import type { AgentStatus } from '../constants/agent-status.js';
import type { AgentResponse } from '../schemas/agent.js';
import type { LogResponse } from '../schemas/log.js';
import type { MetricResponse } from '../schemas/metric.js';

// ── WebSocket Terminal Messages ──────────────────────────────────────────────

export interface TerminalInputMessage {
  type: 'terminal:input';
  sessionId: string;
  data: string;
}

export interface TerminalOutputMessage {
  type: 'terminal:output';
  sessionId: string;
  data: string;
}

export interface TerminalResizeMessage {
  type: 'terminal:resize';
  sessionId: string;
  cols: number;
  rows: number;
}

export interface TerminalExitMessage {
  type: 'terminal:exit';
  sessionId: string;
  exitCode: number | null;
  signal: string | null;
}

export interface TerminalErrorMessage {
  type: 'terminal:error';
  sessionId: string;
  error: string;
}

export type TerminalMessage =
  | TerminalInputMessage
  | TerminalOutputMessage
  | TerminalResizeMessage
  | TerminalExitMessage
  | TerminalErrorMessage;

// ── WebSocket Agent Messages ─────────────────────────────────────────────────

export interface AgentStatusChangeMessage {
  type: 'agent:status';
  agentId: string;
  status: AgentStatus;
  previousStatus: AgentStatus;
}

export interface AgentLogMessage {
  type: 'agent:log';
  agentId: string;
  log: LogResponse;
}

export interface AgentMetricMessage {
  type: 'agent:metric';
  agentId: string;
  metric: MetricResponse;
}

export type AgentMessage =
  | AgentStatusChangeMessage
  | AgentLogMessage
  | AgentMetricMessage;

// ── WebSocket Union ──────────────────────────────────────────────────────────

export type WebSocketMessage = TerminalMessage | AgentMessage;

// ── SSE Event Types ──────────────────────────────────────────────────────────

export interface SSEAgentCreatedEvent {
  event: 'agent:created';
  data: AgentResponse;
}

export interface SSEAgentUpdatedEvent {
  event: 'agent:updated';
  data: AgentResponse;
}

export interface SSEAgentDeletedEvent {
  event: 'agent:deleted';
  data: { id: string };
}

export interface SSEAgentStatusEvent {
  event: 'agent:status';
  data: {
    agentId: string;
    status: AgentStatus;
    previousStatus: AgentStatus;
  };
}

export interface SSELogEvent {
  event: 'log';
  data: LogResponse;
}

export interface SSEMetricEvent {
  event: 'metric';
  data: MetricResponse;
}

export type SSEEvent =
  | SSEAgentCreatedEvent
  | SSEAgentUpdatedEvent
  | SSEAgentDeletedEvent
  | SSEAgentStatusEvent
  | SSELogEvent
  | SSEMetricEvent;
