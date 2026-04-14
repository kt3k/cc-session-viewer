# Task Breakdown: cc-session-viewer v1 実装

## Specifications

- **ランタイム**: Deno（開発・テスト）、Node 互換コードで記述（`node:http`,
  `node:fs`, `node:path` 等）
- **配布**: npm publish（`npx @kt3k/cc-session-viewer` /
  `dx @kt3k/cc-session-viewer`）
- **依存**: `open`（ブラウザ起動）、`deno-test`（devDependencies、Node 上で
  Deno.test 実行）
- **CLI**: `--port`(7777), `--host`(127.0.0.1),
  `--projects-dir`(~/.claude/projects), `--no-open`, `--help`, `--version`
- **データソース**:
  `~/.claude/projects/<encoded-path>/<session-id>.jsonl`。`memory/`
  等のサブディレクトリは除外
- **JSONL の行タイプ**: `user`, `assistant`, `tool_result`, `permission-mode`,
  `file-history-snapshot`, `summary`
- **HTTP API**: `/`, `/sessions/:id`, `/api/projects`, `/api/sessions`,
  `/api/sessions/:id`, `/api/sessions/:id/raw`, `/assets/*`
- **セキュリティ**: `127.0.0.1` のみバインド、読み取り専用、CORS 拒否
- **UI**: 一覧（サイドバー+検索+ソート）/ 詳細（タイムライン、tool_use/result
  折りたたみ、sidechain 区別、`j`/`k`/`/`/`g`
  ショートカット、ダーク/ライト対応）
- **非機能**: 一覧はメタのみ先読み、詳細はストリーミングパース、LRU
  キャッシュ、破損行スキップ
- **破壊禁止**: JSONL には一切書き込まない

## Subtasks

-
  1. [x] プロジェクト基盤セットアップ [M]
  - [x] 1.1 `deno.json` に tasks / compilerOptions を定義、`package.json`
        に依存を定義 [S]
  - [x] 1.2 ディレクトリスケルトン作成（`src/`, `test/`, `fixtures/`,
        `src/assets/`） [XS]
  - [x] 1.3 `types.ts` にセッション / イベント型を定義 [S]
  - [x] 1.4 `.gitignore` / README 雛形 [XS]
-
  2. [x] セッションパーサ & スキャナ（コアロジック） [L]
  - [x] 2.1 テスト用 fixture JSONL を用意 [S]
  - [x] 2.2 `scanner.ts`: projects-dir を走査して project / session ファイル列挙
        [M]
  - [x] 2.3 `session_parser.ts`: 1 行 JSON →
        正規化イベント変換（行タイプ分岐、破損行スキップ） [M]
  - [x] 2.4 `session_loader.ts`: ファイル全体を読み込み、メタ抽出 &
        イベント配列化 [M]
  - [x] 2.5 メタ専用の軽量ロード（先頭/末尾行のみ）最適化 [S]
  - [x] 2.6 LRU キャッシュ実装 [S]
  - [x] 2.7 ユニットテスト（scanner / parser / loader） [M]
-
  3. [x] HTTP サーバー & API 層 [L]
  - [x] 3.1 `server.ts`: `Deno.serve` でサーバー起動、graceful shutdown [S]
  - [x] 3.2 `router.ts`: パス → ハンドラ分岐 [S]
  - [x] 3.3 `/api/projects` ハンドラ [XS]
  - [x] 3.4 `/api/sessions` ハンドラ（メタ一覧） [S]
  - [x] 3.5 `/api/sessions/:id` ハンドラ（正規化イベント） [S]
  - [x] 3.6 `/api/sessions/:id/raw` ハンドラ [XS]
  - [x] 3.7 `/assets/*` 静的配信 + SPA フォールバック（`/`, `/sessions/:id`）
        [S]
  - [x] 3.8 CORS 拒否ヘッダ / 127.0.0.1 バインド検証 [XS]
  - [x] 3.9 API ハンドラのユニットテスト [M]
-
  4. [x] CLI エントリポイント [M]
  - [x] 4.1 `cli.ts`: `parseArgs` で flags 解析、`--help` / `--version` [S]
  - [x] 4.2 起動メッセージ（スキャン結果サマリ + URL） [XS]
  - [x] 4.3 `--no-open` 以外でブラウザ自動起動（`open`/`xdg-open`/`start`） [S]
  - [x] 4.4 ポート使用中 / projects-dir なしのエラーハンドリング [S]
