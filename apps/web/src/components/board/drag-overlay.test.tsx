import { render, screen } from '@testing-library/react';
import { DragOverlayCard } from './drag-overlay.js';
import { buildAgent } from '../../test/factories.js';

describe('DragOverlayCard', () => {
  it('renders the agent name', () => {
    const agent = buildAgent({ name: 'Test Agent' });
    render(<DragOverlayCard agent={agent} />);

    expect(screen.getByText('Test Agent')).toBeInTheDocument();
  });

  it('renders with drag-overlay test id', () => {
    const agent = buildAgent();
    render(<DragOverlayCard agent={agent} />);

    expect(screen.getByTestId('drag-overlay')).toBeInTheDocument();
  });

  it('applies scale transform for elevated appearance', () => {
    const agent = buildAgent();
    render(<DragOverlayCard agent={agent} />);

    const overlay = screen.getByTestId('drag-overlay');
    expect(overlay).toHaveStyle({ transform: 'scale(1.03)' });
  });

  it('renders command badge when agent has a command', () => {
    const agent = buildAgent({ command: 'npm run dev' });
    render(<DragOverlayCard agent={agent} />);

    expect(screen.getByText('npm run dev')).toBeInTheDocument();
  });

  it('does not render command section when agent has no command', () => {
    const agent = buildAgent({ command: null });
    render(<DragOverlayCard agent={agent} />);

    expect(screen.queryByText('npm run dev')).not.toBeInTheDocument();
  });

  it('renders status dot for the agent', () => {
    const agent = buildAgent({ status: 'running' });
    render(<DragOverlayCard agent={agent} />);

    expect(screen.getByTestId('status-dot')).toBeInTheDocument();
  });

  it('has shadow-lg class for elevated appearance', () => {
    const agent = buildAgent();
    render(<DragOverlayCard agent={agent} />);

    const overlay = screen.getByTestId('drag-overlay');
    expect(overlay.className).toContain('shadow-lg');
  });

  it('has accent border to indicate drag state', () => {
    const agent = buildAgent();
    render(<DragOverlayCard agent={agent} />);

    const overlay = screen.getByTestId('drag-overlay');
    expect(overlay.className).toContain('border-accent');
  });
});
