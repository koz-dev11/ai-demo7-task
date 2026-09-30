import { expect, test, type Page } from "@playwright/test";

function expectNoFilter(page: Page) {
  const url = new URL(page.url());
  expect(url.pathname).toBe("/");
  expect(url.search).toBe("");
}

test("一覧からメンバー画面へ進み、空の名前では増えない", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("タスクはまだありません。")).toBeVisible();
  await expect(page.getByLabel("メンバー")).toHaveValue("");
  await expect(page.getByLabel("メンバー").locator("option").first()).toHaveText("全員");
  expectNoFilter(page);
  const membersLink = page.getByRole("link", { name: "メンバー" });
  const newLink = page.getByRole("link", { name: "タスクを登録" });
  await expect(membersLink).toHaveAttribute("href", "/members");
  await expect(newLink).toHaveAttribute("href", "/new");
  await membersLink.click();
  await expect(page).toHaveURL(/\/members$/);
  await expect(page.getByText("メンバーはまだありません。")).toBeVisible();

  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByRole("alert")).toHaveText("名前は必須です");
  await expect(page.getByText("メンバーはまだありません。")).toBeVisible();

  await page.getByLabel("名前").fill("   ");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByRole("alert")).toHaveText("名前は必須です");
  await expect(page.getByRole("listitem")).toHaveCount(0);
});

test("タスクの登録、担当者変更、完了切替、削除確認、未知のパス", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "メンバー" }).click();
  await expect(page).toHaveURL(/\/members$/);
  await expect(page.getByText("メンバーはまだありません。")).toBeVisible();
  await page.getByLabel("名前").fill("花子");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "花子" })).toBeVisible();
  await page.getByLabel("名前").fill("太郎");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "太郎" })).toBeVisible();

  await page.goto("/new");
  await expect(page.locator("select")).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByRole("alert")).toHaveText("タイトルは必須です");
  await expect(page).toHaveURL(/\/new$/);

  await page.getByLabel("タイトル").fill("   ");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByRole("alert")).toHaveText("タイトルは必須です");

  await page.getByLabel("タイトル").fill("資料を整える");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "削除" })).toHaveCount(0);
  await expect(page.getByLabel("担当者")).toHaveCount(0);
  await expect(page.getByLabel("メンバー")).toHaveValue("");
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  const card = page.getByRole("link", { name: /資料を整える/ });
  await expect(card).toContainText("花子");
  await expect(card).toContainText("未完了");
  await expect(card).not.toContainText(/\d{4}-\d{2}-\d{2}T/);

  await card.click();
  await expect(page.getByRole("heading", { name: "資料を整える" })).toBeVisible();
  await expect(page.locator(".assignee")).toHaveCount(0);
  await expect(page.getByLabel("担当者").locator("option:checked")).toHaveText("花子");
  await expect(page.locator(".done-state")).toHaveText("未完了");
  await expect(page.getByLabel("担当者")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "完了を切り替える" })).not.toBeChecked();
  await expect(page.getByText(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/)).toBeVisible();

  await page.getByLabel("担当者").selectOption({ label: "太郎" });
  await expect(page.getByLabel("担当者").locator("option:checked")).toHaveText("太郎");
  await page.getByRole("checkbox", { name: "完了を切り替える" }).check();
  await expect(page.locator(".done-state")).toHaveText("完了");

  await page.getByRole("link", { name: "タスク一覧" }).click();
  await expect(page).toHaveURL(/\/$/);
  const doneCard = page.getByRole("link", { name: /資料を整える/ });
  await expect(doneCard.getByText("完了", { exact: true })).toBeVisible();
  await expect(doneCard.getByText("未完了", { exact: true })).toHaveCount(0);
  await expect(doneCard).toContainText("太郎");
  await expect(page.getByLabel("担当者")).toHaveCount(0);
  await expect(page.getByLabel("メンバー")).toHaveValue("");
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await doneCard.click();
  await expect(page.locator(".done-state")).toHaveText("完了");
  await page.getByRole("checkbox", { name: "完了を切り替える" }).uncheck();
  await expect(page.locator(".done-state")).toHaveText("未完了");
  await page.getByRole("link", { name: "タスク一覧" }).click();
  await expect(
    page.getByRole("link", { name: /資料を整える/ }).getByText("未完了", { exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: /資料を整える/ }).click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "削除" }).click();
  await expect(page.getByRole("heading", { name: "資料を整える" })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "削除" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("資料を整える")).toHaveCount(0);

  await page.goto("/login");
  await expect(page.getByText("見つかりません。")).toBeVisible();
  await page.goto("/members/anything");
  await expect(page.getByText("見つかりません。")).toBeVisible();
  await page.goto("/tasks/missing-id");
  await expect(page.getByText("見つかりません。")).toBeVisible();
});

