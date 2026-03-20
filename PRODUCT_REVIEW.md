# Command Center — Product Review

> Reviewed against `COMMAND_CENTER_SPEC.md`, current implementation, and standards set by Vercel, Linear, Notion, Cursor, and ChatGPT.

---

## Executive Summary

Command Center has a solid architectural skeleton — the monorepo layout, Zustand store pattern, Hono API, and Drizzle ORM foundation are well-chosen and mostly well-executed. However, the product is still an early Phase 2/3 prototype: roughly 60% of the spec's feature surface is implemented, many features are shallow stubs, real-time capabilities are half-wired, and the UX has significant gaps in error handling, empty states, navigation, and accessibility that would make a real user abandon the tool within minutes. The bones are good; the flesh needs serious work.

---

## P0 — Critical (Ship-blocking)

### 1. No Zod Validation on API Routes

**Current state:** The API routes do raw `c.req.json()` with manual `if (!body.name)` checks. The Zod schemas in `packages/shared` are imported nowhere in the API.

**Proposed improvement:** Use `@hono/zod-validator` middleware on every route. The schemas already exist — they just aren't used. This is a security and reliability problem: malformed payloads can corrupt the database.

**Impact:** High. Prevents injection of invalid data, eliminates hand-written validation code, ensures API matches TypeScript types.

---

### 2. API Response Schema Mismatch (Timestamps)

**Current state:** The `agentResponseSchema` in `packages/shared` declares `createdAt`, `updatedAt`, `startedAt`, `stoppedAt` as `z.string().datetime()`. But the Drizzle schema uses `mode: 'timestamp_ms'`, meaning the DB returns `Date` objects. The API returns raw Drizzle rows without serialization, so timestamps are `Date` objects (or ISO strings depending on serialization). The frontend `agent-store.ts` `createAgent` optimistically uses `new Date().toISOString()` (string), while API responses return Date objects. `AgentDetail.formatDate()` calls `new Date(iso)` on a value that might already be a `Date`.

**Proposed improvement:** Add a response serialization layer in the API that converts Drizzle rows to the exact shape defined by `agentResponseSchema`. Every API response should pass through `agentResponseSchema.parse()` before being sent. Normalize timestamps to epoch milliseconds (numbers) across the entire stack.

**Impact:** Critical. Type mismatches between frontend and backend will cause runtime errors as the app grows.

---

### 3. No Real-time Agent Status Updates

**Current state:** When an agent's status changes (e.g., from a move/start/stop), other open tabs or stale UI state never learns about it. The only mechanism is a full re-fetch after a cross-lane drag in `kanban-board.tsx` (`fetchAgents(boardId)`). The spec calls for SSE or WebSocket-based status propagation. The shared types define `AgentStatusChangeMessage` and `SSEAgentStatusEvent` but neither is implemented.

**Proposed improvement:** Implement a global SSE event bus (`/api/v1/events`) that emits agent status changes, creation, deletion. Subscribe from the frontend and merge into the Zustand store. This is the backbone of a "mission control" tool — if the board doesn't update in real time, the core value proposition is broken.

**Impact:** Fundamental. Without this, multiple users (or even one user with two tabs) see stale data.

---

### 4. Settings Page is Non-functional

**Current state:** Settings page has an API URL input defaulting to `http://localhost:3001` (wrong — API is on 4000), a font size dropdown, and an About section. None of these actually persist or affect anything. The API URL is hardcoded in `constants.ts` as `/api/v1`. No state management, no localStorage, no persistence.

**Proposed improvement:** Either (a) make settings actually work with localStorage + a settings store, or (b) strip the page and replace it with a board management view as the spec suggests. The current implementation is misleading.

**Impact:** High. A non-functional settings page erodes trust.

---

### 5. No Back Navigation from Settings

**Current state:** The settings page (`/settings`) is a dead end. There's no back button, no breadcrumb, no way to return to the board except the browser back button. The top bar and status bar from `AppShell` are not rendered on this route because `SettingsPage` is a standalone full-page layout.

