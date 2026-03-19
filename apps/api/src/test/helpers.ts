import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema.js';

const createSchema = (sqlite: DatabaseType): void => {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS swimlanes (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      position INTEGER NOT NULL,
      color TEXT
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      swimlane_id TEXT NOT NULL REFERENCES swimlanes(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      name TEXT NOT NULL,
      model TEXT,
      status TEXT NOT NULL DEFAULT 'idle',
      command TEXT,
      working_dir TEXT,
      env_vars TEXT DEFAULT '{}',
      tmux_session TEXT,
      tmux_pane_id TEXT,
      pid INTEGER,
      exit_code INTEGER,
      error_message TEXT,
      started_at INTEGER,
      stopped_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      level TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS metrics (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      cpu INTEGER,
      memory INTEGER,
      tokens INTEGER,
      timestamp INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE INDEX IF NOT EXISTS agent_board_idx ON agents(board_id);
    CREATE INDEX IF NOT EXISTS log_agent_idx ON logs(agent_id);
    CREATE INDEX IF NOT EXISTS metric_agent_idx ON metrics(agent_id);
  `);
};

export function createTestDatabase(): { sqlite: DatabaseType; db: BetterSQLite3Database<typeof schema> } {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');

  const testDb = drizzle(sqlite, { schema });
  createSchema(sqlite);

  return { sqlite, db: testDb };
}

export type TestDb = ReturnType<typeof createTestDatabase>;

export function initializeTestDatabase(sqlite: DatabaseType): void {
  sqlite.pragma('foreign_keys = ON');
  createSchema(sqlite);
}

export function cleanupTestDatabase(sqlite: DatabaseType): void {
  sqlite.exec(`
    DELETE FROM metrics;
    DELETE FROM logs;
    DELETE FROM agents;
    DELETE FROM swimlanes;
    DELETE FROM boards;
  `);
}
