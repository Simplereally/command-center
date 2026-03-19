import { z } from 'zod';

export const metricResponseSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  cpu: z.number().min(0).max(100),
  memory: z.number().int().min(0),
  timestamp: z.string().datetime(),
});

export type MetricResponse = z.infer<typeof metricResponseSchema>;
