# cc-session-viewer 仕様書

## 概要

`cc-session-viewer` は、Claude Code が記録するセッションログをブラウザ上で可視化する CLI ツールである。CLI を実行するとローカルに HTTP サーバーが起動し、ブラウザからセッション一覧と各セッションの詳細を閲覧できる。

- **実装ランタイム**: Deno（開発・テスト）、Node 互換コードで記述
- **配布形態**: npm publish（`npx @kt3k/cc-session-viewer` / `dx @kt3k/cc-session-viewer`）
- **ターゲット**: ローカルで Claude Code を利用している開発者（自分のセッションを振り返る用途）

## ゴール / 非ゴール

### ゴール
- ローカルに保存されている Claude Code セッションを一覧表示できる
- 各セッションの会話履歴・ツール呼び出し・ツール結果を読みやすく表示する
- 依存が少なく、`npx` 一発で起動できる
- 既存のセッションファイル（`.jsonl`）を読み取り専用で扱い、破壊しない

### 非ゴール（v1 では対象外）
- セッションの編集・削除・エクスポート
- リモートサーバーへのデプロイ / 認証
- セッションの再生成・再実行
- 複数マシン間でのセッション同期

## データソース

Claude Code は以下のパスにセッションログを保存している。

```
~/.claude/projects/<encoded-project-path>/<session-id>.jsonl
```

- `<encoded-project-path>`: プロジェクトの絶対パスを `/` → `-` に置換したもの
  - 例: `/Users/kt3k/oss/cc-session-viewer` → `-Users-kt3k-oss-cc-session-viewer`
- `<session-id>.jsonl`: 1 セッション = 1 ファイル。JSON Lines 形式
- 同ディレクトリ配下の `memory/` などのサブディレクトリはセッションファイルではないので除外する

### セッションファイル（JSONL）の主要な行タイプ

各行は独立した JSON オブジェクトで、`type` フィールドで種別を判別する。

| type | 用途 |
|---|---|
| `user` | ユーザーメッセージ。`message.content` は string または content blocks の配列 |
| `assistant` | アシスタントメッセージ。`message.content` は content blocks の配列で、`text` / `tool_use` / `thinking` などを含む |
| `tool_result` もしくは `user` 内の `tool_result` ブロック | ツール実行結果 |
| `permission-mode` | セッションのパーミッションモード変更 |
| `file-history-snapshot` | ファイルスナップショット（表示対象外） |
| `summary` | セッションサマリ |

共通フィールドの例:
- `uuid`, `parentUuid`: メッセージの親子関係（ツリー構造 / sidechain 判定に利用）
- `timestamp`: ISO8601 タイムスタンプ
- `sessionId`, `cwd`, `gitBranch`, `version`: セッションメタデータ
- `isSidechain`: サブエージェント実行かどうか

## CLI インタフェース

### 起動

```
$ cc-session-viewer [options]
```

### オプション

| オプション | デフォルト | 説明 |
|---|---|---|
| `--port <number>` | `7777` | HTTP サーバーのポート番号 |
| `--host <string>` | `127.0.0.1` | バインドするホスト |
| `--projects-dir <path>` | `~/.claude/projects` | セッション格納ルートディレクトリ |
| `--no-open` | false | 起動時にブラウザを自動で開かない |
| `--help`, `-h` | - | ヘルプ表示 |
| `--version`, `-v` | - | バージョン表示 |

### 起動時の挙動

1. `--projects-dir` 配下をスキャンしてプロジェクト / セッションファイルを列挙
2. 指定ポートで HTTP サーバーを起動
3. 標準出力に URL（例: `http://127.0.0.1:7777`）を表示
4. `--no-open` 指定がなければ `open` コマンド等でブラウザを起動
5. `Ctrl+C` で graceful にシャットダウン

### 実行例

```
$ npx @kt3k/cc-session-viewer
cc-session-viewer v0.1.0
Scanning ~/.claude/projects ... 12 projects, 238 sessions
Listening on http://127.0.0.1:7777
```

## HTTP サーバー仕様

### ルーティング

| Method | Path | 説明 |
|---|---|---|
| GET | `/` | セッション一覧 UI（HTML） |
| GET | `/sessions/:sessionId` | セッション詳細 UI（HTML、SPA の場合は `/` と同じエントリ） |
| GET | `/api/projects` | プロジェクト一覧 JSON |
| GET | `/api/sessions` | 全セッションのメタ情報一覧 JSON（プロジェクト横断） |
| GET | `/api/sessions/:sessionId` | 特定セッションの全イベント JSON（正規化済） |
| GET | `/api/sessions/:sessionId/raw` | 元の JSONL をそのまま返す（デバッグ用） |
| GET | `/assets/*` | 静的アセット（CSS / JS / フォント等） |

### API レスポンス例

`GET /api/sessions`:

```json
[
  {
    "sessionId": "9dc78755-...",
    "projectPath": "/Users/kt3k/oss/cc-session-viewer",
    "firstTimestamp": "2026-04-11T08:09:30.675Z",
    "lastTimestamp": "2026-04-11T08:42:10.123Z",
    "messageCount": 42,
    "firstUserMessage": "claude code のセッションを visualize する ...",
    "gitBranch": "main",
    "cwd": "/Users/kt3k/oss/cc-session-viewer",
    "sizeBytes": 184320
  }
]
```

`GET /api/sessions/:sessionId`:

