## Cursor Cloud specific instructions

This is a pnpm monorepo (`pnpm@9.15.4`, Node >= 22). Key apps live under `apps/` and shared packages under `packages/`.

### Web (`apps/web`)

- **Dev server**: `pnpm dev:web` (Vite)
- **Tests**: `pnpm test:web` (vitest with happy-dom)
- **Typecheck**: `pnpm --filter @command-center/web run typecheck`
- **Lint**: `pnpm --filter @command-center/web run lint`
- Zustand stores (`stores/`) use `immer` middleware. Tests mock stores at the module level via `vi.mock()`.
- When adding new store selectors consumed by existing components, update ALL test files that mock that store (e.g., `top-bar.test.tsx`, `app-shell.test.tsx`), not just the component's own test.
- `sonner` is the toast library; import `toast` from `'sonner'`.

### API (`apps/api`)

- **Dev server**: `pnpm dev:api` (uses `tsx watch`)
- **Tests**: `pnpm test:api` (vitest, mocks external deps like `@command-center/tmux`)
- **Typecheck**: `pnpm --filter @command-center/api run typecheck`
- **Lint**: `pnpm --filter @command-center/api run lint`
- The API listens on port 4000 by default (`PORT` env var).
- WebSocket support is wired via `@hono/node-ws`. The `createNodeWebSocket` setup lives in `app.ts`; `injectWebSocket` must be called on the HTTP server in `index.ts`.
- The tmux WebSocket route (`/sessions/:name/terminal`) is registered via `registerTerminalWebSocket()` called from `createApp()`, not at module load time, to avoid circular imports.
