import process from "node:process";
import * as path from "node:path";
import * as os from "node:os";
import { parseArgs } from "node:util";
import { scanProjects } from "./scanner.ts";
import { startServer } from "./server.ts";

const VERSION = "0.1.0";

function printHelp() {
  console.log(`cc-session-viewer v${VERSION}

Browse and visualize Claude Code session logs in your browser.

Usage:
  cc-session-viewer [options]

Options:
  --port <number>        HTTP server port (default: 7777)
  --host <string>        Bind host (default: 127.0.0.1)
  --projects-dir <path>  Session root directory (default: ~/.claude/projects)
  --no-open              Don't open browser automatically
  --help, -h             Show this help
  --version, -v          Show version`);
}

function resolveProjectsDir(input?: string): string {
  if (input) return path.resolve(input);
  const home = os.homedir();
  return path.join(home, ".claude", "projects");
}

async function openBrowser(url: string) {
  const { exec } = await import("node:child_process");
  const platform = process.platform;
  let cmd: string;
  if (platform === "darwin") {
    cmd = `open "${url}"`;
  } else if (platform === "win32") {
    cmd = `start "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }
  exec(cmd, (err) => {
    if (err) {
      console.warn(`Could not open browser automatically. Visit ${url}`);
    }
  });
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        port: { type: "string", short: "p" },
        host: { type: "string" },
        "projects-dir": { type: "string" },
        "no-open": { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
        version: { type: "boolean", short: "v", default: false },
      },
      strict: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${msg}`);
    console.error("Run with --help for usage information.");
    process.exit(1);
  }

  const { values } = parsed;

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  if (values.version) {
    console.log(`cc-session-viewer v${VERSION}`);
    process.exit(0);
  }

  const port = values.port ? parseInt(values.port, 10) : 7777;
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(`Error: Invalid port number "${values.port}"`);
    process.exit(1);
  }

  const hostname = values.host ?? "127.0.0.1";
  const projectsDir = resolveProjectsDir(values["projects-dir"]);
  const noOpen = values["no-open"] ?? false;

  // Scan projects
  const projects = scanProjects(projectsDir);
  let sessionCount = 0;
  for (const p of projects) {
    sessionCount += p.sessionFiles.length;
  }

  console.log(`cc-session-viewer v${VERSION}`);
  console.log(
    `Scanning ${projectsDir} ... ${projects.length} projects, ${sessionCount} sessions`,
  );

  const assetsDir = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    "assets",
  );

  await startServer({
    port,
    hostname,
    context: { projectsDir, assetsDir },
  });

  const url = `http://${hostname}:${port}`;
  console.log(`Listening on ${url}`);

  if (!noOpen) {
    await openBrowser(url);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
