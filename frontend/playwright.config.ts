import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(frontendDir, "..");
const backendPython = path.join(repoRoot, "backend", ".venv", "Scripts", "python.exe");

function envWith(extra: Record<string, string>): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return { ...merged, ...extra };
}

function backendEnv(): Record<string, string> {
  const merged = envWith({});
  delete merged.MEMBERS_TABLE;
  delete merged.TASKS_TABLE;
  return merged;
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:5173",
    browserName: "chromium",
  },
  webServer: [
    {
      command: `"${backendPython}" -m uvicorn main:app --host 127.0.0.1 --port 8000`,
      cwd: path.join(repoRoot, "backend"),
      url: "http://127.0.0.1:8000/openapi.json",
      reuseExistingServer: false,
      timeout: 120_000,
      env: backendEnv(),
    },
    {
      command: "npm run dev",
      cwd: frontendDir,
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
      timeout: 120_000,
      env: envWith({ NODE_OPTIONS: "--use-system-ca" }),
    },
  ],
});
