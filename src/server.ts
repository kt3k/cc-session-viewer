import * as http from "node:http";
import process from "node:process";
import { createRouter } from "./router.ts";
import type { AppContext } from "./router.ts";

export interface ServerOptions {
  port: number;
  hostname: string;
  context: AppContext;
}

/**
 * Start the HTTP server with graceful shutdown on SIGINT.
 */
export function startServer(
  options: ServerOptions,
): Promise<http.Server> {
  const { port, hostname, context } = options;
  const handler = createRouter(context);

  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `Error: Port ${port} is already in use. Try --port <number> to use a different port.`,
        );
        process.exit(1);
      }
      reject(err);
    });

    server.listen(port, hostname, () => {
      resolve(server);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log("\nShutting down...");
      server.close(() => {
        process.exit(0);
      });
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  });
}
