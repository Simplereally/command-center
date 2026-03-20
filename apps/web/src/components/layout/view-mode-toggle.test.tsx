import { axe } from 'vitest-axe';
import { customRender as render, screen } from '../../test/render.js';
import { ViewModeToggle } from './view-mode-toggle.js';

const mockSetViewMode = vi.fn();
const { mockViewMode } = vi.hoisted(() => ({
  mockViewMode: { value: 'board' as string },
}));

vi.mock('../../stores/ui-store.js', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      viewMode: mockViewMode.value,
      setViewMode: mockSetViewMode,
    }),
}));

describe('ViewModeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockViewMode.value = 'board';
  });

  it('renders with radiogroup role', () => {
    render(<ViewModeToggle />);

    expect(screen.getByRole('radiogroup', { name: 'View mode' })).toBeInTheDocument();
  });

  it('renders three view mode buttons', () => {
    render(<ViewModeToggle />);

    expect(screen.getByRole('radio', { name: /Board view/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Terminal view/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Focus view/i })).toBeInTheDocument();
  });

  it('marks Board as checked when viewMode is "board"', () => {
    mockViewMode.value = 'board';
    render(<ViewModeToggle />);

    expect(screen.getByRole('radio', { name: /Board view/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Terminal view/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: /Focus view/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('marks Terminal as checked when viewMode is "terminal"', () => {
    mockViewMode.value = 'terminal';
    render(<ViewModeToggle />);

    expect(screen.getByRole('radio', { name: /Terminal view/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('marks Focus as checked when viewMode is "focus"', () => {
    mockViewMode.value = 'focus';
    render(<ViewModeToggle />);

    expect(screen.getByRole('radio', { name: /Focus view/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('calls setViewMode("terminal") when Terminal button is clicked', async () => {
    const { user } = render(<ViewModeToggle />);

    await user.click(screen.getByRole('radio', { name: /Terminal view/i }));

    expect(mockSetViewMode).toHaveBeenCalledWith('terminal');
  });

  it('calls setViewMode("focus") when Focus button is clicked', async () => {
    const { user } = render(<ViewModeToggle />);

    await user.click(screen.getByRole('radio', { name: /Focus view/i }));

    expect(mockSetViewMode).toHaveBeenCalledWith('focus');
  });

  it('calls setViewMode("board") when Board button is clicked', async () => {
    mockViewMode.value = 'terminal';
    const { user } = render(<ViewModeToggle />);

    await user.click(screen.getByRole('radio', { name: /Board view/i }));

    expect(mockSetViewMode).toHaveBeenCalledWith('board');
  });

  it('displays mode labels', () => {
    render(<ViewModeToggle />);

    expect(screen.getByText('Board')).toBeInTheDocument();
    expect(screen.getByText('Terminal')).toBeInTheDocument();
    expect(screen.getByText('Focus')).toBeInTheDocument();
  });

  it('renders data-testid', () => {
    render(<ViewModeToggle />);

    expect(screen.getByTestId('view-mode-toggle')).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<ViewModeToggle />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
