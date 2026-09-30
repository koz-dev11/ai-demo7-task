## やること / やらないこと
- コミットは勝手に実行しない。必ず承認否認確認をする
- cdk deploy も依頼があるまで実行しない
- 企画は OpenSpec（schema: spec-driven）。capability は `task`
- 現行の正本は、その段の apply 前は change の `specs/task/spec.md`、apply 後は `openspec/specs/task/spec.md`
- spec-first。proposal / specs / design / tasks を書いて確認を待ち、そのあと実装する
- 実装してよいのは「現在の範囲」だけである。後の段は proposal の確認があるまで実装しない
- 段を飛ばさない。前の段を apply してアーカイブしてから次の change を書く
- apply 済み change はアーカイブする（順: `baseline-board` → `task-patch` → `member-filter` → `screen-layout` → `task-content` → `nav-and-assignee`）。アーカイブ後の change 本文は書き換えない
- 段が apply されたら、人間が「現在の範囲」をその段まで更新する。エージェントは AGENTS.md を書き換えない
- OpenSpec の節見出しは CLI 英語（Why / What Changes / ADDED Requirements / MODIFIED Requirements / Context / Goals / Non-Goals / Decisions）。本文とシナリオのキーワードは日本語（必須である / してはならない / とき / ならば / かつ）。本文に MUST / WHEN は使わない。英語で本文を書いて和訳しない
- 画面の合否は Playwright Test である。Playwright MCP は下書きである。サーバの 422 は pytest が正である

## 触るな
- AGENTS.md は人間が管理。エージェントは作成・編集しない
- ai-demo1-checklist / ai-demo2-recipes / ai-demo3-CDK / ai-demo4-words / ai-demo5-wiki / ai-demo6-BBS は読み取り専用。編集しない
- 5本目 wiki の参考は三段目（`page-tree`）までである。`wiki-login` 以降（Cognito・ログイン画面・JWT オーソライザー）は実装の手本にしない
- `docs/rules/project-rules-serena.md` は AGENTS.md に従う。矛盾したら AGENTS.md を優先する。依頼があるまでエージェントは作成・編集しない

## 技術
- バックエンドは Python ＋ FastAPI。ローカル起動は uvicorn。Lambda は Mangum（`main.handler`、`lifespan="off"`）
- フロントエンドは TypeScript ＋ React ＋ Vite。画面が FastAPI を HTTP で呼ぶ
- 設計図は CDK（TypeScript）だけである。置き場は infra/。スタック名は `AiDemo7ApiStack`
- SAM の template.yaml は作らない。Serverless MCP は使わない
- 1本目から 6本目のスタック・テーブル・バケット・API URL・`.env`・Cognito を共有しない
- Playwright Test が合否、MCP は下書き

## 現在の範囲
- 一段目 `baseline-board`、二段目 `task-patch`、三段目 `member-filter`、見た目の `screen-layout`、`task-content`、`nav-and-assignee` は実装済みで、アーカイブ済みである
- 正本は `openspec/specs/task/spec.md` である
- アーカイブは `openspec/changes/archive/2026-09-28-baseline-board/`、`openspec/changes/archive/2026-09-28-task-patch/`、`openspec/changes/archive/2026-09-29-member-filter/`、`openspec/changes/archive/2026-09-29-screen-layout/`、`openspec/changes/archive/2026-09-29-task-content/`、`openspec/changes/archive/2026-09-30-nav-and-assignee/` である。アーカイブ後の change 本文は書き換えない
- 各段の箇条書きは、その段で足した範囲の記録である。いまの振る舞いの正は正本である
- 次の change は、人間の依頼があるまで書かない。確認の前にコードを書いてはならない
- `cdk deploy` はまだである。依頼があるまで実行しない

## 段の順

