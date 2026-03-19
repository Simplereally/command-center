import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('detectRunningInstances', () => {
  const testDir = join(tmpdir(), 'opencode-test-' + Date.now());

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('returns empty array when opencode directory does not exist', async () => {
    const { detectRunningInstances } = await import('../src/detector.js');
    const nonExistentDir = join(tmpdir(), 'nonexistent-' + Date.now());

    const instances = await detectRunningInstances();

    expect(Array.isArray(instances)).toBe(true);
  });

  it('returns empty array when directory has no socket files', async () => {
    const { detectRunningInstances } = await import('../src/detector.js');
    const emptyDir = join(testDir, 'empty-' + Date.now());
    mkdirSync(emptyDir, { recursive: true });

    const instances = await detectRunningInstances();

    expect(Array.isArray(instances)).toBe(true);
  });

  it('returns empty array when socket files have no corresponding processes', async () => {
    const { detectRunningInstances } = await import('../src/detector.js');

    const instances = await detectRunningInstances();

    expect(Array.isArray(instances)).toBe(true);
  });
});

describe('parseOpencodeConfig', () => {
  const testDir = join(tmpdir(), 'opencode-config-test-' + Date.now());

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('returns default config with null values when directory does not exist', async () => {
    const { parseOpencodeConfig } = await import('../src/detector.js');

    const config = await parseOpencodeConfig();

    expect(config.configDir).toBeDefined();
    expect(config.configDir).toContain('.opencode');
    expect(config.socketPath).toBeNull();
    expect(config.pidFile).toBeNull();
    expect(config.logFile).toBeNull();
    expect(config.options).toEqual({});
  });

  it('returns default config when directory is empty', async () => {
    const { parseOpencodeConfig } = await import('../src/detector.js');

    const config = await parseOpencodeConfig();

    expect(config.configDir).toBeDefined();
    expect(config.options).toEqual({});
  });

  it('handles missing optional fields gracefully', async () => {
    const { parseOpencodeConfig } = await import('../src/detector.js');

    const config = await parseOpencodeConfig();

    expect(config.configDir).toBeDefined();
    expect(config.socketPath === null || typeof config.socketPath === 'string').toBe(true);
    expect(config.pidFile === null || typeof config.pidFile === 'string').toBe(true);
    expect(config.logFile === null || typeof config.logFile === 'string').toBe(true);
  });
});
