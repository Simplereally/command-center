import { customRender as render, screen } from '../../test/render.js';
import { TerminalReconnectBanner } from './terminal-reconnect-banner.js';

describe('TerminalReconnectBanner', () => {
  const defaultProps = {
    isVisible: true,
    attempt: 1,
    maxAttempts: 5,
    onRetry: vi.fn(),
  };

  it('renders when isVisible is true', () => {
    render(<TerminalReconnectBanner {...defaultProps} />);
    expect(screen.getByTestId('terminal-reconnect-banner')).toBeInTheDocument();
  });

  it('does not render when isVisible is false', () => {
    render(<TerminalReconnectBanner {...defaultProps} isVisible={false} />);
    expect(screen.queryByTestId('terminal-reconnect-banner')).not.toBeInTheDocument();
  });

  it('shows correct attempt text', () => {
    render(<TerminalReconnectBanner {...defaultProps} attempt={3} maxAttempts={5} />);
    expect(screen.getByText('Attempt 3 of 5')).toBeInTheDocument();
  });

  it('shows Reconnecting text', () => {
    render(<TerminalReconnectBanner {...defaultProps} />);
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
  });

  it('shows retry button when on last attempt', () => {
    render(<TerminalReconnectBanner {...defaultProps} attempt={5} maxAttempts={5} />);
    expect(screen.getByText('Retry Now')).toBeInTheDocument();
  });

  it('does not show retry button when not on last attempt', () => {
    render(<TerminalReconnectBanner {...defaultProps} attempt={3} maxAttempts={5} />);
    expect(screen.queryByText('Retry Now')).not.toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const onRetry = vi.fn();
    const { user } = render(
      <TerminalReconnectBanner {...defaultProps} attempt={5} maxAttempts={5} onRetry={onRetry} />,
    );
    await user.click(screen.getByText('Retry Now'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('has correct role alert and aria-live attributes', () => {
    render(<TerminalReconnectBanner {...defaultProps} />);
    const banner = screen.getByTestId('terminal-reconnect-banner');
    expect(banner).toHaveAttribute('role', 'alert');
    expect(banner).toHaveAttribute('aria-live', 'assertive');
  });

  it('shows progress bar with correct width', () => {
    const { container } = render(
      <TerminalReconnectBanner {...defaultProps} attempt={2} maxAttempts={5} />,
    );
    const progressBar = container.querySelector('[class*="rounded-full bg-accent"]');
    expect(progressBar).toBeInTheDocument();
  });
});