### 一段目 `baseline-board`（実装済み。アーカイブ済み）
- メンバーの登録・一覧・削除と、タスクの登録・一覧・詳細・削除が通ること
- 画面は `/` `/new` `/tasks/:id` `/members` だけである。`/login` と `/members/:id` は無い
- API は GET/POST `/api/members`、DELETE `/api/members/{id}`、GET/POST `/api/tasks`、GET/DELETE `/api/tasks/{id}` だけである。PATCH は無い
- メンバー項目は `id`, `name`, `createdAt` である。`name` は strip 後に空なら 422 である。同名は許す。`createdAt` はサーバ付与の UTC ISO8601 である
- タスク項目は `id`, `title`, `assigneeId`, `done`, `createdAt` である。`createdAt` はサーバ付与の UTC ISO8601 である。タスク JSON に `name` は無い
- 一覧は `createdAt` 降順である。担当者名は `assigneeId` と GET `/api/members` を画面で結ぶ
- `title` は strip 後に空なら 422 である
- `assigneeId` はサーバが登録時に割り当てる。クライアント指定を採用してはならない
- クライアントの `done` は採用してはならない。一段目の保存値は false である。完了の切り替えはしない
- 割り当ては、未完了タスクが最も少ないメンバーである。同数なら `createdAt` が古いメンバーである
- メンバーが 0 人のタスク登録は 422 である。ストアを変えない
- そのメンバーを担当者にするタスクが残っている DELETE は 422 である。カスケードしない
- タスクの削除は `/tasks/:id` の confirm 後のハード削除である。`/` に削除は置かない
- メンバーの削除は `/members` の confirm 後のハード削除である。メンバーの詳細画面は無い
- メンバー絞り込みはしない
- ローカルは、`MEMBERS_TABLE` と `TASKS_TABLE` が両方未設定のときメモリである。片方だけ設定されているときは起動を失敗させる。本番は DynamoDB（各テーブル PK `id`、一覧は Scan）
- 設計図はこの段で `infra/` の CDK として作る。スタック名は `AiDemo7ApiStack` である
- 認証なし。ログイン・担当者変更・完了切替・メンバー絞り込みをこの段で足してはならない

### 二段目 `task-patch`（実装済み。アーカイブ済み）
- `PATCH /api/tasks/{id}` を足す。送った `assigneeId` と `done` だけを、そのタスクについて変える。他のタスクは再割り当てしない
- `id` と `createdAt` と `title` は不変である
- 両方省略、空の `assigneeId`、存在しないメンバーへの変更は 422 である
- 詳細画面で担当者を変更でき、完了を切り替えられる。完了済みも一覧に残す
- 画面ルートは増やさない。絞り込み用 API は足さない
- CDK に足してよいのは、同じ HttpApi への PATCH ルートだけである。新しい AWS サービスは足さない

### 三段目 `member-filter`（実装済み。アーカイブ済み）
- 一覧をメンバーで絞れる。初期は全員である。選択はメンバーの `id` である。既存 GET `/api/tasks` 全件のフロント処理である
- 完了済みも一覧に残す。URL に絞り込みを載せない。新しい API は無い
- `infra/` は触らない

### 見た目 `screen-layout`（実装済み。アーカイブ済み）
- 文言と操作は変えない。一覧のカード、完了の色、フォーム、詳細、メンバー行、戻る位置、地の色を整える
- `backend/` と `infra/` は触らない

### `task-content`（実装済み。アーカイブ済み）
- タスク JSON に `body`、`dueOn`、`completedAt` を足す。既存の `id`、`title`、`assigneeId`、`done`、`createdAt` は残す。`name` は無い。欠けた保存は、読むときに `body` を空文字、`dueOn` と `completedAt` を null にする
- `body` は平文である。空を許す。Markdown にしない。一覧には全文を出さず、詳細に出す。ラベルは「内容」
- `dueOn` は任意の `YYYY-MM-DD` である。空文字と null は期限なしである。PATCH で省略したら保存済みを残し、空文字か null で消す。ラベルは「期限」、入力は `type="date"`
- `completedAt` はクライアントが決めない。`done` が false から true のときだけ、作成日時と同じ UTC ISO8601（末尾 Z）を付ける。true の再送は元の値を残す。false に戻すと null。画面は「完了日」と文字だけである
- 期限超過は、未完了かつ `dueOn` がローカルの今日より前のときだけである。当日、期限なし、完了済みは出さない。左の線は `#b45309`。カード内に「期限超過」と出す
- 「タスクを登録」は `/` の右下に固定する。文言と `/new` は変えない。「メンバー」はナビゲーションに残す
- PATCH は送った `assigneeId`、`done`、`body`、`dueOn` だけを、そのタスクに書く。4 つとも無ければ 422 である。`id`、`title`、`createdAt`、`completedAt` は捨てる。他のタスクは再割り当てしない。新しい API パスは無い。`infra/` は触らない

