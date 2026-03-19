import { customRender as render, screen } from '../../test/render.js';
import { TerminalInstance } from './terminal-instance.js';

describe('TerminalInstance', () => {
  const defaultProps = {
    sessionId: 'test-session-123',
    wsUrl: 'ws://localhost:3000/ws/terminal/test-session-123',
  };

  it('renders with correct data attributes', () => {
    render(<TerminalInstance {...defaultProps} />);
    const instance = screen.getByTestId('terminal-instance');
    expect(instance).toBeInTheDocument();
    expect(instance).toHaveAttribute('data-session-id', 'test-session-123');
  });

  it('applies custom className', () => {
    render(<TerminalInstance {...defaultProps} className="custom-class" />);
    const instance = screen.getByTestId('terminal-instance');
    expect(instance).toHaveClass('custom-class');
  });

  it('has correct base classes for terminal styling', () => {
    render(<TerminalInstance {...defaultProps} />);
    const instance = screen.getByTestId('terminal-instance');
    expect(instance).toHaveClass('h-full', 'w-full', 'overflow-hidden', 'bg-terminal');
  });

  it('contains container ref div', () => {
    const { container } = render(<TerminalInstance {...defaultProps} />);
    const containerDiv = container.querySelector('[class="h-full w-full"]');
    expect(containerDiv).toBeInTheDocument();
  });

  it('does not render reconnect banner when not reconnecting', () => {
    render(<TerminalInstance {...defaultProps} />);
    const reconnectBanner = screen.queryByTestId('terminal-reconnect-banner');
    expect(reconnectBanner).not.toBeInTheDocument();
  });
});
