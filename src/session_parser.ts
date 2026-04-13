import type { ContentBlock, RawJsonlLine, SessionEvent } from "./types.ts";

/**
 * Parse a single JSONL line into a RawJsonlLine, or return null if corrupted.
 */
export function parseJsonlLine(line: string): RawJsonlLine | null {
  if (!line.trim()) return null;
  try {
    return JSON.parse(line) as RawJsonlLine;
  } catch {
    return null;
  }
}

/**
 * Convert a raw JSONL line into a normalized SessionEvent, or return null
 * if the line type is not displayable (e.g. file-history-snapshot, progress, system).
 */
export function normalizeEvent(raw: RawJsonlLine): SessionEvent | null {
  switch (raw.type) {
    case "user":
      return normalizeUserEvent(raw);
    case "assistant":
      return normalizeAssistantEvent(raw);
    case "summary":
      return normalizeSummaryEvent(raw);
    case "permission-mode":
      return normalizePermissionModeEvent(raw);
    default:
      // Skip non-displayable types: file-history-snapshot, progress, system, last-prompt, etc.
      return null;
  }
}

function buildBaseEvent(
  raw: RawJsonlLine,
  type: SessionEvent["type"],
  content: ContentBlock[] | string,
): SessionEvent {
  return {
    uuid: raw.uuid ?? "",
    parentUuid: raw.parentUuid ?? undefined,
    type,
    timestamp: raw.timestamp,
    isSidechain: raw.isSidechain ?? false,
    content,
    rawType: raw.type,
  };
}

function normalizeMessageContent(raw: RawJsonlLine): ContentBlock[] {
  const messageContent = raw.message?.content;
  if (Array.isArray(messageContent)) {
    return messageContent as ContentBlock[];
  }
  if (typeof messageContent === "string") {
    return [{ type: "text", text: messageContent }];
  }
  return [];
}

function normalizeUserEvent(raw: RawJsonlLine): SessionEvent {
  const content = normalizeMessageContent(raw);

  const isToolResult =
    content.length > 0 &&
    content.every((b) => b.type === "tool_result");

  return buildBaseEvent(raw, isToolResult ? "tool_result" : "user", content);
}

function normalizeAssistantEvent(raw: RawJsonlLine): SessionEvent {
  return buildBaseEvent(raw, "assistant", normalizeMessageContent(raw));
}

function normalizeSummaryEvent(raw: RawJsonlLine): SessionEvent {
  return buildBaseEvent(raw, "summary", raw.summary ?? raw.message?.content ?? "");
}

function normalizePermissionModeEvent(raw: RawJsonlLine): SessionEvent {
  return buildBaseEvent(raw, "permission-mode", raw.permissionMode ?? "");
}

/** Metadata fields extracted during parsing. */
export interface ParsedSessionData {
  events: SessionEvent[];
  cwd?: string;
  gitBranch?: string;
  version?: string;
  firstTimestamp?: string;
  lastTimestamp?: string;
  messageCount: number;
  firstUserMessage?: string;
}

/**
 * Parse all lines from a JSONL string, returning normalized events
 * and extracted metadata in a single pass.
 * Corrupted lines are silently skipped.
 */
export function parseSessionData(jsonlContent: string): ParsedSessionData {
  const lines = jsonlContent.split("\n");
  const events: SessionEvent[] = [];
  let cwd: string | undefined;
  let gitBranch: string | undefined;
  let version: string | undefined;
  let firstTimestamp: string | undefined;
  let lastTimestamp: string | undefined;
  let firstUserMessage: string | undefined;
  let messageCount = 0;

  for (const line of lines) {
    const raw = parseJsonlLine(line);
    if (!raw) continue;

    if (raw.cwd && !cwd) cwd = raw.cwd;
    if (raw.gitBranch && !gitBranch) gitBranch = raw.gitBranch;
    if (raw.version && !version) version = raw.version;

    const event = normalizeEvent(raw);
    if (!event) continue;

    events.push(event);

    if (event.timestamp) {
      if (!firstTimestamp) firstTimestamp = event.timestamp;
      lastTimestamp = event.timestamp;
    }
    if (event.type === "user" || event.type === "assistant") {
      messageCount++;
    }
    if (event.type === "user" && !firstUserMessage) {
      firstUserMessage = extractTextFromEvent(event);
    }
  }

  return {
    events,
    cwd,
    gitBranch,
    version,
    firstTimestamp,
    lastTimestamp,
    messageCount,
    firstUserMessage,
  };
}

/**
 * Extract plain text from a session event's content (truncated to 200 chars).
 */
export function extractTextFromEvent(event: SessionEvent): string | undefined {
  if (typeof event.content === "string") {
    return event.content.slice(0, 200);
  }
  if (Array.isArray(event.content)) {
    for (const block of event.content) {
      if (block.type === "text") {
        return block.text.slice(0, 200);
      }
    }
  }
  return undefined;
}