**Proposed improvement:** Either wrap settings in `AppShell` (with the top bar providing navigation), or add a prominent back-to-board link in the settings header.

**Impact:** Medium-high. Users will feel trapped.

---

## P1 — High Priority (Major UX/quality gaps)

### 6. Hardcoded WebSocket URL

**Current state:** The `WS_BASE_URL` is hardcoded to `ws://localhost:4000` in `terminal-store.ts`, `app-shell.tsx`, and `side-panel.tsx`. This breaks if the API runs on any other port or behind a proxy. The Vite dev server proxies `/api/v1` but not WebSocket connections to an absolute `ws://localhost:4000` URL.

**Proposed improvement:** Derive the WebSocket URL from `window.location` or from the same `API_BASE_URL` constant. Use a helper like: `const wsUrl = new URL('/api/v1/tmux/...', window.location.href); wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';`

**Impact:** High. Terminal integration is broken in any non-localhost deployment.

---

### 7. No Loading States for Root Redirect

**Current state:** `RedirectToFirstBoard` in `app.tsx` does a bare `api.boards.list().then(...)` with zero loading UI and zero error handling. If the API is down, the user sees a blank white screen forever.

**Proposed improvement:** Show a centered loading spinner. Catch errors and show a retry UI. Use the `EmptyState` component for the error case ("Could not reach API server. Retry?").

**Impact:** High. First impression of the app is a blank screen if anything goes wrong.

---

### 8. `useEffect` Data Fetching Without Cleanup Race Guards

**Current state:** Multiple components fetch data in `useEffect` without proper abort signals. `KanbanBoard` fires three parallel fetches (`fetchBoard`, `fetchSwimlanes`, `fetchAgents`) on mount. If `boardId` changes rapidly, stale responses can overwrite fresh data. The `boardStore` and `agentStore` don't guard against this.

**Proposed improvement:** Thread `AbortController` signals through the API client and into the stores. Cancel in-flight requests when the `boardId` changes. Or adopt a lightweight data-fetching hook pattern (e.g., a custom `useQuery` wrapper) that handles request deduplication, cancellation, and stale-while-revalidate.

**Impact:** Medium-high. Causes subtle, hard-to-debug stale data issues under rapid navigation.

---

### 9. Massive Code Duplication in `terminal-store.ts`

**Current state:** The `connectTerminal` and `reconnectFn` functions are virtually identical (~80 lines each). They duplicate `ws.onopen`, `ws.onmessage`, `ws.onerror`, and `ws.onclose` handlers verbatim. This is the single worst DRY violation in the codebase.

**Proposed improvement:** Extract a `createWebSocket(sessionName, ...)` helper and share it between `connectTerminal` and `reconnectFn`. Also consider extracting the reconnect-with-backoff logic into a reusable `ReconnectingWebSocket` class.

**Impact:** Medium. Maintenance burden and divergence risk.

---

### 10. `AgentLogViewer` Uses Hardcoded Log Levels that Don't Match Spec

**Current state:** `AgentLogViewer` defines `LOG_LEVEL_COLORS` for `debug`, `info`, `warn`, `error`. But the DB schema defines log levels as `stdout`, `stderr`, `system`, `error`. The shared `LogLevel` type from `log.ts` uses `debug`, `info`, `warn`, `error`. There's a mismatch — the spec says one thing, the schema says another, and the frontend assumes a third.

**Proposed improvement:** Reconcile the log level system. Pick one set of levels and use it everywhere. The DB schema should match `packages/shared`, which should match the frontend. Recommended: use `debug | info | warn | error` as the Zod schema does, and update the DB schema to match.

**Impact:** Medium-high. Logs will render incorrectly or with missing styles when real data flows through.

---

### 11. `index.css` Has Duplicated `@layer base` Block

**Current state:** The entire `@layer base` block is literally copy-pasted — it appears twice in `index.css` (lines 41–86 and 89–129). This is dead code and visually sloppy.

**Proposed improvement:** Delete the duplicate block.

