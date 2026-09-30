## Context

動機は `proposal.md` の Why。見た目の契約は `specs/task/spec.md`。正本は `openspec/specs/task/spec.md` である。

いまのカードは `grid-template-columns: auto auto 1fr` である。1 段目のタイトルは幅いっぱいである。2 段目は担当者名、完了の文言、作成日時である。期限・完了日・「期限超過」は `.card-extra` の中で横に並ぶが、項目のあいだに間隔が無い。「期限超過」は左の線 `#b45309` だけで、文字色は付いていない。詳細の欄は、内容、期限、完了日、担当者、完了の行、作成日時、「削除」の順である。絞り込みの `.member-filter` は、登録フォームのラベルと同じ縦積みである。「タスクを登録」はナビゲーションのテキストリンクである。

この change が変えるのは `frontend/src/index.css` と、詳細の欄の上下だけである。

## Goals

- カードの 2 段目の右端、期限の行の間隔、「期限超過」の文字色、詳細の欄の順と余白、フォームの欄の余白、絞り込みの横一列、登録リンクの黒地、メンバー行の区切りを、delta のとおりにすること
- 既存の `frontend/e2e/board.spec.ts`（Chromium だけ）が、断言を崩さずに成功すること

## Non-Goals

- `frontend/src/pages/ListPage.tsx`、`NewPage.tsx`、`MembersPage.tsx`、`App.tsx` の編集
- `backend/` と `infra/` の編集。新しい API パス。画面ルートの追加
- 文言、操作、絞り込みの値、完了の色 `#6b7280`、未完了の色 `#1d4ed8`、削除の `#9f1239`、本文幅 40rem の変更
- class `register-link`
- 新しい screenshot テスト。e2e への 422。`board.spec.ts` の断言の書き換え
- ログイン、Cognito、検索箱、`cdk deploy`、git commit、git push、実 URL
- `AGENTS.md`、`README.md`、`docs/rules/project-rules-serena.md`、アーカイブ済み change の本文の編集
- 1本目から 6本目の編集
- ルートの Playwright 見本を合否にすること、見本を消すこと、見本の設定を `frontend/` へ移すこと

## Decisions

### 1. スタイルは `index.css`、DOM を動かすのは詳細の欄の順だけである

- 決定: 色、間隔、幅、区切り線、登録リンクの見た目は `frontend/src/index.css` に書く。`frontend/src/pages/DetailPage.tsx` は、既存の欄を上から、担当者、完了の行、期限、完了日、作成日時、内容、「削除」の順に並べ替えるだけである。ハンドラ、ラベル、checkbox の `htmlFor`、確認「削除しますか？」、「完了日」と UTC ISO8601 のあいだの空白、作成日時のラベル無しは残す。一覧、登録、メンバー、未知のパスの TSX は編集しない。新しいパッケージは足さない
- 理由: 契約が変えるのは密度と、詳細の欄の上下である。一覧のマークアップは、すでにタイトル、2 段目、`.card-extra` に分かれている
- 代替: カードの「期限超過」に新しい class を足す → 一覧の TSX を編集することになる。未完了の超過では `completedAt` が null なので、`.card-extra` の最後の span が「期限超過」である。CSS でその span だけを塗る

### 2. カードの作成日時は右端、期限の行は flex の間隔である

- 決定: カードの grid は残す。`.card > time` に `justify-self: end` を付ける。作成日時の文字は UTC ISO8601 のまま、`0.875rem` の `#6b7280` のままである。`.card-extra` は `display: flex` と `gap: 1rem` とし、`grid-column: 1 / -1` は残す。一覧に「期限」の文字は足さない。`.card.overdue` の左の線は `4px solid #b45309` のままである。`.card.overdue .card-extra > span:last-child` の文字色を `#b45309` にする。一覧の下に `padding-bottom` は足さない
- 理由: 作成日時の `time` はカードの直接の子で、3 列目の `1fr` にある。右端へ寄せれば、その行の右端になる。`.card-extra` の子は日付、「完了日」、 「期限超過」の span なので、flex の間隔が隙間になる
- 代替: 2 段目を別の要素で包む → 一覧の TSX が要る。今の grid のままで右端に寄る

