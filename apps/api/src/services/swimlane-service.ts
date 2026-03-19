import { eq, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { swimlanes } from '../db/schema.js';
import { NotFoundError } from '../lib/errors.js';

export async function listSwimlanes(boardId: string) {
  return db
    .select()
    .from(swimlanes)
    .where(eq(swimlanes.boardId, boardId))
    .orderBy(asc(swimlanes.position))
    .all();
}

export async function createSwimlane(
  boardId: string,
  data: { name: string; position?: number; color?: string },
) {
  const slug = data.name.toLowerCase().replace(/\s+/g, '-');
  const position = data.position ?? 0;

  const [created] = await db
    .insert(swimlanes)
    .values({
      id: nanoid(),
      boardId,
      name: data.name,
      slug,
      position,
      color: data.color,
    })
    .returning();

  return created;
}

export async function deleteSwimlane(id: string) {
  const existing = await db.select().from(swimlanes).where(eq(swimlanes.id, id)).get();
  if (!existing) throw new NotFoundError('Swimlane', id);
  await db.delete(swimlanes).where(eq(swimlanes.id, id));
  return { success: true };
}

export async function getSwimlane(id: string) {
  const lane = await db.select().from(swimlanes).where(eq(swimlanes.id, id)).get();
  if (!lane) throw new NotFoundError('Swimlane', id);
  return lane;
}

export async function updateSwimlane(
  id: string,
  data: { name?: string; position?: number; color?: string },
) {
  const existing = await db.select().from(swimlanes).where(eq(swimlanes.id, id)).get();
  if (!existing) throw new NotFoundError('Swimlane', id);
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.position !== undefined) updates.position = data.position;
  if (data.color !== undefined) updates.color = data.color;
  await db.update(swimlanes).set(updates).where(eq(swimlanes.id, id));
  return { ...existing, ...updates };
}
