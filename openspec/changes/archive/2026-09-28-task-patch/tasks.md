## 1. バックエンド

- [x] 1.1 `backend/main.py` に `PATCH /api/tasks/{id}` を足す。先にタスクの有無を見る。無い id は 404 とし、本文が空の `assigneeId` でも 404 である。ストアは変えない。成功は 200 で、`id`、`title`、`assigneeId`、`done`、`createdAt` の 5 キーだけを返す。`name` は足さない。同じ値への更新も 200 である。確認: 存在するタスクへの妥当な PATCH が 200 で 5 キーであり、無い id が 404 である
- [x] 1.2 送られた `assigneeId` と `done` だけを、そのタスクに書く。片方だけでも更新できる。両方無ければ 422 である。`assigneeId` は strip し、空、空白だけ、文字列でない、存在するメンバーの `id` でない、なら 422 である。`done` は JSON の boolean 以外（文字列、数値、null）なら 422 である。片方が不正なら、もう片方が妥当でも両方とも書かず 422 である。`id`、`createdAt`、`title` と未知の項目は捨て、422 にはしない。不変項目だけなら 422 である。422 のときストアは変えない。他のタスクの `assigneeId` と `done` は変えず、割り当ては呼ばない。確認: 上記の 422 の前後でストアが同じであり、成功時に送っていない項目と他のタスクが変わらない
- [x] 1.3 タスク POST は、クライアントの `assigneeId` と `done` を捨て、保存する `done` は false のままにする。新規の割り当ては、`done` が false の件数だけを数える。`done` が true のタスクは数に入れない。同数なら `createdAt` が古いメンバー、それも同じなら `id` の辞書順が先、は一段目のままである。そのメンバーを `assigneeId` に持つタスクが 1 件でもあれば、`done` が true でもメンバー DELETE は 422 のままである。確認: `done` が true の POST でも保存値が false であり、完了済みだけのメンバーが未完了 0 件として選ばれる

## 2. バックエンドの pytest

- [x] 2.1 `backend/tests` の pytest に、次を足す。`assigneeId` だけの 200、`done` だけの 200、両方省略の 422、空と空白だけの `assigneeId` の 422、存在しないメンバーの 422、boolean でない `done` の 422、妥当な `done` と存在しない `assigneeId` を同時に送った 422 で両方不変、`id` と `createdAt` と `title` を付けても保存値が不変、不変項目だけの 422、存在しない id の 404、存在しない id で空の `assigneeId` でも 404、成功応答に `name` が無い、他タスクを再割り当てしない、POST の `done` が false、完了済みを未完了件数に入れない。422 と 404 は e2e に移さない。確認: `cd backend` のあと `.\.venv\Scripts\python.exe -m pytest` が成功する

## 3. フロントエンド

- [x] 3.1 `frontend/src/api.ts` に、そのタスクの `assigneeId` と `done` だけを送る PATCH を足す。画面ルートは増やさない。絞り込み用 API は足さない。ページから `fetch` を直呼びしない。確認: 新しい画面ルートと、GET `/api/tasks` 以外の一覧 API が無い
- [x] 3.2 `/` の完了の文言を、`done` が true なら「完了」、false なら「未完了」にする。完了済みも一覧に残す。並びは `createdAt` 降順のままである。一覧に select、checkbox、削除、メンバー絞り込みを置かない。担当者名は `assigneeId` と GET `/api/members` を画面で結ぶ。確認: 完了済みと未完了が両方とも一覧に出て、一覧に切り替えの操作が無い
- [x] 3.3 `/tasks/:id` に、存在するメンバーだけを候補にする select を置く。現在の `assigneeId` を選択状態にする。完了は checkbox で切り替える。select の変更は `assigneeId` だけ、checkbox の変更は boolean の `done` だけを PATCH する。この変更に `window.confirm` は使わない。削除の confirm は「削除しますか？」のままである。成功した 5 キーで表示を更新する。失敗したときは保存済みの表示に戻す。候補が空のときは PATCH を送らない。存在しない id は「見つかりません。」のままである。確認: 別のメンバーを選ぶと担当者名が変わり、checkbox で文言が「完了」と「未完了」のあいだで切り替わる
- [x] 3.4 `/new` には担当者の select と完了の入力を足さない。登録後の `done` は false のままである。確認: `/new` に select と checkbox が無い

## 4. 画面の合否

- [x] 4.1 `frontend/e2e/` の Playwright Test で、担当者の変更、完了の切り替え、文言「完了」と「未完了」、完了済みが一覧に残ることを断言する。ブラウザは Chromium だけである。e2e に 422 を足さない。サーバの 422 と 404 は pytest が正である。ルートの `playwright.config.ts` と `tests/example.spec.ts` は実行せず、見本の設定は移さず、見本は消さない。Playwright MCP は合否にしない。確認: 既存の 8000 と 5173 を止めたあと、`cd frontend` して `$env:NODE_OPTIONS="--use-system-ca"` のうえで `npx playwright test` が成功する

## 5. インフラ

- [x] 5.1 `infra/lib/ai-demo7-api-stack.ts` の `/api/tasks/{id}` に PATCH を足す。corsPreflight のメソッドに PATCH を足す。新しいルート、新しい AWS サービス、テーブル、Output、Timeout、ステージは足さない。スタック名は `AiDemo7ApiStack` のままである。FastAPI に CORS は足さない。確認: `cd infra` のあと `$env:NODE_OPTIONS="--use-system-ca"` で `npx cdk synth` が成功し、Lambda ルートが一段目に PATCH `/api/tasks/{id}` を足したものだけであり、corsPreflight のメソッドが GET、POST、DELETE、PATCH、OPTIONS であり、Output が一段目の 4 つのままである

## 6. この change で触らないもの

- [x] 6.1 三段目 `member-filter` を実装していない。一覧の絞り込み、絞り込み用 API、URL への絞り込みが無い。確認: `/` に絞り込みの操作が無く、GET `/api/tasks` 以外の一覧 API が無い
- [x] 6.2 `AGENTS.md`、`README.md`、`docs/rules/project-rules-serena.md`、`openspec/changes/archive/2026-09-28-baseline-board/` の本文、1本目から 6本目を編集していない。実 URL を書いていない。確認: それらの差分が無い
