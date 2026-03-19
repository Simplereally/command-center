import { describe, it, expect } from 'vitest';
import { parseOpencodeLog, parseAgentMetadata } from '../src/parser.js';
import { OpencodeAgentStatus, OpencodeLogLevel } from '../src/types.js';

describe('parseOpencodeLog', () => {
  it('returns null for empty lines', () => {
    expect(parseOpencodeLog('')).toBeNull();
    expect(parseOpencodeLog('   ')).toBeNull();
    expect(parseOpencodeLog('\n')).toBeNull();
  });

  it('parses timestamp in ISO format', () => {
    const result = parseOpencodeLog('2024-01-15T10:30:00.000Z [info] Test message');

    expect(result).not.toBeNull();
    expect(result?.timestamp.getFullYear()).toBe(2024);
    expect(result?.timestamp.getMonth()).toBe(0);
    expect(result?.timestamp.getDate()).toBe(15);
  });

  it('parses timestamp with timezone offset', () => {
    const result = parseOpencodeLog('2024-01-15T10:30:00+05:30 [info] Test');

    expect(result).not.toBeNull();
    expect(result?.timestamp.getUTCHours()).toBe(5);
  });

  it('parses log level from bracket notation', () => {
    const levels = ['debug', 'info', 'warn', 'error', 'system'] as const;

    for (const level of levels) {
      const result = parseOpencodeLog(`2024-01-15T10:30:00Z [${level}] Message`);
      expect(result?.level).toBe(level);
    }
  });

  it('parses session ID from bracket notation', () => {
    const result = parseOpencodeLog('2024-01-15T10:30:00Z [info] [session-abc] Message');

    expect(result).not.toBeNull();
    expect(result?.sessionId).toBe('session-abc');
  });

  it('parses source from angle bracket notation', () => {
    const result = parseOpencodeLog('2024-01-15T10:30:00Z [info] [sess] <agent-core> Message');

    expect(result).not.toBeNull();
    expect(result?.source).toBe('agent-core');
  });

  it('extracts message content correctly', () => {
    const result = parseOpencodeLog(
      '2024-01-15T10:30:00.000Z [info] [session-1] <agent> Agent started successfully',
    );

    expect(result).not.toBeNull();
    expect(result?.message).toBe('Agent started successfully');
  });

  it('handles lines without timestamp', () => {
    const result = parseOpencodeLog('[error] Something went wrong');

    expect(result).not.toBeNull();
    expect(result?.message).toBe('Something went wrong');
  });

  it('handles lines without log level', () => {
    const result = parseOpencodeLog('2024-01-15T10:30:00Z Simple message');

    expect(result).not.toBeNull();
    expect(result?.message).toBe('Simple message');
  });

  it('handles whitespace-only message after parsing', () => {
    const result = parseOpencodeLog('2024-01-15T10:30:00Z [info]     ');

    expect(result).toBeNull();
  });

  it('infers error level from message content when not explicitly set', () => {
    const result = parseOpencodeLog('2024-01-15T10:30:00Z Operation failed with error');

    expect(result).not.toBeNull();
    expect(result?.level).toBe('error');
  });

  it('infers warn level from message content', () => {
    const result = parseOpencodeLog('2024-01-15T10:30:00Z Warning: memory usage high');

    expect(result).not.toBeNull();
    expect(result?.level).toBe('warn');
  });

  it('preserves message case for inference', () => {
    const result = parseOpencodeLog('2024-01-15T10:30:00Z ERROR: connection refused');

    expect(result).not.toBeNull();
    expect(result?.level).toBe('error');
  });

  it('returns null for completely empty line', () => {
    expect(parseOpencodeLog('')).toBeNull();
  });

  it('returns null for whitespace-only line', () => {
    expect(parseOpencodeLog('   \n\t  ')).toBeNull();
  });

  it('handles multiple spaces between components', () => {
    const result = parseOpencodeLog('2024-01-15T10:30:00Z    [info]    [sess1]   Message here');

    expect(result).not.toBeNull();
    expect(result?.message).toBe('Message here');
    expect(result?.sessionId).toBe('sess1');
  });

  it('handles colon-separated timestamp format', () => {
    const result = parseOpencodeLog('2024-01-15 10:30:00 [info] Test message');

    expect(result).not.toBeNull();
    expect(result?.timestamp.getFullYear()).toBe(2024);
  });
});

