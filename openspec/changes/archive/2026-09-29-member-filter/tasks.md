## 1. 一覧

- [x] 1.1 `frontend/src/pages/ListPage.tsx` に、ラベル「メンバー」の select を足す。先頭は表示「全員」、値は空文字である。続く選択肢は GET `/api/members` の順で、表示は `name`、値は `id` である。同じ `name` でも option は分け、値の `id` で区別する。初期選択は「全員」である。確認: `/` を開いたとき選択が「全員」であり、その値がどのメンバーの `id` でもない
- [x] 1.2 絞り込みは、既存の GET `/api/tasks` 全件に対する画面の処理である。「全員」のときは全件、1 人のときはその `id` と `assigneeId` が一致するタスクだけを、受け取った順のまま出す。完了済みも残す。0 件の文言は「タスクはまだありません。」のままである。select は残す。選択は一覧の状態だけにし、URL にも保存先にも載せない。詳細から一覧へ戻ったときの初期値は「全員」である。選んでいる `id` が GET `/api/members` に無いときは「全員」に戻す。一覧に削除、担当者変更、完了切替は置かない。`frontend/src/api.ts` に新しい関数は足さない。確認: 1 人を選ぶと他の担当が消え、その人の完了済みは残り、「全員」に戻すと全件に戻る
- [x] 1.3 `/new`、`/tasks/:id`、`/members` の操作は二段目のままである。画面ルートは増やさない。確認: 新しいルートが無く、詳細の担当者変更と完了切替が残っている

## 2. 画面の合否

- [x] 2.1 `frontend/e2e/` の Playwright Test で、初期が「全員」であること、1 人を選ぶとその担当のタスクだけが残り完了済みも残ること、「全員」に戻すと全件に戻ること、URL に絞り込みが無いことを断言する。詳細から一覧へ戻ると「全員」であることも断言する。担当タスクが無いメンバーを選ぶと「タスクはまだありません。」となり select が残ること、選んだメンバーが居なくなると「全員」に戻ることも断言する。同名の option は値の `id` が異なることを断言する。ブラウザは Chromium だけである。e2e に 422 を足さない。サーバの 422 と 404 は既存の pytest が正である。ルートの `playwright.config.ts` と `tests/example.spec.ts` は実行せず、見本の設定は移さず、見本は消さない。Playwright MCP は合否にしない。確認: 既存の 8000 と 5173 を止めたあと、`cd frontend` して `$env:NODE_OPTIONS="--use-system-ca"` のうえで `npx playwright test` が成功する

## 3. この change で触らないもの

- [x] 3.1 `backend/` と `infra/` を編集していない。CDK、テーブル、Output、PATCH は二段目のままである。新しい API は無い。確認: `backend/` と `infra/` に差分が無い
- [x] 3.2 `AGENTS.md`、`README.md`、`docs/rules/project-rules-serena.md`、`openspec/changes/archive/2026-09-28-baseline-board/`、`openspec/changes/archive/2026-09-28-task-patch/` の本文、1本目から 6本目を編集していない。実 URL を書いていない。確認: それらの差分が無い
