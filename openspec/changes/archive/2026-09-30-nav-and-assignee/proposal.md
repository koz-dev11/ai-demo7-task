## Why

一覧の「タスクを登録」は画面右下に固定されている。詳細では、担当者の select の下に同じ名前がもう一度出る。前者はナビゲーションへ戻し、後者は select だけにする。

## What Changes

- `/` の「タスクを登録」をナビゲーションの中へ戻す。文言と `/new` は変えない。「メンバー」も同じナビゲーションに残す。右下固定にはしない。固定のための一覧下の余白は置かない
- `/tasks/:id` の担当者名は、select の選択中の表示だけにする。select の外に同じ名前を出さない。担当者の変更は残す
- 一覧カードの担当者名、内容、期限、完了日、期限超過は変えない
- 新しい API パスは無い。`infra/` は編集しない

## Capabilities

### New Capabilities

- （なし。capability `task` は正本 `openspec/specs/task/spec.md` にある）

### Modified Capabilities

- `task`: 一覧の登録リンクの位置と、詳細の担当者名の出し方を更新する

## Impact

- 企画成果物: `openspec/changes/nav-and-assignee/` の proposal / specs / design / tasks。確認後の apply で `frontend/` の `/` と `/tasks/:id` と `frontend/e2e/` だけを変える
- `backend/` と `infra/` は編集しない
- `AGENTS.md`、`README.md`、`docs/rules/project-rules-serena.md`、アーカイブ済み change の本文は編集しない
