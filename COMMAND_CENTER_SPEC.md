# COMMAND CENTER — Master Build Specification

> *"The measure of a tool is not what it does, but what it makes possible."*

---

## §0 — Orchestrator Directive

You are the Sisyphus. You have at your disposal a fleet of autonomous subagents — each capable of writing production-grade TypeScript, reasoning through architectural trade-offs, and executing terminal commands with precision. Your job is not to write every line. Your job is to *think clearly*, *decompose ruthlessly*, *delegate precisely*, and *hold the line on quality*.

You are building **Command Center**: a local-first visual orchestration layer for AI agents. Think NASA Mission Control reimagined for the age of autonomous coding agents. A Trello-meets-Linear kanban board fused with embedded tmux terminals, built for engineers who run fleets of AI agents on their local machines and need a single pane of glass to command them all.

This is not a toy. This is not a prototype. This is an opinionated, production-grade developer tool — built to the standards of the best open-source projects in the ecosystem. Every component tested. Every interaction considered. Every pixel intentional.

### How to work

1. **Read this entire specification before writing a single line.** Internalize the vision, the architecture, the patterns, the constraints. Then plan.
2. **Decompose into parallel workstreams.** The monorepo structure is designed for this — `packages/shared` can be built independently of `apps/web`, the database layer can be built independently of the API routes. Identify the dependency graph and parallelize.
3. **Foundation first.** The monorepo scaffold, shared types, database schema, and design tokens must exist before any feature work begins. This is the bedrock.
4. **Test as you build.** Every component, every store slice, every API route gets a test file written alongside it — not after. Testing is not a phase; it is a practice.
5. **Commit atomically.** Each commit should represent a single coherent change. `feat: add agent card component with tests` — not `add stuff`.
6. **Never sacrifice correctness for speed.** If something feels wrong, stop and think. Rewrite. Refactor. The cost of fixing a bad foundation is always higher than building it right.

### Quality gates (non-negotiable)

- TypeScript `strict: true` — zero `any`, zero `@ts-ignore` without a tracking comment
- Every exported component has a corresponding `.test.tsx` file
- Every API route has a corresponding `.test.ts` file
- Every Zustand store has a corresponding `.test.ts` file
- All tests pass before any commit
- ESLint clean (zero warnings in CI, warnings allowed locally only during active development)
- Accessible: keyboard navigable, screen-reader announced, reduced-motion respected
- Responsive down to 1024px (this is a desktop tool, but ultrawide and laptop screens both matter)

---

## §1 — Spec Enhancement Mandate

The lite specification provided below is a starting point — a sketch on a napkin. Before you begin implementation, you must enhance it. Here is what is missing and what you must resolve:

### Gaps to fill

1. **Error handling strategy.** The spec says nothing about what happens when a tmux session dies, when a WebSocket disconnects, when SQLite is locked, when an agent process crashes. Define error boundaries — both in the React sense and the architectural sense. Every failure mode must have a recovery path.

2. **Real-time data flow architecture.** The spec mentions SSE for logs and WebSocket for terminals but does not specify the full real-time topology. Map out exactly which data flows over HTTP (request/response), which over SSE (server-pushed events), and which over WebSocket (bidirectional streams). Be explicit about reconnection strategies, buffering, and backpressure.

