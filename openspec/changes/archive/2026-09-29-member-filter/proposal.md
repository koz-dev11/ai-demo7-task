## Why

二段目までの一覧は、担当者が違っても全件が並ぶだけである。三段目は、画面 `/` でメンバーを選んで、その担当のタスクだけを見られるようにする。

## What Changes

- 既存 capability `task` の画面 `/` に、メンバーで絞る select を足す。初期選択は「全員」である。「全員」の値はメンバーの `id` ではない
- 続く選択肢は GET `/api/members` のメンバーである。表示は `name`、値は `id` である。並びは API の順である。同名でも `id` で区別する
- 絞り込みは、既存の GET `/api/tasks` 全件に対する画面の処理である。新しい API、別の一覧 API、クエリ付きの GET は足さない
- 「全員」のときは全件を出す。1 人を選んだときは、その `id` と `assigneeId` が一致するタスクだけを出す。完了済みも残す。並びは `createdAt` 降順のままである
- URL に絞り込みを載せない。`/` を開いたとき、および詳細から一覧へ戻ったときの初期値は「全員」である。選んだ `id` のメンバーが無いときは「全員」に戻す
- 絞った結果が 0 件のときは、タスクが無いことが分かる表示のままである。select は残す
- 一覧に削除、担当者変更、完了切替は置かない。画面ルートは増やさない。`/new`、`/tasks/:id`、`/members` の操作は二段目のままである
- `backend/` と `infra/` は編集しない。CDK、テーブル、Output、PATCH の契約は変えない
- 画面の合否は `frontend/e2e/` の Playwright Test（Chromium だけ）である。初期は全員であること、1 人を選ぶとその担当のタスクだけが残り完了済みも残ること、「全員」に戻すと全件に戻ること、URL に絞り込みが無いことを e2e で断言する
- サーバの 422 と 404 は backend の pytest が正である。e2e に 422 を足さない。Playwright MCP は合否にしない
- この change に含めないもの: ログイン、Cognito、検索箱、検索用 API、GSI、ソフト削除、カスケード削除、タスク一覧からの削除、タイトル編集、タスク本文、他タスクの再割り当て、新しい AWS サービス、`cdk deploy`、git commit、git push、実 URL

## Capabilities

### New Capabilities

- （なし。capability `task` は正本 `openspec/specs/task/spec.md` にある）

### Modified Capabilities

- `task`: 画面 `/` の一覧を、メンバーの `id` で絞れるようにする。初期は「全員」である。絞り込みは GET `/api/tasks` 全件の画面処理である。新しい API は無い

## Impact

- 企画成果物: `openspec/changes/member-filter/` の proposal / specs / design / tasks。確認後の apply で三段目の画面だけを足す
- 実装の置き場: `frontend/` の一覧 `/` と `frontend/e2e/`。`backend/` と `infra/` は編集しない
- 画面ルートは `/`、`/new`、`/tasks/:id`、`/members` のままである。API は二段目のままである
- リポジトリ直下の `playwright.config.ts` と `tests/example.spec.ts` は初期化の見本である。合否に使わない。見本の設定を `frontend/` へ移さない。見本は消さない
- `AGENTS.md`、`README.md`、`docs/rules/project-rules-serena.md`、アーカイブ済み change `openspec/changes/archive/2026-09-28-baseline-board/` と `openspec/changes/archive/2026-09-28-task-patch/` の本文は編集しない。実 URL は書かない
- 1本目から 6本目は編集しない
