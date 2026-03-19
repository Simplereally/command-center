import type { AgentStatus } from '@command-center/shared';
import { customRender as render, screen } from '../../test/render.js';
import { AgentStatusBadge } from './agent-status-badge.js';

const statuses: Array<{ status: AgentStatus; label: string; colorClass: string }> = [
  { status: 'idle', label: 'Idle', colorClass: 'text-status-idle' },
  { status: 'starting', label: 'In Progress', colorClass: 'text-status-starting' },
  { status: 'running', label: 'Running', colorClass: 'text-status-running' },
  { status: 'paused', label: 'Paused', colorClass: 'text-status-paused' },
  { status: 'stopping', label: 'Stopping', colorClass: 'text-status-stopping' },
  { status: 'stopped', label: 'Stopped', colorClass: 'text-status-idle' },
  { status: 'error', label: 'Error', colorClass: 'text-status-error' },
  { status: 'completed', label: 'Completed', colorClass: 'text-status-completed' },
];

describe('AgentStatusBadge', () => {
  it.each(statuses)(
    'renders correct label "$label" for status "$status"',
    ({ status, label }: { status: AgentStatus; label: string; colorClass: string }) => {
      render(<AgentStatusBadge status={status} />);
      expect(screen.getByTestId('agent-status-badge')).toHaveTextContent(label);
    },
  );

  it.each(statuses)(
    'applies correct color class for status "$status"',
    ({ status, colorClass }: { status: AgentStatus; label: string; colorClass: string }) => {
      render(<AgentStatusBadge status={status} />);
      expect(screen.getByTestId('agent-status-badge').className).toContain(colorClass);
    },
  );

  it('applies custom className', () => {
    render(<AgentStatusBadge status="running" className="mt-2" />);
    expect(screen.getByTestId('agent-status-badge').className).toContain('mt-2');
  });
});
