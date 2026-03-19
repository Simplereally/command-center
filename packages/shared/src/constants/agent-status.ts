export const AgentStatus = {
  IDLE: 'idle',
  STARTING: 'starting',
  RUNNING: 'running',
  PAUSED: 'paused',
  STOPPING: 'stopping',
  STOPPED: 'stopped',
  ERROR: 'error',
  COMPLETED: 'completed',
} as const;

export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

export const VALID_TRANSITIONS: Record<AgentStatus, readonly AgentStatus[]> = {
  idle: ['starting'],
  starting: ['running', 'error'],
  running: ['paused', 'stopping', 'error', 'completed'],
  paused: ['running', 'stopping', 'error'],
  stopping: ['stopped', 'error'],
  stopped: ['starting'],
  error: ['starting', 'idle'],
  completed: ['idle', 'starting'],
} as const;

export function canTransition(from: AgentStatus, to: AgentStatus): boolean {
  return (VALID_TRANSITIONS[from] as readonly string[]).includes(to);
}
