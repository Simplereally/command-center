import { z } from 'zod';

export const OpencodeAgentStatus = {
  INITIALIZING: 'initializing',
  RUNNING: 'running',
  PAUSED: 'paused',
  WAITING: 'waiting',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

export type OpencodeAgentStatus = (typeof OpencodeAgentStatus)[keyof typeof OpencodeAgentStatus];

export const OpencodeLogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  SYSTEM: 'system',
} as const;

export type OpencodeLogLevel = (typeof OpencodeLogLevel)[keyof typeof OpencodeLogLevel];

export interface OpencodeInstance {
  id: string;
  socketPath: string | null;
  pid: number | null;
  workingDir: string | null;
  startedAt: Date | null;
  active: boolean;
}

export interface OpencodeConfig {
  configDir: string;
  socketPath: string | null;
  pidFile: string | null;
  logFile: string | null;
  options: Record<string, string>;
}

export interface OpencodeAgentMetadata {
  sessionId: string;
  name: string | null;
  status: OpencodeAgentStatus;
  model: string | null;
  tokens: number | null;
  workingDir: string | null;
  startedAt: Date | null;
}

export interface OpencodeLogEntry {
  timestamp: Date;
  level: OpencodeLogLevel;
  message: string;
  sessionId: string | null;
  source: string | null;
}

export const opencodeInstanceSchema = z.object({
  id: z.string(),
  socketPath: z.string().nullable(),
  pid: z.number().nullable(),
  workingDir: z.string().nullable(),
  startedAt: z.date().nullable(),
  active: z.boolean(),
});

export const opencodeConfigSchema = z.object({
  configDir: z.string(),
  socketPath: z.string().nullable(),
  pidFile: z.string().nullable(),
  logFile: z.string().nullable(),
  options: z.record(z.string()),
});

export const opencodeAgentMetadataSchema = z.object({
  sessionId: z.string(),
  name: z.string().nullable(),
  status: z.enum([
    OpencodeAgentStatus.INITIALIZING,
    OpencodeAgentStatus.RUNNING,
    OpencodeAgentStatus.PAUSED,
    OpencodeAgentStatus.WAITING,
    OpencodeAgentStatus.COMPLETED,
    OpencodeAgentStatus.ERROR,
  ]),
  model: z.string().nullable(),
  tokens: z.number().nullable(),
  workingDir: z.string().nullable(),
  startedAt: z.date().nullable(),
});

export const opencodeLogEntrySchema = z.object({
  timestamp: z.date(),
  level: z.enum([
    OpencodeLogLevel.DEBUG,
    OpencodeLogLevel.INFO,
    OpencodeLogLevel.WARN,
    OpencodeLogLevel.ERROR,
    OpencodeLogLevel.SYSTEM,
  ]),
  message: z.string(),
  sessionId: z.string().nullable(),
  source: z.string().nullable(),
});
