/** Information about a discovered project directory. */
export interface ProjectInfo {
  /** The encoded directory name (e.g. "-Users-kt3k-oss-foo") */
  encodedPath: string;
  /** The decoded original project path (e.g. "/Users/kt3k/oss/foo") */
  projectPath: string;
  /** Absolute paths to session JSONL files in this project */
  sessionFiles: string[];
}

/** Metadata extracted from a session without full parsing. */
export interface SessionMeta {
  sessionId: string;
  projectPath: string;
  /** Working directory recorded in the session */
  cwd?: string;
  gitBranch?: string;
  firstTimestamp?: string;
  lastTimestamp?: string;
  messageCount: number;
  /** The first user message text (truncated) */
  firstUserMessage?: string;
  /** File size in bytes */
  sizeBytes: number;
}

/** A content block inside a message. */
export type ContentBlock =
  | TextBlock
  | ToolUseBlock
  | ToolResultBlock
  | ThinkingBlock
  | ImageBlock;

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string | ContentBlock[];
}

export interface ThinkingBlock {
  type: "thinking";
  thinking: string;
}

export interface ImageBlock {
  type: "image";
  source: Record<string, unknown>;
}

/** A normalized event from a session timeline. */
export interface SessionEvent {
  uuid: string;
  parentUuid?: string;
  type: "user" | "assistant" | "tool_result" | "summary" | "permission-mode";
  timestamp?: string;
  isSidechain: boolean;
  content: ContentBlock[] | string;
  /** Original JSONL line type for reference */
  rawType?: string;
}

/** Full session data returned by the detail API. */
export interface SessionDetail {
  sessionId: string;
  meta: SessionMeta;
  events: SessionEvent[];
}

/** A raw parsed line from the JSONL file. */
export interface RawJsonlLine {
  type: string;
  uuid?: string;
  parentUuid?: string;
  timestamp?: string;
  sessionId?: string;
  cwd?: string;
  gitBranch?: string;
  version?: string;
  isSidechain?: boolean;
  message?: {
    role?: string;
    content?: string | ContentBlock[];
  };
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}
