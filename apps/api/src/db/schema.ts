import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ── Boards ──────────────────────────────────────────

export const boards = sqliteTable('boards', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// ── Swimlanes ───────────────────────────────────────

export const swimlanes = sqliteTable('swimlanes', {
  id: text('id').primaryKey(),
  boardId: text('board_id')
    .notNull()
    .references(() => boards.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  position: integer('position').notNull(),
  color: text('color'),
});

// ── Agents ──────────────────────────────────────────

export const agents = sqliteTable(
  'agents',
  {
    id: text('id').primaryKey(),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    swimlaneId: text('swimlane_id')
      .notNull()
      .references(() => swimlanes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    name: text('name').notNull(),
    model: text('model'),
    status: text('status', {
      enum: ['idle', 'starting', 'running', 'paused', 'stopping', 'stopped', 'error', 'completed'],
    })
      .notNull()
      .default('idle'),
    command: text('command'),
    workingDir: text('working_dir'),
    envVars: text('env_vars', { mode: 'json' }).default('{}'),
    tmuxSession: text('tmux_session'),
    tmuxPaneId: text('tmux_pane_id'),
    pid: integer('pid'),
    exitCode: integer('exit_code'),
    errorMessage: text('error_message'),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }),
    stoppedAt: integer('stopped_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    agentBoardIdx: index('agent_board_idx').on(table.boardId),
  }),
);

// ── Logs ────────────────────────────────────────────

export const logs = sqliteTable(
  'logs',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    level: text('level', { enum: ['debug', 'info', 'warn', 'error'] }).notNull(),
    content: text('content').notNull(),
    timestamp: integer('timestamp', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    logAgentIdx: index('log_agent_idx').on(table.agentId),
  }),
);

// ── Metrics ─────────────────────────────────────────

export const metrics = sqliteTable(
  'metrics',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    cpu: integer('cpu'),
    memory: integer('memory'),
    tokens: integer('tokens'),
    timestamp: integer('timestamp', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    metricAgentIdx: index('metric_agent_idx').on(table.agentId),
  }),
);
