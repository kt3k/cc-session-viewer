import { assertEquals } from "@std/assert";
import {
  extractTextFromEvent,
  normalizeEvent,
  parseJsonlLine,
  parseSessionData,
} from "../src/session_parser.ts";

Deno.test("parseJsonlLine parses valid JSON", () => {
  const result = parseJsonlLine('{"type":"user","uuid":"u1"}');
  assertEquals(result?.type, "user");
  assertEquals(result?.uuid, "u1");
});

Deno.test("parseJsonlLine returns null for invalid JSON", () => {
  assertEquals(parseJsonlLine("NOT VALID JSON"), null);
  assertEquals(parseJsonlLine("{truncated"), null);
});

Deno.test("parseJsonlLine returns null for empty line", () => {
  assertEquals(parseJsonlLine(""), null);
  assertEquals(parseJsonlLine("  "), null);
});

Deno.test("normalizeEvent handles user with string content", () => {
  const raw = {
    type: "user",
    uuid: "u1",
    timestamp: "2026-01-01T00:00:00Z",
    isSidechain: false,
    message: { role: "user", content: "Hello" },
  };
  const event = normalizeEvent(raw);
  assertEquals(event?.type, "user");
  assertEquals(event?.content, [{ type: "text", text: "Hello" }]);
});

Deno.test("normalizeEvent handles user with tool_result content", () => {
  const raw = {
    type: "user",
    uuid: "u2",
    isSidechain: false,
    message: {
      role: "user",
      content: [
        {
          type: "tool_result" as const,
          tool_use_id: "t1",
          content: "result text",
        },
      ],
    },
  };
  const event = normalizeEvent(raw);
  assertEquals(event?.type, "tool_result");
});

Deno.test("normalizeEvent handles assistant with content blocks", () => {
  const raw = {
    type: "assistant",
    uuid: "a1",
    isSidechain: false,
    message: {
      role: "assistant",
      content: [
        { type: "thinking" as const, thinking: "hmm" },
        { type: "text" as const, text: "Here you go" },
        {
          type: "tool_use" as const,
          id: "t1",
          name: "Read",
          input: { file_path: "x" },
        },
      ],
    },
  };
  const event = normalizeEvent(raw);
  assertEquals(event?.type, "assistant");
  assertEquals(Array.isArray(event?.content), true);
  assertEquals((event?.content as unknown[]).length, 3);
});

Deno.test("normalizeEvent skips non-displayable types", () => {
  assertEquals(normalizeEvent({ type: "file-history-snapshot" }), null);
  assertEquals(normalizeEvent({ type: "progress" }), null);
  assertEquals(normalizeEvent({ type: "system" }), null);
  assertEquals(normalizeEvent({ type: "last-prompt" }), null);
});

Deno.test("normalizeEvent handles sidechain flag", () => {
  const raw = {
    type: "user",
    uuid: "s1",
    isSidechain: true,
    message: { role: "user", content: "sidechain msg" },
  };
  const event = normalizeEvent(raw);
  assertEquals(event?.isSidechain, true);
});

Deno.test("parseSessionData extracts metadata and events", () => {
  const jsonl = [
    '{"type":"user","uuid":"u1","timestamp":"2026-01-01T10:00:00Z","isSidechain":false,"message":{"role":"user","content":"Hello"},"cwd":"/test","gitBranch":"main"}',
    '{"type":"assistant","uuid":"a1","timestamp":"2026-01-01T10:00:05Z","isSidechain":false,"message":{"role":"assistant","content":[{"type":"text","text":"Hi"}]}}',
  ].join("\n");

  const data = parseSessionData(jsonl);
  assertEquals(data.events.length, 2);
  assertEquals(data.cwd, "/test");
  assertEquals(data.gitBranch, "main");
  assertEquals(data.firstTimestamp, "2026-01-01T10:00:00Z");
  assertEquals(data.lastTimestamp, "2026-01-01T10:00:05Z");
  assertEquals(data.messageCount, 2);
  assertEquals(data.firstUserMessage, "Hello");
});

Deno.test("parseSessionData skips corrupted lines", () => {
  const jsonl = [
    '{"type":"user","uuid":"u1","isSidechain":false,"message":{"role":"user","content":"Hello"}}',
    "CORRUPTED LINE",
    '{"type":"assistant","uuid":"a1","isSidechain":false,"message":{"role":"assistant","content":[{"type":"text","text":"Hi"}]}}',
  ].join("\n");

  const data = parseSessionData(jsonl);
  assertEquals(data.events.length, 2);
});

Deno.test("extractTextFromEvent from text content block", () => {
  const event = {
    uuid: "u1",
    type: "user" as const,
    isSidechain: false,
    content: [{ type: "text" as const, text: "Hello world" }],
  };
  assertEquals(extractTextFromEvent(event), "Hello world");
});

Deno.test("extractTextFromEvent from string content", () => {
  const event = {
    uuid: "u1",
    type: "summary" as const,
    isSidechain: false,
    content: "Summary text here",
  };
  assertEquals(extractTextFromEvent(event), "Summary text here");
});

Deno.test("extractTextFromEvent truncates to 200 chars", () => {
  const longText = "a".repeat(300);
  const event = {
    uuid: "u1",
    type: "user" as const,
    isSidechain: false,
    content: [{ type: "text" as const, text: longText }],
  };
  assertEquals(extractTextFromEvent(event)?.length, 200);
});
