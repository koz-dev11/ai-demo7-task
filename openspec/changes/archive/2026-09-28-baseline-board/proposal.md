## Why

認証なしの公開タスクボード `ai-demo7-task` を新しく作る。一段目は、メンバーの登録・一覧・削除と、タスクの登録・一覧・詳細・削除が、4 画面と所定の API だけで通ることまでとする。登録されたタスクの担当者はサーバが決める。担当者変更、完了切替、メンバー絞り込みは後の段に残す。

## What Changes

- 新 capability `task` として、一段目の成功条件・画面・API・項目・割り当て・保存先・やらないことを定義する
- 画面は `/`、`/new`、`/tasks/:id`、`/members` だけである。`/login` と `/members/:id` は無い
- API は GET/POST `/api/members`、DELETE `/api/members/{id}`、GET/POST `/api/tasks`、GET/DELETE `/api/tasks/{id}` だけである。PATCH は無い
- 作成の成功は 201、削除の成功は 204、対象が無い GET と DELETE は 404、検証失敗は 422 である
- メンバー項目は `id`、`name`、`createdAt` である。タスク項目は `id`、`title`、`assigneeId`、`done`、`createdAt` である。JSON は camelCase である。タスク JSON に `name` は無い
- `createdAt` はサーバ付与の UTC ISO8601 である。一覧は `createdAt` 降順である
- `name` と `title` は strip 後に空なら 422 である。同名メンバーは許す
- タスク POST の `assigneeId` と `done` は採用しない。`assigneeId` はサーバが決め、`done` の保存値は false である
- 割り当ては、未完了タスクが最も少ないメンバーである。同数なら `createdAt` が古いメンバーである。メンバーが 0 人のタスク登録は 422 で、ストアを変えない
- そのメンバーを担当者にするタスクが残っている DELETE は 422 である。カスケードしない
- タスクの削除は `/tasks/:id` の confirm 後のハード削除である。`/` に削除は置かない
- メンバーの削除は `/members` の confirm 後のハード削除である。メンバーの詳細画面は無い
- 担当者名は、`assigneeId` と GET `/api/members` を画面で結ぶ
- `/` から `/members` への導線は必須である。タスク登録への導線とは別に置く。URL を直接打つことだけを到達手段にしない
- 一覧と詳細に出す完了の文言は「未完了」である。保存値は false のままである。完了の切り替えはしない
- `/members` で名前が空、または空白だけのまま登録しようとしたとき、メンバーは増えない。名前が必須であることが画面で分かる。API の 422 とストア不変は変えない
- ローカルは `MEMBERS_TABLE` と `TASKS_TABLE` が両方未設定のときだけメモリである。片方だけ設定されているときは起動を失敗させる。本番は DynamoDB（各テーブル PK `id`、一覧は Scan）
- 設計図はこの段で `infra/` の CDK（TypeScript）として作る。スタック名は `AiDemo7ApiStack` である。SAM の `template.yaml` は作らない
- 画面の合否は `frontend/e2e/` の Playwright Test（Chromium だけ）である。サーバの 422 は backend の pytest が正である
- この change に含めないもの: メンバー絞り込み、担当者変更、完了切替、PATCH、`cdk deploy`、git commit、git push

## Capabilities

### New Capabilities

- `task`: 認証なしのタスクボード。メンバーの登録・一覧・削除。タスクの登録・一覧・詳細・削除。登録時のサーバ割り当て。項目・画面・API・保存先・一段目のやらないこと

### Modified Capabilities

- （なし。`openspec/specs/` に既存 capability はない）

## Impact

- 企画成果物: `openspec/changes/baseline-board/` の proposal / specs / design / tasks。確認後の apply で一段目のコードだけを足す。`README.md` は編集しない
- 実装の置き場: `frontend/`（`/` `/new` `/tasks/:id` `/members`）、`backend/main.py`、`infra/`（スタック `AiDemo7ApiStack`）
- 依存の追加は一段目に必要な範囲（FastAPI / Mangum / React / Vite / Playwright Test / CDK）に限る。1本目から 6本目のスタック・テーブル・バケット・API URL・`.env`・Cognito は共有しない
- リポジトリ直下の `playwright.config.ts` と `tests/example.spec.ts` は初期化の見本である。合否に使わない。見本の設定を `frontend/` へ移さない。ルートの見本は消さない
- Playwright MCP は下書きであり、合否にしない
- `AGENTS.md`、`README.md` の契約本文、`docs/rules/project-rules-serena.md` は編集しない。実 URL は書かない
- 二段目 `task-patch` と三段目 `member-filter` は別 change であり、この change では切らない
