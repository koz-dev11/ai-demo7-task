## 1. バックエンド

- [x] 1.1 `backend/main.py` を FastAPI 単一ファイルで作り、依存は `fastapi`、`uvicorn`、`boto3`、`mangum` と、開発用の `pytest` に限る。`requirements.txt` と `requirements-dev.txt` を置く。確認: `template.yaml` が無く、CORS ミドルウェアが無く、PATCH が無い
- [x] 1.2 メンバーは `id`（UUID）、`name`、`createdAt` だけにする。タスクは `id`（UUID）、`title`、`assigneeId`、`done`、`createdAt` だけにする。JSON は camelCase。タスクに `name` は無い。`createdAt` はサーバ付与の UTC ISO8601 で、末尾は `Z`。保存する `name` と `title` は strip 後の値。確認: 作成応答のキーが仕様の項目だけである
- [x] 1.3 GET/POST `/api/members`、DELETE `/api/members/{id}`、GET/POST `/api/tasks`、GET/DELETE `/api/tasks/{id}` だけを実装する。作成の成功は 201、削除の成功は 204、存在しないタスク GET と存在しない DELETE は 404、空の一覧は 200 と空配列。確認: これ以外のパスと PATCH が無い
- [x] 1.4 `name` または `title` が省略、空、空白のみなら 422 とし、ストアを変えない。同名メンバーは許す。タスク作成モデルは `title` だけとし、送られた `assigneeId` と `done` は捨てる。保存する `done` は false。確認: `done` が true の POST でも保存値が false である
- [x] 1.5 割り当ては、未完了（`done` が false）が最も少ないメンバー。同数なら `createdAt` が古いメンバー。それも同じなら `id` の辞書順が先のメンバー。メンバー 0 人のタスク作成は 422 で、ストアを変えない。確認: 件数が違う 2 人と、同数で作成日時が違う 2 人で、選ばれる id が仕様どおりである
- [x] 1.6 そのメンバーを `assigneeId` に持つタスクが 1 件でもある DELETE は 422 とし、メンバーもタスクも残す。カスケードしない。担当タスクが無いメンバーの DELETE は 204。存在するタスクの DELETE は 204 で、他のタスクの `assigneeId` は変えない。確認: 422 の前後で件数が同じである
- [x] 1.7 一覧は Scan 結果を、`createdAt` 降順、同じなら `id` の辞書順が先、で並べる。`MEMBERS_TABLE` と `TASKS_TABLE` が両方未設定ならプロセス内メモリ。両方設定なら DynamoDB（テーブル名は環境変数の値、PK は `id`）。片方だけならモジュール読込時に例外で起動を失敗させる。Lambda 入口は `main.handler`（Mangum、`lifespan="off"`、`api_gateway_base_path` は付けない）。確認: 両方未設定のプロセスで作成した値が、同じプロセスの一覧に残る

## 2. バックエンドの pytest

- [x] 2.1 `backend/tests` にメモリモードの pytest を置く。Windows では `.\.venv\Scripts\python.exe` を直接指定する。確認: `cd backend` のあと `.\.venv\Scripts\python.exe -m pytest` が成功する
- [x] 2.2 次が pytest で通ること。作成 201、削除 204、不在の GET と DELETE が 404、空一覧が 200 の空配列、空の `name` と空の `title` が 422 でストア不変、同名メンバーが 2 人とも 201、タスク JSON に `name` が無い、POST の `assigneeId` と `done` を捨てて `done` が false、未完了が少ないメンバーへの割り当て、同数なら古い `createdAt`、それも同じなら `id` が先、メンバー 0 人のタスク作成が 422 でストア不変、担当タスクが残るメンバー削除が 422 でカスケードしない、タスク削除が他の `assigneeId` を変えない、一覧が `createdAt` 降順、片方だけ環境変数を渡した検査が起動失敗。確認: これらの失敗を e2e に移していない

## 3. フロントエンド

- [x] 3.1 `frontend/` を React + TypeScript + Vite で作る。ルートは `/`、`/new`、`/tasks/:id`、`/members` だけ。未知パスは「見つかりません。」。`/login` と `/members/:id` は足さない。ルート `package.json` はアプリにしない。直下で `npm init playwright@latest` を再実行しない。見本の `playwright.config.ts` と `tests/example.spec.ts` は消さない。npm / npx の前に `$env:NODE_OPTIONS="--use-system-ca"`。確認: ルートの見本ファイルが残っている
- [x] 3.2 `frontend/src/api.ts` だけが HTTP を呼ぶ。パスは一段目の API だけ。ページから `fetch` を直呼びしない。ローカルは `VITE_API_URL` なしの相対パス。Vite が `/api` を `http://127.0.0.1:8000` へプロキシする。確認: プロキシ設定が `127.0.0.1:8000` である
- [x] 3.3 `/` は担当者名、完了、作成日時を `createdAt` 降順で出す。完了の文言は「未完了」に固定する。保存値は false のままである。担当者名は `assigneeId` と GET `/api/members` を画面で結ぶ。カードで `/tasks/:id` へ進む。0 件は「タスクはまだありません。」。タスク登録への導線とは別に、`/members` への導線を置く。削除、メンバー絞り込み、担当者変更、完了切替は置かない。確認: 一覧の DOM に削除操作が無く、完了の文言が「未完了」であり、メンバー導線がタスク登録の導線と別である
- [x] 3.4 `/new` はタイトル必須。担当者を選ばせない。完了の入力は出さない。成功後は `/`。空のタイトルでは登録されないことが分かる。確認: 担当者の select が無い
- [x] 3.5 `/tasks/:id` はタイトル、担当者名、完了、作成日時を出す。完了の文言は「未完了」に固定する。削除は `window.confirm` のあとだけハード削除し、成功後は `/`。confirm を拒否するとタスクが残る。存在しない id は「見つかりません。」。担当者変更と完了切替は無い。確認: 詳細の完了の文言が「未完了」であり、完了を切り替える操作が無い
- [x] 3.6 `/members` は名前の登録、`createdAt` 降順の一覧、`window.confirm` 後の削除だけを出す。0 人は「メンバーはまだありません。」。名前が空、または空白だけのまま登録しようとしたときはメンバーを増やさず、名前が必須であることが分かるようにする。API の 422 とストア不変は変えない。詳細画面は無い。確認: 空と空白だけの送信で件数が増えず、名前が必須であることが分かり、`/members/:id` 用のルートが無い
- [x] 3.7 `frontend/.env.production` は `VITE_API_URL=` の空値で作り、実 URL は書かない。`.gitignore` にこのファイルを足す。確認: ファイル内に `http` で始まる URL が無い

