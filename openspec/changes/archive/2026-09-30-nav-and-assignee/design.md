## Context

動機は proposal.md の Why。振る舞いの契約は specs/task/spec.md。正本は openspec/specs/task/spec.md である。
いまの「タスクを登録」は `/` の右下に position: fixed である。詳細は担当者の select の下に、同じ名前の文字を出している。

## Goals

- 「タスクを登録」をナビゲーションへ戻すこと
- 詳細の担当者名を select だけにすること

## Non-Goals

- 一覧カードの担当者名、内容、期限、完了日、期限超過を変えること
- 新しい API パス、backend/、infra/
- screenshot テスト、e2e の 422
- AGENTS.md、README.md、アーカイブ済み change の本文
- git commit、git push、cdk deploy

## Decisions

### 1. 登録リンクはナビゲーションの中へ戻す

- 決定: 「メンバー」と「タスクを登録」を、`/` の同じ nav に置く。順は「メンバー」、その次が「タスクを登録」である。文言と href="/new" は変えない。position: fixed と、一覧下の padding-bottom: 5rem は外す
- 理由: 右下固定の前は、この 2 つがナビゲーションに並んでいた。余白は固定ボタンにカードが隠れないためのものなので、固定をやめると要らない
- 代替: 右下とナビゲーションの両方に置く → 導線が二つになる

### 2. 詳細の担当者名は select の選択だけにする

- 決定: ラベル「担当者」と select は残す。select の外の担当者名の文字は出さない。候補は存在するメンバーだけである。変更時の PATCH はそのままである
- 理由: 選択中の option が名前を出している。その下の文字は同じ名前の繰り返しである
- 代替: 文字だけ残して select を隠す → 担当者を変えられなくなる
