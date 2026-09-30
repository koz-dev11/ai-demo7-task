## Context

動機は `proposal.md` の Why。振る舞いの契約は `specs/task/spec.md`。一段目の正本は `openspec/specs/task/spec.md` である。

一段目は実装済みである。画面は `/`、`/new`、`/tasks/:id`、`/members`。API に PATCH は無い。一覧と詳細の完了の文言は「未完了」に固定されている。詳細に担当者の選択と完了の切り替えは無い。HttpApi の `/api/tasks/{id}` は GET と DELETE だけである。corsPreflight のメソッドは GET、POST、DELETE、OPTIONS である。

この change は、その詳細と、同じ HttpApi に PATCH を足す。新しい画面ルート、新しい AWS サービス、三段目の絞り込みは足さない。

## Goals

- `PATCH /api/tasks/{id}` が、送った `assigneeId` と `done` だけをそのタスクに反映すること
- 詳細画面で担当者を選べ、完了を切り替えられること。一覧には切り替えを置かないこと
- 完了の文言を `done` に合わせ、完了済みも一覧に残すこと
- CDK は同じ HttpApi の PATCH ルートと、corsPreflight の PATCH だけを足すこと
- 画面の合否は `frontend/e2e/` の Playwright Test（Chromium だけ）であり、サーバの 422 と 404 は pytest が正であること

## Non-Goals

- 三段目 `member-filter`。一覧の絞り込み、絞り込み用 API、URL への絞り込み、`infra/` のそれ以外の変更
- 画面ルートの追加、`/login`、`/members/:id`
- タスク POST でクライアントの `assigneeId` と `done` を採用すること。新規の `done` を false 以外にすること
- `id`、`createdAt`、`title` の変更、タイトル編集、タスク本文
- 他タスクの再割り当て、カスケード削除、一覧からの削除
- 新しい AWS サービス、スタック名、テーブル、Output、Timeout、ステージの変更
- SAM の `template.yaml`、`BucketDeployment`、FastAPI への CORS 追加
- `cdk deploy`、git commit、git push
- `AGENTS.md`、`README.md`、`docs/rules/project-rules-serena.md`、アーカイブ済み change の本文の編集
- 1本目から 6本目の編集
- 実 URL を成果物に書くこと
- ルートの Playwright 見本を合否にすること、見本を消すこと、見本の設定を `frontend/` へ移すこと、Playwright MCP を合否にすること
- サーバの 422 を e2e の正にすること

## Decisions

### 1. PATCH は送った項目だけを書く

- 決定: `PATCH /api/tasks/{id}` を足す。先にタスクの有無を見る。無い id は 404 とし、本文が不正でも 404 である。ストアは変えない。あるタスクについて、`assigneeId` と `done` のうち送られた方だけを変える。両方無ければ 422 である。`assigneeId` は strip し、空または空白だけ、文字列でない、存在するメンバーの `id` でない、のいずれかなら 422 である。`done` は JSON の boolean だけを採用する。文字列、数値、null は 422 である。片方が不正なら、もう片方が妥当でも両方とも書かず 422 である。`id`、`createdAt`、`title` と、それ以外の未知の項目は捨て、422 にはしない。不変項目だけを送った PATCH は、更新項目が無いので 422 である。成功は 200 で、タスクの 5 キーだけを返す。`name` は足さない。同じ値への更新も 200 である。他のタスクの `assigneeId` と `done` は変えない。割り当て関数は呼ばない
- 理由: 片方だけの更新と、不変項目を捨てることが契約である。404 を先にすると、無い id の不正な本文が 422 と 404 に分かれない。未知項目を 422 にすると、`id` や `title` を付けた更新まで失敗する
- 代替: 不正な片方も、妥当な片方は保存する → 422 のときストアを変えない契約と衝突する。不変項目が付いていたら 422 → 捨てて保存値を変えない契約と衝突する

### 2. タスク作成の割り当ては一段目のままである

