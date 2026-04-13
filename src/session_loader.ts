import * as fs from "node:fs";
import * as path from "node:path";
import { Buffer } from "node:buffer";
import type { SessionDetail, SessionEvent, SessionMeta } from "./types.ts";
import { parseJsonlLine, normalizeEvent } from "./session_parser.ts";

/**
 * Load a session file fully: parse all lines, extract metadata and events.
 */
export function loadSession(filePath: string): SessionDetail {
  const content = fs.readFileSync(filePath, "utf-8");
  const stat = fs.statSync(filePath);
  const sessionId = path.basename(filePath, ".jsonl");

  const events: SessionEvent[] = [];
  let cwd: string | undefined;
  let gitBranch: string | undefined;
  let version: string | undefined;
  let projectPath = "";
  let firstTimestamp: string | undefined;
  let lastTimestamp: string | undefined;
  let firstUserMessage: string | undefined;
  let messageCount = 0;

  for (const line of content.split("\n")) {
    const raw = parseJsonlLine(line);
    if (!raw) continue;

    // Extract metadata from any line that has it
    if (raw.cwd && !cwd) cwd = raw.cwd;
    if (raw.gitBranch && !gitBranch) gitBranch = raw.gitBranch;
    if (raw.version && !version) version = raw.version;

    const event = normalizeEvent(raw);
    if (!event) continue;

    events.push(event);

    // Track timestamps
    if (event.timestamp) {
      if (!firstTimestamp) firstTimestamp = event.timestamp;
      lastTimestamp = event.timestamp;
    }

    // Count user and assistant messages
    if (event.type === "user" || event.type === "assistant") {
      messageCount++;
    }

    // Extract first user message text
    if (event.type === "user" && !firstUserMessage) {
      firstUserMessage = extractTextFromEvent(event);
    }
  }

  const meta: SessionMeta = {
    sessionId,
    projectPath,
    cwd,
    gitBranch,
    firstTimestamp,
    lastTimestamp,
    messageCount,
    firstUserMessage,
    sizeBytes: stat.size,
  };

  return { sessionId, meta, events };
}

/**
 * Load only metadata from a session file without full parsing.
 * Reads the first few lines and last few lines for speed.
 */
export function loadSessionMeta(
  filePath: string,
  projectPath: string,
): SessionMeta {
  const stat = fs.statSync(filePath);
  const sessionId = path.basename(filePath, ".jsonl");

  const fd = fs.openSync(filePath, "r");
  try {
    const fileSize = stat.size;
    // Read first 4KB for metadata and first user message
    const headSize = Math.min(fileSize, 4096);
    const headBuf = Buffer.alloc(headSize);
    fs.readSync(fd, headBuf, 0, headSize, 0);
    const headText = headBuf.toString("utf-8");
    const headLines = headText.split("\n");

    // Read last 2KB for last timestamp
    const tailSize = Math.min(fileSize, 2048);
    const tailBuf = Buffer.alloc(tailSize);
    fs.readSync(fd, tailBuf, 0, tailSize, fileSize - tailSize);
    const tailText = tailBuf.toString("utf-8");
    const tailLines = tailText.split("\n");

    let cwd: string | undefined;
    let gitBranch: string | undefined;
    let firstTimestamp: string | undefined;
    let lastTimestamp: string | undefined;
    let firstUserMessage: string | undefined;
    let messageCount = 0;

    // Parse head lines
    for (const line of headLines) {
      const raw = parseJsonlLine(line);
      if (!raw) continue;

      if (raw.cwd && !cwd) cwd = raw.cwd;
      if (raw.gitBranch && !gitBranch) gitBranch = raw.gitBranch;

      const event = normalizeEvent(raw);
      if (!event) continue;

      if (event.timestamp && !firstTimestamp) {
        firstTimestamp = event.timestamp;
      }
      if (event.type === "user" || event.type === "assistant") {
        messageCount++;
      }
      if (event.type === "user" && !firstUserMessage) {
        firstUserMessage = extractTextFromEvent(event);
      }
    }

    // Parse tail lines for last timestamp and additional message count
    for (const line of tailLines) {
      const raw = parseJsonlLine(line);
      if (!raw) continue;

      const event = normalizeEvent(raw);
      if (!event) continue;

      if (event.timestamp) {
        lastTimestamp = event.timestamp;
      }
    }

    // For small files, head covers everything so messageCount is accurate.
    // For large files, this is an approximation from head only.
    // Full count requires full parse, but we trade accuracy for speed.

    return {
      sessionId,
      projectPath,
      cwd,
      gitBranch,
      firstTimestamp,
      lastTimestamp,
      messageCount,
      firstUserMessage,
      sizeBytes: fileSize,
    };
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Extract plain text from a session event's content.
 */
function extractTextFromEvent(event: SessionEvent): string | undefined {
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
