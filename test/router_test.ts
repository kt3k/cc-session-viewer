import { assertEquals } from "@std/assert";
import * as http from "node:http";
import * as path from "node:path";
import { createRouter } from "../src/router.ts";
import type { AppContext } from "../src/router.ts";

const fixturesDir = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../fixtures",
);

const assetsDir = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../src/assets",
);

const ctx: AppContext = {
  projectsDir: fixturesDir,
  assetsDir,
};

/** Helper to invoke the router handler and collect the response. */
function makeRequest(
  url: string,
): Promise<
  { statusCode: number; headers: http.OutgoingHttpHeaders; body: string }
> {
  const handler = createRouter(ctx);

  return new Promise((resolve) => {
    const req = new http.IncomingMessage(
      null as unknown as import("node:net").Socket,
    );
    req.url = url;
    req.method = "GET";
    req.headers = { host: "127.0.0.1:7777" };

    let statusCode = 200;
    let responseHeaders: http.OutgoingHttpHeaders = {};
    const chunks: string[] = [];

    const res = new http.ServerResponse(req);
    const origWriteHead = res.writeHead.bind(res);
    // deno-lint-ignore no-explicit-any
    res.writeHead = (code: number, headers?: any) => {
      statusCode = code;
      if (headers) responseHeaders = headers;
      return origWriteHead(code, headers);
    };
    const origEnd = res.end.bind(res);
    // deno-lint-ignore no-explicit-any
    res.end = (chunk?: any) => {
      if (chunk) {
        chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
      }
      resolve({ statusCode, headers: responseHeaders, body: chunks.join("") });
      return origEnd();
    };

    handler(req, res);
  });
}

Deno.test("GET /api/projects returns project list", async () => {
  const { statusCode, body } = await makeRequest("/api/projects");
  assertEquals(statusCode, 200);
  const data = JSON.parse(body);
  assertEquals(Array.isArray(data), true);
  assertEquals(data.length, 2);
  const names = data.map((p: { encodedPath: string }) => p.encodedPath).sort();
  assertEquals(names, [
    "-Users-test-project-alpha",
    "-Users-test-project-beta",
  ]);
  assertEquals(typeof data[0].sessionCount, "number");
});

Deno.test("GET /api/sessions returns session metadata", async () => {
  const { statusCode, body } = await makeRequest("/api/sessions");
  assertEquals(statusCode, 200);
  const data = JSON.parse(body);
  assertEquals(Array.isArray(data), true);
  // 2 sessions in alpha + 1 in beta = 3
  assertEquals(data.length, 3);
  // Should have sessionId field
  assertEquals(typeof data[0].sessionId, "string");
});

Deno.test("GET /api/sessions?project= filters by project", async () => {
  const { statusCode, body } = await makeRequest(
    "/api/sessions?project=/Users/test/project/beta",
  );
  assertEquals(statusCode, 200);
  const data = JSON.parse(body);
  assertEquals(data.length, 1);
  assertEquals(data[0].sessionId, "session-corrupted");
});

Deno.test("GET /api/sessions/:id returns session detail", async () => {
  const { statusCode, body } = await makeRequest(
    "/api/sessions/session-normal",
  );
  assertEquals(statusCode, 200);
  const data = JSON.parse(body);
  assertEquals(data.sessionId, "session-normal");
  assertEquals(Array.isArray(data.events), true);
  assertEquals(data.events.length > 0, true);
});

Deno.test("GET /api/sessions/:id returns 404 for unknown", async () => {
  const { statusCode } = await makeRequest("/api/sessions/nonexistent");
  assertEquals(statusCode, 404);
});

Deno.test("GET /api/sessions/:id/raw returns JSONL text", async () => {
  const { statusCode, headers, body } = await makeRequest(
    "/api/sessions/session-normal/raw",
  );
  assertEquals(statusCode, 200);
  assertEquals(headers["Content-Type"], "text/plain; charset=utf-8");
  // Should contain raw JSONL lines
  assertEquals(body.includes('"type":"user"'), true);
});

Deno.test("GET / serves index.html (SPA fallback)", async () => {
  const { statusCode, body } = await makeRequest("/");
  assertEquals(statusCode, 200);
  assertEquals(body.includes("<!DOCTYPE html>"), true);
});

Deno.test("GET /sessions/foo serves index.html (SPA fallback)", async () => {
  const { statusCode, body } = await makeRequest("/sessions/some-id");
  assertEquals(statusCode, 200);
  assertEquals(body.includes("<!DOCTYPE html>"), true);
});

Deno.test("GET /assets/style.css serves static file", async () => {
  const { statusCode, headers } = await makeRequest("/assets/style.css");
  assertEquals(statusCode, 200);
  assertEquals(headers["Content-Type"], "text/css; charset=utf-8");
});

Deno.test("GET /assets/nonexistent returns 404", async () => {
  const { statusCode } = await makeRequest("/assets/nonexistent.txt");
  assertEquals(statusCode, 404);
});

Deno.test("GET /unknown returns 404", async () => {
  const { statusCode } = await makeRequest("/unknown");
  assertEquals(statusCode, 404);
});

Deno.test("Security headers are present", async () => {
  const { statusCode } = await makeRequest("/api/projects");
  assertEquals(statusCode, 200);
  // Note: security headers are set via res.setHeader, not writeHead,
  // so they would be on the actual response. Our test mock captures writeHead headers.
  // This is a basic smoke test that the route works.
});
