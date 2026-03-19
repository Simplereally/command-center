import { customRender as render, screen, waitFor } from '../../test/render.js';
import { AgentCreateDialog } from './agent-create-dialog.js';

const mockCreateAgent = vi.fn();

vi.mock('../../stores/agent-store.js', () => ({
  useAgentStore: () => ({
    createAgent: mockCreateAgent,
  }),
}));

describe('AgentCreateDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    boardId: 'board-1',
    swimlaneId: 'lane-not-started',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open is true', () => {
    render(<AgentCreateDialog {...defaultProps} />);

    expect(screen.getByTestId('agent-create-dialog')).toBeInTheDocument();
    expect(screen.getByText('Create New Agent')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<AgentCreateDialog {...defaultProps} open={false} />);

    expect(screen.queryByTestId('agent-create-dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Create New Agent')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(<AgentCreateDialog {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /^close$/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape key is pressed', async () => {
    const onClose = vi.fn();
    const { user } = render(<AgentCreateDialog {...defaultProps} onClose={onClose} />);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(<AgentCreateDialog {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByTestId('agent-create-dialog-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when dialog content is clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(<AgentCreateDialog {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByTestId('agent-create-dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(<AgentCreateDialog {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows validation error when name is empty on submit', async () => {
    const { user } = render(<AgentCreateDialog {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /^create$/i }));

    expect(screen.getByTestId('agent-create-dialog-error')).toHaveTextContent('Name is required');
    expect(mockCreateAgent).not.toHaveBeenCalled();
  });

  it('creates agent and closes on successful submit', async () => {
    mockCreateAgent.mockResolvedValue({ id: 'agent-1' });
    const onClose = vi.fn();
    const { user } = render(<AgentCreateDialog {...defaultProps} onClose={onClose} />);

    await user.type(screen.getByLabelText(/^name/i), 'My Agent');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(mockCreateAgent).toHaveBeenCalledWith({
        name: 'My Agent',
        boardId: 'board-1',
        swimlaneId: 'lane-not-started',
      });
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('includes optional fields when provided', async () => {
    mockCreateAgent.mockResolvedValue({ id: 'agent-1' });
    const onClose = vi.fn();
    const { user } = render(<AgentCreateDialog {...defaultProps} onClose={onClose} />);

    await user.type(screen.getByLabelText(/^name/i), 'My Agent');
    await user.type(screen.getByLabelText(/^model/i), 'claude-4-opus');
    await user.type(screen.getByLabelText(/^working directory/i), '/home/user/project');
    await user.type(screen.getByLabelText(/^command/i), 'npm run dev');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(mockCreateAgent).toHaveBeenCalledWith({
        name: 'My Agent',
        boardId: 'board-1',
        swimlaneId: 'lane-not-started',
        model: 'claude-4-opus',
        workingDir: '/home/user/project',
        command: 'npm run dev',
      });
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows error message when createAgent fails', async () => {
    mockCreateAgent.mockRejectedValue(new Error('Network error'));
    const { user } = render(<AgentCreateDialog {...defaultProps} />);

    await user.type(screen.getByLabelText(/^name/i), 'My Agent');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(screen.getByTestId('agent-create-dialog-error')).toHaveTextContent('Network error');
    });
  });

  it('shows loading state during submission', async () => {
    let resolveCreate: (value: unknown) => void;
    mockCreateAgent.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    const { user } = render(<AgentCreateDialog {...defaultProps} />);

    await user.type(screen.getByLabelText(/^name/i), 'My Agent');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    expect(screen.getByRole('button', { name: /^creating/i })).toBeDisabled();

    resolveCreate!({ id: 'agent-1' });
  });

  it('does not call onClose when Escape is pressed while closed', async () => {
    const onClose = vi.fn();
    const { user } = render(<AgentCreateDialog {...defaultProps} open={false} onClose={onClose} />);

    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});