```json
{
  "sessionId": "9dc78755-...",
  "meta": { "projectPath": "...", "cwd": "...", "gitBranch": "...", "version": "2.1.101" },
  "events": [
    {
      "uuid": "...",
      "parentUuid": null,
      "type": "user",
      "timestamp": "2026-04-11T08:09:30.675Z",
      "isSidechain": false,
      "content": [{ "type": "text", "text": "..." }]
    },
    {
      "uuid": "...",
      "type": "assistant",
      "timestamp": "...",
      "content": [
        { "type": "text", "text": "..." },
        { "type": "tool_use", "name": "Read", "input": { "file_path": "..." } }
      ]
    },
    {
      "uuid": "...",
      "type": "tool_result",
      "toolUseId": "...",
      "content": "file contents ..."
    }
  ]
}
```

- セキュリティのためサーバーは `127.0.0.1` にのみバインドし、CORS は拒否する
- ファイルは読み取り専用。書き込み系エンドポイントは提供しない

## UI 仕様

### 画面 1: セッション一覧（`/`）

- 左サイドバー: プロジェクト一覧（セッション数バッジ付き）。クリックでフィルタ
- メイン: セッションカード / テーブル
  - 項目: 日時（`lastTimestamp`）、最初のユーザー発話の冒頭、メッセージ数、git ブランチ、サイズ
  - 行クリックで詳細画面に遷移
- ヘッダー: 検索ボックス（セッション内容を簡易全文検索）、ソート切替（日時 / サイズ / メッセージ数）

### 画面 2: セッション詳細（`/sessions/:id`）

- ヘッダー: セッションメタ（プロジェクトパス、`cwd`、ブランチ、開始・終了時刻、バージョン）
- 本文: 会話のタイムライン表示
  - **user メッセージ**: 右寄せ吹き出し風
  - **assistant テキスト**: 左寄せ、Markdown レンダリング
  - **thinking ブロック**: 折りたたみ表示（デフォルト閉）
  - **tool_use**: ツール名・入力引数をハイライトしたカード。ツール種別ごとに小さなアイコン
    - `Read` / `Write` / `Edit`: ファイルパスを強調。差分は `diff` 風に表示
    - `Bash`: コマンドを等幅フォントで表示
    - `Grep` / `Glob`: クエリ表示
    - それ以外: 汎用カード
  - **tool_result**: `tool_use` に紐付けて折りたたみ表示（長い結果は省略 + 展開）
  - **sidechain（サブエージェント）**: インデント + 色分けで視覚的に区別
- 左ペイン（オプション）: 目次（各ユーザー発話のジャンプリンク）
- キーボードショートカット: `j` / `k` で次/前のメッセージ、`/` で検索、`g` で一覧に戻る

### スタイル方針

- ダーク / ライトテーマ切替（OS のカラースキームに追従）
- 等幅フォントはコードとツール呼び出しに、UI 本体はサンセリフ
- 外部 CDN への依存を避け、必要なアセットはバンドルして配布

## アーキテクチャ

### モジュール構成

```
src/
  cli.ts              # エントリポイント。引数パース & サーバー起動
  server.ts           # HTTP サーバー（node:http ベース）
  router.ts           # ルーティング & ハンドラ
  scanner.ts          # ~/.claude/projects のスキャン
  session_loader.ts   # JSONL 読み込み & イベント正規化
  session_parser.ts   # 行タイプごとの解釈、sidechain 判定
  types.ts            # 型定義
  assets/             # フロントエンド（HTML/CSS/JS）
    index.html
    app.js
    style.css
test/
  session_parser_test.ts
  scanner_test.ts
fixtures/             # テスト用 jsonl
deno.json             # Deno タスク定義（dev/test 用）
package.json          # npm パッケージメタデータ・依存定義
spec.md               # 本仕様書
README.md
```

### 依存

- Node 互換の built-in モジュール中心（`node:http`, `node:fs`, `node:path`, `node:url`, `node:util`）
- `open`: ブラウザ自動起動用 npm パッケージ
- `deno-test`: テスト用（devDependencies）— Node 上で `Deno.test` を実行可能にする
- Markdown レンダラはフロントエンド側で軽量ライブラリ（例: `marked`）をバンドル
- シンタックスハイライトは必要に応じて `highlight.js` の軽量ビルドをバンドル

### 開発時の権限（Deno flags）

`deno.json` の `tasks` に開発用の実行コマンドを定義。Deno で実行する場合は以下の権限が必要:

- `--allow-read` : セッションファイル & 静的アセット
- `--allow-net=127.0.0.1` : HTTP サーバー
- `--allow-env=HOME` : ホームディレクトリ解決
- `--allow-run=open,xdg-open,start` : ブラウザ自動起動

### パフォーマンス方針

- セッション一覧はメタ情報のみを先読みし、`.jsonl` 全体をパースしない（ファイル先頭と末尾数行だけ読む最適化を検討）
- 詳細画面アクセス時に該当セッションをストリーミングでパースしてレスポンス
- メモリキャッシュは LRU で数セッション分のみ保持
- ファイル監視は v1 ではスコープ外（必要になれば `fs.watch` で追加）

## エラーハンドリング

- `projects-dir` が存在しない: 警告を表示しつつ空状態の UI を返す
- 破損した JSON 行: その行のみスキップしログに警告出力。セッションは継続して読み込む
- 指定ポートが使用中: エラーメッセージと代替ポート案内を表示して終了（exit code 1）

## テスト

- `scanner` / `session_parser` は fixtures の `.jsonl` を使ってユニットテスト（`Deno.test` 使用）
- HTTP ハンドラは直接呼び出して検証
- テストは `deno test` で実行。`deno-test` パッケージにより Node 上でも `Deno.test` を実行可能
- UI はスクリーンショットテストまでは行わず、API 経由での確認に留める（v1）

## 将来の拡張候補

- 全文検索インデックス（Lunr 等）
- セッション同士の diff / 統計ビュー（ツール使用回数、トークン量、経過時間）
- お気に入り / タグ付け
- エクスポート（Markdown / HTML）
- 単一バイナリ配布
