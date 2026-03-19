import { customRender as render, screen, act } from '../../test/render.js';
import { LiveTimer } from './live-timer.js';

describe('LiveTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats seconds correctly ("45s")', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const startTime = new Date(now - 45_000);
    render(<LiveTimer startTime={startTime} />);
    expect(screen.getByTestId('live-timer').textContent).toBe('45s');
  });

  it('formats minutes correctly ("2m 30s")', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const startTime = new Date(now - 150_000);
    render(<LiveTimer startTime={startTime} />);
    expect(screen.getByTestId('live-timer').textContent).toBe('2m 30s');
  });

  it('formats hours correctly ("1h 5m")', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const startTime = new Date(now - 3_900_000);
    render(<LiveTimer startTime={startTime} />);
    expect(screen.getByTestId('live-timer').textContent).toBe('1h 5m');
  });

  it('formats zero elapsed as "0s"', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    render(<LiveTimer startTime={new Date(now)} />);
    expect(screen.getByTestId('live-timer').textContent).toBe('0s');
  });

  it('updates over time', async () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const startTime = new Date(now - 58_000);
    render(<LiveTimer startTime={startTime} />);
    expect(screen.getByTestId('live-timer').textContent).toBe('58s');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('live-timer').textContent).toBe('1m 1s');
  });

  it('accepts string startTime (ISO)', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const startTime = new Date(now - 10_000).toISOString();
    render(<LiveTimer startTime={startTime} />);
    expect(screen.getByTestId('live-timer').textContent).toBe('10s');
  });

  it('accepts numeric startTime (ms)', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    render(<LiveTimer startTime={now - 5_000} />);
    expect(screen.getByTestId('live-timer').textContent).toBe('5s');
  });

  it('applies custom className', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    render(<LiveTimer startTime={new Date(now)} className="custom" />);
    expect(screen.getByTestId('live-timer').className).toContain('custom');
  });

  it('has font-mono class', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    render(<LiveTimer startTime={new Date(now)} />);
    expect(screen.getByTestId('live-timer').className).toContain('font-mono');
  });
});
