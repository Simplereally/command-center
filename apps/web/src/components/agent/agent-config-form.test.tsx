import type { AgentResponse } from '@command-center/shared';
import { customRender as render, screen, waitFor } from '../../test/render.js';
import { AgentConfigForm } from './agent-config-form.js';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

function makeAgent(overrides: Partial<AgentResponse> = {}): AgentResponse {
  return {
    id: 'agent-1',
    name: 'Test Agent',
    status: 'idle',
    boardId: 'board-1',
    swimlaneId: 'lane-1',
    model: null,
    workingDir: null,
    envVars: null,
    command: null,
    tmuxSession: null,
    tmuxPaneId: null,
    pid: null,
    exitCode: null,
    errorMessage: null,
    startedAt: null,
    stoppedAt: null,
    position: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('AgentConfigForm', () => {
  let mockOnSave: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSave = vi.fn().mockResolvedValue(undefined);
  });

  it('renders in read-only mode by default', () => {
    render(<AgentConfigForm agent={makeAgent()} onSave={mockOnSave} />);

    expect(screen.getByTestId('agent-config-form')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
  });

  it('shows agent name in read-only mode', () => {
    render(<AgentConfigForm agent={makeAgent({ name: 'My Agent' })} onSave={mockOnSave} />);

    expect(screen.getByText('My Agent')).toBeInTheDocument();
  });

  it('shows "Not set" for null working directory', () => {
    render(<AgentConfigForm agent={makeAgent({ workingDir: null })} onSave={mockOnSave} />);

    expect(screen.getByText('Not set')).toBeInTheDocument();
  });

  it('shows working directory when set', () => {
    render(
      <AgentConfigForm agent={makeAgent({ workingDir: '/home/project' })} onSave={mockOnSave} />,
    );

    expect(screen.getByText('/home/project')).toBeInTheDocument();
  });

  it('shows Edit button in read-only mode', () => {
    render(<AgentConfigForm agent={makeAgent()} onSave={mockOnSave} />);

    expect(screen.getByRole('button', { name: 'Edit configuration' })).toBeInTheDocument();
  });

  it('enters edit mode when Edit button is clicked', async () => {
    const { user } = render(<AgentConfigForm agent={makeAgent()} onSave={mockOnSave} />);

    await user.click(screen.getByRole('button', { name: 'Edit configuration' }));

    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Working Directory/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Environment Variables/i)).toBeInTheDocument();
  });

  it('pre-fills form inputs with agent data', async () => {
    const agent = makeAgent({
      name: 'My Agent',
      workingDir: '/workspace',
      envVars: { API_KEY: 'secret', NODE_ENV: 'dev' },
    });
    const { user } = render(<AgentConfigForm agent={agent} onSave={mockOnSave} />);

    await user.click(screen.getByRole('button', { name: 'Edit configuration' }));

    expect(screen.getByLabelText(/Name/i)).toHaveValue('My Agent');
    expect(screen.getByLabelText(/Working Directory/i)).toHaveValue('/workspace');
    expect(screen.getByLabelText(/Environment Variables/i)).toHaveValue(
      'API_KEY=secret\nNODE_ENV=dev',
    );
  });

  it('calls onSave with trimmed data when Save is clicked', async () => {
    const { user } = render(
      <AgentConfigForm agent={makeAgent({ name: 'Agent' })} onSave={mockOnSave} />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit configuration' }));

    const nameInput = screen.getByLabelText(/Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Agent');

    await user.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Agent' }),
      );
    });
  });

  it('exits edit mode after successful save', async () => {
    const { user } = render(
      <AgentConfigForm agent={makeAgent({ name: 'Agent' })} onSave={mockOnSave} />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit configuration' }));
    await user.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit configuration' })).toBeInTheDocument();
    });
  });

  it('resets form and exits edit mode when Cancel is clicked', async () => {
    const { user } = render(
      <AgentConfigForm agent={makeAgent({ name: 'Agent' })} onSave={mockOnSave} />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit configuration' }));

    const nameInput = screen.getByLabelText(/Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Changed Name');

    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(screen.getByRole('button', { name: 'Edit configuration' })).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
  });

  it('shows toast error for empty name on submit', async () => {
    const { toast } = await import('sonner');
    const { user } = render(
      <AgentConfigForm agent={makeAgent({ name: 'Agent' })} onSave={mockOnSave} />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit configuration' }));

    const nameInput = screen.getByLabelText(/Name/i);
    await user.clear(nameInput);

    await user.click(screen.getByRole('button', { name: /Save/i }));

    expect(toast.error).toHaveBeenCalledWith('Name is required');
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('shows toast error when onSave throws', async () => {
    const { toast } = await import('sonner');
    mockOnSave.mockRejectedValueOnce(new Error('Save failed'));

    const { user } = render(
      <AgentConfigForm agent={makeAgent({ name: 'Agent' })} onSave={mockOnSave} />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit configuration' }));
    await user.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Save failed');
    });
  });

  it('shows environment variables in read-only mode', () => {
    render(
      <AgentConfigForm
        agent={makeAgent({ envVars: { FOO: 'bar', BAZ: 'qux' } })}
        onSave={mockOnSave}
      />,
    );

    const envText = screen.getByText((_content, element) => {
      return element?.textContent === 'FOO=bar\nBAZ=qux';
    });
    expect(envText).toBeInTheDocument();
  });

  it('does not show env vars section when envVars is null', () => {
    render(
      <AgentConfigForm agent={makeAgent({ envVars: null })} onSave={mockOnSave} />,
    );

    expect(screen.queryByText('Environment Variables')).not.toBeInTheDocument();
  });

  it('submits with env vars parsed correctly', async () => {
    const { user } = render(
      <AgentConfigForm agent={makeAgent()} onSave={mockOnSave} />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit configuration' }));

    const envInput = screen.getByLabelText(/Environment Variables/i);
    await user.type(envInput, 'KEY1=val1\nKEY2=val2');

    await user.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          envVars: { KEY1: 'val1', KEY2: 'val2' },
        }),
      );
    });
  });

  it('does not include workingDir in save data when empty', async () => {
    const { user } = render(
      <AgentConfigForm agent={makeAgent({ name: 'Agent', workingDir: null })} onSave={mockOnSave} />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit configuration' }));
    await user.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      const callArg = mockOnSave.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArg).not.toHaveProperty('workingDir');
    });
  });

  it('shows loading state during save', async () => {
    let resolveOnSave: () => void;
    mockOnSave.mockImplementation(
      () => new Promise<void>((resolve) => { resolveOnSave = resolve; }),
    );

    const { user } = render(
      <AgentConfigForm agent={makeAgent()} onSave={mockOnSave} />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit configuration' }));
    await user.click(screen.getByRole('button', { name: /Save/i }));

    expect(screen.getByText('Saving...')).toBeInTheDocument();

    resolveOnSave!();
    await waitFor(() => {
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    });
  });
});
