import { z } from 'zod';

export const createBoardSchema = z.object({
  name: z.string().min(1).max(128),
});

export const updateBoardSchema = z.object({
  name: z.string().min(1).max(128).optional(),
});

export const boardResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CreateBoard = z.infer<typeof createBoardSchema>;
export type BoardResponse = z.infer<typeof boardResponseSchema>;
export type UpdateBoard = z.infer<typeof updateBoardSchema>;
