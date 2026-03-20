import { PROVIDERS, getProviderById } from '@command-center/shared';

describe('PROVIDERS import test', () => {
  it('should import PROVIDERS array', () => {
    expect(PROVIDERS).toBeDefined();
    expect(Array.isArray(PROVIDERS)).toBe(true);
    expect(PROVIDERS.length).toBeGreaterThan(0);
  });

  it('should have claude-code provider', () => {
    const claude = getProviderById('claude-code');
    expect(claude).toBeDefined();
    expect(claude?.name).toBe('Claude Code');
  });
});
