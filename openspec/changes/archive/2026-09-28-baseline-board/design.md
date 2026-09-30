## Context

動機は `proposal.md` の Why。振る舞いの契約は `specs/task/spec.md`。

コードはまだ無い。この change の apply で一段目の足場を新しく作る。使ってよい型は、ディレクトリ分割、FastAPI 単一ファイル、メモリ / DynamoDB 分岐、Vite プロキシ、HttpApi のステージ `$default`、CORS を FastAPI に足さない、Playwright Test が合否、CDK の S3 + CloudFront（OAC、403/404 を `index.html`）である。wiki の `wiki-login` 以降（Cognito・ログイン画面・JWT）は手本にしない。掲示板の画面、API、NGワード、今日のひとこと、表示名の割当は写さない。

フロントは React + TypeScript + Vite。API は FastAPI 単一ファイル `backend/main.py` を Mangum で Lambda 化する。インフラは `infra/` の CDK（TypeScript）。スタック名は `AiDemo7ApiStack`。SAM の `template.yaml` は作らない。本番デプロイはこの change では行わない。ローカル確認は、両方のテーブル環境変数が未設定のメモリ上で、backend が生きているあいだが対象である。

リポジトリ直下の `playwright.config.ts` と `tests/example.spec.ts` は初期化の見本である。Firefox と WebKit を含む。合否に使わない。見本の設定を `frontend/` へ移さない。見本は消さない。Playwright MCP は下書きである。

## Goals

- メンバーの登録・一覧・削除と、タスクの登録・一覧・詳細・削除が、4 画面と一段目の API だけで通ること
- 層は画面 → `frontend/src/api.ts` → 一段目の API → store に固定すること
- タスクの `assigneeId` をサーバが登録時に決め、クライアントの `assigneeId` と `done` を捨てること
- `MEMBERS_TABLE` と `TASKS_TABLE` が両方未設定のときだけメモリ、両方設定のとき DynamoDB、片方だけは起動失敗にすること
- CORS は本番 API Gateway、ローカルは Vite の `/api` プロキシにすること
- CDK が 2 テーブルとフロント配信（S3 + CloudFront）を宣言し、HttpApi のルートが一段目のメソッドだけであること
- `/` から、タスク登録とは別の導線で `/members` を開けること。完了の表示は「未完了」に固定し、保存値は false のままにすること
- `/members` の空、または空白だけの名前は画面で増えず、名前が必須であることが分かること。API の 422 とストア不変は変えないこと
- 画面の合否は `frontend/e2e/` の Playwright Test で、ブラウザは Chromium だけであること。サーバの 422 は backend の pytest が正であること

## Non-Goals

- メンバー絞り込み、担当者変更、完了切替、PATCH `/api/tasks/{id}`
- 二段目 `task-patch` と三段目 `member-filter` の画面、API、CDK ルート
- ログイン、自己サインアップ、Cognito、JWT、`authorId`、ユーザー識別情報
- タスク本文、タイトルの編集、Markdown 描画、画像、添付、検索箱、検索用 API、タグ、ページング、GSI
- カスケード削除、タスク一覧からの削除、他タスクの再割り当て
- SAM の `template.yaml`、Serverless MCP、`BucketDeployment`、FastAPI への CORS 追加
- `cdk deploy`、git commit、git push
- `AGENTS.md`、`README.md`、`docs/rules/project-rules-serena.md` の編集
- 1本目から 6本目の編集、およびそれらのスタック・テーブル・バケット・API URL・`.env`・Cognito の共有
- 実 URL を成果物、メモリ、`.env.production` に書くこと
- ルートの Playwright 見本を合否にすること、見本の設定を `frontend/` へ移すこと、Playwright MCP を合否にすること
- サーバの 422 を e2e の正にすること
- VPC、ECS、RDS、Secrets Manager、SES、WAF、OpenSearch、新しい AWS アカウント、添付用バケット

## Decisions

### 1. FastAPI は単一ファイルである

