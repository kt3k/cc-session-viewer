# Domain Model — cc-session-viewer

## Context Map

### Session Viewing (Single Context)

The sole bounded context responsible for reading, parsing, and displaying
session data.

**Modules:**

- `src/scanner.ts` — Discovery of projects and session files
- `src/session_parser.ts` — Parsing and normalization of JSONL data
- `src/types.ts` — Domain type definitions

**External Dependencies:**

| Dependency                                       | Relationship         | Integration Pattern                                                 |
| ------------------------------------------------ | -------------------- | ------------------------------------------------------------------- |
| Claude Code session data (`~/.claude/projects/`) | Upstream (read-only) | Direct filesystem reads. `RawJsonlLine` serves as the boundary type |

## Glossary

| Term             | Definition                                                               | Code Representation                         | Notes                                             |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------- |
| **Project**      | A project directory that Claude Code has operated on                     | `ProjectInfo` (`types.ts`)                  | —                                                 |
| **Session**      | A single Claude Code conversation session. Corresponds to one JSONL file | `SessionMeta`, `SessionDetail` (`types.ts`) | —                                                 |
| **Event**        | A single interaction within a session                                    | `SessionEvent` (`types.ts`)                 | Called `message` in raw data (from Anthropic API) |
| **ContentBlock** | A single content unit within a message                                   | `ContentBlock` union type (`types.ts`)      | —                                                 |
| **Sidechain**    | A sub-agent execution branching from the main conversation               | `isSidechain` flag (`SessionEvent`)         | Not yet defined as a standalone type              |
| **EncodedPath**  | Encoded form of a project path (`/` → `-`)                               | `encodedPath`, `decodeProjectPath()`        | Not typed as a value object                       |

### Known Inconsistencies

- **Scanner** — Infrastructure terminology. `ProjectRepository` /
  `ProjectFinder` would be more domain-appropriate
- **Normalize** — Technical terminology. `parseEvent` / `toSessionEvent` would
  convey intent more clearly
- **RawJsonlLine** — Infrastructure-layer type coexists with domain types in the
  same file (`types.ts`)

## Aggregates

### Project

A project directory that Claude Code has operated on. Holds a collection of
session files.

- **Root**: `ProjectInfo` (`src/types.ts:2`)
- **Value Objects**: `encodedPath`, `projectPath`
- **Associations**: `sessionFiles` (string[])
- **Invariants**: `projectPath` is uniquely derivable from `encodedPath`.
  `sessionFiles` contains only `.jsonl` files.
- **Construction**: `scanProjects()` (`src/scanner.ts:20`)

### Session

A single Claude Code conversation session. Composed of metadata and a sequence
of events.

- **Root**: `SessionDetail` (`src/types.ts:76`)
- **Entities**: `SessionMeta`, `SessionEvent`
- **Value Objects**: `ContentBlock` (`TextBlock`, `ToolUseBlock`,
  `ToolResultBlock`, `ThinkingBlock`, `ImageBlock`)
- **Boundary Type**: `RawJsonlLine` (`src/types.ts:83`) — Raw data immediately
  after JSONL parsing. Converted to `SessionEvent` via `normalizeEvent()`
- **Invariants**: Each Event has a `uuid`. `type` is one of
  `"user" | "assistant" | "tool_result" | "summary" | "permission-mode"`.
- **Parsing**: `parseSessionEvents()`, `normalizeEvent()`
  (`src/session_parser.ts`)
