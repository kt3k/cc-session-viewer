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

/**
 * Parse all lines from a JSONL string into normalized events.
 * Corrupted lines are silently skipped.
 */
export function parseSessionEvents(jsonlContent: string): SessionEvent[] {
  const lines = jsonlContent.split("\n");
  const events: SessionEvent[] = [];

  for (const line of lines) {
    const raw = parseJsonlLine(line);
    if (!raw) continue;

    const event = normalizeEvent(raw);
    if (event) {
      events.push(event);
    }
  }

  return events;
}
