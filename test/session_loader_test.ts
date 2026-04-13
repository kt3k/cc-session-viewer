import { assertEquals } from "@std/assert";
import * as path from "node:path";
import { loadSession, loadSessionMeta } from "../src/session_loader.ts";

const fixturesDir = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../fixtures",
);

const normalFile = path.join(
  fixturesDir,
  "-Users-test-project-alpha",
  "session-normal.jsonl",
);
const sidechainFile = path.join(
  fixturesDir,
  "-Users-test-project-alpha",
  "session-sidechain.jsonl",
);
const corruptedFile = path.join(
  fixturesDir,
  "-Users-test-project-beta",
  "session-corrupted.jsonl",
);

Deno.test("loadSession parses normal session", () => {
  const session = loadSession(normalFile);
  assertEquals(session.sessionId, "session-normal");
  assertEquals(session.meta.cwd, "/Users/test/project-alpha");
  assertEquals(session.meta.gitBranch, "main");
  assertEquals(session.meta.firstUserMessage, "Hello, can you read the file?");
  // 3 user + 3 assistant = 6 messages (tool_result counted as tool_result, not user)
  assertEquals(session.events.length, 6);
  assertEquals(session.meta.firstTimestamp, "2026-04-10T10:00:00.000Z");
  assertEquals(session.meta.lastTimestamp, "2026-04-10T10:00:20.000Z");
});

Deno.test("loadSession parses sidechain session", () => {
  const session = loadSession(sidechainFile);
  assertEquals(session.sessionId, "session-sidechain");
  assertEquals(session.meta.gitBranch, "feature-x");

  const sidechainEvents = session.events.filter((e) => e.isSidechain);
  assertEquals(sidechainEvents.length > 0, true);
});

Deno.test("loadSession handles corrupted lines", () => {
  const session = loadSession(corruptedFile);
  assertEquals(session.sessionId, "session-corrupted");
  // 2 corrupted lines skipped, 3 valid lines remain (1 user, 1 assistant, 1 user)
  assertEquals(session.events.length, 3);
});

Deno.test("loadSessionMeta extracts metadata", () => {
  const meta = loadSessionMeta(normalFile, "/Users/test/project-alpha");
  assertEquals(meta.sessionId, "session-normal");
  assertEquals(meta.projectPath, "/Users/test/project-alpha");
  assertEquals(meta.cwd, "/Users/test/project-alpha");
  assertEquals(meta.gitBranch, "main");
  assertEquals(meta.firstUserMessage, "Hello, can you read the file?");
  assertEquals(meta.sizeBytes > 0, true);
});

Deno.test("loadSessionMeta has timestamps", () => {
  const meta = loadSessionMeta(normalFile, "/Users/test/project-alpha");
  assertEquals(meta.firstTimestamp, "2026-04-10T10:00:00.000Z");
  assertEquals(meta.lastTimestamp, "2026-04-10T10:00:20.000Z");
});
