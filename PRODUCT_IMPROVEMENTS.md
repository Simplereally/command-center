# Command Center — Product Improvements Audit

> Audited against the standards of Linear, Vercel, Notion, and ChatGPT.
> Every item is grounded in the actual codebase — file paths, line-level issues, and concrete proposals.

---

## 1. Critical UX Failures (fix immediately)

### 1.1 Settings page is a dead-end with non-functional controls
**Problem:** The `GeneralSettingsSection` in `apps/web/src/routes/settings.tsx` renders an API URL input defaulting to `http://localhost:3001` (wrong — API runs on port 4000) and a terminal font-size selector. Neither control is wired to any state or persistence. Users who change these values lose them on refresh. This is the definition of a lie in the UI — a control that looks interactive but does nothing.

**Solution:** Either wire these to a persisted settings store (Zustand + localStorage) or remove them entirely until they work. The API URL should read from `API_BASE_URL` in `lib/constants.ts`, not a hardcoded wrong value.

**Impact:** High — erodes trust in the entire product.  
**Files:** `apps/web/src/routes/settings.tsx` (lines 39–79), `apps/web/src/lib/constants.ts`

---

### 1.2 No loading state when navigating between boards
**Problem:** When switching boards via the `<select>` in `TopBar` (`apps/web/src/components/layout/top-bar.tsx`), the navigation fires but the KanbanBoard still shows stale agents from the previous board until the new fetch completes. There's no skeleton or loading shimmer during the transition — the board just "jumps" from old data to new data.

**Solution:** Show skeleton cards in each swimlane during `loading` state. The loading spinner only shows when `sortedLanes.length === 0` (`kanban-board.tsx` line 170), which means on subsequent board switches the stale data just persists.

**Impact:** High — users think the board didn't switch.  
**Files:** `apps/web/src/components/board/kanban-board.tsx` (lines 170–176)

---

### 1.3 Escape key conflict between multiple overlays
**Problem:** `useKeyboardShortcuts` (`apps/web/src/hooks/use-keyboard-shortcuts.ts` line 66) handles Escape by calling both `closeSidePanel()` AND `closeCreateAgentDialog()` unconditionally. The `CommandPalette`, `ConfirmDialog`, `AgentCreateDialog`, and `KeyboardHelp` components each independently register their own `keydown` listeners for Escape. This creates a cascade where pressing Escape can close multiple things at once (e.g., command palette AND side panel simultaneously).

**Solution:** Implement a modal stack in `ui-store.ts`. Only the topmost overlay should consume Escape. Use `event.stopPropagation()` or a centralized priority system. Linear does this perfectly — Escape always closes exactly one layer.

**Impact:** High — confusing, unpredictable behavior.  
**Files:** `apps/web/src/hooks/use-keyboard-shortcuts.ts`, `apps/web/src/components/command/command-palette.tsx`, `apps/web/src/components/ui/confirm-dialog.tsx`, `apps/web/src/components/agent/agent-create-dialog.tsx`

---

### 1.4 Agent card context menu positions incorrectly near screen edges
**Problem:** The context menu in `AgentCard` (`apps/web/src/components/board/agent-card.tsx` lines 191–225) is positioned at `{ top: contextMenu.y, left: contextMenu.x }` using `position: fixed`. No viewport boundary detection. Right-clicking a card near the bottom or right edge of the screen will render the menu off-screen.

**Solution:** Calculate available space and flip the menu direction. Use a lightweight positioning library like Floating UI, or implement boundary clamping with `Math.min(contextMenu.x, window.innerWidth - menuWidth)`.

**Impact:** High — completely broken interaction for cards near screen edges.  
**Files:** `apps/web/src/components/board/agent-card.tsx` (lines 191–225)

---

### 1.5 No visual feedback for keyboard-selected cards
**Problem:** Arrow key navigation (`useKeyboardShortcuts`) updates `selectedAgentId` in the UI store, and the `AgentCard` checks `isSelected` for a glow ring. But the board doesn't scroll the selected card into view. If a lane has 20 agents and you arrow down, the selected card scrolls off-screen with no visual cue.