async function removeMembers(page: Page) {
  const listed = page.waitForResponse(
    (response) =>
      response.url().includes("/api/members") &&
      response.request().method() === "GET" &&
      response.ok(),
  );
  await page.goto("/members");
  await listed;
  while ((await page.getByRole("button", { name: "削除" }).count()) > 0) {
    const before = await page.getByRole("listitem").count();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "削除" }).first().click();
    await expect(page.getByRole("listitem")).toHaveCount(before - 1);
  }
}

async function registerMember(page: Page, name: string) {
  await page.getByLabel("名前").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: name }).last()).toBeVisible();
}

test("メンバーで一覧を絞る", async ({ page }) => {
  await removeMembers(page);
  await registerMember(page, "花子");
  await registerMember(page, "太郎");
  await registerMember(page, "次郎");

  await page.goto("/");
  await expect(page.getByLabel("メンバー")).toHaveValue("");
  await expect(page.getByLabel("メンバー").locator("option")).toHaveText(["全員", "次郎", "太郎", "花子"]);
  const optionValues = await page.getByLabel("メンバー").locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  expect(optionValues[0]).toBe("");
  expect(new Set(optionValues).size).toBe(optionValues.length);
  expectNoFilter(page);

  await page.goto("/new");
  await page.getByLabel("タイトル").fill("花子の仕事");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/new");
  await page.getByLabel("タイトル").fill("太郎の仕事");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("link", { name: /花子の仕事/ }).click();
  await page.getByRole("checkbox", { name: "完了を切り替える" }).check();
  await expect(page.locator(".done-state")).toHaveText("完了");
  await page.getByRole("link", { name: "タスク一覧" }).click();

  await expect(page.getByLabel("メンバー")).toHaveValue("");
  await expect(page.getByRole("link", { name: /太郎の仕事/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /花子の仕事/ }).getByText("完了", { exact: true })).toBeVisible();
  await expect(page.locator("a.card")).toHaveText([/太郎の仕事/, /花子の仕事/]);
  expectNoFilter(page);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.getByLabel("担当者")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "削除" })).toHaveCount(0);

  await page.getByLabel("メンバー").selectOption({ label: "花子" });
  await expect(page.getByRole("link", { name: /花子の仕事/ }).getByText("完了", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /太郎の仕事/ })).toHaveCount(0);
  await expect(page.locator("a.card")).toHaveCount(1);
  expectNoFilter(page);

  await page.getByLabel("メンバー").selectOption({ label: "全員" });
  await expect(page.getByRole("link", { name: /太郎の仕事/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /花子の仕事/ }).getByText("完了", { exact: true })).toBeVisible();
  await expect(page.locator("a.card")).toHaveText([/太郎の仕事/, /花子の仕事/]);
  expectNoFilter(page);

  await page.getByLabel("メンバー").selectOption({ label: "花子" });
  await page.getByRole("link", { name: /花子の仕事/ }).click();
  await page.getByRole("link", { name: "タスク一覧" }).click();
  await expect(page.getByLabel("メンバー")).toHaveValue("");
  await expect(page.getByRole("link", { name: /太郎の仕事/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /花子の仕事/ })).toBeVisible();
  expectNoFilter(page);

  const jiroId = await page.getByLabel("メンバー").locator("option", { hasText: "次郎" }).getAttribute("value");
  await page.getByLabel("メンバー").selectOption({ label: "次郎" });
  await expect(page.getByLabel("メンバー")).toHaveValue(jiroId ?? "");
  await expect(page.getByText("タスクはまだありません。")).toBeVisible();
  await expect(page.getByLabel("メンバー")).toBeVisible();
  await expect(page.locator("a.card")).toHaveCount(0);
  expectNoFilter(page);

  await page.getByRole("link", { name: "メンバー" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("listitem").filter({ hasText: "次郎" }).getByRole("button", { name: "削除" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "次郎" })).toHaveCount(0);
  await page.getByRole("link", { name: "タスク一覧" }).click();
  await expect(page.getByLabel("メンバー")).toHaveValue("");
  await expect(page.getByLabel("メンバー").locator("option", { hasText: "次郎" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /太郎の仕事/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /花子の仕事/ })).toBeVisible();
  expectNoFilter(page);
});

