import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './index.js';
import { logger } from '../lib/logger.js';

async function runMigrations() {
  logger.info('Running database migrations...');
  migrate(db, { migrationsFolder: './drizzle' });
  logger.info('Migrations complete.');
}

runMigrations().catch((err) => {
  logger.error('Migration failed', { error: err });
  process.exit(1);
});
