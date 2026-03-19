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
- The `api` client (`lib/api-client.ts`) wraps `fetch` for all backend endpoints. When StatusBar or other components use it, test files that render those components must mock `../../lib/api-client.js`.
- Design tokens are defined in `src/index.css` inside the `@theme` block (Tailwind v4). All interactive elements must have `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`. Use `--color-status-error` (not `--color-destructive`) for error states in UI components.

- The shared `LogResponse` type uses `content` (matching the DB schema). The API SSE stream at `/agents/:agentId/logs` also returns `content`. The `useLogStream` hook (`lib/use-log-stream.ts`) handles both `content` and `message` fields defensively for backwards compatibility.
- The `AgentLogViewer` component accepts `maxLines` (default 500) and uses the `useLogStream` hook for SSE streaming. It only renders in `AgentDetail` when agent status is `running` or `error`.

- **Gotcha: dirty working tree from prior sessions** — Previous agent sessions may leave uncommitted modifications or untracked files in the working directory. Before making changes, run `git diff --name-only HEAD` and `git status` to identify stale files, then `git checkout HEAD -- <file>` any files you did not intend to modify. Leftover dirty files can cause subtle test failures (e.g., mock hoisting issues in vitest).

### API (`apps/api`)

- **Dev server**: `pnpm dev:api` (uses `tsx watch`)
- **Tests**: `pnpm test:api` (vitest, mocks external deps like `@command-center/tmux`)
- **Typecheck**: `pnpm --filter @command-center/api run typecheck`
- **Lint**: `pnpm --filter @command-center/api run lint`
- The API listens on port 4000 by default (`PORT` env var).
- WebSocket support is wired via `@hono/node-ws`. The `createNodeWebSocket` setup lives in `app.ts`; `injectWebSocket` must be called on the HTTP server in `index.ts`.
- The tmux WebSocket route (`/sessions/:name/terminal`) is registered via `registerTerminalWebSocket()` called from `createApp()`, not at module load time, to avoid circular imports.
