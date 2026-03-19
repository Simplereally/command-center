import { customRender as render, screen } from '../../test/render.js';
import { KeyboardHelp } from './keyboard-help.js';

describe('KeyboardHelp', () => {
  it('renders when open=true', () => {
    render(<KeyboardHelp open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('keyboard-help-modal')).toBeTruthy();
    expect(screen.getByText('Keyboard Shortcuts')).toBeTruthy();
  });

  it('hidden when open=false', () => {
    render(<KeyboardHelp open={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('keyboard-help-modal')).toBeNull();
    expect(screen.queryByTestId('keyboard-help-backdrop')).toBeNull();
  });

  it('escape closes', async () => {
    const onClose = vi.fn();
    const { user } = render(<KeyboardHelp open={true} onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows shortcut categories', () => {
    render(<KeyboardHelp open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Navigation')).toBeTruthy();
    expect(screen.getByText('Agent Actions')).toBeTruthy();
    expect(screen.getByText('General')).toBeTruthy();
  });

  it('shows all navigation shortcuts', () => {
    render(<KeyboardHelp open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Command palette')).toBeTruthy();
    expect(screen.getByText('New agent')).toBeTruthy();
    expect(screen.getByText('Navigate lanes')).toBeTruthy();
    expect(screen.getByText('Navigate cards')).toBeTruthy();
  });

  it('shows all agent action shortcuts', () => {
    render(<KeyboardHelp open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Open terminal')).toBeTruthy();
    expect(screen.getByText('Start/stop')).toBeTruthy();
    expect(screen.getByText('Restart')).toBeTruthy();
    expect(screen.getByText('Select/view detail')).toBeTruthy();
  });

  it('shows all general shortcuts', () => {
    render(<KeyboardHelp open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Close panel / deselect')).toBeTruthy();
    expect(screen.getByText('Toggle this help')).toBeTruthy();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(<KeyboardHelp open={true} onClose={onClose} />);
    await user.click(screen.getByTestId('keyboard-help-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(<KeyboardHelp open={true} onClose={onClose} />);
    await user.click(screen.getByTestId('keyboard-help-close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call escape handler when closed', async () => {
    const onClose = vi.fn();
    const { user } = render(<KeyboardHelp open={false} onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});
