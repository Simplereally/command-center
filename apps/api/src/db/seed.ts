import { nanoid } from 'nanoid';
import { db } from './index.js';
import { boards, swimlanes } from './schema.js';
import { SWIMLANE_DEFINITIONS } from '@command-center/shared';
import { logger } from '../lib/logger.js';

export async function seed() {
  logger.info('Seeding database...');

  // Check if default board exists
  const existing = await db.select().from(boards).limit(1);
  if (existing.length > 0) {
    logger.info('Database already seeded, skipping.');
    return;
  }

  // Create default board
  const boardId = nanoid();
  await db.insert(boards).values({
    id: boardId,
    name: 'Default Board',
    description: 'Main kanban board for agent management',
  });

  // Create 4 default swimlanes
  const laneValues = SWIMLANE_DEFINITIONS.map((lane) => ({
    id: nanoid(),
    boardId,
    name: lane.name,
    slug: lane.slug,
    position: lane.position,
    color: lane.color,
  }));

  await db.insert(swimlanes).values(laneValues);

  logger.info('Database seeded successfully.', { boardId, lanes: laneValues.length });
}

// Run if called directly
seed().catch((err) => {
  logger.error('Seed failed', { error: err });
  process.exit(1);
});