-
  5. [ ] フロントエンド UI [L]
  - [x] 5.1 `index.html` + ベース `style.css`（ダーク/ライト） [S]
  - [x] 5.2 `app.js`: ルーター（`/`, `/sessions/:id`） [S]
  - [ ] 5.3 一覧画面: サイドバー / カード / ソート / 検索ボックス [M]
  - [ ] 5.4 詳細画面: タイムラインレンダラ（user/assistant/thinking） [M]
  - [ ] 5.5 詳細画面: tool_use + tool_result 折りたたみ & ツール別カード [M]
  - [ ] 5.6 sidechain のインデント/色分け表示 [S]
  - [ ] 5.7 Markdown レンダリング（marked をバンドル） [S]
  - [ ] 5.8 キーボードショートカット（`j`/`k`/`/`/`g`） [S]
-
  6. [ ] パッケージング & 動作検証 [M]
  - [ ] 6.1 `deno.json` の `start` タスクで最小権限フラグを確定 [XS]
  - [ ] 6.2 実セッションディレクトリでの手動動作確認 [S]
  - [ ] 6.3 README に使い方 / flags / スクリーンショット枠を記載 [S]
  - [ ] 6.4 npm 公開メタデータ（`package.json` の `name`, `version`, `bin`,
        `files`） [S]

## Subtask Details

### 1. プロジェクト基盤セットアップ

Deno
プロジェクトの骨組みを作り、型とタスクを先に固定することで以降の並行作業を楽にする。

#### 1.1 `deno.json` / `package.json`

`deno.json` に `tasks.start` / `tasks.test` / `tasks.dev` と `compilerOptions`
を定義。`package.json` に npm メタデータと依存（`open`, `deno-test`）を定義。

#### 1.2 スケルトン

`src/{cli,server,router,scanner,session_loader,session_parser,types}.ts`
を空で作成。`src/assets/{index.html,app.js,style.css}`、`test/`, `fixtures/`
も作る。

#### 1.3 `types.ts`

`SessionMeta`, `SessionEvent`(union: user/assistant/tool_result/thinking/...),
`ProjectInfo`, `RawJsonlLine` を定義。パーサ・API・UI で共有。

#### 1.4 `.gitignore` / README 雛形

`*.swp`, `.DS_Store`, `coverage/` などの除外と、プロジェクト目的を 3 行記載する
README。

---

### 2. セッションパーサ & スキャナ（コアロジック）

JSONL
の解釈はアプリの心臓部。先にテスト可能な純関数として切り出し、サーバー層から独立させる。

#### 2.1 Fixture 準備

実セッションを匿名化したもの、または最小合成例を `fixtures/` に 2〜3
本配置（通常・sidechain 含む・破損行含む）。

#### 2.2 `scanner.ts`

`node:fs` で projects-dir 直下の各ディレクトリ（encoded project
path）を列挙し、各ディレクトリ内の `*.jsonl`（`memory/`
等は除外）を収集。`encoded path → 元のプロジェクトパス` 復元（`-` →
`/`）。戻り値は `ProjectInfo[]`。

#### 2.3 `session_parser.ts`

1 行の JSON を受け取り、`type` を見て `SessionEvent` に正規化。`message.content`
が string のケースと content blocks のケース両方ハンドリング。`tool_use` /
`tool_result` のひも付け、`thinking` 抽出、`isSidechain` 伝搬。JSON
パース失敗時は `null` を返しロガーで警告。

#### 2.4 `session_loader.ts`

ファイル全体を読んで行ごとに `session_parser` を適用、イベント配列と
`SessionMeta`（`sessionId`, `cwd`, `gitBranch`, `firstTimestamp`,
`lastTimestamp`, `messageCount`, `firstUserMessage`, `sizeBytes`）を返す。

#### 2.5 軽量メタロード

一覧用に「先頭数行 +
末尾数行」だけ読んでメタを作る高速パスを実装。ファイルサイズが小さければフルロードにフォールバック。

#### 2.6 LRU キャッシュ

`sessionId → ロード済みイベント` の Map + アクセス順管理。デフォルト容量 8
程度。メモリ使用量を制限。

#### 2.7 ユニットテスト

- scanner: fixtures ディレクトリで想定ファイル数 / 除外ルール
- parser: 各行タイプと破損行スキップ
- loader: メタ抽出の正確性、軽量パスとフルパスの一致

---

### 3. HTTP サーバー & API 層

コアロジックをラップして JSON API と静的配信を公開する。

#### 3.1 `server.ts`

`node:http` の `createServer` で起動。`SIGINT` で
`server.close()`、完了まで待機。ポート衝突は `EADDRINUSE` → プロセス exit 1。

#### 3.2 `router.ts`

パスパターンマッチングの簡易ルータ。`IncomingMessage → ServerResponse`
のハンドラマップ。