- 決定: HTTP と検証は `backend/main.py` のルート、永続化は `_…_store`。Lambda 入口は `main.handler`（Mangum、`lifespan="off"`）。`api_gateway_base_path` は付けない。公開ルートはメンバーの一覧・作成・削除と、タスクの一覧・作成・詳細・削除だけである。Pydantic の作成モデルは `name` だけのメンバーと、`title` だけのタスクである。`assigneeId` と `done` はモデルに入れない。余分な項目は拒否せず捨てる。FastAPI に CORS ミドルウェアを足さない
- 理由: 一段目の規模では単一ファイルで足りる。クライアントの担当者と完了を「採用しない」は、422 でリクエスト全体を拒否することではない
- 代替: 余分な項目を 422 にする → クライアントが `assigneeId` を送った作成まで失敗し、契約の「捨てて 201」と衝突する。パッケージ分割 → この段では過剰である

### 2. 保存先は 2 つの環境変数で切替える

- 決定: `MEMBERS_TABLE` と `TASKS_TABLE` が両方未設定ならプロセス内メモリ。両方が設定されているなら DynamoDB。テーブル名は `${stackName}-members` と `${stackName}-tasks`。PK は `id`。一覧は Scan し、アプリ側で `createdAt` 降順、同じなら `id` の辞書順が先になるよう並べる。片方だけ設定されているときは、モジュール読込時の検査が例外を送出し、リクエストを受け付けない。`AWS_SAM_LOCAL` は見ない
- 理由: ローカルはテーブルなしで動かす。件数は少ない前提なので Scan で足りる。片方だけでは、メモリと DynamoDB が混ざる
- 代替: ローカルも DynamoDB Local、一覧を GSI の Query → この段の範囲を超える

### 3. 割り当ては登録時だけである

- 決定: 未完了（`done` が false）の件数が最も少ないメンバーを選ぶ。同数なら `createdAt` が古いメンバー。`createdAt` も同じなら `id` の辞書順が先のメンバー。同じ規則を、一覧で `createdAt` が同じときの前後にも使う。`id` は UUID 文字列。`createdAt` は UTC の ISO8601 で、末尾は `Z` に正規化する。保存する `name` と `title` は strip 後の値である。一段目の `done` は常に false である。削除は対象の 1 件だけを消し、他のタスクの `assigneeId` は変えない
- 理由: `createdAt` が同値のときの前後を決めないと、pytest の期待が揺れる。仕様の「同数なら古いメンバー」には、同値の次の鍵が無い
- 代替: 同値のときは不定 → テストが不安定になる。ランダムな担当者 → 契約に反する

### 4. 画面は API クライアント経由である

- 決定: ルートは `/`、`/new`、`/tasks/:id`、`/members` だけである。`/` にはタスク登録への導線とは別に、`/members` へ進む導線を置く。URL の直接入力だけを到達手段にしない。未知パスは「見つかりません。」と出す。タスク 0 件は「タスクはまだありません。」、メンバー 0 人は「メンバーはまだありません。」と出す。一覧と詳細の完了の文言は「未完了」である。保存値は false のままであり、切り替えは出さない。`/members` で名前が空、または空白だけのまま登録しようとしたときはメンバーを増やさず、名前が必須であることが分かるようにする。API の 422 とストア不変は変えない。削除の confirm は `window.confirm` である。担当者名は、タスクの `assigneeId` と GET `/api/members` を画面で結ぶ。ページから `fetch` を直呼びしない。ローカルは `VITE_API_URL` なしの相対パス。Vite が `/api` を `http://127.0.0.1:8000` へプロキシする。文言は日本語である
- 理由: メンバー画面へは一覧から進める。完了の文言を「未完了」に固定しないと、e2e が保存値 false と表示を別々に読めない。空の名前は、空のタイトルと同じく画面で必須だと分かる必要がある。空一覧と不明の文面は、仕様が「分かること」までにしているため、この段の決定で固定する
- 代替: 文言を実装者に任せる → 合否の文章がぶれる。メンバー画面を URL 直打ちだけにする → 一覧から辿れない

### 5. HttpApi と Mangum とローカルプロキシを揃える

