import { http, HttpResponse } from 'msw';
import { AgentStatus } from '@command-center/shared';
import { buildAgent, buildBoard } from '../factories';

const API = '/api/v1';

export const handlers = [
  http.get(`${API}/health`, () => {
    return HttpResponse.json({
      data: { status: 'ok', timestamp: Date.now(), uptime: 0 },
    });
  }),

  http.get(`${API}/boards`, () => {
    return HttpResponse.json({
      data: [buildBoard({ id: 'board-1', name: 'Default Board' })],
    });
  }),

  http.get(`${API}/boards/:boardId`, ({ params }) => {
    return HttpResponse.json({
      data: buildBoard({ id: params.boardId as string }),
    });
  }),

  http.get(`${API}/agents`, ({ request }) => {
    const url = new URL(request.url);
    const boardId = url.searchParams.get('boardId');
    return HttpResponse.json({
      data: [
        buildAgent({
          id: 'agent-1',
          name: 'Frontend Agent',
          boardId: boardId ?? 'board-1',
          swimlaneId: 'lane-2',
          status: AgentStatus.RUNNING,
        }),
        buildAgent({
          id: 'agent-2',
          name: 'Backend Agent',
          boardId: boardId ?? 'board-1',
          swimlaneId: 'lane-1',
          status: AgentStatus.IDLE,
        }),
      ],
    });
  }),

  http.post(`${API}/agents/:agentId/move`, () => {
    return HttpResponse.json({ data: { success: true } });
  }),

  http.post(`${API}/agents/:agentId/start`, ({ params }) => {
    return HttpResponse.json({
      data: buildAgent({ id: params.agentId as string, status: AgentStatus.RUNNING }),
    });
  }),

  http.post(`${API}/agents/:agentId/stop`, ({ params }) => {
    return HttpResponse.json({
      data: buildAgent({ id: params.agentId as string, status: AgentStatus.STOPPED }),
    });
  }),
];