**Solution:** After setting `selectAgent(agent.id)`, scroll the corresponding card into view via `document.querySelector(\`[data-testid="agent-card-${agent.id}"]\`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })`.

**Impact:** High — keyboard navigation is unusable with more than a screenful of agents.  
**Files:** `apps/web/src/hooks/use-keyboard-shortcuts.ts` (lines 112–200), `apps/web/src/components/board/agent-card.tsx`

---

### 1.6 Board deletion has no navigation recovery
**Problem:** `boardStore.deleteBoard()` (`apps/web/src/stores/board-store.ts` lines 105–130) sets `currentBoard: null` when the deleted board was the current one, but does not navigate the user anywhere. The UI would be left in a broken state — no board, no swimlanes, an empty shell.

**Solution:** After deleting the current board, navigate to the next available board or to `/settings` if none remain. The optimistic delete rollback is implemented, but the happy path leaves the user stranded.

**Impact:** High — complete UX dead-end after a successful action.  
**Files:** `apps/web/src/stores/board-store.ts` (lines 105–130)

---

## 2. Missing "Table Stakes" Features

### 2.1 No search or filter for agents
**Problem:** There is no way to search or filter agents on the board. The command palette (`command-palette.tsx`) has fuzzy search via `cmdk`, but the main board view has no filter bar. With 20+ agents across 4 lanes, finding a specific agent requires visual scanning.

**Solution:** Add a filter bar above the kanban board: text search (fuzzy match on name, model, command), status filter pills (running, error, idle), and model filter. The API already supports `?status=` and `?boardId=` query params — extend to support `?search=`.

**Impact:** High — this is table stakes for any orchestration tool.  
**Files:** `apps/web/src/components/board/kanban-board.tsx`, `apps/api/src/routes/agents.ts`, `apps/api/src/services/agent-service.ts`

---

### 2.2 No bulk operations
**Problem:** You can only act on agents one at a time. No "stop all running agents", no "delete all completed agents", no multi-select. For a tool managing a fleet, this is a critical gap.

**Solution:** Add multi-select (Shift+Click, Cmd+Click), a selection toolbar that appears with bulk actions (Stop All, Delete Selected, Move Selected to Lane), and keyboard shortcut `Cmd+A` to select all agents in the current lane.

**Impact:** High — fleet management is the core use case.  
**Files:** `apps/web/src/stores/ui-store.ts` (add `selectedAgentIds: Set<string>`), `apps/web/src/components/board/kanban-board.tsx`

---

### 2.3 No undo/redo
**Problem:** Deleting an agent is permanent. Moving an agent to a wrong lane requires manually dragging it back. There's a `ConfirmDialog` for delete, but no undo mechanism.

