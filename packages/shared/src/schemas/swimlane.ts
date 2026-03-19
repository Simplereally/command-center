import { z } from 'zod';

export const createSwimlaneSchema = z.object({
  name: z.string().min(1).max(128),
  position: z.number().int().min(0),
  color: z.string(),
});

export const swimlaneResponseSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  slug: z.string(),
  name: z.string(),
  position: z.number().int(),
  color: z.string(),
  createdAt: z.string().datetime(),
});

export const updateSwimlaneSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  position: z.number().int().min(0).optional(),
  color: z.string().optional(),
});

export type SwimlaneResponse = z.infer<typeof swimlaneResponseSchema>;
export type UpdateSwimlane = z.infer<typeof updateSwimlaneSchema>;
export type CreateSwimlane = z.infer<typeof createSwimlaneSchema>;
