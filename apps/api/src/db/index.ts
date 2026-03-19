import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import { env } from '../lib/env.js';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

function createDatabase() {
  const dbPath = env.DATABASE_URL;
  mkdirSync(dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  return drizzle(sqlite, { schema });
}

export const db = createDatabase();
export type Database = typeof db;
