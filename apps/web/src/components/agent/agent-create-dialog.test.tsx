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
    expect(screen.getByText('Choose Provider')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<AgentCreateDialog {...defaultProps} open={false} />);

    expect(screen.queryByTestId('agent-create-dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Choose Provider')).not.toBeInTheDocument();
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

  it('does not call onClose when Escape is pressed while closed', async () => {
    const onClose = vi.fn();
    const { user } = render(
      <AgentCreateDialog {...defaultProps} open={false} onClose={onClose} />,
    );

    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  describe('Step 1: Provider Selection', () => {
    it('shows provider grid with all providers', () => {
      render(<AgentCreateDialog {...defaultProps} />);

      expect(screen.getByTestId('provider-grid')).toBeInTheDocument();
      expect(screen.getByTestId('provider-card-claude-code')).toBeInTheDocument();
      expect(screen.getByTestId('provider-card-opencode')).toBeInTheDocument();
      expect(screen.getByTestId('provider-card-aider')).toBeInTheDocument();
      expect(screen.getByTestId('provider-card-custom')).toBeInTheDocument();
    });

    it('shows provider names and descriptions', () => {
      render(<AgentCreateDialog {...defaultProps} />);

      expect(screen.getByText('Claude Code')).toBeInTheDocument();
      expect(screen.getByText('OpenCode')).toBeInTheDocument();
      expect(screen.getByText('Aider')).toBeInTheDocument();
      expect(screen.getByText('Custom')).toBeInTheDocument();
    });

    it('transitions to step 2 when a provider is clicked', async () => {
      const { user } = render(<AgentCreateDialog {...defaultProps} />);

      await user.click(screen.getByTestId('provider-card-claude-code'));

      expect(screen.queryByTestId('provider-grid')).not.toBeInTheDocument();
      expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    });
  });

  describe('Step 2: Configuration', () => {
    async function goToStep2(providerId: string = 'claude-code') {
      const result = render(<AgentCreateDialog {...defaultProps} />);
      await result.user.click(screen.getByTestId(`provider-card-${providerId}`));
      return result;
    }

    it('shows a back button in step 2', async () => {
      await goToStep2();

      expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument();
    });

    it('returns to step 1 when back is clicked', async () => {
      const { user } = await goToStep2();

      await user.click(screen.getByRole('button', { name: /^back$/i }));

      expect(screen.getByTestId('provider-grid')).toBeInTheDocument();
    });

    it('auto-generates agent name from provider', async () => {
      await goToStep2('claude-code');

      const nameInput = screen.getByLabelText(/^name/i) as HTMLInputElement;
      expect(nameInput.value).toContain('Claude Code');
    });

    it('pre-fills command from provider default', async () => {
      await goToStep2('claude-code');

      const commandInput = screen.getByLabelText(/^command$/i) as HTMLInputElement;
      expect(commandInput.value).toBe('claude --print');
    });

    it('shows model dropdown for providers with models', async () => {
      await goToStep2('claude-code');

      const modelSelect = screen.getByLabelText(/^model$/i);
      expect(modelSelect.tagName).toBe('SELECT');
    });

    it('shows freeform model input for custom provider', async () => {
      await goToStep2('custom');

      const modelInput = screen.getByLabelText(/^model$/i);
      expect(modelInput.tagName).toBe('INPUT');
    });

    it('shows auth methods for the selected provider', async () => {
      await goToStep2('claude-code');

      expect(screen.getByText('Authentication')).toBeInTheDocument();
      expect(screen.getByText('Anthropic API key')).toBeInTheDocument();
    });

    it('shows API key input for api_key auth methods', async () => {
      await goToStep2('claude-code');

      expect(screen.getByLabelText('ANTHROPIC_API_KEY')).toBeInTheDocument();
    });

    it('shows doc link for provider with docUrl', async () => {
      await goToStep2('claude-code');

      expect(screen.getByText('Claude Code Documentation')).toBeInTheDocument();
    });

    it('shows validation error when name is empty on submit', async () => {
      const { user } = await goToStep2('claude-code');

      const nameInput = screen.getByLabelText(/^name/i);
      await user.clear(nameInput);

      await user.click(screen.getByRole('button', { name: /^create$/i }));

      expect(screen.getByTestId('agent-create-dialog-error')).toHaveTextContent(
        'Name is required',
      );
      expect(mockCreateAgent).not.toHaveBeenCalled();
    });

    it('creates agent and closes on successful submit', async () => {
      mockCreateAgent.mockResolvedValue({ id: 'agent-1' });
      const onClose = vi.fn();
      const result = render(<AgentCreateDialog {...defaultProps} onClose={onClose} />);

      await result.user.click(screen.getByTestId('provider-card-claude-code'));
      await result.user.click(screen.getByRole('button', { name: /^create$/i }));

      await waitFor(() => {
        expect(mockCreateAgent).toHaveBeenCalledWith(
          expect.objectContaining({
            boardId: 'board-1',
            swimlaneId: 'lane-not-started',
            model: 'claude-sonnet-4-20250514',
            command: 'claude --print',
          }),
        );
      });
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('creates agent with custom model text', async () => {
      mockCreateAgent.mockResolvedValue({ id: 'agent-1' });
      const onClose = vi.fn();
      const result = render(<AgentCreateDialog {...defaultProps} onClose={onClose} />);

      await result.user.click(screen.getByTestId('provider-card-custom'));

      const modelInput = screen.getByLabelText(/^model$/i);
      await result.user.type(modelInput, 'my-custom-model');

      await result.user.click(screen.getByRole('button', { name: /^create$/i }));

      await waitFor(() => {
        expect(mockCreateAgent).toHaveBeenCalledWith(
          expect.objectContaining({
            model: 'my-custom-model',
          }),
        );
      });
    });

    it('shows error message when createAgent fails', async () => {
      mockCreateAgent.mockRejectedValue(new Error('Network error'));
      const { user } = await goToStep2('claude-code');

      await user.click(screen.getByRole('button', { name: /^create$/i }));

      await waitFor(() => {
        expect(screen.getByTestId('agent-create-dialog-error')).toHaveTextContent(
          'Network error',
        );
      });
    });

    it('shows loading state during submission', async () => {
      let resolveCreate: (value: unknown) => void;
      mockCreateAgent.mockReturnValue(
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
      );
      const { user } = await goToStep2('claude-code');

      await user.click(screen.getByRole('button', { name: /^create$/i }));

      expect(screen.getByRole('button', { name: /^creating/i })).toBeDisabled();

      resolveCreate!({ id: 'agent-1' });
    });

    it('calls onClose when Cancel button is clicked', async () => {
      const onClose = vi.fn();
      const result = render(<AgentCreateDialog {...defaultProps} onClose={onClose} />);

      await result.user.click(screen.getByTestId('provider-card-claude-code'));
      await result.user.click(screen.getByRole('button', { name: /^cancel$/i }));

      expect(onClose).toHaveBeenCalledOnce();
    });

    it('includes env vars from API key inputs in create call', async () => {
      mockCreateAgent.mockResolvedValue({ id: 'agent-1' });
      const onClose = vi.fn();
      const result = render(<AgentCreateDialog {...defaultProps} onClose={onClose} />);

      await result.user.click(screen.getByTestId('provider-card-claude-code'));

      const apiKeyInput = screen.getByLabelText('ANTHROPIC_API_KEY');
      await result.user.type(apiKeyInput, 'sk-test-key');

      await result.user.click(screen.getByRole('button', { name: /^create$/i }));

      await waitFor(() => {
        expect(mockCreateAgent).toHaveBeenCalledWith(
          expect.objectContaining({
            envVars: expect.objectContaining({
              ANTHROPIC_API_KEY: 'sk-test-key',
            }),
          }),
        );
      });
    });
  });
});
