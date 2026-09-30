# Serena Project Rules — ai-demo7-task

この文書は、Serena MCP を使って **Spec / Plan / Build** を行うときのプロジェクト固有ルールである。
人間が管理する `AGENTS.md` と矛盾する場合は **`AGENTS.md` を優先**する。本ファイル自体の変更は、人間の明示依頼があるときだけ行う。

Serena は `--context ide` で動く前提とする。このコンテキストでは `list_dir` / `read_file` は使わない。ファイル一覧と非コードファイルの全文は Cursor の読み取りで代替し、コード探索は `search_for_pattern` と、Language Server が使えるときの記号ツールにする。pytest、npm、uvicorn、`cdk synth`、playwright は Cursor のターミナルで実行する。

企画は OpenSpec（schema: `spec-driven`）。capability は `task`。spec-first。proposal / specs / design / tasks を書いて確認を待ち、そのあと実装する。OpenSpec の節見出しは CLI 英語（Why / What Changes / ADDED Requirements / MODIFIED Requirements / Context / Goals / Non-Goals / Decisions）。本文とシナリオのキーワードは日本語（必須である / してはならない / とき / ならば / かつ）。本文に MUST / WHEN は使わない。英語で本文を書いて和訳しない。

現行の正本は、その段の apply 前は change の `specs/task/spec.md`、apply 後は `openspec/specs/task/spec.md` である。

Spec / Plan / Build と OpenSpec の対応:

| フェーズ | 目的 | OpenSpec 成果物 | コード |
|----------|------|-----------------|--------|
| Spec | 何を作るか / 何を変えるか | `proposal.md`、`specs/task/spec.md` | 触らない |
| Plan | 既存構造への載せ方 | `design.md`、`tasks.md` | 触らない |
| Build | 承認済み tasks の実装 | アプリコードと tasks のチェック | 「現在の範囲」だけ |

`/opsx-propose` は Spec と Plan を一度に揃えてよい。揃えたあとは確認を待ち、同じ応答で Build（`/opsx-apply`）を始めない。実装してよいのは「現在の範囲」だけである。後の段は proposal の確認があるまで実装しない。段を飛ばさない。前の段を apply してアーカイブしてから次の change を書く。アーカイブ後の change 本文は書き換えない。段が apply されたら、人間が `AGENTS.md` の「現在の範囲」をその段まで更新する。エージェントは `AGENTS.md` を書き換えない。

画面の合否は `frontend/e2e/` の Playwright Test である。Playwright MCP は下書きである。サーバの 422 は pytest が正である。

---

## 1. プロジェクト概要と技術スタック

### 概要

認証なしの公開タスクボード。メンバーを登録し、タスクはサーバが自動で割り当てる。capability は `task`。個人情報・社外秘は入れない。

- リポジトリ名は `ai-demo7-task`。設計図は `infra/` の CDK（TypeScript）。スタック名は `AiDemo7ApiStack`
- **現在の範囲は未実装**である。`frontend/` / `backend/` / `infra/` / `openspec/` はまだ無い。どの段も apply 前である。実装してよいコードは無い
- **次に書いてよいのは一段目 `baseline-board` の企画だけ**である。proposal / specs / design / tasks を書いて確認を待つ。確認の前にコードを書いてはならない
- 計画済みの最終段は三段目 `member-filter` までである。画面は `/` `/new` `/tasks/:id` `/members`。`/login` と `/members/:id` は無い。API は一段目のパスに二段目の PATCH `/api/tasks/{id}` を足したものだけである。絞り込み用 API は無い。認証なし。誰でも読み書き・削除できる
- 1本目から 6本目（`ai-demo1-checklist` / `ai-demo2-recipes` / `ai-demo3-CDK` / `ai-demo4-words` / `ai-demo5-wiki` / `ai-demo6-BBS`）は読み取り専用。編集しない。スタック・テーブル・バケット・API URL・`.env`・Cognito を共有しない
- 5本目 wiki の参考は三段目（`page-tree`）までである。`wiki-login` 以降（Cognito・ログイン画面・JWT オーソライザー）は実装の手本にしない

### 現在の範囲（未実装）

実装してよいコードは無い。次に書いてよいのは一段目 `baseline-board` の proposal / specs / design / tasks だけである。確認の前にコードを書いてはならない。二段目 `task-patch` と三段目 `member-filter` は、前の段を apply してアーカイブし、その段の proposal を確認するまで実装しない。