3. **Agent lifecycle state machine.** "Create/stop/restart" is insufficient. Define the complete state machine for an agent: `idle → starting → running → paused → stopping → stopped → error → completed`. Define valid transitions. Define what triggers each transition. Define what side effects occur on each transition (e.g., `running → error` should capture the last N log lines, emit a notification, and update the card's visual state).

4. **Keyboard interaction model.** This is a power-user tool. Every action reachable by mouse must be reachable by keyboard. Define the shortcut map: navigation between swimlanes, card selection, card movement, terminal focus, command palette, quick actions. Reference Linear's keyboard model as inspiration.

5. **Persistence and session recovery.** What happens when the user closes the browser and reopens it? What happens when the API server restarts? Define what state is ephemeral (WebSocket connections, terminal scroll position) vs. durable (board layout, agent positions, agent configurations). SQLite is the durable layer. Zustand is the ephemeral layer. Be explicit about what lives where.

6. **Drag-and-drop edge cases.** What happens when you drag a running agent to "Done"? Does it auto-stop? What happens when you drag from "Done" back to "In Progress"? Does it auto-restart? Define the semantics of lane transitions and their side effects on agent state.

7. **Component composition patterns.** The spec lists features but not how they compose visually. Define the layout shell. Define how the kanban view, terminal panel, detail drawer, and command palette coexist. Define the split-pane behavior. Define what "focus mode" looks like.

### Research directives

- Study `@dnd-kit`'s sortable preset and multi-container examples. The kanban use case requires moving items between containers (swimlanes) with positional ordering within each container.
- Study xterm.js v5 API, particularly the `ITerminalAddon` interface, the fit addon, and the webgl renderer for performance.
- Study Hono's WebSocket helper (`hono/ws`) for the terminal streaming backend.
- Study Drizzle ORM's SQLite dialect — specifically `drizzle-orm/better-sqlite3` for synchronous, single-file database access.

---

## §2 — Product Vision & Philosophy

### What this is

Command Center is a **local-first desktop web application** for visually orchestrating AI coding agents. It runs entirely on your machine — no cloud, no accounts, no telemetry. You start it, it discovers your running agents and tmux sessions, and it gives you a beautiful, interactive kanban board to manage them.

Each agent is a card. Each card lives in a swimlane that represents its lifecycle stage. You drag cards between lanes. You click a card to see its details. You open a terminal to interact with it directly. You watch logs stream in real-time. You see at a glance which agents are working, which are stuck, which are done.

### Who this is for

Engineers who run multiple AI coding agents simultaneously. People who have 5 tmux panes open and can't remember which agent is working on which task. People who want the organizational clarity of Linear applied to their local agent fleet.

### Design principles

1. **Clarity over cleverness.** Every UI element must communicate its purpose immediately. No mystery meat navigation. No hidden gestures. If it's important, it's visible.

2. **Speed is a feature.** The app must feel instant. Page loads under 100ms. Drag operations at 60fps. Terminal rendering at native speed. Perceived performance matters as much as actual performance.

3. **Local-first, always.** No network calls to external services. No analytics. No tracking. The only network activity is between the browser and the local API server. Your data never leaves your machine.

4. **Keyboard-first, mouse-friendly.** Every action has a keyboard shortcut. But the mouse experience must be equally polished. Neither is an afterthought.

5. **Progressive disclosure.** Show the essentials by default. Reveal complexity on demand. The kanban board is simple. The agent detail panel has depth. The terminal has full power. Let the user choose their level of engagement.

6. **Resilient by default.** Agents crash. Processes die. WebSockets disconnect. The UI must handle all of these gracefully — no white screens, no frozen states, no silent failures. Show the user what happened and offer a path forward.

---

## §3 — UX & Interaction Design

### Layout architecture

The application uses a **shell layout** with four distinct zones:

```
┌─────────────────────────────────────────────────────┐
│  Top Bar (app title, board selector, global actions) │
├──────────────────────────────┬──────────────────────┤
│                              │                      │
│     Main Content Area        │   Side Panel         │
│     (Kanban Board)           │   (Agent Detail /    │
│                              │    Terminal)          │
│                              │                      │
├──────────────────────────────┴──────────────────────┤
│  Status Bar (agent count, system health, shortcuts)  │
└─────────────────────────────────────────────────────┘
```

**Top Bar** — Fixed. Contains:
- App logo/wordmark (left)
- Board selector dropdown (center-left)
- Quick-add agent button (center-right)
- Command palette trigger `⌘K` (right)
- Settings gear (far right)

**Main Content** — The kanban board. Scrolls horizontally if swimlanes overflow. Each swimlane scrolls vertically independently.

**Side Panel** — Slides in from the right via `react-resizable-panels`. Three modes:
- **Closed** (default) — full-width kanban
- **Detail view** — agent detail card with config, logs preview, actions
- **Terminal view** — embedded xterm.js terminal connected to the agent's tmux session

The divider between main content and side panel is draggable. Double-click to snap to 60/40 default.

**Status Bar** — Fixed at bottom. Minimal. Shows:
- Active agents count (with colored dot)
- tmux sessions count
- Last event timestamp
- Keyboard shortcut hint for current context

### View modes

1. **Board view** (default) — Full kanban board with optional side panel
2. **Terminal view** — Side panel expanded to 100%, showing terminal full-screen
3. **Focus view** — Single agent card expanded with terminal below (stacked vertical layout, like an IDE)

Toggle between views with `⌘1`, `⌘2`, `⌘3`.

### Kanban board interactions

**Swimlanes:**
- Four fixed lanes: `Not Started` → `In Progress` → `Review` → `Done`
- Each lane header shows: lane name, card count badge, collapse/expand toggle
- Lanes can be collapsed to just the header (useful on smaller screens)
- Subtle color accent on lane header: gray, blue, amber, green respectively

**Agent cards:**
- Fixed-width within the lane, full-width minus padding
- Displays: agent name (bold), model badge (pill), status indicator (colored dot), runtime duration (live-updating), last log line (truncated, monospace, muted)
- Hover: subtle elevation lift (+2px Y translate, shadow increase), quick-action icons fade in (terminal, stop/play, more menu)
- Selected: ring outline in accent color, side panel opens to detail view
- Drag: card lifts with scale(1.03) and shadow, original position shows a ghost placeholder, valid drop zones highlight with a dashed border pulse
- Context menu (right-click): Open Terminal, View Logs, Restart, Stop, Duplicate Config, Delete

**Drag-and-drop semantics:**
- Dragging between lanes triggers an agent lifecycle transition (see §6 state machine)
- Dragging within a lane reorders (position update only, no state change)
- Invalid transitions are prevented: drop zone shows red rejection indicator and card snaps back
- Lane transition side effects:
  - → Not Started: agent is stopped if running, status set to `idle`
  - → In Progress: agent is started if idle, status set to `running`
  - → Review: no automatic state change, status set to `paused` (agent keeps running but flagged for review)
  - → Done: agent is stopped if running, status set to `completed`

**Empty state:**
- Each empty lane shows a subtle placeholder: "Drag an agent here" with a dashed border card outline
- The board itself, when completely empty, shows a centered onboarding prompt: "Create your first agent" with a prominent CTA button

### Command palette

Triggered by `⌘K` (or `Ctrl+K`). Built with `cmdk` (Command Menu component).

**Commands:**
- `Create Agent` — opens agent creation dialog
- `Switch Board` — board selector
- `Open Terminal` — lists agents with terminals, opens selected
- `Search Agents` — fuzzy search across all agent names
- `Go to Settings` — opens settings panel
- Agent quick actions: `Stop <agent>`, `Restart <agent>`, `View Logs <agent>`

### Keyboard shortcut map

| Shortcut | Action |
|----------|--------|
| `⌘K` | Command palette |
| `⌘N` | New agent |
| `⌘1/2/3` | Switch view mode |
| `←/→` | Navigate between swimlanes |
| `↑/↓` | Navigate between cards in a lane |
| `Enter` | Open selected card detail |
| `T` | Open terminal for selected card |
| `Space` | Toggle play/pause for selected agent |
| `Backspace/Delete` | Stop selected agent (with confirmation) |
| `Escape` | Close side panel / deselect / close modal |
| `⌘,` | Open settings |

### Animations & motion

Use **Framer Motion** (or CSS transitions where sufficient) with these principles:
- **Spring physics** for drag-and-drop (stiffness: 300, damping: 25)
- **Fade + slide** for panel open/close (200ms ease-out)
- **Scale pulse** for status indicators (running agents have a subtle breathing pulse on their status dot)
- **Layout animations** for list reordering when cards are moved
- **Respect `prefers-reduced-motion`**: disable all non-essential animations, keep only opacity transitions

### Notifications

Use `sonner` for toast notifications:
- Agent started → success toast (green)
- Agent stopped → neutral toast (gray)
- Agent error → error toast (red) with "View Logs" action button
- Agent completed → success toast (blue) with celebratory subtle animation
- WebSocket reconnected → info toast (blue)

---

## §4 — Visual Design System

### Philosophy

Dark-first. This is a developer tool used in low-light environments alongside terminals and IDEs. The dark theme is the *primary* theme. A light theme is a nice-to-have for v2 — do not build it now. Focus entirely on a stunning dark experience.

### Color tokens (CSS custom properties)

Map these to Tailwind CSS v4 and shadcn/ui's theming system:

```
--background:       hsl(240 6% 6%)        /* near-black, zinc-950 equivalent */
--surface:          hsl(240 5% 10%)       /* card/panel backgrounds */
--surface-hover:    hsl(240 5% 13%)       /* interactive surface hover */
--surface-active:   hsl(240 5% 16%)       /* interactive surface pressed */
--border:           hsl(240 4% 18%)       /* subtle borders */
--border-strong:    hsl(240 4% 25%)       /* emphasized borders */

--text-primary:     hsl(0 0% 95%)         /* primary text */
--text-secondary:   hsl(240 3% 58%)       /* secondary/muted text */
--text-tertiary:    hsl(240 3% 40%)       /* placeholder, disabled text */

--accent:           hsl(217 91% 60%)      /* primary blue accent */
--accent-hover:     hsl(217 91% 55%)
--accent-muted:     hsl(217 91% 60% / 0.15) /* for backgrounds */

--status-running:   hsl(152 60% 52%)      /* emerald */
--status-paused:    hsl(38 92% 55%)       /* amber */
--status-error:     hsl(0 72% 56%)        /* red */
--status-idle:      hsl(240 3% 46%)       /* gray */
--status-completed: hsl(217 91% 60%)      /* blue */
--status-starting:  hsl(280 68% 60%)      /* purple, transitional */
--status-stopping:  hsl(24 80% 55%)       /* orange, transitional */

--terminal-bg:      hsl(0 0% 4%)          /* true black for terminal */
```

### Typography

- **UI font:** `"Geist Sans", "Inter", system-ui, sans-serif` — clean, geometric, modern
- **Mono font:** `"Geist Mono", "JetBrains Mono", "Fira Code", monospace` — for terminals, log output, code snippets, badges

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| App title | 18px | 700 | text-primary |
| Lane header | 13px | 600 | text-secondary, uppercase, tracking-wide |
| Card title | 14px | 600 | text-primary |
| Card subtitle | 12px | 400 | text-secondary |
| Card log preview | 11px | 400 | text-tertiary, mono |
| Badge | 11px | 500 | on colored background, mono |
| Status bar | 12px | 400 | text-secondary |
| Toast | 13px | 500 | text-primary |

### Spacing

Use a 4px base grid. Standard spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.

- Card padding: 16px
- Card gap (within lane): 8px
- Lane padding: 12px
- Lane gap (between lanes): 16px
- Side panel padding: 24px
- Top bar height: 48px
- Status bar height: 32px

### Radius

- Cards: 12px
- Buttons: 8px
- Badges/pills: 9999px (full-round)
- Input fields: 8px
- Modal/dialog: 16px
- Tooltips: 8px

### Shadows (dark theme)

Shadows in dark themes are subtle. Use opacity and blur rather than offset:

- `--shadow-sm`: `0 1px 2px hsl(0 0% 0% / 0.3)`
- `--shadow-md`: `0 4px 12px hsl(0 0% 0% / 0.4)`
- `--shadow-lg`: `0 8px 24px hsl(0 0% 0% / 0.5)` (for modals, drag states)
- `--shadow-glow`: `0 0 0 1px var(--accent), 0 0 12px var(--accent-muted)` (for focused/selected elements)

### Icons

Use `lucide-react` exclusively. Consistent size: 16px for inline, 20px for buttons, 24px for empty states.

---

## §5 — Technical Architecture

### Monorepo structure

```
command-center/
├── .github/
│   └── ...
├── apps/
│   ├── web/                          # Vite + React 19 SPA
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app.tsx               # Root component, router setup
│   │   │   ├── main.tsx              # Entry point, mount React
│   │   │   ├── routes/               # File-based-ish route components
│   │   │   │   ├── board.tsx         # Main kanban view
│   │   │   │   └── settings.tsx      # Settings page
│   │   │   ├── components/           # Shared UI components
│   │   │   │   ├── ui/              # shadcn/ui components (generated)
│   │   │   │   ├── layout/          # Shell, top-bar, status-bar, side-panel
│   │   │   │   ├── board/           # Kanban board, swimlane, agent-card
│   │   │   │   ├── terminal/        # Terminal wrapper, tab bar
│   │   │   │   ├── agent/           # Agent detail, create form, status badge
│   │   │   │   └── command/         # Command palette
│   │   │   ├── features/            # Feature-scoped logic (hooks + components tightly coupled to a feature)
│   │   │   │   ├── agents/          # Agent CRUD, lifecycle management
│   │   │   │   ├── board/           # Board + swimlane logic
│   │   │   │   ├── terminal/        # Terminal connection management
│   │   │   │   └── tmux/            # Tmux session discovery
│   │   │   ├── stores/              # Zustand stores
│   │   │   │   ├── board-store.ts
│   │   │   │   ├── agent-store.ts
│   │   │   │   ├── terminal-store.ts
│   │   │   │   ├── ui-store.ts      # Side panel state, view mode, selections
│   │   │   │   └── index.ts
│   │   │   ├── hooks/               # Shared custom hooks
│   │   │   ├── lib/                 # Utilities, constants, API client
│   │   │   │   ├── api-client.ts    # Typed fetch wrapper for Hono API
│   │   │   │   ├── constants.ts
│   │   │   │   ├── cn.ts            # clsx + tailwind-merge utility
│   │   │   │   └── keyboard.ts      # Keyboard shortcut registration
│   │   │   └── test/                # Test utilities
│   │   │       ├── setup.ts         # Vitest global setup
│   │   │       ├── render.tsx       # Custom render with providers
│   │   │       ├── mocks/           # MSW handlers
│   │   │       └── factories.ts     # Test data factories
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── vitest.config.ts
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts       # Only if Tailwind v4 needs one; prefer CSS-based config
│   │   ├── postcss.config.js
│   │   └── package.json
│   │
│   └── api/                          # Hono backend
│       ├── src/
│       │   ├── index.ts             # Server entry, mount routes
│       │   ├── app.ts               # Hono app instance, middleware
│       │   ├── routes/
│       │   │   ├── boards.ts
│       │   │   ├── swimlanes.ts
│       │   │   ├── agents.ts
│       │   │   ├── logs.ts          # SSE endpoint
│       │   │   ├── metrics.ts
│       │   │   └── tmux.ts          # WebSocket terminal + REST session mgmt
│       │   ├── services/            # Business logic, decoupled from HTTP
│       │   │   ├── agent-service.ts
│       │   │   ├── tmux-service.ts
│       │   │   ├── log-service.ts
│       │   │   └── process-service.ts  # Process spawning, lifecycle
│       │   ├── db/
│       │   │   ├── schema.ts        # Drizzle schema definitions
│       │   │   ├── migrations/      # Drizzle migration files
│       │   │   ├── index.ts         # DB connection singleton
│       │   │   └── seed.ts          # Optional seed data
│       │   ├── ws/
│       │   │   ├── terminal-handler.ts  # WebSocket ↔ node-pty bridge
│       │   │   └── events.ts            # Event types for WS messages
│       │   ├── lib/
│       │   │   ├── errors.ts        # Custom error classes
│       │   │   ├── logger.ts        # Structured logging
│       │   │   └── env.ts           # Environment config with Zod validation
│       │   └── test/
│       │       ├── setup.ts
│       │       └── helpers.ts       # Test DB setup, cleanup
│       ├── vitest.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── shared/                       # Shared types + Zod schemas
│   │   ├── src/
│   │   │   ├── schemas/
│   │   │   │   ├── agent.ts         # Agent Zod schemas (create, update, response)
│   │   │   │   ├── board.ts
│   │   │   │   ├── swimlane.ts
│   │   │   │   ├── log.ts
│   │   │   │   └── metric.ts
│   │   │   ├── types/
│   │   │   │   ├── agent.ts         # Inferred TypeScript types from schemas
│   │   │   │   ├── board.ts
│   │   │   │   ├── swimlane.ts
│   │   │   │   ├── events.ts        # WebSocket + SSE event types
│   │   │   │   └── index.ts
│   │   │   ├── constants/
│   │   │   │   ├── agent-status.ts  # Status enum, valid transitions map
│   │   │   │   └── swimlane-defaults.ts
│   │   │   └── index.ts             # Barrel export
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── tmux/                         # Tmux client library
│       ├── src/
│       │   ├── client.ts            # TmuxClient class: list, create, attach, kill sessions
│       │   ├── parser.ts            # Parse tmux output formats
│       │   ├── types.ts             # TmuxSession, TmuxPane, etc.
│       │   └── index.ts
│       ├── src/__tests__/
│       │   ├── client.test.ts
│       │   └── parser.test.ts
│       ├── tsconfig.json
│       └── package.json
│
├── plugins/
│   └── opencode/                     # Opencode adapter
│       ├── src/
│       │   ├── detector.ts          # Detect running opencode instances
│       │   ├── parser.ts            # Parse opencode logs/config
│       │   ├── types.ts
│       │   └── index.ts
│       ├── src/__tests__/
│       │   ├── detector.test.ts
│       │   └── parser.test.ts
│       ├── tsconfig.json
│       └── package.json
│
├── pnpm-workspace.yaml
├── package.json                      # Root: scripts, devDependencies for tooling
├── tsconfig.base.json                # Shared TypeScript config
├── .eslintrc.cjs                     # Or flat config eslint.config.mjs
├── .prettierrc                       # If using Prettier (recommended for consistency)
├── .gitignore
├── README.md
└── AGENTS.md                         # Agent development guidelines
```

### Package boundaries (dependency rules)

```
packages/shared  →  (no internal deps, only Zod)
packages/tmux    →  (no internal deps, only node child_process)
plugins/opencode →  packages/shared
apps/api         →  packages/shared, packages/tmux, plugins/opencode
apps/web         →  packages/shared
```

- `apps/web` **never** imports from `apps/api`. Communication is HTTP/WS only.
- `packages/shared` has **zero** runtime dependencies other than Zod. It is the contract layer.
- `packages/tmux` is a pure Node.js library — no React, no browser APIs.

### TypeScript configuration

**`tsconfig.base.json`** (root):
```jsonc
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": false, // too strict for React props
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noEmit": true
  }
}
```

Each package/app extends this and adds its own `paths`, `include`, `references`.

### Build & dev tooling

- **pnpm** v9+ with workspaces
- **Vite** v6+ for the web app (dev server + build)
- **tsx** for running the Hono API in development (fast TypeScript execution)
- **Drizzle Kit** for database migrations (`drizzle-kit generate`, `drizzle-kit migrate`)
- **concurrently** or pnpm `--parallel` for running web + api simultaneously

Root `package.json` scripts:
```json
{
  "scripts": {
    "dev": "pnpm --parallel --filter './apps/*' run dev",
    "dev:web": "pnpm --filter @command-center/web run dev",
    "dev:api": "pnpm --filter @command-center/api run dev",
    "build": "pnpm --filter './packages/*' run build && pnpm --filter './apps/*' run build",
    "test": "pnpm -r run test",
    "test:web": "pnpm --filter @command-center/web run test",
    "test:api": "pnpm --filter @command-center/api run test",
    "lint": "pnpm -r run lint",
    "typecheck": "pnpm -r run typecheck",
    "db:generate": "pnpm --filter @command-center/api run db:generate",
    "db:migrate": "pnpm --filter @command-center/api run db:migrate",
    "db:studio": "pnpm --filter @command-center/api run db:studio",
    "clean": "pnpm -r run clean && rm -rf node_modules"
  }
}
```

---

## §6 — Data Layer

### SQLite with Drizzle ORM

Use `drizzle-orm` with `better-sqlite3` (synchronous, no connection pooling needed for local-first). The database file lives at `./data/command-center.db` (created automatically on first run, gitignored).

### Schema

```typescript
// apps/api/src/db/schema.ts

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ── Boards ──────────────────────────────────────────

export const boards = sqliteTable('boards', {
  id:          text('id').primaryKey(),          // nanoid
  name:        text('name').notNull(),
  description: text('description'),
  createdAt:   integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt:   integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
});

// ── Swimlanes ───────────────────────────────────────

export const swimlanes = sqliteTable('swimlanes', {
  id:       text('id').primaryKey(),
  boardId:  text('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  name:     text('name').notNull(),                  // "Not Started", "In Progress", "Review", "Done"
  slug:     text('slug').notNull(),                  // "not-started", "in-progress", "review", "done"
  position: integer('position').notNull(),           // ordering within board
  color:    text('color'),                           // hex or hsl accent color
});

// ── Agents ──────────────────────────────────────────

export const agents = sqliteTable('agents', {
  id:           text('id').primaryKey(),
  boardId:      text('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  swimlaneId:   text('swimlane_id').notNull().references(() => swimlanes.id, { onDelete: 'cascade' }),
  position:     integer('position').notNull().default(0),
  name:         text('name').notNull(),
  model:        text('model'),                       // "claude-4-opus", "gpt-5", "opencode", etc.
  status:       text('status', {
                  enum: ['idle', 'starting', 'running', 'paused', 'stopping', 'stopped', 'error', 'completed']
                }).notNull().default('idle'),
  command:      text('command'),                     // The command to run the agent
  workingDir:   text('working_dir'),                 // CWD for the agent process
  envVars:      text('env_vars', { mode: 'json' }).default('{}'),  // JSON object of env vars
  tmuxSession:  text('tmux_session'),                // Associated tmux session name
  tmuxPaneId:   text('tmux_pane_id'),                // Specific pane within session
  pid:          integer('pid'),                      // OS process ID (null if not running)
  exitCode:     integer('exit_code'),                // Last exit code (null if still running)
  errorMessage: text('error_message'),               // Last error message
  startedAt:    integer('started_at', { mode: 'timestamp_ms' }),
  stoppedAt:    integer('stopped_at', { mode: 'timestamp_ms' }),
  createdAt:    integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt:    integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
});

// ── Logs ────────────────────────────────────────────

export const logs = sqliteTable('logs', {
  id:        text('id').primaryKey(),
  agentId:   text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  level:     text('level', { enum: ['stdout', 'stderr', 'system', 'error'] }).notNull(),
  content:   text('content').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
});

// ── Metrics ─────────────────────────────────────────

export const metrics = sqliteTable('metrics', {
  id:        text('id').primaryKey(),
  agentId:   text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  cpu:       integer('cpu'),                         // CPU percentage (0-100)
  memory:    integer('memory'),                      // Memory in MB
  tokens:    integer('tokens'),                      // Token count (if applicable)
  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
});
```

### Database indexes

Add indexes for common query patterns:
```typescript
// Add after table definitions
import { index } from 'drizzle-orm/sqlite-core';

// For querying agents by board + lane (the kanban query)
export const agentBoardIdx = index('agent_board_idx').on(agents.boardId, agents.swimlaneId, agents.position);

// For querying logs by agent (the log streaming query)
export const logAgentIdx = index('log_agent_idx').on(logs.agentId, logs.timestamp);

// For querying metrics by agent
export const metricAgentIdx = index('metric_agent_idx').on(metrics.agentId, metrics.timestamp);
```

### Agent state machine

Define valid transitions in `packages/shared`:

```typescript
// packages/shared/src/constants/agent-status.ts

export const AgentStatus = {
  IDLE:       'idle',
  STARTING:   'starting',
  RUNNING:    'running',
  PAUSED:     'paused',
  STOPPING:   'stopping',
  STOPPED:    'stopped',
  ERROR:      'error',
  COMPLETED:  'completed',
} as const;

export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

export const VALID_TRANSITIONS: Record<AgentStatus, readonly AgentStatus[]> = {
  idle:       ['starting'],
  starting:   ['running', 'error'],
  running:    ['paused', 'stopping', 'error', 'completed'],
  paused:     ['running', 'stopping', 'error'],
  stopping:   ['stopped', 'error'],
  stopped:    ['starting'],
  error:      ['starting', 'idle'],
  completed:  ['idle', 'starting'],
} as const;

export function canTransition(from: AgentStatus, to: AgentStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
```

### Swimlane-to-status mapping

```typescript
// packages/shared/src/constants/swimlane-defaults.ts

export const SWIMLANE_STATUS_MAP = {
  'not-started': 'idle',
  'in-progress': 'running',
  'review':      'paused',
  'done':        'completed',
} as const;

export const SWIMLANE_DEFINITIONS = [
  { slug: 'not-started', name: 'Not Started', position: 0, color: 'hsl(240 3% 46%)' },
  { slug: 'in-progress', name: 'In Progress', position: 1, color: 'hsl(217 91% 60%)' },
  { slug: 'review',      name: 'Review',      position: 2, color: 'hsl(38 92% 55%)' },
  { slug: 'done',        name: 'Done',        position: 3, color: 'hsl(152 60% 52%)' },
] as const;
```

---

## §7 — API Design (Hono)

### Conventions

- All routes prefixed with `/api/v1`
- Request validation with Zod (via `@hono/zod-validator`)
- Response shapes: `{ data: T }` for success, `{ error: { code: string, message: string, details?: unknown } }` for errors
- HTTP status codes: 200 (OK), 201 (Created), 204 (No Content for deletes), 400 (Validation), 404 (Not Found), 409 (Conflict/Invalid Transition), 500 (Internal)
- Consistent error handling middleware
- Request ID middleware for tracing

### Route definitions

```
GET    /api/v1/boards                     → List all boards
POST   /api/v1/boards                     → Create board (auto-creates 4 swimlanes)
GET    /api/v1/boards/:boardId            → Get board with swimlanes and agents
PUT    /api/v1/boards/:boardId            → Update board name/description
DELETE /api/v1/boards/:boardId            → Delete board (cascades)

GET    /api/v1/boards/:boardId/swimlanes  → List swimlanes for board
PUT    /api/v1/swimlanes/:laneId          → Update swimlane (rename, reorder)

GET    /api/v1/agents                     → List all agents (optional: ?boardId=&status=)
POST   /api/v1/agents                     → Create agent
GET    /api/v1/agents/:agentId            → Get agent detail
PUT    /api/v1/agents/:agentId            → Update agent config
DELETE /api/v1/agents/:agentId            → Delete agent (stops if running)

POST   /api/v1/agents/:agentId/start     → Start agent
POST   /api/v1/agents/:agentId/stop      → Stop agent
POST   /api/v1/agents/:agentId/restart   → Restart agent (stop + start)
POST   /api/v1/agents/:agentId/move      → Move agent to different swimlane + position
                                            Body: { swimlaneId, position }

GET    /api/v1/agents/:agentId/logs       → SSE stream of agent logs
GET    /api/v1/agents/:agentId/logs/history → Get historical logs (paginated)

GET    /api/v1/agents/:agentId/metrics    → Get latest metrics
GET    /api/v1/agents/:agentId/metrics/history → Get historical metrics (paginated)

GET    /api/v1/tmux/sessions              → List all tmux sessions
POST   /api/v1/tmux/sessions              → Create new tmux session
DELETE /api/v1/tmux/sessions/:name        → Kill tmux session

WS     /api/v1/tmux/sessions/:name/terminal → WebSocket terminal connection
```

### Zod schemas (in `packages/shared`)

```typescript
// packages/shared/src/schemas/agent.ts

import { z } from 'zod';
import { AgentStatus } from '../constants/agent-status';

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  boardId: z.string(),
  swimlaneId: z.string(),
  model: z.string().optional(),
  command: z.string().optional(),
  workingDir: z.string().optional(),
  envVars: z.record(z.string()).optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  model: z.string().optional(),
  command: z.string().optional(),
  workingDir: z.string().optional(),
  envVars: z.record(z.string()).optional(),
});

export const moveAgentSchema = z.object({
  swimlaneId: z.string(),
  position: z.number().int().min(0),
});

export const agentResponseSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  swimlaneId: z.string(),
  position: z.number(),
  name: z.string(),
  model: z.string().nullable(),
  status: z.enum([
    'idle', 'starting', 'running', 'paused',
    'stopping', 'stopped', 'error', 'completed'
  ]),
  command: z.string().nullable(),
  workingDir: z.string().nullable(),
  envVars: z.record(z.string()),
  tmuxSession: z.string().nullable(),
  pid: z.number().nullable(),
  exitCode: z.number().nullable(),
  errorMessage: z.string().nullable(),
  startedAt: z.number().nullable(),
  stoppedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type CreateAgent = z.infer<typeof createAgentSchema>;
export type UpdateAgent = z.infer<typeof updateAgentSchema>;
export type MoveAgent = z.infer<typeof moveAgentSchema>;
export type AgentResponse = z.infer<typeof agentResponseSchema>;
```

### SSE for log streaming

```typescript
// apps/api/src/routes/logs.ts — pattern

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

const logs = new Hono();

logs.get('/agents/:agentId/logs', async (c) => {
  const agentId = c.req.param('agentId');
  
  return streamSSE(c, async (stream) => {
    // 1. Send historical logs as initial burst
    // 2. Subscribe to new log events for this agent
    // 3. On new log event, send SSE message
    // 4. Handle client disconnect (cleanup subscription)
    // 5. Heartbeat every 15s to keep connection alive
  });
});
```

### WebSocket for terminals

```typescript
// apps/api/src/ws/terminal-handler.ts — pattern

// WebSocket message protocol:
// Client → Server:
//   { type: 'input', data: string }        — terminal input (keystrokes)
//   { type: 'resize', cols: number, rows: number }  — terminal resize

// Server → Client:
//   { type: 'output', data: string }       — terminal output
//   { type: 'exit', code: number }         — process exited
//   { type: 'error', message: string }     — error occurred
```

---

## §8 — Frontend Architecture

### Routing

Use `react-router` v7 (or TanStack Router if preferred for type safety). Simple flat routing:

```
/                 → Redirect to /boards/:defaultBoardId
/boards/:boardId  → Board view (kanban)
/settings         → Settings page
```

The board view is the app. Most navigation happens within this view via the side panel, command palette, and modals. Do not over-route.

### Zustand store architecture

Follow the **slice pattern** — each store manages one domain. Stores can read from each other but should not write to each other directly. Cross-store coordination happens in React components or in dedicated "action" functions.

```typescript
// stores/agent-store.ts — pattern

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface AgentState {
  agents: Map<string, Agent>;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchAgents: (boardId: string) => Promise<void>;
  createAgent: (data: CreateAgent) => Promise<Agent>;
  updateAgent: (id: string, data: UpdateAgent) => Promise<void>;
  moveAgent: (id: string, swimlaneId: string, position: number) => Promise<void>;
  startAgent: (id: string) => Promise<void>;
  stopAgent: (id: string) => Promise<void>;
  
  // Optimistic updates
  optimisticMove: (id: string, swimlaneId: string, position: number) => void;
  rollbackMove: (id: string, originalSwimlaneId: string, originalPosition: number) => void;
  
  // Selectors (computed)
  getAgentsByLane: (swimlaneId: string) => Agent[];
}

export const useAgentStore = create<AgentState>()(
  immer((set, get) => ({
    // ... implementation
  }))
);
```

**Store list:**

| Store | Responsibility |
|-------|---------------|
| `board-store` | Board and swimlane data, board CRUD |
| `agent-store` | Agent data, CRUD, lifecycle actions, optimistic move |
| `terminal-store` | Active terminal sessions, WebSocket connections |
| `ui-store` | Side panel state (open/closed, mode), selected agent ID, view mode, command palette open |

### Data fetching pattern

Fetch on mount (or route entry), store in Zustand, re-fetch on mutations. No cache invalidation complexity — this is a local-first app with a single user.

```typescript
// Pattern for a feature component
function useBoardData(boardId: string) {
  const fetchBoard = useBoardStore((s) => s.fetchBoard);
  const fetchAgents = useAgentStore((s) => s.fetchAgents);
  
  useEffect(() => {
    fetchBoard(boardId);
    fetchAgents(boardId);
  }, [boardId, fetchBoard, fetchAgents]);
}
```

### API client

A thin typed wrapper around `fetch`. Do not use Axios or any heavy HTTP client.

```typescript
// lib/api-client.ts — pattern

const BASE_URL = 'http://localhost:4000/api/v1';

class ApiClient {
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(response.status, error.error.code, error.error.message);
    }
    
    const json = await response.json();
    return json.data as T;
  }
  
  // Typed methods for each endpoint...
  agents = {
    list: (boardId: string) => this.request<AgentResponse[]>(`/agents?boardId=${boardId}`),
    create: (data: CreateAgent) => this.request<AgentResponse>('/agents', { method: 'POST', body: JSON.stringify(data) }),
    move: (id: string, data: MoveAgent) => this.request<AgentResponse>(`/agents/${id}/move`, { method: 'POST', body: JSON.stringify(data) }),
    start: (id: string) => this.request<AgentResponse>(`/agents/${id}/start`, { method: 'POST' }),
    stop: (id: string) => this.request<AgentResponse>(`/agents/${id}/stop`, { method: 'POST' }),
    // ...
  };
}

export const api = new ApiClient();
```

### Optimistic updates for drag-and-drop

Drag-and-drop must feel instant. The pattern:

1. User drops card in new position
2. **Immediately** update Zustand store (optimistic)
3. Fire API request in background
4. If API fails → rollback Zustand to previous state + show error toast
5. If API succeeds → no-op (state already matches)

This eliminates perceived latency on card moves entirely.

### Terminal connection management

```typescript
// features/terminal/use-terminal.ts — pattern

function useTerminal(sessionName: string, terminalRef: RefObject<HTMLDivElement>) {
  const terminalInstance = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    // 1. Create xterm.js Terminal instance
    // 2. Attach to DOM ref
    // 3. Open WebSocket to /api/v1/tmux/sessions/:name/terminal
    // 4. Pipe WS output → terminal.write()
    // 5. Pipe terminal.onData() → WS send
    // 6. Handle resize (fit addon → WS resize message)
    // 7. Handle WS disconnect (show reconnecting banner, auto-reconnect with backoff)
    // 8. Cleanup on unmount
    
    return () => {
      wsRef.current?.close();
      terminalInstance.current?.dispose();
    };
  }, [sessionName]);
}
```

---

## §9 — Component Catalog

Each component below must have a corresponding test file. Components are organized by feature domain.

### Layout components (`components/layout/`)

| Component | Description |
|-----------|-------------|
| `AppShell` | Root layout — top bar, main content, status bar, side panel |
| `TopBar` | App header with logo, board selector, actions |
| `StatusBar` | Bottom bar with system health info |
| `SidePanel` | Resizable right panel (detail/terminal modes) |
| `ViewModeToggle` | Toggle between board/terminal/focus views |

### Board components (`components/board/`)

| Component | Description |
|-----------|-------------|
| `KanbanBoard` | Container for all swimlanes, horizontal scroll |
| `Swimlane` | Single column — header + droppable card list |
| `SwimlaneSortableContext` | @dnd-kit SortableContext wrapper per lane |
| `SwimlaneHeader` | Lane name, count badge, collapse toggle |
| `AgentCard` | Draggable card — agent summary |
| `AgentCardSkeleton` | Loading state placeholder |
| `EmptyLane` | Placeholder when lane has no agents |
| `DragOverlay` | Custom drag overlay for the active drag item |

### Agent components (`components/agent/`)

| Component | Description |
|-----------|-------------|
| `AgentDetail` | Full detail view in side panel |
| `AgentCreateDialog` | Modal for creating a new agent |
| `AgentStatusBadge` | Colored pill showing agent status |
| `AgentActions` | Action buttons (start/stop/restart/delete) |
| `AgentLogViewer` | Scrollable log output with SSE connection |
| `AgentMetrics` | CPU/memory/token display |
| `AgentConfigForm` | Edit agent config (name, command, env vars, working dir) |

### Terminal components (`components/terminal/`)

| Component | Description |
|-----------|-------------|
| `TerminalPanel` | Container with tab bar + terminal instance |
| `TerminalInstance` | xterm.js wrapper component |
| `TerminalTabs` | Tab bar for multiple terminal sessions |
| `TerminalReconnectBanner` | Overlay shown when WS disconnects |

### Command components (`components/command/`)

| Component | Description |
|-----------|-------------|
| `CommandPalette` | cmdk-based command menu |
| `CommandItem` | Individual command item with icon + shortcut hint |

### UI components (`components/ui/`)

All shadcn/ui components. Initialize with:
```bash
pnpm dlx shadcn@latest init
```

Then add individual components as needed:
```bash
pnpm dlx shadcn@latest add button card dialog dropdown-menu input badge tooltip scroll-area separator skeleton sonner command
```

Additional custom UI components:
| Component | Description |
|-----------|-------------|
| `StatusDot` | Animated colored dot for agent status |
| `LiveTimer` | Auto-updating duration display (e.g., "2m 34s") |
| `KeyboardHint` | Small keyboard shortcut display (e.g., `⌘K`) |
| `EmptyState` | Centered message + icon + CTA for empty views |

---

## §10 — Testing Strategy (Gold Standard)

### Philosophy

> *"Test behavior, not implementation. Test what the user sees and does, not what the code does internally."*

Every test should answer the question: **"If I were a user, what would I see and what would I do?"** For components, the "user" is a human interacting with the UI. For stores, the "user" is a component calling store actions. For API routes, the "user" is an HTTP client sending requests.

### Stack

- **Vitest** — Test runner (fast, Vite-native, ESM-first)
- **@testing-library/react** — Component testing (DOM-based, accessible queries)
- **@testing-library/user-event** v14 — User interaction simulation (click, type, drag)
- **MSW** v2 — API mocking (intercept fetch at the network level, not at the import level)
- **vitest-axe** (or `jest-axe` compat) — Automated accessibility testing
- **happy-dom** or **jsdom** — DOM environment (prefer happy-dom for speed)

### Configuration

```typescript
// apps/web/vitest.config.ts

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom', // or 'jsdom' if happy-dom has compat issues
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/components/**', 'src/features/**', 'src/stores/**', 'src/hooks/**', 'src/lib/**'],
      exclude: ['**/*.test.*', '**/test/**', '**/ui/**'], // Exclude shadcn components from coverage
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    // Prevent hanging tests
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@command-center/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
});
```

### Test setup

```typescript
// apps/web/src/test/setup.ts

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, afterAll, beforeAll } from 'vitest';
import { server } from './mocks/server';

// Start MSW server before tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

// Mock ResizeObserver (needed for @dnd-kit, xterm.js, react-resizable-panels)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  root = null;
  rootMargin = '';
  thresholds = [];
  takeRecords() { return []; }
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)' ? false : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
```

### Custom render

```typescript
// apps/web/src/test/render.tsx

import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';

// Add any providers your app needs here
function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    // BrowserRouter, ThemeProvider, etc. — whatever your app shell needs
    <>{children}</>
  );
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllProviders, ...options }),
  };
}

export { customRender as render };
export { screen, within, waitFor, act } from '@testing-library/react';
```

### Test data factories

```typescript
// apps/web/src/test/factories.ts

import type { AgentResponse, BoardResponse, SwimlaneResponse } from '@command-center/shared';

let counter = 0;
const id = () => `test-${++counter}`;

export function buildAgent(overrides?: Partial<AgentResponse>): AgentResponse {
  return {
    id: id(),
    boardId: 'board-1',
    swimlaneId: 'lane-1',
    position: 0,
    name: `Agent ${counter}`,
    model: 'claude-4',
    status: 'idle',
    command: null,
    workingDir: null,
    envVars: {},
    tmuxSession: null,
    pid: null,
    exitCode: null,
    errorMessage: null,
    startedAt: null,
    stoppedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

export function buildBoard(overrides?: Partial<BoardResponse>): BoardResponse {
  return {
    id: id(),
    name: `Board ${counter}`,
    description: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

// ... similar for swimlanes, logs, metrics
```

### MSW handlers

```typescript
// apps/web/src/test/mocks/handlers.ts

import { http, HttpResponse } from 'msw';
import { buildAgent, buildBoard } from '../factories';

const API = 'http://localhost:4000/api/v1';

export const handlers = [
  // Boards
  http.get(`${API}/boards`, () => {
    return HttpResponse.json({ data: [buildBoard({ id: 'board-1', name: 'Default Board' })] });
  }),
  
  http.get(`${API}/boards/:boardId`, ({ params }) => {
    return HttpResponse.json({
      data: buildBoard({ id: params.boardId as string }),
    });
  }),
  
  // Agents
  http.get(`${API}/agents`, ({ request }) => {
    const url = new URL(request.url);
    const boardId = url.searchParams.get('boardId');
    return HttpResponse.json({
      data: [
        buildAgent({ id: 'agent-1', name: 'Frontend Agent', boardId: boardId ?? 'board-1', swimlaneId: 'lane-2', status: 'running' }),
        buildAgent({ id: 'agent-2', name: 'Backend Agent', boardId: boardId ?? 'board-1', swimlaneId: 'lane-1', status: 'idle' }),
      ],
    });
  }),
  
  http.post(`${API}/agents/:agentId/move`, () => {
    return HttpResponse.json({ data: { success: true } });
  }),
  
  http.post(`${API}/agents/:agentId/start`, ({ params }) => {
    return HttpResponse.json({
      data: buildAgent({ id: params.agentId as string, status: 'running' }),
    });
  }),
  
  http.post(`${API}/agents/:agentId/stop`, ({ params }) => {
    return HttpResponse.json({
      data: buildAgent({ id: params.agentId as string, status: 'stopped' }),
    });
  }),
];
```

### Component test examples (gold standard patterns)

```typescript
// components/board/agent-card.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@/test/render';
import { AgentCard } from './agent-card';
import { buildAgent } from '@/test/factories';

describe('AgentCard', () => {
  it('renders agent name and model', () => {
    const agent = buildAgent({ name: 'My Agent', model: 'claude-4' });
    render(<AgentCard agent={agent} />);
    
    expect(screen.getByText('My Agent')).toBeInTheDocument();
    expect(screen.getByText('claude-4')).toBeInTheDocument();
  });

  it('shows running status indicator', () => {
    const agent = buildAgent({ status: 'running' });
    render(<AgentCard agent={agent} />);
    
    const statusBadge = screen.getByRole('status');
    expect(statusBadge).toHaveTextContent('Running');
  });

  it('displays live runtime duration for running agents', () => {
    const agent = buildAgent({
      status: 'running',
      startedAt: Date.now() - 120_000, // 2 minutes ago
    });
    render(<AgentCard agent={agent} />);
    
    // Should show approximate duration
    expect(screen.getByText(/2m/)).toBeInTheDocument();
  });

  it('shows quick actions on hover', async () => {
    const agent = buildAgent({ status: 'running' });
    const { user } = render(<AgentCard agent={agent} />);
    
    const card = screen.getByRole('article');
    await user.hover(card);
    
    expect(screen.getByRole('button', { name: /open terminal/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /stop/i })).toBeVisible();
  });

  it('calls onSelect when clicked', async () => {
    const agent = buildAgent();
    const onSelect = vi.fn();
    const { user } = render(<AgentCard agent={agent} onSelect={onSelect} />);
    
    await user.click(screen.getByRole('article'));
    
    expect(onSelect).toHaveBeenCalledWith(agent.id);
  });

  it('shows context menu on right-click', async () => {
    const agent = buildAgent();
    const { user } = render(<AgentCard agent={agent} />);
    
    const card = screen.getByRole('article');
    await user.pointer({ keys: '[MouseRight]', target: card });
    
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /open terminal/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /restart/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const agent = buildAgent({ name: 'Accessible Agent', status: 'running' });
    const { container } = render(<AgentCard agent={agent} />);
    
    // If using vitest-axe:
    // expect(await axe(container)).toHaveNoViolations();
    
    // At minimum: verify aria attributes
    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('aria-label', expect.stringContaining('Accessible Agent'));
  });
});
```

### Store test example

```typescript
// stores/agent-store.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAgentStore } from './agent-store';
import { buildAgent } from '@/test/factories';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

const API = 'http://localhost:4000/api/v1';

describe('AgentStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useAgentStore.setState({ agents: new Map(), loading: false, error: null });
  });

  it('fetches agents and populates store', async () => {
    const mockAgents = [
      buildAgent({ id: 'a1', name: 'Agent 1' }),
      buildAgent({ id: 'a2', name: 'Agent 2' }),
    ];
    
    server.use(
      http.get(`${API}/agents`, () => {
        return HttpResponse.json({ data: mockAgents });
      })
    );

    await useAgentStore.getState().fetchAgents('board-1');
    
    const state = useAgentStore.getState();
    expect(state.agents.size).toBe(2);
    expect(state.agents.get('a1')?.name).toBe('Agent 1');
    expect(state.loading).toBe(false);
  });

  it('handles fetch error gracefully', async () => {
    server.use(
      http.get(`${API}/agents`, () => {
        return HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'DB error' } },
          { status: 500 }
        );
      })
    );

    await useAgentStore.getState().fetchAgents('board-1');
    
    const state = useAgentStore.getState();
    expect(state.error).toBeTruthy();
    expect(state.agents.size).toBe(0);
  });

  it('performs optimistic move and rollback on failure', async () => {
    const agent = buildAgent({ id: 'a1', swimlaneId: 'lane-1', position: 0 });
    useAgentStore.setState({
      agents: new Map([['a1', agent]]),
    });

    // Simulate API failure
    server.use(
      http.post(`${API}/agents/a1/move`, () => {
        return HttpResponse.json(
          { error: { code: 'CONFLICT', message: 'Invalid transition' } },
          { status: 409 }
        );
      })
    );

    // The optimistic update should happen immediately
    useAgentStore.getState().optimisticMove('a1', 'lane-2', 0);
    expect(useAgentStore.getState().agents.get('a1')?.swimlaneId).toBe('lane-2');

    // After API call fails, should rollback
    await useAgentStore.getState().moveAgent('a1', 'lane-2', 0).catch(() => {});
    expect(useAgentStore.getState().agents.get('a1')?.swimlaneId).toBe('lane-1');
  });
});
```

### API route test example

```typescript
// apps/api/src/routes/agents.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../app';
import { db } from '../db';
import { agents, boards, swimlanes } from '../db/schema';

describe('POST /api/v1/agents', () => {
  beforeEach(async () => {
    // Clean DB and seed required parent records
    await db.delete(agents);
    await db.delete(swimlanes);
    await db.delete(boards);
    
    await db.insert(boards).values({ id: 'board-1', name: 'Test Board' });
    await db.insert(swimlanes).values({ id: 'lane-1', boardId: 'board-1', name: 'Not Started', slug: 'not-started', position: 0 });
  });

  it('creates an agent with valid data', async () => {
    const res = await app.request('/api/v1/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'My Agent',
        boardId: 'board-1',
        swimlaneId: 'lane-1',
        model: 'claude-4',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('My Agent');
    expect(body.data.status).toBe('idle');
    expect(body.data.model).toBe('claude-4');
  });

  it('rejects invalid data with 400', async () => {
    const res = await app.request('/api/v1/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }), // empty name
    });

    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent board', async () => {
    const res = await app.request('/api/v1/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Agent',
        boardId: 'nonexistent',
        swimlaneId: 'lane-1',
      }),
    });

    expect(res.status).toBe(404);
  });
});
```

### Testing DOs and DON'Ts

**DO:**
- Use `screen.getByRole()` as the primary query — it reflects what the user sees
- Use `screen.getByLabelText()` for form inputs
- Use `screen.getByText()` for non-interactive content
- Use `user.click()`, `user.type()`, `user.keyboard()` from `@testing-library/user-event`
- Use `waitFor()` for assertions that depend on async state updates
- Use `within()` for scoped queries within a container
- Test error states and edge cases, not just happy paths
- Test loading states (skeleton screens, spinners)
- Use factory functions for test data — never hardcode objects inline
- Reset state between tests (`beforeEach`)

**DON'T:**
- Use `getByTestId()` unless absolutely no accessible alternative exists (and document why)
- Use `container.querySelector()` — it breaks the testing library contract
- Test implementation details (internal state, private methods, CSS classes)
- Use `act()` manually — `user.click()` and `waitFor()` handle it
- Use snapshot tests for components — they're brittle and low-signal
- Mock `useState` or `useEffect` — test through the component's public interface
- Test third-party library behavior (shadcn/ui, @dnd-kit) — test your integration of them

---

## §11 — Implementation Phases

### Phase 0: Scaffold (prerequisite for everything)

**Deliverables:**
- pnpm monorepo initialized with all packages/apps
- TypeScript configured (base + per-package)
- ESLint + Prettier configured
- Vitest configured for web + api
- `packages/shared` with Zod schemas, types, constants
- `apps/api` with Hono skeleton, health check route, Drizzle + SQLite connected
- `apps/web` with Vite + React 19 skeleton, Tailwind CSS, shadcn/ui initialized
- Root scripts working: `pnpm dev`, `pnpm test`, `pnpm lint`
- `AGENTS.md` with development guidelines
- Database migration for all tables
- **Tests:** health check API route test, shared schema validation tests

**Can be parallelized:**
- `packages/shared` (types person) + `apps/api` scaffold (backend person) + `apps/web` scaffold (frontend person)
- But `packages/shared` should be done first or simultaneously

### Phase 1: Data layer + API routes

**Deliverables:**
- All CRUD routes for boards, swimlanes, agents
- Agent lifecycle routes (start, stop, restart, move)
- Log and metric CRUD routes
- Service layer with business logic separated from HTTP handlers
- All API routes tested with Vitest
- Seed script for default board with 4 swimlanes

**Can be parallelized:**
- Board/swimlane routes (simple CRUD) + Agent routes (lifecycle logic) — different route files, same service patterns

### Phase 2: Kanban board UI

**Deliverables:**
- `AppShell` layout with top bar, main content area, status bar
- `KanbanBoard` with four `Swimlane` components
- `AgentCard` component with all visual states
- `@dnd-kit` integration for drag-and-drop between lanes
- Agent store connected to API
- Optimistic drag-and-drop with rollback
- Empty states for lanes and board
- Loading skeletons
- **Tests:** All board components tested, drag-and-drop interaction tested, store tested

### Phase 3: Agent lifecycle + Side panel

**Deliverables:**
- Agent create dialog
- Agent detail view in side panel
- Agent actions (start, stop, restart, delete)
- Agent status transitions wired to UI
- Real-time status updates (polling initially, SSE in Phase 5)
- Agent log viewer (historical, scrollable)
- **Tests:** Agent creation flow, lifecycle transitions, detail panel rendering

### Phase 4: Terminal integration

**Deliverables:**
- `packages/tmux` client library
- Tmux session discovery and management API routes
- xterm.js terminal component
- WebSocket bridge between xterm.js and node-pty/tmux
- Terminal panel in side panel
- Terminal tab management
- Resize handling
- Reconnection logic
- **Tests:** Tmux client unit tests, terminal component rendering tests (WS mocked)

### Phase 5: Polish & real-time

**Deliverables:**
- SSE log streaming (replace polling)
- Command palette (`⌘K`)
- Keyboard shortcuts (full map from §3)
- Framer Motion animations (drag, panel transitions, status changes)
- Notification toasts (sonner)
- Settings page (minimal: board management, theme preference placeholder)
- Opencode adapter (detection + integration)
- Status bar live data
- Error boundaries at route and component level
- Accessibility audit pass (keyboard nav, screen reader, reduced motion)
- **Tests:** Command palette tests, keyboard shortcut tests, accessibility tests

---

## §12 — Development Setup

### Prerequisites

- Node.js 22+ (LTS)
- pnpm 9+
- tmux installed (`brew install tmux` / `apt install tmux`)
- SQLite3 installed (usually pre-installed)

### Bootstrap

```bash
# Clone + install
git clone <repo>
cd command-center
pnpm install

# Initialize database
pnpm db:migrate

# Start development (both web + api)
pnpm dev

# Web: http://localhost:5173
# API: http://localhost:4000
```

### Environment

```
# apps/api/.env
DATABASE_URL=./data/command-center.db
PORT=4000
LOG_LEVEL=debug
```

```
# apps/web/.env
VITE_API_URL=http://localhost:4000
```

### Key commands

```bash
pnpm dev              # Start web + api in parallel
pnpm test             # Run all tests
pnpm test:web         # Run web tests only
pnpm test:api         # Run API tests only  
pnpm lint             # Lint all packages
pnpm typecheck        # TypeScript check all packages
pnpm db:generate      # Generate new migration from schema changes
pnpm db:migrate       # Apply pending migrations
pnpm db:studio        # Open Drizzle Studio (DB browser)
```

---

## §13 — Final Directives

1. **No external services.** No cloud databases, no hosted APIs, no analytics, no telemetry, no auth providers. Everything runs on localhost. SQLite on disk. WebSockets on localhost. This is a local-first tool.

2. **No premature optimization.** Build the correct thing first. Optimize when profiling shows a need. The exception is drag-and-drop, which must be optimistically updated from day one — users notice 100ms of latency on a drag operation.

3. **Ship incrementally.** Each phase should produce a usable (if incomplete) application. Phase 2's output is a functional kanban board with persistence. Phase 3 adds agent management. Phase 4 adds terminals. Phase 5 polishes everything. At no point should the application be broken.

4. **Test coverage is a floor, not a ceiling.** 80% is the minimum. Critical paths (agent lifecycle, drag-and-drop, terminal connection) should be at 95%+. Coverage is not a vanity metric here — it is your safety net for a system with many moving parts.

5. **Documentation lives in code.** JSDoc for public APIs. TypeScript types for contracts. Tests for behavior. The code should be self-documenting. A separate wiki is not needed for an application of this scope.

6. **Respect the user's time.** This tool exists to save developers time. Every interaction should be faster than the terminal alternative. If it's slower to use the UI than to type `tmux ls`, the tool has failed. Measure in keystrokes and seconds.

7. **Build something you would use.** If you wouldn't trust this tool to manage your own agents, keep building until you would.

---

*This specification is your north star. Internalize it. Enhance it where the gaps reveal themselves. And then build something extraordinary.*