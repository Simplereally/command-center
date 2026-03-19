import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { boards, swimlanes } from '../db/schema.js';
import { SWIMLANE_DEFINITIONS } from '@command-center/shared';
import { NotFoundError } from '../lib/errors.js';

export async function createBoard(data: { name: string; description?: string }) {
  const id = nanoid();
  await db.insert(boards).values({ id, name: data.name, description: data.description ?? null });
  const laneValues = SWIMLANE_DEFINITIONS.map((l) => ({ id: nanoid(), boardId: id, name: l.name, slug: l.slug, position: l.position, color: l.color }));
  await db.insert(swimlanes).values(laneValues);
  return { id, name: data.name, description: data.description ?? null, createdAt: new Date(), updatedAt: new Date() };
}

export async function getBoard(id: string) {
  const board = await db.select().from(boards).where(eq(boards.id, id)).get();
  if (!board) throw new NotFoundError('Board', id);
  const lanes = await db.select().from(swimlanes).where(eq(swimlanes.boardId, id)).all();
  return { ...board, swimlanes: lanes };
}

export async function listBoards() {
  return db.select().from(boards).all();
}

export async function updateBoard(id: string, data: { name?: string; description?: string }) {
  const existing = await db.select().from(boards).where(eq(boards.id, id)).get();
  if (!existing) throw new NotFoundError('Board', id);
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  await db.update(boards).set(updates).where(eq(boards.id, id));
  return { ...existing, ...updates };
}

export async function deleteBoard(id: string) {
  const existing = await db.select().from(boards).where(eq(boards.id, id)).get();
  if (!existing) throw new NotFoundError('Board', id);
  await db.delete(boards).where(eq(boards.id, id));
}
