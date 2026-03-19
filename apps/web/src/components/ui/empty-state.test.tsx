import { customRender as render, screen } from '../../test/render.js';
import { EmptyState } from './empty-state.js';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No agents" description="Create your first agent to get started" />);
    expect(screen.getByText('No agents')).toBeTruthy();
    expect(screen.getByText('Create your first agent to get started')).toBeTruthy();
  });

  it('renders action button with click handler', async () => {
    const onClick = vi.fn();
    const { user } = render(
      <EmptyState title="No agents" action={{ label: 'Create Agent', onClick }} />,
    );
    const button = screen.getByRole('button', { name: 'Create Agent' });
    expect(button).toBeTruthy();
    await user.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders without optional props', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.getByText('Empty')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders icon when provided', () => {
    render(<EmptyState title="Empty" icon={<svg data-testid="custom-icon" />} />);
    expect(screen.getByTestId('custom-icon')).toBeTruthy();
  });

  it('does not render description when not provided', () => {
    render(<EmptyState title="Only title" />);
    const container = screen.getByTestId('empty-state');
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });

  it('applies custom className', () => {
    render(<EmptyState title="Test" className="my-custom" />);
    expect(screen.getByTestId('empty-state').className).toContain('my-custom');
  });

  it('has centered layout classes', () => {
    render(<EmptyState title="Test" />);
    const el = screen.getByTestId('empty-state');
    expect(el.className).toContain('flex');
    expect(el.className).toContain('flex-col');
    expect(el.className).toContain('items-center');
    expect(el.className).toContain('justify-center');
  });
});