describe('parseAgentMetadata', () => {
  it('returns default metadata for empty input', () => {
    const result = parseAgentMetadata('');

    expect(result.sessionId).toBe('unknown');
    expect(result.status).toBe('error');
    expect(result.name).toBeNull();
    expect(result.model).toBeNull();
  });

  it('parses session ID', () => {
    const result = parseAgentMetadata('session: abc-123 some other content');

    expect(result.sessionId).toBe('abc-123');
  });

  it('parses name', () => {
    const result = parseAgentMetadata('name: my-agent session: abc');

    expect(result.name).toBe('my-agent');
  });

  it('parses status', () => {
    const statuses = [
      { input: 'status: initializing', expected: 'initializing' as const },
      { input: 'status: running', expected: 'running' as const },
      { input: 'status: paused', expected: 'paused' as const },
      { input: 'status: waiting', expected: 'waiting' as const },
      { input: 'status: completed', expected: 'completed' as const },
      { input: 'status: error', expected: 'error' as const },
    ];

    for (const { input, expected } of statuses) {
      const result = parseAgentMetadata(input);
      expect(result.status).toBe(expected);
    }
  });

  it('parses model', () => {
    const result = parseAgentMetadata('model: claude-3-opus session: test');

    expect(result.model).toBe('claude-3-opus');
  });

  it('parses tokens', () => {
    const result = parseAgentMetadata('tokens: 12345 session: test');

    expect(result.tokens).toBe(12345);
  });

  it('parses token singular form', () => {
    const result = parseAgentMetadata('token: 999 session: test');

    expect(result.tokens).toBe(999);
  });

  it('parses working directory', () => {
    const result = parseAgentMetadata('workingDir: /home/user/project session: test');

    expect(result.workingDir).toBe('/home/user/project');
  });

  it('parses dir shorthand', () => {
    const result = parseAgentMetadata('dir: /tmp/session session: test');

    expect(result.workingDir).toBe('/tmp/session');
  });

  it('parses started timestamp', () => {
    const result = parseAgentMetadata('started: 2024-01-15T10:30:00Z session: test');

    expect(result.startedAt).not.toBeNull();
    expect(result.startedAt?.getFullYear()).toBe(2024);
  });

  it('handles complex metadata string', () => {
    const result = parseAgentMetadata(
      'name: test-agent model: claude-3 tokens: 5000 status: running dir: /project session: sess-001',
    );

    expect(result.sessionId).toBe('sess-001');
    expect(result.name).toBe('test-agent');
    expect(result.model).toBe('claude-3');
    expect(result.tokens).toBe(5000);
    expect(result.status).toBe('running');
    expect(result.workingDir).toBe('/project');
  });

  it('returns error status for unknown status values', () => {
    const result = parseAgentMetadata('status: unknown-state');

    expect(result.status).toBe('error');
  });

  it('parses status variations', () => {
    const variations = [
      { input: 'status: init', expected: 'initializing' as const },
      { input: 'status: active', expected: 'running' as const },
      { input: 'status: pause', expected: 'paused' as const },
      { input: 'status: idle', expected: 'waiting' as const },
      { input: 'status: done', expected: 'completed' as const },
      { input: 'status: failed', expected: 'error' as const },
    ];

    for (const { input, expected } of variations) {
      const result = parseAgentMetadata(input);
      expect(result.status).toBe(expected);
    }
  });

  it('handles whitespace variations', () => {
    const result = parseAgentMetadata('session:   spaced-id    name:  spaced-name  ');

    expect(result.sessionId).toBe('spaced-id');
    expect(result.name).toBe('spaced-name');
  });

  it('handles JSON-like status values', () => {
    const result = parseAgentMetadata('{"status": "running", "session": "json-1"}');

    expect(result.sessionId).toBe('json-1');
    expect(result.status).toBe('running');
  });
});