- 決定: POST はこれまでどおり、クライアントの `assigneeId` と `done` を捨て、保存する `done` は false、担当者はサーバが決める。未完了の件数は `done` が false のタスクだけを数える。`done` が true のタスクは数に入れない。同数なら `createdAt` が古いメンバー、それも同じなら `id` の辞書順が先、は一段目のままである。メンバー削除は、そのメンバーを `assigneeId` に持つタスクが 1 件でもあれば 422 のままである。`done` が true でもカスケードしない
- 理由: 二段目は作成時の割り当てを変えない。完了にしても、そのタスクは担当者に残る
- 代替: 完了にしたタスクを未完了件数に入れたままにする → 完了後の新規割り当てが契約とずれる。完了済みならメンバーを消せる → 一段目の削除契約を広げる

### 3. 詳細だけが担当者と完了を変える

- 決定: `/tasks/:id` に、存在するメンバーだけを候補にする select を置く。現在の `assigneeId` を選択状態にする。完了は checkbox で切り替える。select の変更は `assigneeId` だけ、checkbox の変更は `done` だけを PATCH する。削除の confirm は使わない。削除の confirm は一段目の `window.confirm`「削除しますか？」のままである。成功した 5 キーで詳細の表示を更新する。失敗したときは、保存済みの値の表示に戻す。一覧はカードの文言だけである。select も checkbox も置かない。担当者名は、これまでどおり `assigneeId` と GET `/api/members` を画面で結ぶ。完了の文言は、`done` が true なら「完了」、false なら「未完了」であり、一覧と詳細の両方に出す。`/new` に担当者と完了の入力は足さない
- 理由: 候補を存在するメンバーに限ると、画面から空や未知の `assigneeId` を送れない。e2e は 422 を踏まない。一覧に切り替えを置くと、二段目の画面契約を超える
- 代替: 担当者を自由入力にする → 空と未知の id が画面から送れる。変更に保存ボタンを付ける → 切り替えの操作が契約より一つ増える。確認は select と checkbox の変更で足りる

### 4. CDK は同じルートに PATCH を足すだけである

- 決定: `infra/lib/ai-demo7-api-stack.ts` の `/api/tasks/{id}` のメソッドに PATCH を足す。corsPreflight のメソッドに PATCH を足す。新しいルート、新しい AWS サービス、テーブル、Output、Timeout、ステージは足さない。スタック名は `AiDemo7ApiStack` のままである。FastAPI に CORS は足さない。Vite の `/api` プロキシは `http://127.0.0.1:8000` のままである。`cdk deploy` はこの change では実行しない
- 理由: ブラウザの PATCH は、プリフライトのメソッドに PATCH が無いと届かない。一段目の HttpApi を複製しない
- 代替: 別の API を作る、Lambda の `$default` に寄せる → 契約で禁止である

### 5. 合否の置き場は一段目と同じである

- 決定: サーバの 422 と 404 は `backend/tests` の pytest が正である。対象は、両方省略、空または空白だけの `assigneeId`、存在しないメンバー、boolean でない `done`、片方だけ不正、不変項目だけ、存在しない id、存在しない id で本文が不正、成功 200 の 5 キー、他タスクを変えないこと、POST の `done` が false のままであること、完了済みを未完了件数に入れないこと。e2e は Chromium だけとし、担当者変更、完了の切り替え、文言「完了」と「未完了」、完了済みが一覧に残ることを断言する。e2e に 422 を足さない。ルートの見本と Playwright MCP は合否にしない
- 理由: 422 と 404 は API の契約である。画面の select は未知のメンバーを候補に出さない
- 代替: 422 を e2e で踏む → 契約で足さない

## Risks / Trade-offs

- [Requirement の見出しは一段目の文言のままである] → アーカイブ時に正本の見出しと一致させるためである。実装は本文とシナリオに従う。見出しの「無い」「しない」「一段目だけ」を、二段目の禁止として読まない
- [完了にすると、その後の POST の割り当て人数が変わる] → 既存タスクは再割り当てしない。pytest で、完了済みを件数から外すことと、他タスクの `assigneeId` が変わらないことを固定する
- [corsPreflight に PATCH が無いと、ブラウザの PATCH がプリフライトで落ちる] → 決定 4 でメソッドに PATCH を足す。FastAPI には CORS を足さない
- [詳細の select は、メンバー取得に失敗すると候補が空になる] → 候補が空のときは PATCH を送らない。保存済みの担当者名の表示は残す
- [ルートの `npx playwright test` は見本を実行する] → 合否は `frontend/` で実行する。`tests/example.spec.ts` は実行しない