## 4. 画面の合否

- [x] 4.1 `frontend/playwright.config.ts` と `frontend/e2e/` を新しく作る。ブラウザは Chromium だけ。`webServer` は両方のテーブル環境変数を外した uvicorn（`127.0.0.1:8000`）と Vite（`127.0.0.1:5173`）を起動し、既存サーバは再利用しない。ルートの `playwright.config.ts` と `tests/example.spec.ts` は合否に使わず、見本の設定は移さず、見本は消さない。Playwright MCP は合否にしない。確認: projects に Firefox と WebKit が無く、ルートの見本ファイルが残っている
- [x] 4.2 e2e で、メンバー登録、タスク登録、一覧の担当者名と作成日時、一覧と詳細の「未完了」、詳細、confirm 後の削除、confirm 拒否で残ること、一覧に削除が無いこと、絞り込みと担当者変更と完了切替が無いこと、未知パスの「見つかりません。」が通ること。`/` のメンバー導線から `/members` を開くこと。その導線はタスク登録への導線とは別であり、URL の直接入力だけを到達手段にしない。`/members` で名前が空、または空白だけのとき、メンバーが増えず、名前が必須であることが分かることを断言する。422 は e2e に足さない。サーバの 422 は pytest が正である。Playwright MCP は使わない。`tests/example.spec.ts` は実行しない。確認: 既存の 8000 と 5173 を止めたあと、`cd frontend` して `$env:NODE_OPTIONS="--use-system-ca"` のうえで `npx playwright test` が成功する

## 5. インフラ

- [x] 5.1 `infra/` に CDK（TypeScript）を置く。入口は `infra/bin/infra.ts`。スタッククラスは `AiDemo7ApiStack`。スタック名は `AiDemo7ApiStack`。`template.yaml` は作らない。確認: `infra/` 以外に SAM の雛形が無い
- [x] 5.2 Lambda は PythonFunction（`backend/`、`main.handler`、Timeout 15 秒）。HttpApi のステージは `$default`。URL に `/prod` を付けない。Lambda に繋ぐルートを `$default` にしない。ルートは GET/POST `/api/members`、DELETE `/api/members/{id}`、GET/POST `/api/tasks`、GET/DELETE `/api/tasks/{id}` だけ。OPTIONS は corsPreflight。許可オリジンは `*`。メソッドは GET、POST、DELETE、OPTIONS。Mangum に `api_gateway_base_path` は付けない。CORS は FastAPI に足さない。確認: 合成結果に PATCH ルートと Lambda の `$default` が無く、ステージが `$default` であり、Timeout が 15 秒である
- [x] 5.3 DynamoDB を 2 つ宣言する。名前は `${stackName}-members` と `${stackName}-tasks`。PK は `id`。環境変数は `MEMBERS_TABLE` と `TASKS_TABLE`。IAM ロールと CloudWatch Logs を宣言する。確認: テーブルが 2 つで、一覧用の GSI が無い
- [x] 5.4 フロント配信用の S3 と CloudFront（OAC。403 と 404 は `index.html`）を宣言する。`BucketDeployment` はしない。Output は `ApiUrl`、`FrontendUrl`、`FrontendBucketName`、`CloudFrontDistributionId` だけ。足してよい AWS は Lambda、API Gateway、DynamoDB、IAM ロール、CloudWatch Logs、S3、CloudFront だけ。確認: Cognito、VPC、RDS が無い
- [x] 5.5 `infra/bin/infra.ts` は、Docker が無い `cdk deploy` を例外で止める。`cdk synth` で Docker が無いときだけ bundling を無効化してよい。確認: `cd infra` のあと `$env:NODE_OPTIONS="--use-system-ca"` で `npx cdk synth` が成功し、Output が `ApiUrl`、`FrontendUrl`、`FrontendBucketName`、`CloudFrontDistributionId` だけであり、テーブルが `${stackName}-members` と `${stackName}-tasks` の 2 つで GSI が無く、S3 と CloudFront（OAC。403 と 404 は `index.html`）があり、`BucketDeployment` が無く、足した AWS が Lambda、API Gateway、DynamoDB、IAM ロール、CloudWatch Logs、S3、CloudFront だけである。`cdk deploy` は実行しない

## 6. この change で触らないもの

- [x] 6.1 メンバー絞り込み、担当者変更、完了切替、PATCH、二段目 `task-patch`、三段目 `member-filter` を実装していない。確認: 画面と API と CDK ルートにそれらが無い
- [x] 6.2 `cdk deploy`、git commit、git push、`AGENTS.md`、`README.md`、`docs/rules/project-rules-serena.md`、1本目から 6本目の編集をしていない。実 URL を書いていない。確認: それらの差分が無い