段の順（飛ばさない。前の段を apply してアーカイブしてから次の change を書く。本文はアーカイブ後に書き換えない。順: `baseline-board` → `task-patch` → `member-filter`）:

1. `baseline-board` — メンバーの登録・一覧・削除。タスクの登録・一覧・詳細・削除。登録時の自動割り当て。画面は `/` `/new` `/tasks/:id` `/members` だけ。`/login` と `/members/:id` は無い。API は GET/POST `/api/members`、DELETE `/api/members/{id}`、GET/POST `/api/tasks`、GET/DELETE `/api/tasks/{id}` だけ。PATCH は無い。メンバー項目は `id`, `name`, `createdAt`。`name` は strip 後に空なら 422。同名は許す。`createdAt` はサーバ付与の UTC ISO8601。タスク項目は `id`, `title`, `assigneeId`, `done`, `createdAt`。`createdAt` はサーバ付与の UTC ISO8601。タスク JSON に `name` は無い。一覧は `createdAt` 降順。担当者名は `assigneeId` と GET `/api/members` を画面で結ぶ。`title` は strip 後に空なら 422。`assigneeId` はサーバが登録時に割り当てる。クライアント指定を採用してはならない。クライアントの `done` は採用してはならない。一段目の保存値は false。完了の切り替えはしない。割り当ては、未完了タスクが最も少ないメンバー。同数なら `createdAt` が古いメンバー。メンバーが 0 人のタスク登録は 422。ストアを変えない。そのメンバーを担当者にするタスクが残っている DELETE は 422。カスケードしない。タスクの削除は `/tasks/:id` の confirm 後のハード削除。`/` に削除は置かない。メンバーの削除は `/members` の confirm 後のハード削除。メンバーの詳細画面は無い。メンバー絞り込みはしない。ローカルは、`MEMBERS_TABLE` と `TASKS_TABLE` が両方未設定のときメモリ。片方だけ設定されているときは起動を失敗させる。本番は DynamoDB（各テーブル PK `id`、一覧は Scan）。設計図はこの段で `infra/` の CDK として作る。スタック名は `AiDemo7ApiStack`。認証なし。ログイン・担当者変更・完了切替・メンバー絞り込みをこの段で足してはならない
2. `task-patch` — `PATCH /api/tasks/{id}` を足す。送った `assigneeId` と `done` だけを、そのタスクについて変える。他のタスクは再割り当てしない。`id` と `createdAt` と `title` は不変。両方省略、空の `assigneeId`、存在しないメンバーへの変更は 422。詳細画面で担当者を変更でき、完了を切り替えられる。完了済みも一覧に残す。画面ルートは増やさない。絞り込み用 API は足さない。CDK に足してよいのは、同じ HttpApi への PATCH ルートだけ。新しい AWS サービスは足さない
3. `member-filter` — 一覧をメンバーで絞れる。初期は全員。選択はメンバーの `id`。既存 GET `/api/tasks` 全件のフロント処理。完了済みも一覧に残す。URL に絞り込みを載せない。新しい API は無い。`infra/` は触らない

### 三段目までの範囲（`member-filter` まで）

計画済みの最終段の姿である。今の実装範囲ではない。

- 画面は `/` `/new` `/tasks/:id` `/members`。`/login` と `/members/:id` は無い
- API は一段目のパスに PATCH `/api/tasks/{id}` を足したものだけである
- 認証なし。誰でも読み書き・削除できる
- 一覧は `createdAt` 降順。メンバー絞り込みは GET 全件のフロント処理。初期は全員。完了済みも残す
- 担当者名は画面が `assigneeId` と GET `/api/members` を結ぶ。タスク JSON に `name` は無い

### 現状の実体

アプリ本体・CDK・OpenSpec はまだ無い。Serena onboarding は未実施である。実施済みと扱わない。このルールを置いた作業では実行しない。人間の明示があるまで実行しない。`.serena/` は commit しない。`project.yml` と memories は、onboarding を人間が依頼したあとでローカルにできる。このルールとメモリに本番 URL は書かない。

