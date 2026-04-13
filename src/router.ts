import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { Buffer } from "node:buffer";
import type { ProjectInfo, SessionMeta } from "./types.ts";
import { scanProjects } from "./scanner.ts";
import { loadSession, loadSessionMeta } from "./session_loader.ts";
import { LRUCache } from "./cache.ts";
import type { SessionDetail } from "./types.ts";

export interface AppContext {
  projectsDir: string;
  assetsDir: string;
}

interface RouteMatch {
  params: Record<string, string>;
}

type Handler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  match: RouteMatch,
  ctx: AppContext,
) => void;

interface Route {
  pattern: RegExp;
  paramNames: string[];
  handler: Handler;
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

const sessionCache = new LRUCache<string, SessionDetail>(8);

function buildRoutes(): Route[] {
  return [
    route("GET", "/api/projects", handleApiProjects),
    route("GET", "/api/sessions/:id/raw", handleApiSessionRaw),
    route("GET", "/api/sessions/:id", handleApiSession),
    route("GET", "/api/sessions", handleApiSessions),
  ];
}

function route(
  _method: string,
  pattern: string,
  handler: Handler,
): Route {
  const paramNames: string[] = [];
  const regexStr = pattern.replace(/:(\w+)/g, (_match, name) => {
    paramNames.push(name);
    return "([^/]+)";
  });
  return {
    pattern: new RegExp(`^${regexStr}$`),
    paramNames,
    handler,
  };
}

/**
 * Create the request handler function for the HTTP server.
 */
export function createRouter(
  ctx: AppContext,
): http.RequestListener {
  const routes = buildRoutes();

  return (req: http.IncomingMessage, res: http.ServerResponse) => {
    // Add security headers to all responses
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      res.setHeader(key, value);
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const pathname = url.pathname;

    // API routes
    for (const r of routes) {
      const m = pathname.match(r.pattern);
      if (m) {
        const params: Record<string, string> = {};
        r.paramNames.forEach((name, i) => {
          params[name] = m[i + 1];
        });
        r.handler(req, res, { params }, ctx);
        return;
      }
    }

    // Static assets: /assets/*
    if (pathname.startsWith("/assets/")) {
      serveStaticFile(res, ctx.assetsDir, pathname.slice("/assets/".length));
      return;
    }

    // SPA fallback: / and /sessions/:id serve index.html
    if (pathname === "/" || pathname.startsWith("/sessions/")) {
      serveStaticFile(res, ctx.assetsDir, "index.html");
      return;
    }

    // 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  };
}

// --- Static File Serving ---

function serveStaticFile(
  res: http.ServerResponse,
  assetsDir: string,
  relativePath: string,
) {
  // Prevent directory traversal
  const normalized = path.normalize(relativePath);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  const filePath = path.join(assetsDir, normalized);

  let content: Buffer;
  try {
    content = fs.readFileSync(filePath);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType });
  res.end(content);
}

// --- API Handlers ---

function handleApiProjects(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  _match: RouteMatch,
  ctx: AppContext,
) {
  const projects = scanProjects(ctx.projectsDir);
  const body = projects.map((p: ProjectInfo) => ({
    encodedPath: p.encodedPath,
    projectPath: p.projectPath,
    sessionCount: p.sessionFiles.length,
  }));
  jsonResponse(res, body);
}

function handleApiSessions(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  _match: RouteMatch,
  ctx: AppContext,
) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const projectFilter = url.searchParams.get("project");

  let projects = scanProjects(ctx.projectsDir);
  if (projectFilter) {
    projects = projects.filter((p) => p.projectPath === projectFilter);
  }

  const sessions: SessionMeta[] = [];
  for (const project of projects) {
    for (const file of project.sessionFiles) {
      const meta = loadSessionMeta(file, project.projectPath);
      sessions.push(meta);
    }
  }

  // Sort by lastTimestamp descending
  sessions.sort((a, b) => {
    const ta = a.lastTimestamp ?? "";
    const tb = b.lastTimestamp ?? "";
    return tb.localeCompare(ta);
  });

  jsonResponse(res, sessions);
}

function handleApiSession(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  match: RouteMatch,
  ctx: AppContext,
) {
  const sessionId = match.params.id;
  const filePath = findSessionFile(ctx.projectsDir, sessionId);

  if (!filePath) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Session not found" }));
    return;
  }

  let detail = sessionCache.get(sessionId);
  if (!detail) {
    detail = loadSession(filePath);
    sessionCache.set(sessionId, detail);
  }

  jsonResponse(res, detail);
}

function handleApiSessionRaw(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  match: RouteMatch,
  ctx: AppContext,
) {
  const sessionId = match.params.id;
  const filePath = findSessionFile(ctx.projectsDir, sessionId);

  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Session not found");
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Disposition": "inline",
  });
  res.end(content);
}

// --- Helpers ---

function jsonResponse(res: http.ServerResponse, data: unknown) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

/**
 * Find a session JSONL file by session ID across all projects.
 */
function findSessionFile(
  projectsDir: string,
  sessionId: string,
): string | null {
  const projects = scanProjects(projectsDir);
  for (const project of projects) {
    for (const file of project.sessionFiles) {
      if (path.basename(file, ".jsonl") === sessionId) {
        return file;
      }
    }
  }
  return null;
}
