import type { AgentResponse, BoardResponse, SwimlaneResponse } from '@command-center/shared';
import { AgentStatus } from '@command-center/shared';

let counter = 0;
const id = (prefix: string) => `${prefix}-${++counter}`;

export function buildAgent(overrides?: Partial<AgentResponse>): AgentResponse {
  return {
    id: id('agent'),
    boardId: 'board-1',
    swimlaneId: 'lane-1',
    position: 0,
    name: `Agent ${counter}`,
    status: AgentStatus.IDLE,
    model: null,
    command: null,
    workingDir: null,
    envVars: null,
    tmuxSession: null,
    tmuxPaneId: null,
    pid: null,
    exitCode: null,
    errorMessage: null,
    startedAt: null,
    stoppedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function buildBoard(overrides?: Partial<BoardResponse>): BoardResponse {
  return {
    id: id('board'),
    name: `Board ${counter}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function buildSwimlane(overrides?: Partial<SwimlaneResponse>): SwimlaneResponse {
  return {
    id: id('lane'),
    boardId: 'board-1',
    name: `Lane ${counter}`,
    slug: `lane-${counter}`,
    position: counter,
    color: '#6366f1',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