| 入力 | 現状 |
|------|------|
| `AGENTS.md` | 契約の正。人間管理。現在の範囲は未実装。エージェントは書き換えない |
| `README.md` | 三段目までの成功条件・起動手順・やらないこと。実 URL はまだ無い。デプロイ前の URL は書かない |
| `docs/rules/project-rules-serena.md` | 本ルール。矛盾したら `AGENTS.md` |
| `openspec/` | 無い。change はまだ無い |
| `frontend/` / `backend/` / `infra/` | 無い |
| `.serena/project.yml` | 無い。onboarding は未実施。`language_servers` は空のままでよい |

技術の正は `AGENTS.md` と `README.md` である。バージョンピンは、コードができたあとの実ファイルが正である。

### 技術スタック（契約）

| 層 | 実体 | 根拠 |
|----|------|------|
| フロント | TypeScript ＋ React ＋ Vite。画面が FastAPI を HTTP で呼ぶ。ビルド成果は S3 + CloudFront | `AGENTS.md` / `README.md` |
| API | Python ＋ FastAPI。ローカル uvicorn。Lambda は Mangum（`main.handler`、`lifespan="off"`） | `AGENTS.md` |
| 入口 | API Gateway（HTTP API、ステージ `$default`）。URL に `/prod` を付けない。Mangum に `api_gateway_base_path` は付けない。Lambda に繋ぐルートは `$default` にしてはならない。OPTIONS は API Gateway の corsPreflight。Lambda Timeout は 15 秒 | `AGENTS.md` |
| データ | ローカルは `MEMBERS_TABLE` と `TASKS_TABLE` が両方未設定のときプロセス内メモリ。片方だけ設定されているときは起動を失敗させる。本番は DynamoDB。テーブル名は `${stackName}-members` と `${stackName}-tasks`。PK は `id`。一覧は Scan | `AGENTS.md` / `README.md` |
| インフラ | `infra/` の CDK（TypeScript）だけ。スタック名 `AiDemo7ApiStack`。一段目で作る。三段目では触らない | `AGENTS.md` / `README.md` |
| 合否 | 画面は `frontend/e2e/` の Playwright Test。Playwright MCP は下書き。サーバの 422 は pytest が正 | `AGENTS.md` / `README.md` |
| 使わない | SAM の `template.yaml`、Serverless MCP、`BucketDeployment`、VPC、ECS、RDS、Secrets Manager、SES、WAF、新しい AWS アカウント、OpenSearch、Cognito、添付用バケット | `AGENTS.md` |

足してよい AWS は Lambda、API Gateway、DynamoDB、IAM ロール、CloudWatch Logs、S3、CloudFront だけである。

CORS は FastAPI に足さない（本番は API Gateway、ローカルは Vite プロキシ）。本番 CORS の許可オリジンは `*` でよい。

CDK Output は `ApiUrl` / `FrontendUrl` / `FrontendBucketName` / `CloudFrontDistributionId` である。`BucketDeployment` はしない。

`infra/bin/infra.ts` は、Docker が無い `cdk deploy` を例外で止める。`cdk synth` で Docker が無いときだけ bundling を無効化してよい。

### 本番 URL

実 URL は CDK Output と `frontend/.env.production` である。本ルール、OpenSpec、Serena メモリには URL を書かない。デプロイ前の URL は書かない。デプロイ後の実 URL は README の「URL」に書いてよい。commit に `.env.production` を混ぜない。1本目から 6本目の URL は使わない。

`cdk deploy`、git commit、git push は依頼があるまでしない。

---

## 2. ディレクトリ構成と責務境界

現状のルート（Cursor の読み取りで確認する。`list_dir` は使わない）:

    ai-demo7-task/
      AGENTS.md
      README.md
      .gitignore                 # .serena/ を commit しない
      .cursor/mcp.json           # serena_ai-demo7-task だけ
      docs/rules/project-rules-serena.md

まだ無いもの: `frontend/`、`backend/`、`infra/`、`openspec/`、`.serena/`。`.serena/` はこの作業では作らない。`project.yml` と memories は、人間が onboarding を依頼したあとでローカルにできる。

一段目の実装が確認されたあとの置き場（今は作らない）:

    frontend/                   # React + TypeScript + Vite。画面の合否は frontend/e2e/
    backend/                    # FastAPI。ローカルは uvicorn。テストはメモリモードの pytest
    infra/                      # CDK（TypeScript）。スタック名 AiDemo7ApiStack
    openspec/
      specs/task/spec.md        # apply 後の正本
      changes/                  # apply 前の正本はここの specs/task/spec.md
      changes/archive/          # apply 済み。書き換えない

