import { z } from 'zod';

const logLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);

export const logResponseSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  level: logLevelSchema,
  message: z.string(),
  timestamp: z.string().datetime(),
});

export type LogLevel = z.infer<typeof logLevelSchema>;
export type LogResponse = z.infer<typeof logResponseSchema>;