**Impact:** Low effort, but signals carelessness.

---

### 12. API Client Has No Retry Logic

**Current state:** The `ApiClient.request()` method is fire-once. If a transient network error occurs (connection reset, timeout), the request fails and the error bubbles to the UI as a toast. The spec calls for resilience.

**Proposed improvement:** Add configurable retry with exponential backoff for `GET` requests (idempotent). For mutations, don't retry but show a clear "Retry" action in the error toast. Consider adding a `navigator.onLine` check to short-circuit requests when offline.

**Impact:** Medium. Resilience is a core design principle of the spec.

---

### 13. Drag-and-Drop Does Not Prevent Invalid Transitions

**Current state:** The `KanbanBoard.handleDragEnd` moves agents between lanes and calls the API. If the API rejects the move due to an invalid state transition (e.g., `completed` → `running`), the optimistic move is rolled back — but the user sees a confusing flash. There's no visual indication of an invalid drop zone during the drag.

**Proposed improvement:** Use the `DndContext`'s `onDragOver` to check `canTransition()` and set a rejection state on invalid drop targets (red highlight, cursor change). Prevent the drop entirely for invalid transitions. The spec explicitly says: "Invalid transitions are prevented: drop zone shows red rejection indicator and card snaps back."

**Impact:** Medium-high. Core interaction feels unreliable.

---

### 14. No Polling or SSE for Agent List Refresh

**Current state:** Once agents are fetched on board mount, they are never re-fetched except after a drag-and-drop. If an agent's status changes externally (e.g., a tmux session dies, or another API consumer modifies it), the board shows stale data indefinitely.