#### 3.3 `/api/projects`

scanner 結果を JSON で返却。セッション数バッジ用に `sessionCount` を含める。

#### 3.4 `/api/sessions`

全プロジェクトのメタ一覧を集約。軽量メタロードパスを使用。`?project=`
クエリでフィルタ可。

#### 3.5 `/api/sessions/:id`

LRU キャッシュ経由で完全なイベント配列 + メタを返却。存在しない ID は 404。

#### 3.6 `/api/sessions/:id/raw`

JSONL をそのまま `text/plain` で返す。`Content-Disposition: inline`。

#### 3.7 静的配信 + SPA フォールバック

`/assets/*` は `src/assets` から MIME 付きで返す。`/` と `/sessions/:id` は同じ
`index.html` を返す（SPA エントリ）。`__dirname` ベースのパス解決。

#### 3.8 セキュリティ

`Access-Control-*` を返さない（同一オリジンのみ許可）。`hostname` は `127.0.0.1`
固定を強制するロジックを残す（`--host` は受け取るが警告）。

#### 3.9 API テスト

ハンドラ関数を直接呼び出し、fixture プロジェクトを `--projects-dir`
として与えてレスポンスを検証。

---

### 4. CLI エントリポイント

ユーザー接点。起動体験が悪いと全てが台無しになるので flags
とエラーを丁寧に扱う。

#### 4.1 引数パース

`node:util` の `parseArgs` で型付きパース。不明 flag はエラー。`--help` /
`--version` は即終了。

#### 4.2 起動メッセージ

`cc-session-viewer vX.Y.Z` / `Scanning ... N projects, M sessions` /
`Listening on ...` を出力。

#### 4.3 ブラウザ自動起動

プラットフォーム判定で `open` / `xdg-open` / `start` を選択。`--allow-run`
無い場合は警告のみで続行。

#### 4.4 エラーハンドリング

- `projects-dir` なし: 警告 + 空状態で継続
- ポート使用中: `EADDRINUSE` 検出 → 代替ポート案内 + exit 1

---

### 5. フロントエンド UI

静的ファイルのみで動く SPA。ビルドステップは置かず、ES Modules + バンドル済み
`marked` を `src/assets/vendor/` に同梱。

#### 5.1 HTML / CSS ベース

CSS
変数でダーク/ライト切替（`@media (prefers-color-scheme: dark)`）。等幅とサンセリフのトークン定義。

#### 5.2 クライアントルータ

`history.pushState` + `popstate` で `/` と `/sessions/:id` を切替。

#### 5.3 一覧画面

- サイドバー: `/api/projects` を描画、クリックでフィルタ
- メイン: `/api/sessions` を取得 → カード描画
- ヘッダ: 検索（クライアント側 `firstUserMessage` 部分一致）、ソート切替

#### 5.4 詳細タイムライン（基本）

`/api/sessions/:id` を取得。`user` は右寄せ吹き出し、`assistant text` は左寄せ
Markdown、`thinking` は `<details>` で折りたたみデフォルト閉。

#### 5.5 tool_use / tool_result

ツール名に応じてカードバリアント切替（Read/Write/Edit/Bash/Grep/Glob/default）。tool_result
は対応する tool_use 直下に `<details>`。長文は `max-height` + 「展開」ボタン。

#### 5.6 Sidechain

`isSidechain === true` のブロックは左インデント +
枠色を変えて視覚的にグルーピング。

#### 5.7 Markdown

`marked` をバンドルし、`DOMPurify` 相当のサニタイズか、`marked`
のオプションで安全 HTML 生成。コードブロックは等幅フォント。

#### 5.8 ショートカット

`j`/`k` で次/前のメッセージへスクロール、`/` で検索フォーカス、`g`
で一覧に戻る。`input` にフォーカス中は無効化。

---

### 6. パッケージング & 動作検証

#### 6.1 権限フラグ確定

`deno.json` `tasks.start` に `--allow-read` / `--allow-net=127.0.0.1` /
`--allow-env=HOME` / `--allow-run=open,xdg-open,start` を記述。npm
経由の場合は権限フラグ不要。

#### 6.2 実セッションでの動作確認

自分の `~/.claude/projects` を読ませて、一覧 / 詳細 / tool_use 表示 / sidechain
/ 破損行を含むケースを手動確認。

#### 6.3 README

インストール（`npx @kt3k/cc-session-viewer` /
`dx @kt3k/cc-session-viewer`）、起動、flags、制限事項を記載。

#### 6.4 npm メタデータ

`package.json` に `name`, `version`, `bin`, `files` を設定。`npm pack --dry-run`
で確認。