### 責務境界

表は計画済み最終段（`member-filter`）までの契約である。今書いてよいのは一段目 `baseline-board` の企画文書だけである。Build は「現在の範囲」だけであり、現在の範囲ではコードを書かない。

| 場所 | やってよいこと | やってはいけないこと |
|------|----------------|----------------------|
| `frontend/` の画面 | タスク一覧・登録・詳細、メンバーの登録と一覧と削除。担当者名は `assigneeId` と GET `/api/members` を結ぶ。三段目の絞り込みは GET 全件のフロント。初期は全員 | タスク一覧からの削除、`/login`、`/members/:id`、絞り込み用 API、URL への絞り込み、担当者を選ばせる登録 |
| `frontend/e2e/` | Playwright Test。画面の合否 | Playwright MCP を合否にする、サーバの 422 を e2e の正にする |
| `backend/` | 契約どおりの HTTP。422 は pytest が正。メモリと DynamoDB | FastAPI への CORS、SAM、クライアントの `assigneeId` 採用、一段目でのクライアント `done` の採用、カスケード削除、他タスクの再割り当て |
| `infra/` | 一段目で CDK を作る。二段目は同じ HttpApi への PATCH ルートだけ | `template.yaml`、`BucketDeployment`、三段目での変更、新しい AWS サービス |
| `README.md` | 成功条件・起動手順・やらないこと。デプロイ後の実 URL は「URL」に書いてよい | デプロイ前の URL。`AGENTS.md` の代わりの正本にすること |
| `openspec/specs/task/spec.md` | apply 後の正本 | ユーザー明示なしに編集しない |
| `openspec/changes/archive/**` | 歴史 | 本文を書き換えない |

フロントと API は別オリジンになり得る。ローカルは Vite プロキシで CORS を使わない。本番 CORS は API Gateway。FastAPI に CORS ミドルウェアを足さない。ローカルは `VITE_API_URL` なしで相対パス。Vite が `/api` を `http://127.0.0.1:8000` へプロキシする。

---

## 3. 命名規約・レイヤリング・既存設計の前提

コードはまだ無い。命名の正は `AGENTS.md` と `README.md` の契約である。実装時のファイル名や関数名は、一段目の design が確認されてから、その design に書く。

### 画面と API 契約（計画済み最終段まで）

| 画面パス | 内容 | 段 |
|----------|------|----|
| `/` | タスク一覧。担当者名、完了、作成日時。`createdAt` 降順。カードで詳細へ。三段目でメンバー絞り込み（初期は全員、1 人を選べる。完了済みも残す）。削除は無い | 一段目。絞り込みは三段目 |
| `/new` | タスク登録。タイトル必須。担当者は選ばせない。成功後は `/` | 一段目 |
| `/tasks/:id` | 詳細。二段目で担当者変更と完了切替。削除は confirm 後のハード削除で `/` | 一段目。変更と完了は二段目 |
| `/members` | メンバーの登録と一覧（`createdAt` 降順）。削除は confirm 後。詳細画面は無い | 一段目 |
| その他 | 見つからない表示。`/login` は無い | 一段目 |

| メソッド | パス | 段 |
|----------|------|----|
| GET / POST | `/api/members` | 一段目 |
| DELETE | `/api/members/{id}` | 一段目 |
| GET / POST | `/api/tasks` | 一段目 |
| GET / DELETE | `/api/tasks/{id}` | 一段目 |
| PATCH | `/api/tasks/{id}` | 二段目 |

これ以外のパスは作らない。絞り込み用 API は無い。一覧は `createdAt` 降順である。

### 項目（JSON は camelCase）

- メンバー: `id`（UUID）、`name`、`createdAt`（サーバ付与、UTC ISO8601）
- タスク: `id`（UUID）、`title`、`assigneeId`、`done`（boolean）、`createdAt`（サーバ付与、UTC ISO8601）

タスク JSON に `name` は無い。担当者名は画面が `assigneeId` と GET `/api/members` を結ぶ。

### 検証（契約）

