import { customRender as render, screen } from '../../test/render.js';
import { StatusDot } from './status-dot.js';

describe('StatusDot', () => {
  it('renders with correct size class for sm', () => {
    render(<StatusDot status="idle" size="sm" />);
    const dot = screen.getByTestId('status-dot');
    expect(dot.className).toContain('w-2');
    expect(dot.className).toContain('h-2');
  });

  it('renders with correct size class for md (default)', () => {
    render(<StatusDot status="idle" />);
    const dot = screen.getByTestId('status-dot');
    expect(dot.className).toContain('w-3');
    expect(dot.className).toContain('h-3');
  });

  it('renders with correct size class for lg', () => {
    render(<StatusDot status="idle" size="lg" />);
    const dot = screen.getByTestId('status-dot');
    expect(dot.className).toContain('w-4');
    expect(dot.className).toContain('h-4');
  });

  it('applies pulse animation for running status when pulse=true', () => {
    render(<StatusDot status="running" pulse />);
    const dot = screen.getByTestId('status-dot');
    expect(dot.className).toContain('rounded-full');
    expect(dot.className).toContain('bg-status-running');
  });

  it('does NOT pulse for non-running status even when pulse=true', () => {
    render(<StatusDot status="idle" pulse />);
    const dot = screen.getByTestId('status-dot');
    expect(dot.className).not.toContain('animate-pulse');
  });

  it('does NOT pulse for running status when pulse=false', () => {
    render(<StatusDot status="running" />);
    const dot = screen.getByTestId('status-dot');
    expect(dot.className).not.toContain('animate-pulse');
  });

  it('applies correct status color class', () => {
    render(<StatusDot status="error" />);
    const dot = screen.getByTestId('status-dot');
    expect(dot.className).toContain('bg-status-error');
  });

  it('applies custom className', () => {
    render(<StatusDot status="idle" className="custom-class" />);
    const dot = screen.getByTestId('status-dot');
    expect(dot.className).toContain('custom-class');
  });

  it('is always rounded-full', () => {
    render(<StatusDot status="idle" />);
    const dot = screen.getByTestId('status-dot');
    expect(dot.className).toContain('rounded-full');
  });
});
