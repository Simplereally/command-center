import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";

const app = createApp();

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    logger.info("Server started", {
      port: info.port,
      url: `http://localhost:${info.port}`,
    });
  },
);