- `name` と `title` は strip 後に空なら 422。同名メンバーは許す
- タスク POST の `assigneeId` は採用しない。保存する担当者はサーバが決める
- 一段目のタスク POST の `done` は採用しない。保存する値は false である
- 割り当ては、未完了（`done` が false）のタスクが最も少ないメンバーである。同数なら `createdAt` が古いメンバーである
- メンバーが 0 人のタスク登録は 422 で、ストアを変えない
- そのメンバーを `assigneeId` に持つタスクが 1 件でもある DELETE は 422 である。カスケードしない
- 二段目の PATCH は、送った `assigneeId` と `done` だけを、そのタスクについて変える。他のタスクは再割り当てしない。`id` と `createdAt` と `title` は不変である。両方省略、空の `assigneeId`、存在しないメンバーへの変更は 422 である
- 三段目の絞り込みはメンバーの `id` で行う。初期は全員である。URL には載せない。完了済みも一覧に残す

### 保存とインフラの名前

- 環境変数は `MEMBERS_TABLE` と `TASKS_TABLE`。両方が未設定のときだけメモリ。片方だけなら起動を失敗させる
- テーブル名は `${stackName}-members` と `${stackName}-tasks`。PK は `id`。一覧は Scan
- スタック名は `AiDemo7ApiStack`
- CDK Output は `ApiUrl` / `FrontendUrl` / `FrontendBucketName` / `CloudFrontDistributionId`

### 守る前提

- 認証なし。ログイン・自己サインアップ・Cognito・JWT・`authorId` はどの段のあとでも足さない
- ローカルは backend を先に 8000 で起動する。Windows では venv の `Activate.ps1` を使わず `.\.venv\Scripts\python.exe` を直接指定する
- npm / npx の前に `$env:NODE_OPTIONS="--use-system-ca"`
- UI 合否は `frontend/e2e/` の `npx playwright test`。Playwright MCP は下書き。サーバの 422 は pytest
- `.serena/project.yml` の `language_servers` は空のままでよい。Python と TypeScript を足すのは、コードができたあとの人間の明示があるときだけ
- Serena onboarding は未実施である。実施済みと書かない。人間の明示があるまで実行しない

---

## 4. Spec フェーズで許可される操作と禁止事項

目的は「何を作るか / 何を変えるか」を文書化し、コードを変えないこと。apply 前の正本は change の `specs/task/spec.md`、apply 後は `openspec/specs/task/spec.md` である。

今書いてよいのは一段目 `baseline-board` の proposal / specs / design / tasks だけである。後の段の change は、前の段を apply してアーカイブしてから書く。

### 許可

- 読み取り専用の調査。ファイル一覧と非コードの全文は Cursor の読み取り。コード探索は `search_for_pattern` と、Language Server が使えるときの記号ツール。`list_dir` と `read_file` は使わない
- `AGENTS.md`、`README.md`、本ルールを契約の入力にする。1本目から 6本目は読み取りだけ
- OpenSpec の change 成果物のうち Spec に属するものを、節見出しは CLI 英語、本文は日本語で書く（ユーザーが企画を求めている場合）
- 不明点は推測で埋めず、質問する
- 画面・API・データ項目・非機能への影響を明記する

### 禁止

- アプリケーションコード、`infra/`、依存ファイルの編集
- `AGENTS.md` と `README.md` の編集（本ルールも、この依頼が終わったあとは人間の明示があるときだけ）
- git commit、git push、`cdk deploy`、本番データの操作
- README / `AGENTS.md` の「やらないこと」を、この段の機能として勝手に入れること
- ログイン、担当者変更、完了切替、メンバー絞り込みを一段目の change に入れること
- 1本目から 6本目の本番リソースをこのアプリの前提にすること
- `wiki-login` 以降を実装契約としてコピーすること
- Serena メモリへの本番 URL、アカウント ID、キー、`.env.production` の中身の保存
- OpenSpec の本文を MUST / WHEN で書くこと
- アーカイブ済み change 本文の書き換え
- onboarding の実行
- ユーザーが「作って」と言っても、Spec フェーズでは実装に進まない

Spec の出力には少なくとも次を含める。

- 変更しないこと
- 変更すること（画面 / API / データ）
- 成功条件と確認手順（ローカル。本番実機は apply 完了条件にしない。UI 合否は Playwright Test。サーバの 422 は pytest）
- 対象外（やらないこと）

---

## 5. Plan フェーズで許可される操作と禁止事項

