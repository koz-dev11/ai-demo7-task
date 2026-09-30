## 1. API

- [x] 1.1 `backend/main.py` のタスクに `body`、`dueOn`、`completedAt` を足す。GET は 8 キーを返す。キーが無い保存は、読むときに `body` を空文字、`dueOn` と `completedAt` を null にする。`name` は足さない。確認: タイトルだけの POST が 201 で、`body` は空文字、`dueOn` と `completedAt` は null、`done` は false である
- [x] 1.2 POST は、送った `body` を strip して保存し、実在する `YYYY-MM-DD` の `dueOn` を保存する。空文字と null の `dueOn` は null である。`assigneeId`、`done`、`completedAt` は採用しない。文字列でない `body`、形の違う `dueOn`、strip 後に空の `title` は 422 で、ストアを変えない。確認: `backend/tests/test_api.py` が、これらの 422 と、内容と期限を保存する 201 を断言する
- [x] 1.3 PATCH は、送った `assigneeId`、`done`、`body`、`dueOn` だけを、そのタスクに書く。4 つとも無ければ 422 である。`dueOn` の省略は保存済みを変えず、空文字か null は null にする。`done` が false から true のときだけ `completedAt` に今の UTC ISO8601 を付ける。true の再送は元の値を残し、true から false は null にする。`id`、`title`、`createdAt`、`completedAt` は捨て、422 にはしない。他のタスクは再割り当てしない。存在しないタスクは 404 のままである。確認: pytest が、完了日時の付与と維持と消去、期限の省略と消去、不変項目だけの 422、存在しないタスクの 404 を断言する

## 2. 画面

- [x] 2.1 `/new` に、ラベル「内容」「期限」を、タイトルと同じ縦の並びに足す。どちらも空で登録できる。担当者と完了の入力は出さない。登録後にタイトルを変える入力は出さない。確認: 内容と期限を入れて登録すると `/` に戻り、詳細に内容が出る
- [x] 2.2 詳細に内容を平文で出し、内容と期限を編集できる。Markdown としては描画しない。`completedAt` があるときだけ「完了日」と UTC ISO8601 の文字を出し、入力欄にはしない。完了にすると完了日が出て、未完了に戻すと消える。担当者変更、完了の checkbox、削除の confirm は今のままである。確認: 完了と未完了の往復で完了日が付き、消える
- [x] 2.3 一覧のカードは 2 段を残し、期限、完了日、「期限超過」は別の行でリンクの中に出す。`body` の全文は出さない。期限超過は、未完了で `dueOn` がローカル日付より前のときだけ、左の線を `#b45309` にし、「期限超過」と出す。当日、期限なし、完了済みは出さない。「タスクを登録」は右下に固定し、文言と `/new` は変えない。「メンバー」はナビゲーションに残す。一覧の下に、最後のカードが隠れない余白を置く。確認: 昨日以前の未完了に「期限超過」が出て、完了済みと当日には出ない

## 3. 画面の合否

- [x] 3.1 `frontend/e2e/` の既存の Playwright Test に、内容が詳細に出ること、完了にすると完了日が出て未完了に戻すと消えること、期限を入れると一覧に出ること、昨日以前の未完了に「期限超過」が出て完了済みと当日には出ないこと、「タスクを登録」が `/` の右下にあることを断言する。screenshot テストは足さない。e2e に 422 を足さない。ブラウザは Chromium だけである。確認: 既存の 8000 と 5173 を止めたあと、`cd frontend` して `$env:NODE_OPTIONS="--use-system-ca"` のうえで `npx playwright test` が成功する。ルートの `playwright.config.ts` と `tests/example.spec.ts` は実行せず、見本の設定は移さず、見本は消さない

## 4. この change で触らないもの

- [x] 4.1 `infra/` を編集していない。新しい API パスは無い。確認: `infra/` に差分が無い
- [x] 4.2 `AGENTS.md`、`README.md`、`docs/rules/project-rules-serena.md`、アーカイブ済み change の本文、1本目から 6本目を編集していない。実 URL を書いていない。`cdk deploy`、git commit、git push はしていない。確認: それらの差分が無い
