import { assertEquals } from "@std/assert";
import * as path from "node:path";
import { decodeProjectPath, scanProjects } from "../src/scanner.ts";

const fixturesDir = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../fixtures",
);

Deno.test("decodeProjectPath restores slashes", () => {
  assertEquals(
    decodeProjectPath("-Users-kt3k-oss-foo"),
    "/Users/kt3k/oss/foo",
  );
});

Deno.test("decodeProjectPath handles root", () => {
  assertEquals(decodeProjectPath("-"), "/");
});

Deno.test("scanProjects finds projects in fixtures", () => {
  const projects = scanProjects(fixturesDir);
  const names = projects.map((p) => p.encodedPath).sort();
  assertEquals(names, [
    "-Users-test-project-alpha",
    "-Users-test-project-beta",
  ]);
});

Deno.test("scanProjects returns correct session files per project", () => {
  const projects = scanProjects(fixturesDir);
  const alpha = projects.find(
    (p) => p.encodedPath === "-Users-test-project-alpha",
  )!;
  const beta = projects.find(
    (p) => p.encodedPath === "-Users-test-project-beta",
  )!;

  // alpha has 2 session files, beta has 1
  assertEquals(alpha.sessionFiles.length, 2);
  assertEquals(beta.sessionFiles.length, 1);

  // Files should be .jsonl only, not memory/ contents
  for (const f of alpha.sessionFiles) {
    assertEquals(f.endsWith(".jsonl"), true);
    assertEquals(f.includes("memory"), false);
  }
});

Deno.test("scanProjects excludes memory subdirectory", () => {
  const projects = scanProjects(fixturesDir);
  const alpha = projects.find(
    (p) => p.encodedPath === "-Users-test-project-alpha",
  )!;

  // No files from memory/ should be included
  for (const f of alpha.sessionFiles) {
    assertEquals(f.includes("memory"), false);
  }
});

Deno.test("scanProjects returns empty for non-existent dir", () => {
  const projects = scanProjects("/non/existent/path");
  assertEquals(projects, []);
});
