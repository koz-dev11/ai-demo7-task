## 1. 見た目

- [x] 1.1 `frontend/src/index.css` で、背景を白に近く、文字を黒に近くする。`main` の最大幅は 40rem のままである。ボタン、入力欄、select、checkbox は、キーボードで選んだとき枠が分かること。一覧とメンバーの黒丸は出さない。カードは枠と余白のある 2 段で、1 段目のタイトルだけを大きくし、2 段目を小さく横に並べる。「完了」は `#6b7280`、「未完了」は `#1d4ed8` とする。作成日時は小さい `#6b7280` とする。「削除」は内容から `2rem` 以上離し `#9f1239`、「登録する」は `#1a1a1a` とする。確認: 文字の色と枠は design.md の Decisions 3 と 2 のとおりである
- [x] 1.2 `frontend/src/pages/ListPage.tsx` で、カードのリンクの中にタイトル、担当者名、完了の文言、作成日時を残す。一覧に削除、担当者の select、完了の checkbox は置かない。「メンバー」の select はナビゲーションの下の 1 行である。ラベル、先頭の「全員」、空文字の値、続く `name` と `id` は変えない。確認: `/` のカードのリンクにそれらの文字があり、select はナビの下にある
- [x] 1.3 `frontend/src/pages/DetailPage.tsx` で、「タスク一覧」を `main` の先頭に置く。「担当者」は select の上に置き、担当者名の文字は残す。完了の文言と checkbox は同じ行にする。checkbox はラベルの中に入れず、名前「完了を切り替える」は変えない。「削除」は内容から離す。確認の文言「削除しますか？」は変えない。確認: 詳細の並びが delta の「詳細はラベルが上で操作が下である」と「削除は内容から離れ登録とは色が違う」を満たす
- [x] 1.4 `frontend/src/pages/NewPage.tsx` と `frontend/src/pages/MembersPage.tsx` で、「タスク一覧」を `main` の先頭に置く。ラベルを上、入力欄を幅いっぱいでその下、エラーを入力欄の直下、「登録する」をその下に置く。エラーの文言は変えない。メンバーの 1 行は、名前を左、作成日時を小さく、削除を右端にする。確認: 空のタイトルと空の名前で、エラーが入力欄の直下に出る
- [x] 1.5 `frontend/src/App.tsx` の未知のパスは、`main` の中の「見つかりません。」にする。文言は変えない。画面ルートは増やさない。確認: `/login` で「見つかりません。」が、他の画面と同じ幅の中に出る

## 2. 画面の合否

- [x] 2.1 見た目のための screenshot テストは足さない。e2e に 422 を足さない。既存の `frontend/e2e/` の文言と名前を変えない。確認: 既存の 8000 と 5173 を止めたあと、`cd frontend` して `$env:NODE_OPTIONS="--use-system-ca"` のうえで `npx playwright test` が成功する。ブラウザは Chromium だけである。ルートの `playwright.config.ts` と `tests/example.spec.ts` は実行せず、見本の設定は移さず、見本は消さない

## 3. この change で触らないもの

- [x] 3.1 `backend/` と `infra/` を編集していない。API、CDK、テーブル、Output は三段目のままである。確認: `backend/` と `infra/` に差分が無い
- [x] 3.2 `AGENTS.md`、`README.md`、`docs/rules/project-rules-serena.md`、アーカイブ済み change の本文、1本目から 6本目を編集していない。実 URL を書いていない。確認: それらの差分が無い
