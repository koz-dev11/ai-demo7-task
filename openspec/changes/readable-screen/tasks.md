## 1. スタイル

- [x] 1.1 `frontend/src/index.css` で、カードの grid は残す。`.card > time` は `justify-self: end` とし、文字は UTC ISO8601 の `0.875rem` `#6b7280` のままである。`.card-extra` は `display: flex`、`gap: 1rem`、`grid-column: 1 / -1` とする。`.card.overdue` の左の線は `4px solid #b45309` のままである。`.card.overdue .card-extra > span:last-child` の文字色を `#b45309` にする。一覧に「期限」は足さない。一覧の下に `padding-bottom` は足さない。`ListPage.tsx` は編集しない。確認: design.md の Decisions 2 のとおりである
- [x] 1.2 `frontend/src/index.css` で、`nav a[href="/new"]` の背景を `#1a1a1a`、文字を `#ffffff`、`text-decoration: none`、余白を `0.4rem 0.8rem` とする。キーボードで選んだときは `outline: 2px solid #1d4ed8` が見えるようにする。class `register-link` は足さない。「メンバー」のリンクはテキストのままである。`position: fixed` は使わない。`.member-filter` は `flex-direction: row`、`align-items: center`、`gap: 0.75rem` とし、フォームのラベルの縦積みからは外す。確認: design.md の Decisions 4 と 5 のとおりである
- [x] 1.3 `frontend/src/index.css` で、`form label` は縦積みのままである。`form > label + label` と、エラーの次の `label` に `margin-top: 1rem` を付ける。エラーの `alert` は `margin-top: 0.25rem` のままである。`form input` と `textarea` の幅 100% は残す。詳細の `.field input[type="date"]` は `width: auto` とする。`.field` と `.done-row` と、`time` を含む詳細の段落に `margin-top: 1rem` を付ける。戻るリンクの段落には付けない。「削除」は `margin-top: 2rem`、背景 `#9f1239`、文字 `#ffffff` のままである。`textarea` の `min-height` は `8rem` とする。`.member + .member` に `border-top: 1px solid #d1d5db` を付ける。`list-style: none` は残す。確認: design.md の Decisions 3 と 6 のとおりである

## 2. 詳細の欄

- [x] 2.1 `frontend/src/pages/DetailPage.tsx` で、既存の欄を上から、担当者、完了の行、期限、完了日、作成日時、内容、「削除」の順に並べ替える。ハンドラ、ラベル、checkbox の `htmlFor`、確認「削除しますか？」、「完了日」と UTC ISO8601 のあいだの空白、作成日時のラベル無しは残す。他の TSX は編集しない。確認: `completedAt` があるときはその順であり、null のときは完了日が無く、期限の次が作成日時である

## 3. 画面の合否

- [x] 3.1 `frontend/e2e/board.spec.ts` の既存の断言は書き換えない。見た目のための screenshot テストは足さない。e2e に 422 を足さない。既存の 8000 と 5173 を止めたあと、`cd frontend` して `$env:NODE_OPTIONS="--use-system-ca"` のうえで `npx playwright test` が成功する。ブラウザは Chromium だけである。ルートの `playwright.config.ts` と `tests/example.spec.ts` は実行せず、見本の設定は移さず、見本は消さない。確認: そのコマンドが成功し、`board.spec.ts` の断言は実装前と同じである

## 4. この change で触らないもの

- [x] 4.1 `backend/` と `infra/` を編集していない。新しい API パスは無い。画面ルートは増やしていない。確認: `backend/` と `infra/` に差分が無い
- [x] 4.2 `AGENTS.md`、`README.md`、`docs/rules/project-rules-serena.md`、アーカイブ済み change の本文、1本目から 6本目を編集していない。実 URL を書いていない。`cdk deploy` と git commit はしていない。確認: それらの差分が無い