test("同名の option は id が異なる", async ({ page }) => {
  await page.goto("/members");
  await page.getByLabel("名前").fill("同名");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "同名" })).toHaveCount(1);
  await page.getByLabel("名前").fill("同名");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "同名" })).toHaveCount(2);

  await page.goto("/");
  const sameName = page.getByLabel("メンバー").locator("option", { hasText: "同名" });
  await expect(sameName).toHaveCount(2);
  const values = await sameName.evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  expect(values).toHaveLength(2);
  expect(values[0]).not.toBe("");
  expect(values[1]).not.toBe("");
  expect(values[0]).not.toBe(values[1]);
  await expect(page.getByLabel("メンバー")).toHaveValue("");
});

test("内容、完了日、期限、期限超過、登録リンクの位置", async ({ page }) => {
  function localDate(offsetDays: number) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }

  const yesterday = localDate(-1);
  const today = localDate(0);

  await page.goto("/members");
  await page.getByLabel("名前").fill("担当");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "担当" })).toBeVisible();

  await page.goto("/");
  const navLinks = page.locator("nav").getByRole("link");
  await expect(navLinks).toHaveText(["メンバー", "タスクを登録"]);
  await expect(page.locator("nav").getByRole("link", { name: "タスクを登録" })).toHaveAttribute("href", "/new");
  await expect(page.locator(".register-link")).toHaveCount(0);

  await page.goto("/new");
  await expect(page.locator("select")).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await page.getByLabel("タイトル").fill("期限のある仕事");
  await page.getByLabel("内容").fill("一行目\n<b>二行目</b>");
  await page.getByLabel("期限").fill(yesterday);
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/$/);

  const card = page.getByRole("link", { name: /期限のある仕事/ });
  await expect(card).toContainText(yesterday);
  await expect(card).toContainText("期限超過");
  await expect(card).not.toContainText("一行目");
  await expect(card).toHaveCSS("border-left-color", "rgb(180, 83, 9)");

  await card.click();
  const body = page.getByLabel("内容");
  await expect(body).toHaveValue("一行目\n<b>二行目</b>");
  await expect(page.locator("b")).toHaveCount(0);
  await expect(page.getByText("完了日")).toHaveCount(0);

  await page.getByRole("checkbox", { name: "完了を切り替える" }).check();
  await expect(page.getByText(/完了日 \d{4}-\d{2}-\d{2}$/)).toBeVisible();
  await page.getByRole("link", { name: "タスク一覧" }).click();
  await expect(card).toContainText("完了日");
  await expect(card).not.toContainText("期限超過");

  await card.click();
  await page.getByRole("checkbox", { name: "完了を切り替える" }).uncheck();
  await expect(page.getByText("完了日")).toHaveCount(0);
  const duePatched = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" && response.url().includes("/api/tasks/") && response.ok(),
  );
  await page.getByLabel("期限").fill(today);
  await duePatched;
  await page.getByRole("link", { name: "タスク一覧" }).click();
  await expect(card).not.toContainText("完了日");
  await expect(card).not.toContainText("期限超過");
  await expect(card).toContainText(today);
});