目的は、Spec を手順に落とすこと。まだ実装しない。今の Plan は一段目 `baseline-board` の `design.md` と `tasks.md` だけである。

### 許可

- Spec と同じ読み取り専用調査
- 触るファイルをパス単位で列挙する
- レイヤ境界に沿った変更順を書く
- リスクを書く
- OpenSpec の `design.md` / `tasks.md` を節見出しは CLI 英語、本文は日本語で書く
- Build 後の確認方法（pytest メモリモード、`frontend/e2e/` の Playwright Test、`infra/` を作る一段目では `cdk synth`）を計画に含める。実行は Cursor のターミナル

### 禁止

- コード・インフラ・依存関係の編集
- Spec に無い機能の追加計画
- FastAPI への CORS 追加
- SAM の `template.yaml`、Serverless MCP、`BucketDeployment`、`api_gateway_base_path` を計画に入れる
- 二段目・三段目を一段目の tasks に混ぜる
- コミット、push、`cdk deploy`、本番 DynamoDB の中身を変える手順を作業として書かない
- メモリと本ルールに本番 URL を書くこと
- onboarding を tasks に入れること
- `.serena/project.yml` の `language_servers` へ Python と TypeScript を足すことを、コードができる前の tasks に入れること

Plan の各ステップは、Build で 1 回の編集単位になる粒度にする。確認の前にコードを書いてはならない。

---

## 6. Build フェーズで許可される操作と禁止事項

目的は、承認済み Spec / Plan / `tasks.md` だけを実装すること。実装してよいのは「現在の範囲」だけである。現在の範囲は未実装であり、実装してよいコードは無い。後の段の proposal 確認があるまで、その段を Build しない。

### Serena の部品単位編集を優先する

コードが存在するファイルでは、ファイル全体の書き換えをしない。次の順で編集する。

1. `get_symbols_overview` / `find_symbol` / `find_referencing_symbols` で対象の記号を特定する（全文読みは必要なときだけ。非コードの全文は Cursor の読み取り）
2. 関数・クラス・メソッド単位は `replace_symbol_body` / `insert_before_symbol` / `insert_after_symbol` / `rename_symbol` / `safe_delete_symbol`
3. 記号の一部の数行だけなら `replace_content`
4. 新規ファイル作成は tasks で明示され、その段の確認が済んだときだけ

`.serena/project.yml` の `language_servers` は空のままでよい。そのあいだは記号ツールが弱い。コード探索は `search_for_pattern` と `replace_content` で足りる範囲だけにし、ファイル丸ごとの再生成はしない。Python と TypeScript を足すのは、コードができたあとの人間の明示があるときだけ。

### 許可

- 第 9 節の「編集してよいファイル」への、確認済み Plan / tasks に書いた変更。現在の範囲ではこの許可は空である
- コードができたあと、バックエンドはメモリモードの pytest を tasks どおり足す。実行は Cursor のターミナル
- UI 合否は `frontend/e2e/` の Playwright Test（`$env:NODE_OPTIONS="--use-system-ca"`）
- `infra/` の CDK と `cdk synth` は、一段目の tasks が確認されたときだけ。三段目では触らない
- Spec / Plan と実装がずれたら、実装を Spec に合わせるか、ずれをユーザーに報告して止める

### 禁止

- 現在の範囲でのコード、`frontend/`、`backend/`、`infra/`、`openspec/` の作成
- Spec / Plan / tasks に無い機能
- 第 9 節の禁止ファイルの編集
- git commit、git push
- `cdk deploy`、AWS 上の実リソースの変更
- 1本目から 6本目の `.env` / URL / テーブル名 / Cognito / スタックの流用
- FastAPI への CORS 追加、認証、タスク本文、タイトルの編集、ソフト削除、カスケード削除、タスク一覧からの削除、他タスクの再割り当て
- HttpApi のステージを `$default` 以外にする、Mangum に `api_gateway_base_path` を付ける、Lambda ルートを `$default` にする
- 一覧 Scan を Query + GSI に置き換える
- SAM の `template.yaml`、Serverless MCP、`BucketDeployment`
- クライアント指定の `assigneeId` を保存すること。一段目でクライアントの `done` を保存すること
- ファイル全体の再生成を常態化すること
- onboarding の実行。`.serena/` をこの未実装の段階で作ること
- メモリと本ルールへ本番 URL を書くこと

