# ai-demo7-task

認証なしの公開タスクボード。メンバーを登録し、タスクはサーバが自動で割り当てる。
個人情報・社外秘は入れない。

三段、見た目の `screen-layout`、`task-content`、`nav-and-assignee` まで実装済みである。企画は OpenSpec（schema: spec-driven、capability は `task`）。実装は確認済みの段だけ進める。

## 成功条件（`nav-and-assignee` まで）

- メンバーの登録・一覧・削除ができる
- タスクの登録・一覧・詳細・削除ができる
- 登録されたタスクの担当者はサーバが決める。クライアントの指定は採用しない
- 割り当て後に担当者を変更できる。変えるのはそのタスクだけである
- 完了を切り替えられる。完了済みも一覧に残る。完了にしたときだけ完了日が付き、未完了に戻すと消える
- 一覧をメンバーで絞れる。初期は全員で、1 人を選べる
- 内容は平文で、詳細に出る。期限は任意で、一覧に `YYYY-MM-DD` が出る。未完了で期限がローカルの今日より前のときだけ「期限超過」が出る
- 「タスクを登録」は一覧のナビゲーションにあり、「メンバー」の次で、`/new` へ進む
- 詳細の担当者名は、変更用の select の選択中だけに出る
- 再読み込み後も本番は DynamoDB に残る。ローカルは backend の生存中が確認対象である
- 画面の合否は `frontend/e2e/` の Playwright Test である。サーバの 422 と 404 は pytest が正である

## やらないこと

ログイン、Cognito、課金、検索箱、検索用 API、GSI、ソフト削除、カスケード削除、タスク一覧からの削除、タイトルの編集、Markdown 描画、画像、添付、リアルタイム同期、モバイルアプリ。
SAM の `template.yaml`、`BucketDeployment`。
1〜6本目のスタック・テーブル・バケット・API URL・`.env`・Cognito の共有。

## 構成

フロント: React ＋ TypeScript（ビルド成果を S3 + CloudFront）
API: Python on AWS Lambda（FastAPI、Mangum）
入口: API Gateway (HTTP API、ステージ `$default`)
データ: Amazon DynamoDB（メンバーとタスクの 2 テーブル。PK は `id`。一覧は Scan）
インフラ定義: CDK（TypeScript、`infra/`）。スタック名は `AiDemo7ApiStack`
企画: OpenSpec。画面の合否は Playwright Test。Playwright MCP は下書き

## 段

飛ばさない。前の段を apply してアーカイブしてから次を書く。

1. `baseline-board` — メンバーの登録・一覧・削除。タスクの登録・一覧・詳細・削除。登録時の自動割り当て。CDK はこの段で作る
2. `task-patch` — 担当者変更と完了チェック（`PATCH /api/tasks/{id}`）。他のタスクは再割り当てしない
3. `member-filter` — 一覧のメンバー絞り込み（GET 全件のフロント。API と `infra/` は触らない）
4. `task-content` — 内容 `body`、期限 `dueOn`、完了日 `completedAt`、期限超過、右下の「タスクを登録」。新しい API パスと `infra/` は触らない
5. `nav-and-assignee` — 「タスクを登録」をナビゲーションへ戻す。詳細の担当者名は select の選択中だけ。新しい API パスと `backend/` と `infra/` は触らない

## 画面

| パス | 内容 |
|------|------|
| `/` | タスク一覧。担当者名、完了、作成日時。`createdAt` 降順。カードで詳細へ。メンバー絞り込み（初期は全員、1 人を選べる。完了済みも残す）。期限があれば `YYYY-MM-DD`。完了日があればその文字。未完了で期限がローカルの今日より前なら「期限超過」。`body` の全文は出さない。削除は無い。「タスクを登録」はナビゲーションにあり、「メンバー」の次で、`/new` へ進む |
| `/tasks/:id` | 詳細。担当者は select の選択中だけ。内容と期限を編集できる。完了切替と完了日は文字だけ。削除は confirm 後のハード削除で `/` |
| `/members` | メンバーの登録と一覧（`createdAt` 降順）。削除は confirm 後。詳細画面は無い |
| その他 | 見つからない表示。`/login` は無い |

担当者名は、タスクの `assigneeId` と `GET /api/members` を画面で結んで出す。一覧カードには名前を出す。詳細では select の選択中だけに出す。タスク JSON に `name` は無い。

## API

