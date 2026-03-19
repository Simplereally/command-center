import { axe } from 'vitest-axe';
import { customRender as render, screen, waitFor } from '../../test/render.js';
import { CommandPalette } from './command-palette.js';

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal: () => Promise<typeof import('react-router')>) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockStartAgent = vi.fn();
const mockStopAgent = vi.fn();
const mockGetAgentById = vi.fn();
const mockOpenTerminalPanel = vi.fn();
const mockCloseSidePanel = vi.fn();
const mockSelectAgent = vi.fn();

const { mockSelectedAgentId } = vi.hoisted(() => ({
  mockSelectedAgentId: { value: null as string | null },
}));

vi.mock('../../stores/agent-store.js', () => ({
  useAgentStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      startAgent: mockStartAgent,
      stopAgent: mockStopAgent,
      getAgentById: mockGetAgentById,
    }),
}));

vi.mock('../../stores/ui-store.js', () => ({
  useUiStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      selectedAgentId: mockSelectedAgentId.value,
      openTerminalPanel: mockOpenTerminalPanel,
      closeSidePanel: mockCloseSidePanel,
      selectAgent: mockSelectAgent,
    }),
}));

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectedAgentId.value = null;
    mockGetAgentById.mockReturnValue(undefined);
  });

  it('renders when open is true', () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('command-palette')).toBeTruthy();
    expect(screen.getByTestId('command-palette-input')).toBeTruthy();
  });

  it('does not render when open is false', () => {
    render(<CommandPalette open={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('command-palette')).toBeNull();
  });

  it('renders backdrop when open', () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('command-palette-backdrop')).toBeTruthy();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(<CommandPalette open={true} onClose={onClose} />);
    await user.click(screen.getByTestId('command-palette-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    const { user } = render(<CommandPalette open={true} onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders all command groups', () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Agents')).toBeTruthy();
    expect(screen.getByText('Navigation')).toBeTruthy();
    expect(screen.getByText('Actions')).toBeTruthy();
  });

  it('renders New Agent command', () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    expect(screen.getByText('New Agent')).toBeTruthy();
  });

  it('renders navigation commands', () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Go to Board')).toBeTruthy();
    expect(screen.getByText('Go to Settings')).toBeTruthy();
  });

  it('renders action commands', () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Toggle Sidebar')).toBeTruthy();
    expect(screen.getByText('Focus Board')).toBeTruthy();
  });

  it('does not render agent-specific commands when no agent is selected', () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    expect(screen.queryByText(/Start Agent/)).toBeNull();
    expect(screen.queryByText(/Stop Agent/)).toBeNull();
    expect(screen.queryByText(/Open Terminal/)).toBeNull();
  });

  it('renders agent-specific commands when an agent is selected', () => {
    mockSelectedAgentId.value = 'agent-1';
    mockGetAgentById.mockReturnValue({
      id: 'agent-1',
      name: 'Test Agent',
      status: 'running',
      swimlaneId: 'lane-1',
      position: 0,
    });

    render(<CommandPalette open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Start Agent: Test Agent')).toBeTruthy();
    expect(screen.getByText('Stop Agent: Test Agent')).toBeTruthy();
    expect(screen.getByText('Open Terminal: Test Agent')).toBeTruthy();
  });

  it('navigates to board when Go to Board is selected', async () => {
    const onClose = vi.fn();
    const { user } = render(<CommandPalette open={true} onClose={onClose} />);
    await user.click(screen.getByTestId('cmd-go-to-board'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('navigates to settings when Go to Settings is selected', async () => {
    const onClose = vi.fn();
    const { user } = render(<CommandPalette open={true} onClose={onClose} />);
    await user.click(screen.getByTestId('cmd-go-to-settings'));
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('filters items when searching', async () => {
    const { user } = render(<CommandPalette open={true} onClose={vi.fn()} />);
    const input = screen.getByTestId('command-palette-input');
    await user.type(input, 'settings');
    await waitFor(() => {
      expect(screen.getByText('Go to Settings')).toBeTruthy();
    });
  });

  it('should have no accessibility violations when open', async () => {
    const { container } = render(<CommandPalette open={true} onClose={vi.fn()} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations with agent selected', async () => {
    mockSelectedAgentId.value = 'agent-1';
    mockGetAgentById.mockReturnValue({
      id: 'agent-1',
      name: 'Test Agent',
      status: 'running',
      swimlaneId: 'lane-1',
      position: 0,
    });

    const { container } = render(<CommandPalette open={true} onClose={vi.fn()} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