Build 後は、変更した画面と API を成功条件に沿って確認する手順をユーザーに残す。本番反映は人間の別依頼である。段が apply されたら、人間が `AGENTS.md` の「現在の範囲」を更新する。エージェントは `AGENTS.md` を書き換えない。

---

## 7. テスト方針

コードはまだ無い。合否の置き場は、一段目の実装が確認されたあとで `frontend/e2e/` と backend の pytest である。

画面の合否は `frontend/e2e/` の Playwright Test である。Playwright MCP は下書きである。サーバの 422 は pytest が正である。pytest、npm、uvicorn、`cdk synth`、playwright は Cursor のターミナルで実行する。

### 検証手段（一段目の実装後）

1. backend（メモリモード。先に 8000 で起動する）。Windows では venv の `Activate.ps1` を使わず `.\.venv\Scripts\python.exe` を直接指定する
2. バックエンド単体はメモリモードの pytest
3. frontend。npm / npx の前に `$env:NODE_OPTIONS="--use-system-ca"`。ローカルは `VITE_API_URL` なし
4. UI 合否は、既存の 8000 / 5173 を止めてから `cd frontend` で `npx playwright test`
5. CDK は tasks にあるときだけ `cdk synth`
6. `cdk deploy` と本番実機確認は apply 完了条件ではない。依頼があるまでしない

ローカルの再読み込み後の残存は、backend の生存中が確認対象である。本番の残存は DynamoDB である。

### コードを変えたときに最低限見る観点

- 一段目の API が GET/POST `/api/members`、DELETE `/api/members/{id}`、GET/POST `/api/tasks`、GET/DELETE `/api/tasks/{id}` だけである。一段目に PATCH が無い
- JSON は camelCase。タスクに `name` が無い。担当者名は画面が結んでいる
- 一覧が `createdAt` 降順である
- タスク POST がクライアントの `assigneeId` と `done` を捨てる。保存する `done` は false
- メンバー 0 人のタスク登録が 422 で、ストアが変わらない
- 担当タスクが残るメンバー DELETE が 422 である。カスケードしない
- タスク削除が `/tasks/:id` の confirm 後だけである。`/` に削除が無い
- メンバー削除が `/members` の confirm 後である。`/members/:id` が無い
- `MEMBERS_TABLE` と `TASKS_TABLE` の片方だけ設定で起動が失敗する
- FastAPI に CORS ミドルウェアが無い
- 二段目以降を、その段の確認前に足していない

### 自動テストを広げる場合（ユーザーが明示したときだけ）

- バックエンドはメモリモードの pytest。本番 DynamoDB をテストから叩かない
- フロント E2E は `frontend/e2e/` の Playwright Test
- サーバの 422 を e2e の正にしない。pytest が正である

---

## 8. レビュー観点

1. **スコープ**: 「現在の範囲」と `AGENTS.md` に反していないか。未確認の段を先行していないか。今は企画文書以外が無いか
2. **契約**: パス、メソッド、422、JSON キー（camelCase）が `AGENTS.md` どおりか
3. **割り当て**: 未完了が最少のメンバーか。同数は `createdAt` が古いか。クライアントの `assigneeId` を捨てているか。他タスクを再割り当てしていないか
4. **done**: 一段目の保存値が false か。完了済みが一覧に残るか
5. **削除**: タスクは詳細の confirm 後か。メンバーは `/members` の confirm 後か。一覧からのタスク削除が無いか。カスケードが無いか
6. **一覧**: `createdAt` 降順か。担当者名の結び方が契約どおりか。三段目の絞り込みがフロントで、初期が全員か
7. **ストア**: 両方未設定だけメモリか。片方だけが起動失敗か。PK が `id` で一覧が Scan か
8. **Lambda**: 一段目のルートだけか。二段目は PATCH だけか。Timeout 15 秒か。`$default` を Lambda ルートにしていないか
9. **CORS**: FastAPI に足していないか
10. **画面**: `/login` と `/members/:id` が無いか
11. **セキュリティ / データ**: ログイン、Cognito、`authorId`、タスク本文、添付が無いか
12. **インフラ**: スタック名 `AiDemo7ApiStack`。CDK だけか。`template.yaml` と `BucketDeployment` が無いか。三段目で `infra/` を触っていないか
13. **git**: commit と push をしていないか。`.env.production` と `.serena/` が commit に混ざっていないか
14. **文書**: `AGENTS.md` を触っていないか。本ルールとメモリに本番 URL が無いか。onboarding を実施済みと書いていないか
15. **Serena 編集**: `list_dir` と `read_file` を使っていないか。コマンドは Cursor のターミナルか。`language_servers` を独断で足していないか