### `nav-and-assignee`（実装済み。アーカイブ済み）
- 「タスクを登録」は `/` のナビゲーションへ戻す。順は「メンバー」、その次が「タスクを登録」である。文言と `/new` は変えない。右下固定にはしない。固定のための一覧下の余白は置かない
- 詳細の担当者名は、select の選択中の表示だけである。select の外に同じ名前は出さない。担当者の変更は残す
- 一覧カードの担当者名、内容、期限、完了日、期限超過は変えない。新しい API パスは無い。`backend/` と `infra/` は触らない

## 三段目までの範囲（`member-filter` まで）
- 画面は `/` `/new` `/tasks/:id` `/members` である。`/login` と `/members/:id` は無い
- API は一段目のパスに PATCH `/api/tasks/{id}` を足したものだけである
- 認証なし。誰でも読み書き・削除できる
- 一覧は `createdAt` 降順である。メンバー絞り込みは GET 全件のフロント処理である。初期は全員である。完了済みも残す
- 担当者名は画面が `assigneeId` と GET `/api/members` を結ぶ。タスク JSON に `name` は無い

## どの段のあとでもやらないこと
- ログイン、自己サインアップ、Cognito、JWT オーソライザー、`authorId`、ユーザー識別情報
- 課金、リアルタイム同期、モバイルアプリ、ソフト削除、版履歴
- タイトルの編集、Markdown 描画、画像、添付
- 検索箱、検索用 API、タグ、ページング、GSI
- カスケード削除、タスク一覧からの削除、他タスクの再割り当て
- FastAPI への CORS 追加、`BucketDeployment`、SAM の `template.yaml`

## AWS
- 足してよい: Lambda、API Gateway、DynamoDB、IAM ロール、CloudWatch Logs、S3、CloudFront
- 足さない: VPC、ECS、RDS、Secrets Manager、SES、WAF、新しい AWS アカウント、OpenSearch、Cognito、添付用バケット
- CORS は FastAPI に足さない（本番は API Gateway、ローカルは Vite プロキシ）
- 本番 CORS の許可オリジンは `*` でよい
- HttpApi のステージは `$default`（URL に `/prod` を付けない）。Mangum に `api_gateway_base_path` は付けない
- Lambda に繋ぐルートは `$default` にしてはならない。OPTIONS は API Gateway の corsPreflight に残す
- 一段目の Lambda ルートは GET/POST `/api/members`、DELETE `/api/members/{id}`、GET/POST `/api/tasks`、GET/DELETE `/api/tasks/{id}` だけである
- 二段目で PATCH `/api/tasks/{id}` をその HttpApi に足してよい
- Lambda Timeout は 15 秒
- CDK Output は `ApiUrl` / `FrontendUrl` / `FrontendBucketName` / `CloudFrontDistributionId` である。`BucketDeployment` はしない
- 実 URL は CDK Output と `frontend/.env.production` である。AGENTS / OpenSpec / Serena メモリには URL を書かない。デプロイ後に README の「URL」へ書いてよい。commit に `.env.production` を混ぜない
- スタック名は `AiDemo7ApiStack` である。環境変数は `MEMBERS_TABLE` と `TASKS_TABLE` である。テーブル名は `${stackName}-members` と `${stackName}-tasks` である。両方が未設定のときだけメモリである。片方だけ設定されているときは起動を失敗させる
- `infra/bin/infra.ts` は、Docker が無い `cdk deploy` を例外で止める。`cdk synth` で Docker が無いときだけ bundling を無効化してよい
