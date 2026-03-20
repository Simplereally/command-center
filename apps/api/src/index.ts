import { serve } from "@hono/node-server";
import { createApp, injectWebSocket } from "./app.js";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { reconcileAgents } from "./services/reconciliation-service.js";

const app = createApp();

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    logger.info("Server started", {
      port: info.port,
      url: `http://localhost:${info.port}`,
    });

    reconcileAgents().catch((err: unknown) => {
      logger.error("Agent reconciliation failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  },
);

injectWebSocket(server);