- 決定: HttpApi のステージは `$default` である。URL に `/prod` を付けない。Lambda に繋ぐルートを `$default` にしてはならない。Lambda ルートは GET/POST `/api/members`、DELETE `/api/members/{id}`、GET/POST `/api/tasks`、GET/DELETE `/api/tasks/{id}` だけである。OPTIONS は API Gateway の corsPreflight に残す。本番 CORS の許可オリジンは `*`、メソッドは GET、POST、DELETE、OPTIONS である。Lambda Timeout は 15 秒である。Output `ApiUrl` は末尾スラッシュなしである。ローカルの画面は相対 `/api` なので、プロキシ先も同じパスである
- 理由: ベースパスがずれると、ブラウザから API に届かない。一段目に PATCH は無い。この決定の必須事項は `specs/task/spec.md` の HttpApi の Requirement と同じである
- 代替: Lambda の `$default` ルート、Mangum の `api_gateway_base_path` → 契約で禁止である

### 6. CDK の範囲は一段目の宣言だけである

- 決定: 置き場は `infra/`。入口は `infra/bin/infra.ts`。スタックのクラスは `infra/lib/ai-demo7-api-stack.ts` の `AiDemo7ApiStack`。スタック名は `AiDemo7ApiStack`。Lambda は PythonFunction（`backend/`、`main.handler`）。DynamoDB が 2 テーブル、IAM ロール、CloudWatch Logs、S3、CloudFront（OAC。403 と 404 は `index.html`）を宣言する。`BucketDeployment` はしない。Output は `ApiUrl`、`FrontendUrl`、`FrontendBucketName`、`CloudFrontDistributionId` だけである。`infra/bin/infra.ts` は、Docker が無い `cdk deploy` を例外で止める。`cdk synth` で Docker が無いときだけ bundling を無効化してよい。足してよい AWS は Lambda、API Gateway、DynamoDB、IAM ロール、CloudWatch Logs、S3、CloudFront だけである
- 理由: フロントのアップロードはデプロイ依頼のあとである。Docker 無しの bundling 無効のままデプロイすると、Lambda の中身が本番とずれる。この決定の必須事項は `specs/task/spec.md` の CDK と配信の Requirement と同じである
- 代替: SAM の `template.yaml`、`BucketDeployment` → 契約で作らない

### 7. 合否の置き場を分ける

- 決定: 画面の合否は `frontend/playwright.config.ts` と `frontend/e2e/` である。プロジェクトは Chromium だけである。`webServer` は、両方のテーブル環境変数を外した uvicorn（`127.0.0.1:8000`）と、Vite（`127.0.0.1:5173`）を起動する。既存サーバは再利用しない。サーバの 422（空の `name`、空の `title`、メンバー 0 人のタスク作成、担当タスクが残るメンバー削除）は `backend/tests` の pytest が正である。e2e には 422 を足さない。ルート直下の見本は実行しない。Playwright MCP は下書きであり、合否の記録に使わない
- 理由: 見本は Firefox と WebKit を含み、このアプリの画面を起動しない。422 は API の契約であり、画面操作の偶然に依存させない。この決定の必須事項は `specs/task/spec.md` の合否の Requirement と同じである
- 代替: ルートの設定を `frontend/` へ移す → 見本のブラウザ構成と `tests/example.spec.ts` が合否に混ざる

## Risks / Trade-offs

- [未ログインの公開 API をデプロイすると誰でも書き換わる] → この change では `cdk deploy` をしない。依頼があっても、その依頼の中で先に確認する
- [一覧が Scan である] → 一段目の件数では足りる。GSI とページングは足さない
- [`createdAt` が同値のときの `id` 順は、仕様の「古いメンバー」に次の鍵として足した] → 決定 3 のとおり実装し、pytest で固定する
- [空一覧と不明の文言は仕様が「分かること」までにしている] → 決定 4 の文面を e2e が断言する。「未完了」、メンバー導線、空の名前の画面契約は仕様にある。文言を変えるときは仕様とこの決定を先に直す
- [DynamoDB 分岐を pytest から叩かない] → 形はメモリと同じ関数に寄せる。本番テーブルはテストから触らない
- [ルートの `npx playwright test` は見本を実行する] → 合否のコマンドは `frontend/` で実行する、と tasks に書く。見本ファイルは実行しない
