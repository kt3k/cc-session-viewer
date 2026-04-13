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

function normalizeUserEvent(raw: RawJsonlLine): SessionEvent {
  const messageContent = raw.message?.content;
  let content: ContentBlock[] | string;

  if (typeof messageContent === "string") {
    content = [{ type: "text", text: messageContent }];
  } else if (Array.isArray(messageContent)) {
    // Could be tool_result blocks or text blocks
    content = messageContent as ContentBlock[];
  } else {
    content = [];
  }

  // Check if this is actually a tool_result message
  const isToolResult =
    Array.isArray(content) &&
    content.length > 0 &&
    content.every((b) => "type" in b && b.type === "tool_result");

  return {
    uuid: raw.uuid ?? "",
    parentUuid: raw.parentUuid ?? undefined,
    type: isToolResult ? "tool_result" : "user",
    timestamp: raw.timestamp,
    isSidechain: raw.isSidechain ?? false,
    content,
    rawType: raw.type,
  };
}

function normalizeAssistantEvent(raw: RawJsonlLine): SessionEvent {
  const messageContent = raw.message?.content;
  let content: ContentBlock[];

  if (Array.isArray(messageContent)) {
    content = messageContent as ContentBlock[];
  } else if (typeof messageContent === "string") {
    content = [{ type: "text", text: messageContent }];
  } else {
    content = [];
  }

  return {
    uuid: raw.uuid ?? "",
    parentUuid: raw.parentUuid ?? undefined,
    type: "assistant",
    timestamp: raw.timestamp,
    isSidechain: raw.isSidechain ?? false,
    content,
    rawType: raw.type,
  };
}

function normalizeSummaryEvent(raw: RawJsonlLine): SessionEvent {
  return {
    uuid: raw.uuid ?? "",
    parentUuid: raw.parentUuid ?? undefined,
    type: "summary",
    timestamp: raw.timestamp,
    isSidechain: raw.isSidechain ?? false,
    content: raw.summary ?? raw.message?.content ?? "",
    rawType: raw.type,
  };
}

function normalizePermissionModeEvent(raw: RawJsonlLine): SessionEvent {
  return {
    uuid: raw.uuid ?? "",
    parentUuid: raw.parentUuid ?? undefined,
    type: "permission-mode",
    timestamp: raw.timestamp,
    isSidechain: raw.isSidechain ?? false,
    content: raw.permissionMode ?? "",
    rawType: raw.type,
  };
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
