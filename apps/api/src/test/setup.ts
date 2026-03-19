import { beforeAll, beforeEach } from 'vitest';
import { db } from '../db/index.js';
import { initializeTestDatabase, cleanupTestDatabase } from './helpers.js';

beforeAll(() => {
  initializeTestDatabase(db.$client);
});

beforeEach(() => {
  cleanupTestDatabase(db.$client);
});
