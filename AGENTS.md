## Cursor Cloud specific instructions

This is a pnpm monorepo (`pnpm@9.15.4`, Node >= 22). Key apps live under `apps/` and shared packages under `packages/`.

### API (`apps/api`)

- **Dev server**: `pnpm dev:api` (uses `tsx watch`)
- **Tests**: `pnpm test:api` (vitest, mocks external deps like `@command-center/tmux`)
- **Typecheck**: `pnpm --filter @command-center/api run typecheck`
- **Lint**: `pnpm --filter @command-center/api run lint`
- The API listens on port 4000 by default (`PORT` env var).
- WebSocket support is wired via `@hono/node-ws`. The `createNodeWebSocket` setup lives in `app.ts`; `injectWebSocket` must be called on the HTTP server in `index.ts`.
- The tmux WebSocket route (`/sessions/:name/terminal`) is registered via `registerTerminalWebSocket()` called from `createApp()`, not at module load time, to avoid circular imports.