---

## 9. Serena が編集してよいファイル範囲・編集してはいけないファイル範囲

現在の範囲では、編集してよいコードは無い。次に書いてよいのは、ユーザーが企画を求めたときの一段目 `baseline-board` の proposal / specs / design / tasks だけである。

### 編集してよい（ユーザーが企画または確認済み Build を求めたとき）

| 範囲 | 条件 |
|------|------|
| `openspec/changes/**`（archive 以外）の一段目 `baseline-board` | ユーザーが企画を求めたとき。確認の前にコードを書かない |
| 後の段の change | 前の段を apply してアーカイブし、その段の proposal 確認があるときだけ |
| `frontend/**`、`backend/**`、`infra/**` | その段の tasks が確認された Build だけ。現在は不可。三段目で `infra/` は触らない |
| `frontend/e2e/**` | tasks にあるとき。合否は Playwright Test |
| `README.md` | 人間が明示したときだけ。実 URL はデプロイ後の「URL」だけ |

### ユーザーの明示があるときだけ編集してよい

| 範囲 | 理由 |
|------|------|
| `docs/rules/project-rules-serena.md` | 本契約。矛盾時は `AGENTS.md` |
| `openspec/config.yaml` | 人間の依頼があるときだけ |
| `openspec/specs/**` | apply 後の正本。明示なしに編集しない |
| `.serena/memories/**` | onboarding は未実施。URL は書かない。人間が onboarding を依頼するまで作らない |
| `.serena/project.yml` の `language_servers` | 空のままでよい。コードができたあとの明示があるときだけ Python と TypeScript を足す |
| `frontend/.env.production` | 実 URL はデプロイ後に人間。commit しない |
| `.gitignore` | 人間の依頼があるときだけ。`.serena/` は commit しない |

### 編集してはいけない

| 範囲 | 理由 |
|------|------|
| `AGENTS.md` | 人間管理。矛盾時は本ルールより `AGENTS.md` を優先 |
| `README.md` | 人間が明示するまで編集しない |
| `.cursor/**` | 人間の IDE / MCP 設定。この Serena 追加の依頼が終わったあとは編集しない |
| `.git/**` | 設定変更の禁止 |
| `frontend/.env`、`*.local`、`frontend/.env.production` | 秘密と実 URL |
| `frontend/dist/**`、`**/node_modules/**` | 生成物 |
| `backend/.venv/**`、`**/__pycache__/**` | ローカル環境 |
| `infra/cdk.out/**` | CDK 合成成果 |
| `ai-demo1-checklist` / `ai-demo2-recipes` / `ai-demo3-CDK` / `ai-demo4-words` / `ai-demo5-wiki` / `ai-demo6-BBS` | 読み取り専用 |
| `openspec/changes/archive/**` | apply 済み。本文を書き換えない |
| `template.yaml` | SAM は使わない |
| リポジトリ外、AWS 上の実テーブル・バケット・ディストリビューション | デプロイは人間の別依頼 |

### git とデプロイ

- git commit と git push は依頼があるまでしない
- `cdk synth` は、確認済み tasks にあるとき Cursor のターミナルで実行してよい
- `cdk deploy` は依頼があるまでしない
- スタック名は `AiDemo7ApiStack`
- commit に `frontend/.env.production`、`.serena/`、`dist/`、`.venv/`、`cdk.out/` を混ぜない

### Serena メモリ

- onboarding は未実施である。実施済みと書かない。人間の明示があるまで実行しない
- 本番 URL、アカウント、`.env.production` の値、1本目から 6本目の URL は書かない
- メモリより本ルールと `AGENTS.md` と、できたあとの OpenSpec spec を優先する
- 現在の範囲は未実装である。次に書いてよいのは一段目 `baseline-board` の企画だけである
- capability は `task`。計画済みの最終段は `member-filter`。順は `baseline-board` → `task-patch` → `member-filter`
- `.serena/project.yml` の `language_servers` は空のままでよい
