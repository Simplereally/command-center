import { customRender as render, screen } from '../../test/render.js';
import { TerminalPanel } from './terminal-panel.js';

describe('TerminalPanel', () => {
  const defaultSessions = [
    {
      id: 'tab-1',
      name: 'Terminal 1',
      sessionId: 'session-1',
      wsUrl: 'ws://localhost:3000/ws/terminal/session-1',
    },
    {
      id: 'tab-2',
      name: 'Terminal 2',
      sessionId: 'session-2',
      wsUrl: 'ws://localhost:3000/ws/terminal/session-2',
    },
  ];

  const defaultProps = {
    sessions: defaultSessions,
    activeSessionId: 'session-1',
    onSessionSelect: vi.fn(),
    onSessionClose: vi.fn(),
    onSessionCreate: vi.fn(),
  };

  it('renders terminal panel with correct data-testid', () => {
    render(<TerminalPanel {...defaultProps} />);
    expect(screen.getByTestId('terminal-panel')).toBeInTheDocument();
  });

  it('renders terminal tabs', () => {
    render(<TerminalPanel {...defaultProps} />);
    expect(screen.getByTestId('terminal-tabs')).toBeInTheDocument();
  });

  it('renders tabs for each session', () => {
    render(<TerminalPanel {...defaultProps} />);
    expect(screen.getByTestId('terminal-tab-tab-1')).toBeInTheDocument();
    expect(screen.getByTestId('terminal-tab-tab-2')).toBeInTheDocument();
  });

  it('shows active tab correctly', () => {
    render(<TerminalPanel {...defaultProps} activeSessionId="session-1" />);
    const tab1 = screen.getByTestId('terminal-tab-tab-1');
    expect(tab1).toHaveAttribute('data-active', 'true');
  });

  it('renders new tab button', () => {
    render(<TerminalPanel {...defaultProps} />);
    expect(screen.getByTestId('terminal-new-tab')).toBeInTheDocument();
  });

  it('shows empty state when no sessions', () => {
    render(<TerminalPanel {...defaultProps} sessions={[]} activeSessionId={null} />);
    expect(screen.getByText('No active terminal session')).toBeInTheDocument();
  });

  it('has correct panel structure with tabs and content area', () => {
    render(<TerminalPanel {...defaultProps} />);
    const panel = screen.getByTestId('terminal-panel');
    expect(panel).toHaveClass('flex', 'flex-col', 'h-full', 'bg-surface');
  });
});