| メソッド | パス | 段 |
|----------|------|----|
| GET / POST | `/api/members` | 一段目 |
| DELETE | `/api/members/{id}` | 一段目 |
| GET / POST | `/api/tasks` | 一段目 |
| GET / DELETE | `/api/tasks/{id}` | 一段目 |
| PATCH | `/api/tasks/{id}` | 二段目 |

これ以外のパスは作らない。絞り込み用 API は無い。`task-content` もパスは足していない。一覧は `createdAt` 降順である。

## 項目

JSON は camelCase。

- メンバー: `id`（UUID）、`name`、`createdAt`（サーバ付与、UTC ISO8601）
- タスク: `id`（UUID）、`title`、`assigneeId`、`done`（boolean）、`createdAt`（サーバ付与、UTC ISO8601）、`body`（平文。空を許す）、`dueOn`（`YYYY-MM-DD` または null）、`completedAt`（UTC ISO8601 または null。クライアントは決めない）

`name` と `title` は strip 後に空なら 422。同名メンバーは許す。
タスク POST の `assigneeId` は採用しない。保存する担当者はサーバが決める。
タスク POST の `done` と `completedAt` は採用しない。保存する `done` は false、`completedAt` は null である。送った `body` は strip して保存し、空文字を許す。送った `dueOn` が `YYYY-MM-DD` ならその日付、空文字か null なら null である。
割り当ては、未完了（`done` が false）のタスクが最も少ないメンバーである。同数なら `createdAt` が古いメンバーである。
メンバーが 0 人のタスク登録は 422 で、ストアを変えない。
そのメンバーを `assigneeId` に持つタスクが 1 件でもある DELETE は 422 である。カスケードしない。
PATCH は、送った `assigneeId`、`done`、`body`、`dueOn` だけを、そのタスクについて変える。他のタスクは再割り当てしない。`id` と `createdAt` と `title` と `completedAt` は不変である。4 つとも省略、空の `assigneeId`、存在しないメンバーへの変更、文字列でない `body`、形の違う `dueOn` は 422 である。`done` が false から true のときだけ `completedAt` が付く。true の再送は元の値を残し、false に戻すと null である。
絞り込みはメンバーの `id` で行う。初期は全員である。URL には載せない。完了済みも一覧に残す。

## 保存先

- ローカル: `MEMBERS_TABLE` と `TASKS_TABLE` が両方未設定ならプロセス内メモリ。片方だけ設定されているときは起動を失敗させる
- 本番: DynamoDB。テーブル名は `${stackName}-members` と `${stackName}-tasks`。PK は `id`。一覧は Scan

## インフラ

スタック名は `AiDemo7ApiStack`。設計図は `infra/` の CDK（TypeScript）だけである。SAM の `template.yaml` は置かない。
Output は `ApiUrl` / `FrontendUrl` / `FrontendBucketName` / `CloudFrontDistributionId`。
`cdk deploy` は別依頼である。デプロイ前の URL は書かない。デプロイ後の実 URL は README の「URL」に書いてよい。`frontend/.env.production` は commit しない。

足してよい AWS は Lambda、API Gateway、DynamoDB、IAM、CloudWatch Logs、S3、CloudFront だけである。

## ローカル起動（一段目の実装後）

1. backend（メモリモード。先に 8000 で起動する）。Windows では venv の `Activate.ps1` を使わず Python を直接指定する。

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

2. frontend。npm / npx の前に `NODE_OPTIONS=--use-system-ca`。ローカルは `VITE_API_URL` なしで相対パス。Vite が `/api` を `http://127.0.0.1:8000` へプロキシする。

```powershell
cd frontend
$env:NODE_OPTIONS="--use-system-ca"
npm install
npm run dev
```

## 合否（一段目の実装後）

既存の 8000 / 5173 を止めてから:

```powershell
cd frontend
$env:NODE_OPTIONS="--use-system-ca"
npx playwright test
```

バックエンド単体はメモリモードの pytest:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

## URL

- 画面: https://ddll2lik7dg4j.cloudfront.net
- API: https://4yydj54vxe.execute-api.ap-northeast-1.amazonaws.com

## 進捗

`baseline-board`、`task-patch`、`member-filter`、`screen-layout`、`task-content`、`nav-and-assignee` を実装済みでアーカイブ済み。正本は `openspec/specs/task/spec.md`。コミットはまだ。`cdk deploy` は済み。