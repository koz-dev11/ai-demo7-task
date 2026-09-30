## Why

一段目のタスクボードは、登録時の担当者割り当てと、完了の保存値 false までである。二段目は、詳細画面からそのタスクの担当者と完了だけを変えられるようにする。メンバー絞り込みは三段目に残す。

## What Changes

- 既存 capability `task` に `PATCH /api/tasks/{id}` を足す。画面ルートは増やさない。絞り込み用 API は足さない
- 送った `assigneeId` と `done` だけを、そのタスクについて変える。片方だけでも更新できる。両方省略は 422 である。他のタスクは再割り当てしない
- 空の `assigneeId`、存在しないメンバーへの `assigneeId`、boolean でない `done` は 422 である。ストアは変えない
- `id`、`createdAt`、`title` は不変である。PATCH にこれらが付いていても捨て、422 にはしない。保存値は変えない
- 存在しないタスクの PATCH は 404 である。成功は 200 で、タスクの 5 キーを返す
- タスク POST の `assigneeId` と `done` は、これまでどおり採用しない。新規の `done` は false のままである
- 詳細画面で担当者を選べ、完了を切り替えられる。一覧には切り替えを置かない。担当者の候補は、存在するメンバーだけである
- 完了の文言は、`done` が true なら「完了」、false なら「未完了」である。一覧と詳細の両方である。完了済みも一覧に残す
- CDK に足してよいのは、同じ HttpApi への `PATCH /api/tasks/{id}` だけである。corsPreflight のメソッドに PATCH を足す。新しい AWS サービスは足さない。スタック名、テーブル、Output は一段目のままである
- 画面の合否は `frontend/e2e/` の Playwright Test（Chromium だけ）である。担当者変更、完了の切り替え、文言「完了」「未完了」、完了済みが一覧に残ることを e2e で断言する
- サーバの 422 と 404 は backend の pytest が正である。e2e に 422 を足さない
- この change に含めないもの: 三段目 `member-filter`、`cdk deploy`、git commit、git push、実 URL

## Capabilities

### New Capabilities

- （なし。capability `task` は一段目の正本 `openspec/specs/task/spec.md` にある）

### Modified Capabilities

- `task`: `PATCH /api/tasks/{id}` を足す。詳細で担当者を変更でき、完了を切り替えられる。完了の文言は `done` に従う。完了済みも一覧に残す。メンバー絞り込みは変えない

## Impact

- 企画成果物: `openspec/changes/task-patch/` の proposal / specs / design / tasks。確認後の apply で二段目のコードだけを足す
- 実装の置き場: `backend/main.py` の PATCH、`frontend/` の詳細画面と一覧・詳細の完了文言、`frontend/e2e/`、`infra/` の同じ HttpApi への PATCH ルートと corsPreflight のメソッド
- 画面ルートは `/`、`/new`、`/tasks/:id`、`/members` のままである。API は一段目のパスに PATCH `/api/tasks/{id}` を足したものだけである
- スタック名 `AiDemo7ApiStack`、テーブル、Output、Lambda Timeout、ステージ `$default` は一段目のままである。新しい AWS サービスは足さない
- リポジトリ直下の `playwright.config.ts` と `tests/example.spec.ts` は初期化の見本である。合否に使わない。見本の設定を `frontend/` へ移さない。見本は消さない。Playwright MCP は下書きであり、合否にしない
- `AGENTS.md`、`README.md`、`docs/rules/project-rules-serena.md`、アーカイブ済み change `openspec/changes/archive/2026-09-28-baseline-board/` の本文は編集しない。実 URL は書かない
- 1本目から 6本目は編集しない。三段目 `member-filter` はこの change では切らない
