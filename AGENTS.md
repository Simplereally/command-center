# AGENTS.md

## Cursor Cloud specific instructions

### Project Structure
- Monorepo using pnpm workspaces: `apps/web` (React/Vite frontend), `apps/api` (Hono/Node backend), `packages/shared` (shared types/schemas), `packages/tmux` (tmux integration)
- See `package.json` scripts for standard commands (`pnpm dev:web`, `pnpm dev:api`, `pnpm test:web`, etc.)

### Running Tests & Lint
- Web tests: `pnpm --filter @command-center/web run test` (vitest with jsdom environment)
- Web lint: `pnpm --filter @command-center/web run lint` (eslint)
- The `test/render.tsx` warning about `react-refresh/only-export-components` is a known benign warning
- Tests use `vi.mock()` extensively; when adding new store fields/methods, update the corresponding test mocks

### Key Caveats
- The web app uses `zustand` with `immer` middleware and `enableMapSet()` for `Map`/`Set` support in stores
- `sonner` is used for toasts — in tests, toast calls happen asynchronously; mock or spy on `sonner` if testing toast behavior
- The `@dnd-kit` drag-and-drop tests use mocked stores, not real DnD events
- The API uses SQLite via `better-sqlite3` + `drizzle-orm`; run `pnpm db:migrate` and `pnpm db:seed` before starting the API for the first time
- API routes use `@hono/zod-validator` middleware with shared Zod schemas from `@command-center/shared` — validation errors return `{ success: false, error: { issues: [...] } }` (ZodError format), not the old `{ error: { code: 'VALIDATION_ERROR' } }` format
- `WS_BASE_URL` and `API_ORIGIN` are centralized in `apps/web/src/lib/constants.ts` — do not hardcode `ws://localhost:4000` or `http://localhost:4000` elsewhere
- CORS origins are configurable via the `CORS_ORIGINS` env var (comma-separated); defaults to `http://localhost:5173`

### Running Services
- API: `pnpm dev:api` (port 4000) — requires `pnpm db:migrate` on first run
- Web: `pnpm dev:web` (port 5173) — Vite proxies `/api` to `http://localhost:4000`
- Both: `pnpm dev` (runs both in parallel)
- `tmux` must be installed on the system (used for terminal sessions)
- Pre-existing lint errors in `provider-badge.tsx` (unused vars) and `test/render.tsx` (react-refresh warning) are known and not caused by terminal changes
- The Vite config proxies `/api` requests to the API server, so the frontend only needs the relative `/api/v1` prefix for REST calls; WebSocket URLs use `WS_BASE_URL` from constants