**Proposed improvement:** Implement either (a) periodic polling (e.g., every 5-10 seconds) as an interim measure, or (b) SSE from the global event bus (see P0 #3). The reconciliation service runs on API startup but its results never propagate to the frontend.

**Impact:** High. Core usability issue for a monitoring tool.

---

## P2 — Medium Priority (Product quality & polish)

### 15. Command Palette Has No Fuzzy Search

**Current state:** The command palette uses `cmdk` but doesn't configure fuzzy matching. The default `cmdk` filtering is basic substring matching.

**Proposed improvement:** Configure `cmdk`'s filter function or add `command-score` for fuzzy ranking. Linear's command palette quality is the gold standard here — partial matches, typo tolerance, and recency weighting.

**Impact:** Medium. Power users expect world-class search.

---

### 16. Agent Create Dialog Missing Model Dropdown

**Current state:** The model field is a free-text input. The spec and product vision imply a curated set of models (`claude-4-opus`, `gpt-5`, `opencode`, etc.).

**Proposed improvement:** Replace with a searchable dropdown/combobox with a curated model list plus a custom option. Consider fetching available models from the API.

**Impact:** Low-medium. Quality-of-life improvement.

---

### 17. `AgentMetrics` Fetches Raw from API, Bypasses Store

**Current state:** `AgentMetrics` component directly calls `api.metrics.latest()` in a `useEffect` with `setInterval`. It doesn't use the Zustand store, creating an inconsistency with the rest of the data flow pattern. If the agent doesn't exist or the API is down, it silently fails with "No metrics yet."

**Proposed improvement:** Route metrics through the store. Show a proper error state ("Failed to load metrics. Retry?"). Consider batching metric fetches if multiple agent details are open.

**Impact:** Low-medium. Pattern inconsistency and silent failures.

---

### 18. No Keyboard Navigation Visual Indicators

**Current state:** Arrow keys navigate between swimlanes and cards via `useKeyboardShortcuts`, updating `selectedSwimlaneIndex` and `selectedCardIndexByLane` in the UI store. But there's **no visual ring/highlight** on the currently keyboard-selected card or lane — the user has no idea what's selected. The `isSelected` check in `AgentCard` only fires when `selectedAgentId` matches, which happens on arrow navigation but there's no visual focus indicator on the swimlane itself.

**Proposed improvement:** Add a visible focus ring on the keyboard-focused card (e.g., `ring-2 ring-accent`) and a subtle lane highlight. Show the current keyboard position in the status bar.

**Impact:** Medium. The keyboard nav is useless without visual feedback.

---

### 19. No Board CRUD in the UI

**Current state:** The spec describes board creation, deletion, and switching. The API supports full board CRUD. But the only board-related UI is a `<select>` dropdown in the `TopBar` that switches between existing boards. There's no way to create, rename, or delete a board from the UI. The Settings page has no board management section.

**Proposed improvement:** Add a "New Board" option in the board selector dropdown. Add board management (rename, delete) to the settings page or as a dropdown menu.

**Impact:** Medium. Users are stuck with whatever boards they seed.

---

### 20. `AgentConfigForm` Doesn't Edit `command` or `model`

**Current state:** The config form only edits `name`, `workingDir`, and `envVars`. The `model` and `command` fields — two of the most important agent properties — are not editable after creation.

**Proposed improvement:** Add `model` and `command` to the edit form. Include proper field descriptions.

**Impact:** Medium. Core workflow gap.

---

### 21. CORS Hardcoded to `http://localhost:5173`

**Current state:** The API's CORS config allows only `http://localhost:5173`. This will break if the frontend runs on any other port or if accessed from a different origin.

**Proposed improvement:** Make the allowed origin configurable via environment variable (`CORS_ORIGIN`), defaulting to `http://localhost:5173`.

**Impact:** Medium. Breaks any non-default setup.

---

### 22. `TerminalPanel` State Desyncs from Props

**Current state:** `TerminalPanel` initializes `tabs` state from `sessions` prop using `useState(() => sessions.map(...))`. This runs once — subsequent `sessions` prop changes are ignored, causing desync when sessions are added/removed externally.

**Proposed improvement:** Either derive tabs directly from props (lifting state up) or sync with `useEffect` when props change.

**Impact:** Medium. Terminal tabs show stale sessions.

---

### 23. No Error Handling in `moveAgent` for State Machine Violations

**Current state:** When the backend rejects a move due to an invalid state transition (`ConflictError`), the frontend catches the error in `KanbanBoard.handleDragEnd` and does `rollbackMove`. But it doesn't show an error toast explaining *why* the move failed ("Cannot move a completed agent back to In Progress"). The user just sees the card snap back.

**Proposed improvement:** In the catch block, check if the error is an `ApiError` with code `CONFLICT`, and show a descriptive toast: "Cannot move agent: [backend message]."

**Impact:** Medium. Users will be confused by silent rejections.

---

### 24. No Agent Duplication

**Current state:** The spec's context menu lists "Duplicate Config" but the implementation doesn't include it. No API endpoint for duplication.

**Proposed improvement:** Add a "Duplicate" action that creates a new agent with the same config (different name suffix). Reuse the create endpoint.

**Impact:** Low-medium. Common workflow shortcut.

---

## P3 — Nice-to-Have (World-class product features)

### 25. No Agent Templates / Presets

**Current state:** Every agent is created from scratch. Power users who repeatedly create similar agents (same model, same command, same env vars) have no way to save presets.

**Proposed improvement:** Add a "Save as Template" action and a template selector in the create dialog. Store templates in a new DB table.

**Impact:** Medium. Major workflow accelerator.

---

### 26. No Batch Operations

**Current state:** No way to start all, stop all, restart all agents in a lane or on a board. Each action is one-by-one.

**Proposed improvement:** Add lane-level actions (start all, stop all) in the `SwimlaneHeader`. Add board-level batch controls in the `TopBar`.

**Impact:** Medium. Essential for managing agent fleets.

---

### 27. No Activity Timeline

**Current state:** The only trace of what happened is the "Last event" timestamp in the status bar and individual agent logs. There's no unified activity feed showing "Agent X started", "Agent Y moved to Done", "Terminal session created for Z" etc.

**Proposed improvement:** Create an activity log table in the DB, emit events from all lifecycle operations, display as a collapsible timeline in the side panel or as a dedicated route.

**Impact:** Medium. Critical for observability.

---

### 28. No Dashboard / Overview Stats

**Current state:** The only aggregate view is the status bar showing running/total counts. There's no dashboard showing completion rates, average runtimes, error rates, resource usage over time.

**Proposed improvement:** Add a `/dashboard` route with summary cards (total agents, running, errored, completed today) and simple charts (status distribution pie chart, timeline of agent activity).

**Impact:** Low-medium. Nice situational awareness feature.

---

### 29. No Import / Export Board Configurations

**Current state:** No way to export a board (with its agents, configs, swimlane layout) or import from another instance.

**Proposed improvement:** Add export (JSON download) and import (JSON upload) endpoints and UI. This enables sharing setups across machines.

**Impact:** Low-medium. Power user feature.

---

### 30. No Dark / Light Theme Toggle

**Current state:** Dark theme only, as per spec ("light theme is a nice-to-have for v2"). The CSS is well-structured with custom properties, making theme switching straightforward.

**Proposed improvement:** Add a theme toggle in settings/top bar. Define a `:root[data-theme='light']` set of token overrides. Persist with localStorage.

**Impact:** Low. Solid foundation already exists.

---

### 31. No Cross-Agent Log Search

**Current state:** Logs can only be viewed per-agent. No way to search across all agent logs for a keyword.

**Proposed improvement:** Add a `/logs` route or a command palette command that searches across all agent logs. Use SQLite FTS5 for full-text search.

**Impact:** Low-medium. Extremely useful for debugging.

---

### 32. No Agent Dependency Chains

**Current state:** Agents are independent. The spec enhancement mandate asks for "agent B waits for agent A to complete."

**Proposed improvement:** Add an optional `dependsOn` field to agents. When a dependency completes, auto-start the dependent agent. Visualize dependencies with arrows or badges on cards.

**Impact:** Medium. Advanced orchestration feature.

---

### 33. No Notification Center / Persistent Log

**Current state:** Notifications are ephemeral `sonner` toasts. Once dismissed, they're gone forever.

**Proposed improvement:** Add a notification bell icon in the top bar with a dropdown showing recent notifications. Persist to a notifications table. Mark as read/unread.

**Impact:** Low-medium. Professional polish.

---

## Quick Wins (< 30 minutes each)

| # | Item | Effort | File(s) |
|---|------|--------|---------|
| 1 | Delete duplicate `@layer base` block in `index.css` | 2 min | `apps/web/src/index.css` |
| 2 | Fix hardcoded API URL `http://localhost:3001` in Settings → should be `4000` or dynamic | 5 min | `routes/settings.tsx` |
| 3 | Add toast on failed drag-and-drop with backend error message | 10 min | `components/board/kanban-board.tsx` |
| 4 | Add loading spinner and error handling in `RedirectToFirstBoard` | 10 min | `app.tsx` |
| 5 | Add a "Back to Board" link on the Settings page header | 5 min | `routes/settings.tsx` |
| 6 | Extract `WS_BASE_URL` to `constants.ts` and derive from `window.location` | 10 min | `terminal-store.ts`, `app-shell.tsx`, `side-panel.tsx` |
| 7 | Make CORS origin configurable via `CORS_ORIGIN` env var | 10 min | `apps/api/src/app.ts`, `apps/api/src/lib/env.ts` |
| 8 | Add `model` and `command` fields to `AgentConfigForm` | 15 min | `components/agent/agent-config-form.tsx` |
| 9 | Add visual focus ring on keyboard-navigated agent card | 15 min | `components/board/agent-card.tsx` |
| 10 | Show agent count per status in `StatusBar` (not just "running" vs "total") | 10 min | `components/layout/status-bar.tsx` |
| 11 | Add `aria-role="tablist"` and proper `aria-selected` to lane headers | 10 min | `components/board/swimlane.tsx` |
| 12 | Add missing `Backspace`/`Delete` confirmation dialog in keyboard shortcuts | 15 min | `hooks/use-keyboard-shortcuts.ts` |

---

## Big Bets (High effort, high reward)

### 1. Real-time Event Bus (SSE) — 2-3 components changed, new SSE endpoint

**Description:** Implement a global `/api/v1/events` SSE endpoint that broadcasts agent lifecycle events, log events, and board changes. Add an `EventBusService` that aggregates events from the agent service, log service, and reconciliation service. On the frontend, create a `useEventBus` hook that subscribes on mount and dispatches incoming events to the appropriate Zustand stores.

**Why it matters:** This is the single most important missing feature. Without it, Command Center is a static dashboard, not a "mission control." Every other real-time feature (live status updates, activity timeline, multi-tab sync) depends on this.

**Risk:** Medium. SSE is well-understood, but the fan-out pattern needs careful design to avoid memory leaks and stale connections.

---

### 2. Agent Templates System — New DB table, new API routes, new UI components

**Description:** Add a `templates` table with fields for `name`, `model`, `command`, `workingDir`, `envVars`, `createdAt`. API endpoints for template CRUD. A "Save as Template" action on agent cards. A template selector step in the create dialog. Consider bundling a few "starter templates" (e.g., "Claude Agent", "GPT Agent", "Custom Script").

**Why it matters:** Reduces the #1 friction point: agent creation. Once users have 5+ templates, they can spin up preconfigured agents in 2 clicks instead of filling out 5 form fields.

---

### 3. Virtual Scrolling for Logs and Large Boards — Performance critical

**Description:** Replace the `AgentLogViewer`'s `div`-per-line rendering with `@tanstack/react-virtual`. For boards with 50+ agents per lane, virtualize the card list in `Swimlane`. The current implementation renders every log line and every card into the DOM.

**Why it matters:** At 500+ log lines (the current `maxLines`), the log viewer will jank. At 20+ agents per lane, drag-and-drop becomes sluggish. Virtualization is table stakes for production quality.

---

### 4. Agent Process Health Monitoring — Backend service + frontend display

**Description:** The reconciliation service only runs on startup. Implement a background job (e.g., `setInterval` every 30s) that checks the health of running agents: is the tmux session still alive? Is the process still running? If not, transition the agent to `error` and emit a notification. On the frontend, show a health indicator on each card.

**Why it matters:** Without continuous monitoring, the "mission control" metaphor is hollow. Users won't know an agent has crashed until they manually click on it.

---

### 5. Resizable Side Panel with Drag Handle — `react-resizable-panels`

**Description:** The spec calls for a draggable divider between the main content and the side panel. Currently, the side panel width is a Zustand state value that nothing adjusts. Implement the `react-resizable-panels` library as the spec suggests, with double-click-to-snap-to-default.

**Why it matters:** Power users need to resize the terminal panel. On ultrawide monitors, a fixed-width panel wastes space. On laptops, it may take too much.

---

## Technical Debt & Code Quality

### Inconsistent Error Handling

- **Frontend:** Some actions show `toast.error()`, some silently fail, some throw. The `fetchLatestLogs` function catches and swallows errors. The `startAgent`/`stopAgent`/`restartAgent` store methods bubble errors to the component, which shows toasts — but the `AgentActions` component wraps them in `withLoading` which doesn't handle errors.
- **Backend:** Routes inconsistently throw `AppError` vs return `c.json(error, status)`. Some routes use the error classes, others do manual JSON error responses.
- **Fix:** Standardize error handling. In the API, always throw `AppError` subclasses and let the global `onError` handler format the response. In the frontend, create an `errorHandler` utility that wraps async actions with toast display.

### Components That Are Too Large

| Component | Lines | Recommendation |
|-----------|-------|----------------|
| `command-palette.tsx` | 375 | Extract `AgentQuickActions`, `CommandItem` into separate files |
| `kanban-board.tsx` | 213 | Extract drag-and-drop logic into a `useDragAndDrop` hook |
| `agent-card.tsx` | 232 | Extract context menu into a `<ContextMenu>` component |
| `use-keyboard-shortcuts.ts` | 227 | Extract arrow key navigation into a `useBoardNavigation` hook |
| `terminal-store.ts` | 353 | Extract WebSocket lifecycle into a `WebSocketManager` class |

### Missing Abstractions

1. **No request deduplication.** If two components call `fetchAgents(boardId)` simultaneously, two identical HTTP requests fire. Need a request cache/dedup layer.
2. **No optimistic update abstraction.** The optimistic → commit → rollback pattern is hand-coded for both agent moves and deletes. Extract an `optimistic()` helper.
3. **No form abstraction.** `AgentCreateDialog` and `AgentConfigForm` both have duplicated form state management, validation, error display. Consider `react-hook-form` or at minimum a shared pattern.

### Type Safety Gaps

1. **`agent-service.ts` returns raw Drizzle rows.** The return type of `createAgent()` is `typeof agents.$inferSelect` — a Drizzle type, not the shared `AgentResponse` type. The API layer leaks the DB type.
2. **Loose `Record<string, unknown>` casts.** The `useLogStream` hook casts `raw as unknown as Record<string, unknown>`, losing type safety entirely.
3. **`startedAt` type confusion.** The shared type says `string | null` (datetime). The `LiveTimer` component accepts `string | number | Date`. The DB returns `Date | null`. Pick one and enforce it.

### Missing Tests

The following components/modules lack test files:

| File | Kind |
|------|------|
| `agent-actions.tsx` | Component |
| `agent-config-form.tsx` | Component |
| `agent-log-viewer.tsx` | Component |
| `agent-metrics.tsx` | Component |
| `view-mode-toggle.tsx` | Component |
| `use-log-stream.ts` | Hook |
| `reconciliation-service.ts` | Service |
| `board-service.ts` (unit) | Service |
| `swimlane-service.ts` (unit) | Service |
| `agent-service.ts` (unit) | Service |
| `terminal-handler.ts` (unit) | WS handler |

The spec mandates "Every exported component has a corresponding `.test.tsx` file" and "Every API route has a corresponding `.test.ts` file" — these are non-negotiable quality gates.

---

## Accessibility Gaps

1. **Swimlane headers are not buttons.** They use `<div onClick>` instead of `<button>`. Screen readers won't announce them as interactive.
2. **Context menu is custom-rendered.** The agent card's right-click menu is a positioned `<div>` with no ARIA menu role, no `role="menu"` / `role="menuitem"`, no arrow key navigation within the menu.
3. **Modals don't trap focus.** The `AgentCreateDialog`, `ConfirmDialog`, and `KeyboardHelp` don't implement focus trapping. Users can tab out of the modal into the background.
4. **No skip-to-content link.** The app has a top bar, status bar, and side panel — keyboard users need a way to skip to the main content.
5. **Color-only status indicators.** The `StatusDot` conveys information through color alone. Color-blind users can't distinguish running (green) from idle (gray). Add a shape or pattern differentiation, or pair with text labels.
6. **`LiveTimer` has no `aria-live` region.** Screen readers won't announce the updating duration.

---

## Performance Concerns

1. **Agent card re-renders on every store change.** `AgentCard` reads from both `useUiStore` and `useAgentStore` (for logs). Any change to *any* agent's logs triggers a re-render of *every* card. Use shallow selectors and memoize.
2. **`fetchLatestLogs` fires for every running agent on every `agents` map change.** This creates an N+1 waterfall: every time the agents map updates (even from a move), it re-fetches logs for all running agents.
3. **No debouncing on status bar tmux polling.** `StatusBar` polls `api.tmux.listSessions()` every 10 seconds even when the component is not visible (e.g., settings page). Use `document.hidden` check.
4. **Terminal xterm.js is dynamically imported on every mount.** The dynamic import `await import('@xterm/xterm')` runs every time a terminal instance mounts. Consider caching the module reference.

---

*This review was produced by exhaustive line-by-line analysis of every file in `apps/web/src/`, `apps/api/src/`, `packages/shared/`, `packages/tmux/`, and `plugins/opencode/`. Issues are prioritized by impact on user experience and product quality.*
