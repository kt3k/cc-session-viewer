# Domain Model — cc-session-viewer

## Context Map

### Session Viewing（単一コンテキスト）

セッションデータの読み取り・パース・表示を担当する唯一のコンテキスト。

**含まれるモジュール:**
- `src/scanner.ts` — プロジェクト・セッションファイルの発見
- `src/session_parser.ts` — JSONL データのパース・正規化
- `src/types.ts` — ドメイン型定義

**外部依存:**

| 依存先 | 関係 | 統合パターン |
|--------|------|-------------|
| Claude Code セッションデータ (`~/.claude/projects/`) | Upstream（読み取り専用） | ファイルシステム直接読み取り。`RawJsonlLine` が境界型として機能 |

## Glossary

| 用語 | 定義 | コード上の表現 | 備考 |
|------|------|---------------|------|
| **Project** | Claude Code が操作対象としたプロジェクトディレクトリ | `ProjectInfo` (`types.ts`) | — |
| **Session** | 1回の Claude Code 対話セッション。JSONL ファイル1つに対応 | `SessionMeta`, `SessionDetail` (`types.ts`) | — |
| **Event** | セッション内の1つのやり取り | `SessionEvent` (`types.ts`) | 生データでは `message`（Anthropic API 由来） |
| **ContentBlock** | メッセージ内の1つのコンテンツ単位 | `ContentBlock` union type (`types.ts`) | — |
| **Sidechain** | メイン会話から分岐したサブエージェント処理 | `isSidechain` フラグ (`SessionEvent`) | 独立した型として未定義 |
| **EncodedPath** | プロジェクトパスのエンコード形式（`/` → `-`） | `encodedPath`, `decodeProjectPath()` | 値オブジェクトとして未型付け |

### 既知の不整合

- **Scanner** — インフラ用語。ドメイン的には `ProjectRepository` / `ProjectFinder` が適切
- **Normalize** — 技術用語。`parseEvent` / `toSessionEvent` の方が意図が明確
- **RawJsonlLine** — インフラ層の型がドメイン型と同じファイル (`types.ts`) に同居

## Aggregates

### Project

Claude Code が操作対象としたプロジェクトディレクトリ。セッションファイルの集合を保持する。

- **ルート**: `ProjectInfo` (`src/types.ts:2`)
- **値オブジェクト**: `encodedPath`, `projectPath`
- **関連**: `sessionFiles` (string[])
- **不変条件**: `projectPath` は `encodedPath` から一意に導出可能。`sessionFiles` は `.jsonl` のみ。
- **構築**: `scanProjects()` (`src/scanner.ts:20`)

### Session

1回の Claude Code 対話セッション。メタデータとイベント列から構成される。

- **ルート**: `SessionDetail` (`src/types.ts:76`)
- **エンティティ**: `SessionMeta`, `SessionEvent`
- **値オブジェクト**: `ContentBlock` (`TextBlock`, `ToolUseBlock`, `ToolResultBlock`, `ThinkingBlock`, `ImageBlock`)
- **境界型**: `RawJsonlLine` (`src/types.ts:83`) — JSONL パース直後の生データ。`normalizeEvent()` で `SessionEvent` へ変換
- **不変条件**: 各 Event は `uuid` を持つ。`type` は `"user" | "assistant" | "tool_result" | "summary" | "permission-mode"` のいずれか。
- **パース**: `parseSessionEvents()`, `normalizeEvent()` (`src/session_parser.ts`)