### 3. 詳細の日付欄は幅自動、欄のあいだは 1rem、内容の最小の高さは 8rem である

- 決定: 詳細の `.field input[type="date"]` は `width: auto` とする。`/new` の `form input` の `width: 100%` は残す。`.field` と `.done-row` と、`time` を含む詳細の段落に `margin-top: 1rem` を付ける。戻るリンクの段落には付けない。「削除」は `margin-top: 2rem` のまま、背景 `#9f1239`、文字 `#ffffff` のままである。`textarea` の `min-height` は `8rem` とする。詳細と `/new` で同じ規則にする。Markdown にはしない
- 理由: 詳細の日付だけを本文幅いっぱいにしない、という契約である。`8rem` は空でも数行分の高さになり、両方の内容で同じである。削除の `2rem` は欄の `1rem` より離れ、内容から離れる
- 代替: 詳細の日付も幅 100% のままにする → 契約の「本文幅いっぱいに伸ばさない」とずれる。高さを行数の `rows` 属性にする → 詳細以外の TSX を編集することになる

### 4. 絞り込みだけ横にし、登録フォームの縦積みは残す

- 決定: `.member-filter` を、フォームのラベルとまとめた `flex-direction: column` から外す。`.member-filter` は `flex-direction: row`、`align-items: center`、`gap: 0.75rem` とする。ラベル「メンバー」、先頭「全員」の値 `""`、続く `name` と `id` は変えない。`form label` は縦積みのままである。`form > label + label` と、エラーの次の `label` に `margin-top: 1rem` を付ける。エラーの `alert` は `margin-top: 0.25rem` のまま、入力欄の直下に残す
- 理由: いまの共通規則が、絞り込みと登録フォームを同じ縦積みにしている。絞り込みだけを外すと、フォームの縦積みは残る
- 代替: `.member-filter` を `column` のまま select だけ横に見せる → ラベルが上に残り、横一列にならない

### 5. 「タスクを登録」は `href="/new"` のリンクを、登録ボタンと同じ塗りにする

- 決定: `nav a[href="/new"]` の背景を `#1a1a1a`、文字を `#ffffff`、`text-decoration: none`、余白を `button[type="submit"]` と同じ `0.4rem 0.8rem` とする。要素はいまの `Link` のままである。class `register-link` は CSS にも TSX にも足さない。「メンバー」のリンクはテキストのままである。キーボードで選んだときは、ボタンと同じ `outline: 2px solid #1d4ed8` が見えるようにする。`position: fixed` は使わない
- 理由: 登録ボタンの黒は `#1a1a1a` である。同じ値にすると「同じ黒地・白文字」になる。`href` で足りるので、禁止された class は要らない。リンクのままなので、既存の e2e の `link` という役割は残る
- 代替: `button` に変えて `/new` へ遷移する → 要素がリンクでなくなる。class `register-link` を付ける → 契約で使わない

### 6. メンバー行のあいだだけ線を引く

- 決定: `.member + .member` に `border-top: 1px solid #d1d5db` を付ける。先頭の上と、末尾の下には線を足さない。`list-style: none`、名前を左、作成日時を小さく、削除を右端、は残す
- 理由: 区切るのは行と行のあいだである。色はカードの枠と同じ `#d1d5db` で足りる
- 代替: 各行をカードと同じ枠で囲む → あいだの線より強い区切りになり、一覧のカードと紛れる

## Risks / Trade-offs

- [「期限超過」の色を最後の span に付ける] → 未完了のとき `completedAt` は null なので、超過のカードでは最後が「期限超過」である。一覧の span の順は変えない
- [詳細の欄を並べ替えると e2e が落ちる] → 既存の断言はラベル、役割、文言を見ている。`frontend/e2e/board.spec.ts` は書き換えない。落ちたときだけ、断言の意味を変えずに直す
- [欄の 1rem と、内容の 8rem は見た目の選択である] → 契約は「余白」と「同じ最小の高さ」である。値はこの design で固定する
- [`nav a[href="/new"]` が他の `/new` にも当たる] → `/` のナビゲーションにそのリンクは 1 つだけである。他の画面の戻るリンクは `/` である
