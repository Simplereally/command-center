export const Terminal = vi.fn().mockImplementation(() => ({
  write: vi.fn(),
  open: vi.fn(),
  dispose: vi.fn(),
  onData: vi.fn(),
  loadAddon: vi.fn(),
  cols: 80,
  rows: 24,
}));
