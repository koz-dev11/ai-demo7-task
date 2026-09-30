## 1. 画面

- [x] 1.1 `/` の「タスクを登録」をナビゲーションへ戻す。文言と `/new` は変えない。「メンバー」も残し、その次に置く。右下固定と、一覧下の固定用の余白を外す。確認: リンクはナビゲーションの中にあり、右下には固定されていない
- [x] 1.2 詳細の担当者は select だけにする。select の外に同じ名前を出さない。ラベル「担当者」は select の上のままである。担当者変更、完了の checkbox、削除の confirm は残す。確認: 名前は select の選択中にだけ出る

## 2. 画面の合否

- [x] 2.1 `frontend/e2e/` の既存の Playwright Test を、ナビゲーション内の「タスクを登録」と、詳細の担当者が select の選択だけであることに合わせる。screenshot テストは足さない。e2e に 422 を足さない。ブラウザは Chromium だけである。確認: 既存の 8000 と 5173 を止めたあと、`cd frontend` して `$env:NODE_OPTIONS="--use-system-ca"` のうえで `npx playwright test` が成功する

## 3. この change で触らないもの

- [x] 3.1 `backend/` と `infra/` を編集していない。新しい API パスは無い
- [x] 3.2 `AGENTS.md`、`README.md`、`docs/rules/project-rules-serena.md`、アーカイブ済み change の本文を編集していない。git commit、git push、cdk deploy はしていない
