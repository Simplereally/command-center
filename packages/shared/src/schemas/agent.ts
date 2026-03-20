import { z } from 'zod';
import { AgentStatus } from '../constants/agent-status.js';

const agentStatusSchema = z.enum([
  AgentStatus.IDLE,
  AgentStatus.STARTING,
  AgentStatus.RUNNING,
  AgentStatus.PAUSED,
  AgentStatus.STOPPING,
  AgentStatus.STOPPED,
  AgentStatus.ERROR,
  AgentStatus.COMPLETED,
]);

export const createAgentSchema = z.object({
  name: z.string().min(1).max(128),
  boardId: z.string().min(1),
  swimlaneId: z.string().min(1),
  model: z.string().min(1).optional(),
  workingDir: z.string().min(1).optional(),
  envVars: z.record(z.string(), z.string()).optional(),
  command: z.string().min(1).optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  status: agentStatusSchema.optional(),
  swimlaneId: z.string().min(1).optional(),
  workingDir: z.string().min(1).optional(),
  envVars: z.record(z.string(), z.string()).optional(),
});

export const moveAgentSchema = z.object({
  swimlaneId: z.string().min(1),
  position: z.number().int().min(0).optional(),
});

export const agentResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: agentStatusSchema,
  boardId: z.string(),
  swimlaneId: z.string(),
  model: z.string().nullable(),
  workingDir: z.string().nullable(),
  envVars: z.record(z.string(), z.string()).nullable(),
  command: z.string().nullable(),
  tmuxSession: z.string().nullable(),
  tmuxPaneId: z.string().nullable(),
  pid: z.number().int().nullable(),
  exitCode: z.number().int().nullable(),
  errorMessage: z.string().nullable(),
  startedAt: z.string().datetime().nullable(),
  stoppedAt: z.string().datetime().nullable(),
  position: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CreateAgent = z.infer<typeof createAgentSchema>;
export type UpdateAgent = z.infer<typeof updateAgentSchema>;
export type MoveAgent = z.infer<typeof moveAgentSchema>;
export type AgentResponse = z.infer<typeof agentResponseSchema>;
