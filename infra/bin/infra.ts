#!/usr/bin/env node
import { execFileSync, spawnSync } from "child_process";
import * as cdk from "aws-cdk-lib/core";
import { AiDemo7ApiStack } from "../lib/ai-demo7-api-stack";

function dockerAvailable(): boolean {
  const result = spawnSync("docker", ["info"], { stdio: "ignore" });
  return result.status === 0;
}

function commandLineOf(pid: number): { command: string; parentPid: number } | null {
  if (process.platform === "win32") {
    try {
      const output = execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `$p = Get-CimInstance Win32_Process -Filter "ProcessId=${pid}"; if ($p) { Write-Output $p.ParentProcessId; Write-Output $p.CommandLine }`,
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      );
      const lines = output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      const parentPid = Number(lines[0]);
      if (!Number.isFinite(parentPid)) {
        return null;
      }
      return { parentPid, command: lines.slice(1).join(" ") };
    } catch {
      return null;
    }
  }
  try {
    const command = execFileSync("ps", ["-o", "args=", "-p", String(pid)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const parentRaw = execFileSync("ps", ["-o", "ppid=", "-p", String(pid)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const parentPid = Number(parentRaw.trim());
    if (!Number.isFinite(parentPid)) {
      return null;
    }
    return { parentPid, command };
  } catch {
    return null;
  }
}

function ancestorCommands(): string {
  const lines = [process.argv.join(" ")];
  let pid = process.ppid;
  for (let depth = 0; depth < 8 && pid > 0; depth += 1) {
    const info = commandLineOf(pid);
    if (!info) {
      break;
    }
    lines.push(info.command);
    if (info.parentPid === pid) {
      break;
    }
    pid = info.parentPid;
  }
  return lines.join("\n");
}

function isCdkDeploy(): boolean {
  return /(^|[\s"'`])cdk(\.cmd|\.exe)?\s+deploy\b|\bcdk\s+deploy\b/.test(ancestorCommands());
}

const app = new cdk.App();
if (!dockerAvailable()) {
  if (isCdkDeploy()) {
    throw new Error(
      "Docker が無いため cdk deploy を中止しました。bundling を無効化したままデプロイしません。",
    );
  }
  app.node.setContext("aws:cdk:bundling-stacks", []);
}
new AiDemo7ApiStack(app, "AiDemo7ApiStack");
