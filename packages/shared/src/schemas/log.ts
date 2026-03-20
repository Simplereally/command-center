import { z } from 'zod';

const logLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);

export const createLogSchema = z.object({
  level: logLevelSchema,
  content: z.string().min(1),
});

export const logResponseSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  level: logLevelSchema,
  content: z.string(),
  timestamp: z.string().datetime(),
});

export type CreateLog = z.infer<typeof createLogSchema>;
export type LogLevel = z.infer<typeof logLevelSchema>;
export type LogResponse = z.infer<typeof logResponseSchema>;
