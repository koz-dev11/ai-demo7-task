## Why

三段までのタスクは、タイトルと担当と完了しか持たない。内容と期限と完了日が無く、登録へのリンクはナビゲーションに並ぶだけである。この change は、その 5 点を 1 つの change で足す。

## What Changes

- タスク JSON に `body`、`dueOn`、`completedAt` を足す。既存の `id`、`title`、`assigneeId`、`done`、`createdAt` は残す。`name` は足さない。保存済みで項目が無いタスクは、読むときに `body` を空文字、`dueOn` と `completedAt` を null として返す
- `body` は平文である。Markdown として描画しない。省略と、strip 後の空文字は許す。文字列でないときは 422 である。`/new` と詳細で編集できる。一覧には全文を出さず、詳細に出す
- `dueOn` は任意である。値は実在する暦日の `YYYY-MM-DD` だけである。空文字と null は期限なしである。それ以外は 422 である。`/new` と詳細で設定できる。PATCH で省略したときは保存済みを変えず、空文字か null を送ったときは期限なしに戻す
- `completedAt` はクライアントが決めてはならない。PATCH に付いていても捨て、422 にはしない。`done` が false から true になったとき、サーバが今の UTC ISO8601 を付ける。すでに true のタスクへ、もう一度 true を送ったときは元の `completedAt` を残す。true から false にしたときは null にする。新規 POST の `done` は false のままなので、新規の `completedAt` は null である
- 画面の完了日は、`completedAt` があるときだけ「完了日」として、一覧と詳細に UTC ISO8601 の文字のまま出す
- 期限超過は、`done` が false で、`dueOn` が利用者のローカル日付より前のときだけである。当日は超過にしない。期限が無いタスクと、完了済みのタスクは超過にしない。一覧のそのカードは左の線を `#b45309` にし、カードの中に「期限超過」と出す。未完了の青、完了の灰色、削除の赤とは別の色である
- `/` の「タスクを登録」は画面右下に固定する。文言と `/new` へのリンクは変えない。メンバーへのリンクはナビゲーションに残す。最後のカードがボタンに隠れない余白を、一覧の下に置く
- PATCH は、送った `assigneeId`、`done`、`body`、`dueOn` だけを、そのタスクに書く。4 つとも無ければ 422 である。`id`、`title`、`createdAt`、`completedAt` は捨てる。他のタスクは再割り当てしない。新しい API パスは足さない。`infra/` は編集しない
- タイトルは、これまでどおり strip 後に空なら 422 である。登録後にタイトルを変える手段は足さない
- 画面の合否は `frontend/e2e/` の Playwright Test（Chromium だけ）である。内容が詳細に出ること、完了にすると完了日が出て未完了に戻すと消えること、期限を入れると一覧に出ること、昨日以前の未完了に「期限超過」が出て完了済みと当日には出ないこと、「タスクを登録」が `/` の右下にあることを e2e で断言する。422 と 404 は pytest が正である。e2e に 422 を足さない。screenshot テストは足さない

## Capabilities

### New Capabilities

- （なし。capability `task` は正本 `openspec/specs/task/spec.md` にある）

### Modified Capabilities

- `task`: タスク項目、POST、PATCH、一覧、詳細、登録画面、合否の既存 Requirement を、内容・完了日・期限日・登録リンクの位置に合わせて更新する。既存の見出しに入らない振る舞いだけを ADDED する

## Impact

- 企画成果物: `openspec/changes/task-content/` の proposal / specs / design / tasks。確認後の apply で API の項目と画面だけを足す
- 実装の置き場: `backend/` のタスク保存と PATCH、`frontend/` の `/`、`/new`、`/tasks/:id`、`frontend/e2e/`、`backend/tests/`。`infra/` は編集しない
- 画面ルートは `/`、`/new`、`/tasks/:id`、`/members` のままである。API パスは今のままである
- リポジトリ直下の `playwright.config.ts` と `tests/example.spec.ts` は初期化の見本である。合否に使わない。見本の設定を `frontend/` へ移さない。見本は消さない
- `AGENTS.md`、`README.md`、`docs/rules/project-rules-serena.md`、アーカイブ済み change の本文は編集しない。実 URL は書かない
- 1本目から 6本目は編集しない
- この change に含めないもの: タイトル編集、Markdown 描画、画像、添付、検索、ログイン、Cognito、新しい AWS サービス、`cdk deploy`、git commit、git push、実 URL
