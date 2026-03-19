import { customRender as render, screen } from '../../test/render.js';
import { TopBar } from './top-bar.js';
import { useBoardStore } from '../../stores/board-store.js';

vi.mock('../../stores/board-store.js', () => ({
  useBoardStore: vi.fn(),
}));

const mockFetchBoards = vi.fn();

function mockBoardState(currentBoard: Record<string, unknown> | null, boards?: Record<string, unknown>[]) {
  vi.mocked(useBoardStore).mockImplementation(((
    selector: (s: Record<string, unknown>) => unknown,
  ) =>
    selector({
      currentBoard,
      boards: boards ?? (currentBoard ? [currentBoard] : []),
      fetchBoards: mockFetchBoards,
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
}

describe('TopBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Command Center" title', () => {
    mockBoardState(null);

    render(<TopBar />);

    expect(screen.getByText('Command Center')).toBeInTheDocument();
  });

  it('shows board name when currentBoard exists', () => {
    mockBoardState({ id: 'board-1', name: 'My Board' });

    render(<TopBar />);

    expect(screen.getByText('My Board')).toBeInTheDocument();
  });

  it('shows "New Agent" button', () => {
    mockBoardState(null);

    render(<TopBar />);

    expect(screen.getByText('New Agent')).toBeInTheDocument();
  });

  it('has settings link to /settings', () => {
    mockBoardState(null);

    render(<TopBar />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/settings');
  });
});