**Solution:** Implement undo for destructive actions using a toast with "Undo" button (like Gmail's "Message sent. Undo."). For delete, keep the agent in a soft-deleted state for 5 seconds. For moves, store the previous position. `sonner` supports action buttons on toasts — use `toast('Agent deleted', { action: { label: 'Undo', onClick: restoreAgent } })`.

**Impact:** Medium — prevents costly mistakes.  
**Files:** `apps/web/src/stores/agent-store.ts`, `apps/web/src/components/board/agent-card.tsx`

---

### 2.4 No real-time updates / polling for board state
**Problem:** The agent list is fetched once on mount (`kanban-board.tsx` line 60). If another tab or user makes changes, or if an agent's status changes server-side, the board goes stale. There's no polling interval and no SSE/WebSocket subscription for agent status changes.

**Solution:** Add a polling interval (every 5s) for `fetchAgents`, or better — use SSE to push agent status changes. The API already has SSE infrastructure in `routes/logs.ts`. Extend with an `/agents/events` SSE endpoint that emits status changes, creates, and deletes.

**Impact:** High — the board lies about agent state after initial load.  
**Files:** `apps/web/src/components/board/kanban-board.tsx`, `apps/api/src/routes/agents.ts`

---

### 2.5 No board CRUD from the main UI
**Problem:** The `TopBar` shows a board selector dropdown, but there's no way to create, rename, or delete boards from the main UI. The board management is only accessible if you're on `/settings` (and even there, there's no board management — only keyboard shortcuts, general settings, and about).

**Solution:** Add a "+" button next to the board selector. Add a right-click context menu on the selector with Rename/Delete. Or add board management to the settings page with a proper board list.

**Impact:** Medium — users are stuck with whatever boards exist.  
**Files:** `apps/web/src/components/layout/top-bar.tsx`, `apps/web/src/routes/settings.tsx`

---

### 2.6 No confirmation or protection for drag-and-drop lifecycle transitions
**Problem:** Dragging a running agent to "Done" lane silently stops it (via `moveAgent` which transitions status). There's no confirmation dialog. A user could accidentally drop an agent into "Not Started" and kill a long-running process.

**Solution:** For cross-lane moves that trigger stop/start transitions, show a confirmation toast or dialog: "Moving to Done will stop this agent. Continue?". The spec mentions this in §3 under "Invalid transitions" but it's not implemented — the API just applies the transition.

**Impact:** Medium — accidental data loss / work interruption.  
**Files:** `apps/web/src/components/board/kanban-board.tsx` (handleDragEnd), `apps/api/src/services/agent-service.ts` (moveAgent)

---

### 2.7 No agent duplication / cloning
**Problem:** The context menu spec lists "Duplicate Config" but it's not implemented. Users who want to create similar agents must re-enter all configuration manually.

**Solution:** Add "Duplicate" to the context menu and command palette. Create a new agent with the same model, command, workingDir, and envVars, appending " (copy)" to the name.

**Impact:** Medium — significant friction for fleet-scale usage.  
**Files:** `apps/web/src/components/board/agent-card.tsx`, `apps/web/src/stores/agent-store.ts`

---

## 3. Differentiation Opportunities

### 3.1 Agent templates / presets system
**Problem:** Every agent is configured from scratch. Power users have recurring patterns (e.g., "Frontend Claude Agent with Node.js", "Backend GPT Agent with Python").

**Solution:** Create a template system: save any agent config as a template, pick from templates in the create dialog. Store templates in a `templates` table (name, model, command, workingDir, envVars). Add a "Save as Template" button in `AgentConfigForm` and a template picker in `AgentCreateDialog`. This is how Notion does blocks — composability through reuse.

**Impact:** High — massive reduction in setup friction, makes the product sticky.  
**Files:** New: `apps/api/src/db/schema.ts` (templates table), `apps/api/src/routes/templates.ts`, `apps/web/src/components/agent/template-picker.tsx`

---

### 3.2 Inter-agent communication visualizer
**Problem:** When agents depend on each other (Agent B waits for Agent A's output), there's no way to visualize these relationships.

**Solution:** Add a "Dependencies" view (toggle from board view) that renders agents as nodes in a DAG. Use a library like `reactflow` or `d3-dag`. Allow users to define dependencies in agent config (dependsOn: string[]). Show status propagation — when Agent A completes, Agent B auto-starts. This would be genuinely unique in the AI orchestration space.

**Impact:** High — this is the "10x feature" that makes Command Center THE orchestration platform.  
**Files:** New: `apps/web/src/components/graph/dependency-graph.tsx`, `packages/shared/src/schemas/agent.ts` (add dependsOn field)

---

### 3.3 Natural language → agent config
**Problem:** Configuring agents requires knowing exact commands, paths, and environment variables.

**Solution:** Add a "Describe your task" textarea in the create dialog. Use a local LLM or heuristic parser to extract: name, model suggestion, command, working directory. Example: "Run the frontend tests in ~/myproject using Claude" → `{ name: "Frontend Tests", command: "npm test", workingDir: "~/myproject", model: "claude-4" }`. Progressive disclosure — power users skip this, new users benefit.

**Impact:** Medium — lowers barrier to entry, aligns with ChatGPT-style progressive disclosure.  
**Files:** `apps/web/src/components/agent/agent-create-dialog.tsx`

---

### 3.4 Agent performance analytics dashboard
**Problem:** `AgentMetrics` (`apps/web/src/components/agent/agent-metrics.tsx`) shows a single point-in-time CPU/memory reading. No historical charts, no trends, no comparisons.

**Solution:** Add a metrics dashboard view: time-series charts for CPU, memory, and tokens over the last hour/day. Use a lightweight chart library (recharts, lightweight-charts). The API already stores metric history (`/agents/:id/metrics/history`). Add a sparkline in the agent card for at-a-glance health.

**Impact:** Medium — turns the tool from "monitoring" to "observability".  
**Files:** `apps/web/src/components/agent/agent-metrics.tsx`, new: `apps/web/src/components/agent/metrics-chart.tsx`

---

### 3.5 Multi-board workspace with drag between boards
**Problem:** Boards are completely isolated. You can't move an agent from "Project A" board to "Project B" board.

**Solution:** Add a board sidebar (like Notion's page tree) and allow cross-board drag. Requires adding a `PATCH /agents/:id` that changes `boardId`. Show a minimap of boards in the side panel.

**Impact:** Low — power user feature, but differentiating.  
**Files:** `apps/web/src/components/layout/app-shell.tsx`, `apps/api/src/services/agent-service.ts`

---

### 3.6 Plugin system for custom agent adapters
**Problem:** The `plugins/opencode/` adapter exists but there's no plugin discovery, registration, or UI for it. It's dead code from the user's perspective.

**Solution:** Build a plugin manifest system. Each plugin exports a `detect()`, `parseStatus()`, and `getConfig()` function. The API loads plugins at startup and exposes them via `/api/v1/plugins`. The create dialog shows detected running agents from plugins as importable presets. The opencode adapter should auto-detect running opencode instances and offer to import them.

**Impact:** High — extensibility is what makes developer tools ecosystem players.  
**Files:** `plugins/opencode/src/`, new: `apps/api/src/services/plugin-service.ts`, `apps/web/src/components/agent/plugin-import.tsx`

---

### 3.7 Import/export board configurations
**Problem:** No way to share a board setup between machines or team members.

**Solution:** Add export (JSON) and import buttons in the board header or settings. Export includes board name, swimlane configuration, and all agent configs (minus runtime state like PID, tmuxSession). This makes "board as code" possible.

**Impact:** Medium — enables reproducible agent setups.  
**Files:** `apps/api/src/routes/boards.ts` (add `/boards/:id/export` and `/boards/import`), `apps/web/src/components/layout/top-bar.tsx`

---

### 3.8 Collaborative features (multi-tab sync)
**Problem:** Opening the same board in two browser tabs creates split-brain. Each tab has its own Zustand state. Actions in one tab are invisible in the other.

**Solution:** Use `BroadcastChannel` API to sync Zustand state across tabs. When any store action occurs, broadcast the mutation. Other tabs apply it. This is cheap to implement and dramatically improves perceived quality.

**Impact:** Medium — "it just works" quality signal.  
**Files:** `apps/web/src/stores/agent-store.ts`, `apps/web/src/stores/board-store.ts`

---

## 4. UX Micro-improvements

### 4.1 Toast messaging is inconsistent
**Problem:** Some actions show success toasts, some don't. `handleStop` in `AgentActions` uses `toast()` (neutral) while `handleStart` uses `toast.success()`. Move operations show success but optimistic move failures show nothing. The toast for "Agent started" appears even when the agent transitions to error state (the API returns the agent regardless of final status).

**Solution:** Standardize: all lifecycle actions → success/error toast. All moves → success toast only on cross-lane transitions. Error toasts should include a "View Logs" action button. Follow the spec exactly: error → red with action, completed → blue with animation.

**Impact:** Medium — consistency builds trust.  
**Files:** `apps/web/src/components/agent/agent-actions.tsx`, `apps/web/src/components/board/kanban-board.tsx`, `apps/web/src/components/board/agent-card.tsx`

---

### 4.2 No loading skeletons for agent cards
**Problem:** When the board loads, it shows either a spinner or the empty state, then suddenly renders all cards at once. No progressive rendering, no skeleton placeholders.

**Solution:** Add `AgentCardSkeleton` component (mentioned in spec §9 but never built). Show 2-3 skeleton cards per lane during loading. Use `pulse` animation matching the existing shimmer keyframe.

**Impact:** Medium — perceived performance improvement (Vercel does this perfectly).  
**Files:** New: `apps/web/src/components/board/agent-card-skeleton.tsx`, `apps/web/src/components/board/swimlane.tsx`

---

### 4.3 Swimlane header needs accessibility role
**Problem:** The swimlane header (`swimlane.tsx` lines 32–48) uses a `<div>` with `onClick` and `cursor-pointer` but no `role="button"`, `tabIndex`, or keyboard event handler. It's inaccessible via keyboard.

**Solution:** Add `role="button"`, `tabIndex={0}`, and `onKeyDown` handler for Enter/Space. The spec mandates keyboard navigability for all interactions.

**Impact:** Medium — accessibility compliance.  
**Files:** `apps/web/src/components/board/swimlane.tsx` (lines 32–48)

---

### 4.4 Side panel has no resize handle
**Problem:** The spec calls for a draggable divider between main content and side panel with double-click to snap to 60/40. The current implementation just uses a fixed `sidePanelWidth` in rem with no resize interaction.

**Solution:** Use `react-resizable-panels` (already in the spec) or a custom drag handle. Store the width in `ui-store.ts` (already has `setSidePanelWidth`). The state setter exists but no UI consumes it.

**Impact:** Medium — power users need panel customization.  
**Files:** `apps/web/src/components/layout/app-shell.tsx`, `apps/web/src/stores/ui-store.ts`

---

### 4.5 Command palette doesn't show recently used commands
**Problem:** The command palette lists all commands in static groups. No "Recent" section, no learning from usage patterns.

**Solution:** Track last 5 executed commands in localStorage. Show a "Recent" group at the top of the command palette. This is how Linear's `Cmd+K` works — your most-used commands are always first.

**Impact:** Low — but makes power users significantly faster.  
**Files:** `apps/web/src/components/command/command-palette.tsx`

---

### 4.6 No onboarding flow for first-time users
**Problem:** A brand-new user lands on the board and sees "Create your first agent" with no context about what agents are, how they work, or what command to enter. The product assumes domain knowledge.

**Solution:** Add a 3-step onboarding tooltip sequence: (1) "Agents run AI coding tasks in tmux sessions", (2) "Click New Agent to create one — you'll need a command to run", (3) "Use Cmd+K to access all actions quickly". Store `onboardingComplete` in localStorage.

**Impact:** Medium — reduces abandonment for new users.  
**Files:** `apps/web/src/components/board/kanban-board.tsx`, new: `apps/web/src/components/ui/onboarding.tsx`

---

### 4.7 View mode labels missing from keyboard shortcut hints
**Problem:** `ViewModeToggle` shows `⌘1`, `⌘2`, `⌘3` but only on hover. First-time users have no way to discover these shortcuts exist without hovering over each button.

**Solution:** Show shortcut hints in the status bar based on current context (the spec calls for this — "Keyboard shortcut hint for current context"). The status bar currently shows static `⌘K command palette` but nothing else.

**Impact:** Low — discoverability improvement.  
**Files:** `apps/web/src/components/layout/status-bar.tsx`

---

### 4.8 `formatDate` in `AgentDetail` shows raw locale string
**Problem:** `AgentDetail` (`agent-detail.tsx` line 14) uses `new Date(iso).toLocaleString()` which produces an ugly format like "3/20/2026, 3:36:44 PM". Developer tools should use relative time ("2 hours ago") or clean formats ("Mar 20, 3:36 PM").

**Solution:** Use relative time for dates within 24 hours, and a clean absolute format for older dates. The `StatusBar` already has a `formatRelativeTime` function — extract it to a shared utility.

**Impact:** Low — polish detail.  
**Files:** `apps/web/src/components/agent/agent-detail.tsx` (line 14)

---

## 5. Technical Debt & Architecture Issues

### 5.1 Duplicated WebSocket event handlers in `terminal-store.ts`
**Problem:** The `connectTerminal` and `reconnectFn` functions in `apps/web/src/stores/terminal-store.ts` both contain nearly identical WebSocket setup code (onopen, onmessage, onerror, onclose handlers). Lines 112–165 and 180–225 are ~80% duplicate.

**Solution:** Extract a `createWebSocketConnection(sessionName, url)` helper that returns a configured WebSocket. Both functions should call this helper.

**Impact:** Medium — violates DRY, increases bug surface when updating reconnection logic.  
**Files:** `apps/web/src/stores/terminal-store.ts`

---

### 5.2 No Zod validation in API route handlers
**Problem:** The spec mandates `@hono/zod-validator` for request validation. Instead, every route does manual `if (!body.name)` checks (`routes/agents.ts` lines 16–20, `routes/boards.ts` lines 13–14). The shared Zod schemas exist in `packages/shared/src/schemas/` but are never used server-side.

**Solution:** Replace manual validation with `zValidator('json', createAgentSchema)` middleware on each POST/PUT route. This ensures consistent error formats and leverages the existing schema definitions.

**Impact:** High — inconsistent validation, duplicate logic, missing edge cases.  
**Files:** `apps/api/src/routes/agents.ts`, `apps/api/src/routes/boards.ts`, `apps/api/src/routes/logs.ts`

---

### 5.3 Stores use `Map` but no selector memoization
**Problem:** `useAgentStore` and `useBoardStore` return `Map` objects. Every subscriber that calls `(s) => s.agents` gets a new reference only when the map instance changes, but `getAgentsByLane` (`agent-store.ts` line 177) creates a new array every time `getState()` is called, even when the underlying data hasn't changed.

**Solution:** Use Zustand's `useShallow` comparator for derived data, or memoize selectors. The `getAgentsByLane` should be a selector factory that returns a stable reference when inputs haven't changed.

**Impact:** Medium — causes unnecessary re-renders as agent count grows.  
**Files:** `apps/web/src/stores/agent-store.ts` (lines 177–180), `apps/web/src/components/board/kanban-board.tsx`

---

### 5.4 `useLogStream` effect has `addLog` in dependency array
**Problem:** In `apps/web/src/lib/use-log-stream.ts`, the `useEffect` at line 64 includes `addLog` in its dependency array. `addLog` is created with `useCallback` and has `[]` deps so it's stable. But if someone adds a dependency to `addLog` in the future, the entire EventSource will reconnect on every render.

**Solution:** Use a ref for `addLog` to decouple the effect from callback stability: `const addLogRef = useRef(addLog); addLogRef.current = addLog;`.

**Impact:** Low — but a latent foot-gun.  
**Files:** `apps/web/src/lib/use-log-stream.ts`

---

### 5.5 Missing error boundary around board-level data fetching
**Problem:** `KanbanBoard` fetches data in `useEffect` and catches 404s to redirect. But any other error (network timeout, 500, JSON parse failure) is swallowed. The `ErrorBoundary` wraps `BoardPage` but `useEffect` errors don't trigger React error boundaries.

**Solution:** Add error state handling in `KanbanBoard` that shows a retry-able error view when `agentStore.error` or `boardStore.error` is set. Currently these error states are set but never rendered.

**Impact:** Medium — silent failures with no recovery path.  
**Files:** `apps/web/src/components/board/kanban-board.tsx`, `apps/web/src/stores/agent-store.ts`, `apps/web/src/stores/board-store.ts`

---

### 5.6 `API_BASE_URL` is hardcoded as relative path
**Problem:** `apps/web/src/lib/constants.ts` exports `API_BASE_URL = '/api/v1'`. This works when the Vite dev server proxies to the API, but the terminal store (`terminal-store.ts` line 11) hardcodes `ws://localhost:4000` and the side panel hardcodes the same. The API client works via relative path (goes through Vite proxy), but WebSockets don't benefit from this.

**Solution:** Use a single source of truth for the API origin. Read from `import.meta.env.VITE_API_URL` or derive WebSocket URL from the HTTP URL. The mixed relative/absolute approach will break in any non-default deployment.

**Impact:** Medium — deployment fragility.  
**Files:** `apps/web/src/lib/constants.ts`, `apps/web/src/stores/terminal-store.ts`, `apps/web/src/components/layout/side-panel.tsx`, `apps/web/src/components/layout/app-shell.tsx`

---

### 5.7 Log level mismatch between DB schema and shared types
**Problem:** The database schema (`apps/api/src/db/schema.ts` line 82) defines log levels as `['debug', 'info', 'warn', 'error']`. But the spec in `COMMAND_CENTER_SPEC.md` §6 defines them as `['stdout', 'stderr', 'system', 'error']`. The shared schema (`packages/shared/src/schemas/log.ts`) should be the single source of truth, but there's a mismatch that will surface when log ingestion from actual agent processes begins.

**Solution:** Decide on one set of log levels and update both the DB schema and shared types to match. For an agent orchestrator, the spec's levels (`stdout`, `stderr`, `system`, `error`) make more sense than generic logging levels.

**Impact:** Medium — will break when real log ingestion is implemented.  
**Files:** `apps/api/src/db/schema.ts` (line 82), `packages/shared/src/schemas/log.ts`

---

### 5.8 CORS is hardcoded to `localhost:5173`
**Problem:** `apps/api/src/app.ts` line 39 hardcodes `origin: 'http://localhost:5173'`. This blocks any other origin, including production deployments, other dev ports, or LAN access.

**Solution:** Read allowed origins from env var: `origin: env.CORS_ORIGINS?.split(',') ?? ['http://localhost:5173']`.

**Impact:** Low — only matters in non-default setups, but easy to fix.  
**Files:** `apps/api/src/app.ts` (line 39), `apps/api/src/lib/env.ts`

---

## 6. Performance Opportunities

### 6.1 No virtualization for large agent lists
**Problem:** Each swimlane renders all agent cards in a flat `<div>`. With 50+ agents per lane, this creates 200+ DOM nodes in the kanban view. Each `AgentCard` contains Framer Motion animation bindings, multiple Zustand subscriptions, and conditional rendering logic.

**Solution:** Use `@tanstack/react-virtual` for swimlane content. Only render cards in the visible viewport. The `@dnd-kit` sortable context is compatible with virtualized lists with some configuration.

**Impact:** High — performance cliff at 100+ agents.  
**Files:** `apps/web/src/components/board/swimlane.tsx`

---

### 6.2 Agent log fetching triggers re-renders for all cards
**Problem:** `KanbanBoard` has an effect (lines 72–79) that iterates over ALL agents, checks if they're running, and calls `fetchLatestLogs` for each. This fires every time `agents` map reference changes (which happens on any agent mutation). The `agents` dependency means every card re-renders when any log fetch updates the store.

**Solution:** Move log fetching into individual `AgentCard` components (only for running/error agents). Use a separate `useEffect` per card that watches its own agent's status. This eliminates the N+1 re-render cascade.

**Impact:** High — linear performance degradation with agent count.  
**Files:** `apps/web/src/components/board/kanban-board.tsx` (lines 72–79), `apps/web/src/components/board/agent-card.tsx`

---

### 6.3 `StatusBar` tmux session polling creates unnecessary network traffic
**Problem:** `StatusBar` (`apps/web/src/components/layout/status-bar.tsx` lines 37–55) polls `api.tmux.listSessions()` every 10 seconds, even when the tmux count hasn't changed and no terminals are open. This creates continuous network traffic for a cosmetic status indicator.

**Solution:** Use a longer interval (30s) or only poll when a terminal panel is open. Alternatively, expose tmux session count via the health endpoint to avoid a separate request.

**Impact:** Low — unnecessary network traffic.  
**Files:** `apps/web/src/components/layout/status-bar.tsx`

---

### 6.4 `LiveTimer` re-renders every second for every running agent
**Problem:** Each `LiveTimer` component (`apps/web/src/components/ui/live-timer.tsx`) sets up its own `setInterval` that triggers `setNow(Date.now())` every second. If 10 agents are running, that's 10 independent timers causing 10 re-renders per second.

**Solution:** Use a single shared timer context or observable. Create a `useTickEverySecond()` hook that uses a single `setInterval` shared via React context or a module-level variable. All `LiveTimer` instances subscribe to the same tick.

**Impact:** Medium — noticeable jank with 10+ running agents on lower-end hardware.  
**Files:** `apps/web/src/components/ui/live-timer.tsx`

---

### 6.5 Bundle size: Framer Motion is heavy for simple animations
**Problem:** `framer-motion` is imported in `swimlane.tsx`, `agent-card.tsx`, `drag-overlay.tsx`, `side-panel.tsx`, `app-shell.tsx`, `status-dot.tsx`. The full Framer Motion bundle is ~35KB gzipped. Most usage is simple `layout` animations and opacity transitions that CSS can handle.

**Solution:** Replace simple animations with CSS transitions (already used in many places). Keep Framer Motion only for complex layout animations in drag-and-drop. Consider `motion` (the lightweight version from the same team) or `framer-motion/m` for reduced bundle size.

**Impact:** Medium — 35KB is significant for a local-first tool that should load instantly.  
**Files:** All files importing `framer-motion`

---

### 6.6 Metrics polling per agent creates N concurrent intervals
**Problem:** Each `AgentMetrics` component (`agent-metrics.tsx` lines 39–53) creates its own 5-second polling interval. If 5 agent detail views are opened sequentially (side panel), 5 independent intervals accumulate because the cleanup only runs on unmount, and the component may not unmount between agent selections.

**Solution:** Clear the interval AND cancel in-flight requests when `agentId` changes (already partially handled by the `useEffect` cleanup). But verify via `useRef` that stale intervals are cleared on `agentId` changes. Also: consider batching all metric fetches into a single API call.

**Impact:** Low — only affects power users who rapidly switch between agents.  
**Files:** `apps/web/src/components/agent/agent-metrics.tsx`

---

## Summary Priority Matrix

| Priority | Count | Items |
|----------|-------|-------|
| **P0 — Fix now** | 6 | Settings dead-end, board switch loading, Escape conflicts, context menu positioning, keyboard scroll-into-view, board deletion recovery |
| **P1 — This sprint** | 7 | Search/filter, bulk ops, real-time updates, Zod validation, no-agent-duplication, board CRUD from UI, drag confirmation |
| **P2 — Next sprint** | 8 | Templates, undo, analytics, plugin system, virtualization, log fetch optimization, timer consolidation, skeleton cards |
| **P3 — Roadmap** | 8 | Dependency graph, NL→config, multi-board drag, import/export, collaborative sync, onboarding, command recency, metrics batching |

---

*This audit represents a single pass through the codebase as of March 2026. Every issue cited references specific files and line numbers in the current implementation. Reassess after addressing P0 items.*
