import { customRender as render, screen } from '../../test/render.js';
import { AppShell } from './app-shell.js';
import { useUiStore } from '../../stores/ui-store.js';
import { useBoardStore } from '../../stores/board-store.js';
import { useAgentStore } from '../../stores/agent-store.js';

vi.mock('../../stores/ui-store.js', () => ({
  useUiStore: vi.fn(),
}));

vi.mock('../../stores/board-store.js', () => ({
  useBoardStore: vi.fn(),
}));

vi.mock('../../stores/agent-store.js', () => ({
  useAgentStore: vi.fn(),
}));

vi.mock('../../lib/api-client.js', () => ({
  api: {
    tmux: {
      listSessions: vi.fn().mockResolvedValue([]),
    },
  },
}));

function setupMocks(overrides: Record<string, unknown> = {}) {
  vi.mocked(useUiStore).mockImplementation(((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      viewMode: overrides.viewMode ?? 'board',
      sidePanelMode: overrides.sidePanelMode ?? 'closed',
      sidePanelWidth: 40,
      selectedAgentId: overrides.selectedAgentId ?? null,
      closeSidePanel: vi.fn(),
      commandPaletteOpen: false,
      closeCommandPalette: vi.fn(),
    })) as never);

  const currentBoard = { id: 'board-1', name: 'Test Board', createdAt: '', updatedAt: '' };
  vi.mocked(useBoardStore).mockImplementation(((
    selector: (s: Record<string, unknown>) => unknown,
  ) =>
    selector({
      currentBoard,
      boards: [currentBoard],
      fetchBoards: vi.fn(),
      swimlanes: [
        {
          id: 'lane-1',
          slug: 'not-started',
          name: 'Not Started',
          position: 0,
          color: '#94a3b8',
          boardId: 'board-1',
        },
      ],
    })) as never);

  vi.mocked(useAgentStore).mockImplementation(((
    selector?: (s: Record<string, unknown>) => unknown,
  ) => {
    const state = { agents: new Map(), createAgent: vi.fn() };
    return selector ? selector(state) : state;
  }) as never);
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders TopBar, main content, and StatusBar', () => {
    setupMocks({ sidePanelMode: 'closed' });

    render(
      <AppShell>
        <div data-testid="child-content">Hello</div>
      </AppShell>,
    );

    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    expect(screen.getByTestId('top-bar')).toBeInTheDocument();
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('shows SidePanel when sidePanelMode is detail', () => {
    setupMocks({ sidePanelMode: 'detail' });

    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    expect(screen.getByTestId('side-panel')).toBeInTheDocument();
  });

  it('shows SidePanel when sidePanelMode is terminal', () => {
    setupMocks({ sidePanelMode: 'terminal' });

    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    expect(screen.getByTestId('side-panel')).toBeInTheDocument();
  });

  it('hides SidePanel when sidePanelMode is closed', () => {
    setupMocks({ sidePanelMode: 'closed' });

    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    expect(screen.queryByTestId('side-panel')).not.toBeInTheDocument();
  });

  it('renders terminal fullscreen view in terminal mode', () => {
    setupMocks({ viewMode: 'terminal', sidePanelMode: 'terminal' });

    render(
      <AppShell>
        <div data-testid="child-content">Hello</div>
      </AppShell>,
    );

    expect(screen.getByTestId('terminal-fullscreen')).toBeInTheDocument();
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
  });

  it('renders focus view with no-agent message when no agent selected', () => {
    setupMocks({ viewMode: 'focus' });

    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    expect(screen.getByTestId('focus-view')).toBeInTheDocument();
    expect(screen.getByText('Select an agent to enter focus mode')).toBeInTheDocument();
  });
});
