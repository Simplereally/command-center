import { customRender as render, screen } from '@/test/render';
import { SettingsPage } from './settings';

describe('SettingsPage', () => {
  it('renders the "Settings" heading', () => {
    render(<SettingsPage />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Settings');
  });

  it('renders the sidebar navigation', () => {
    render(<SettingsPage />);

    expect(screen.getByRole('button', { name: 'Keyboard Shortcuts' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'About' })).toBeInTheDocument();
  });

  it('renders the keyboard shortcuts section by default', () => {
    render(<SettingsPage />);

    expect(screen.getByText('View Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('has proper heading structure for accessibility', () => {
    render(<SettingsPage />);

    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('renders header and main landmarks', () => {
    render(<SettingsPage />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
