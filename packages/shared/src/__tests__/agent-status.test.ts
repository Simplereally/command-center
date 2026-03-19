import { describe, it, expect } from 'vitest';
import { AgentStatus, VALID_TRANSITIONS, canTransition } from '../constants/agent-status.js';

describe('AgentStatus', () => {
  it('defines all 8 statuses', () => {
    const statuses = Object.values(AgentStatus);
    expect(statuses).toHaveLength(8);
    expect(statuses).toContain('idle');
    expect(statuses).toContain('starting');
    expect(statuses).toContain('running');
    expect(statuses).toContain('paused');
    expect(statuses).toContain('stopping');
    expect(statuses).toContain('stopped');
    expect(statuses).toContain('error');
    expect(statuses).toContain('completed');
  });

  it('has valid transitions for every status', () => {
    const statuses = Object.values(AgentStatus);
    statuses.forEach((status) => {
      expect(VALID_TRANSITIONS[status]).toBeDefined();
      expect(Array.isArray(VALID_TRANSITIONS[status])).toBe(true);
    });
  });
});

describe('canTransition', () => {
  describe('valid transitions', () => {
    it('idle → starting', () => {
      expect(canTransition('idle', 'starting')).toBe(true);
    });

    it('starting → running', () => {
      expect(canTransition('starting', 'running')).toBe(true);
    });

    it('starting → error', () => {
      expect(canTransition('starting', 'error')).toBe(true);
    });

    it('running → paused', () => {
      expect(canTransition('running', 'paused')).toBe(true);
    });

    it('running → stopping', () => {
      expect(canTransition('running', 'stopping')).toBe(true);
    });

    it('running → error', () => {
      expect(canTransition('running', 'error')).toBe(true);
    });

    it('running → completed', () => {
      expect(canTransition('running', 'completed')).toBe(true);
    });

    it('paused → running', () => {
      expect(canTransition('paused', 'running')).toBe(true);
    });

    it('paused → stopping', () => {
      expect(canTransition('paused', 'stopping')).toBe(true);
    });

    it('paused → error', () => {
      expect(canTransition('paused', 'error')).toBe(true);
    });

    it('stopping → stopped', () => {
      expect(canTransition('stopping', 'stopped')).toBe(true);
    });

    it('stopping → error', () => {
      expect(canTransition('stopping', 'error')).toBe(true);
    });

    it('stopped → starting', () => {
      expect(canTransition('stopped', 'starting')).toBe(true);
    });

    it('error → starting', () => {
      expect(canTransition('error', 'starting')).toBe(true);
    });

    it('error → idle', () => {
      expect(canTransition('error', 'idle')).toBe(true);
    });

    it('completed → idle', () => {
      expect(canTransition('completed', 'idle')).toBe(true);
    });

    it('completed → starting', () => {
      expect(canTransition('completed', 'starting')).toBe(true);
    });
  });

  describe('invalid transitions', () => {
    it('idle → running (must go through starting)', () => {
      expect(canTransition('idle', 'running')).toBe(false);
    });

    it('idle → paused', () => {
      expect(canTransition('idle', 'paused')).toBe(false);
    });

    it('idle → stopping', () => {
      expect(canTransition('idle', 'stopping')).toBe(false);
    });

    it('idle → stopped', () => {
      expect(canTransition('idle', 'stopped')).toBe(false);
    });

    it('idle → error', () => {
      expect(canTransition('idle', 'error')).toBe(false);
    });

    it('idle → completed', () => {
      expect(canTransition('idle', 'completed')).toBe(false);
    });

    it('completed → running (terminal state)', () => {
      expect(canTransition('completed', 'running')).toBe(false);
    });

    it('completed → paused', () => {
      expect(canTransition('completed', 'paused')).toBe(false);
    });

    it('completed → stopping', () => {
      expect(canTransition('completed', 'stopping')).toBe(false);
    });

    it('completed → stopped', () => {
      expect(canTransition('completed', 'stopped')).toBe(false);
    });

    it('completed → error', () => {
      expect(canTransition('completed', 'error')).toBe(false);
    });

    it('stopped → running (must go through starting)', () => {
      expect(canTransition('stopped', 'running')).toBe(false);
    });

    it('stopped → paused', () => {
      expect(canTransition('stopped', 'paused')).toBe(false);
    });

    it('stopped → completed', () => {
      expect(canTransition('stopped', 'completed')).toBe(false);
    });

    it('running → idle (must stop first)', () => {
      expect(canTransition('running', 'idle')).toBe(false);
    });

    it('running → stopped (must go through stopping)', () => {
      expect(canTransition('running', 'stopped')).toBe(false);
    });

    it('running → starting', () => {
      expect(canTransition('running', 'starting')).toBe(false);
    });

    it('paused → idle', () => {
      expect(canTransition('paused', 'idle')).toBe(false);
    });

    it('paused → stopped', () => {
      expect(canTransition('paused', 'stopped')).toBe(false);
    });

    it('paused → starting', () => {
      expect(canTransition('paused', 'starting')).toBe(false);
    });

    it('paused → completed', () => {
      expect(canTransition('paused', 'completed')).toBe(false);
    });

    it('stopping → idle', () => {
      expect(canTransition('stopping', 'idle')).toBe(false);
    });

    it('stopping → starting', () => {
      expect(canTransition('stopping', 'starting')).toBe(false);
    });

    it('stopping → running', () => {
      expect(canTransition('stopping', 'running')).toBe(false);
    });

    it('stopping → paused', () => {
      expect(canTransition('stopping', 'paused')).toBe(false);
    });

    it('stopping → completed', () => {
      expect(canTransition('stopping', 'completed')).toBe(false);
    });

    it('error → running', () => {
      expect(canTransition('error', 'running')).toBe(false);
    });

    it('error → paused', () => {
      expect(canTransition('error', 'paused')).toBe(false);
    });

    it('error → stopping', () => {
      expect(canTransition('error', 'stopping')).toBe(false);
    });

    it('error → stopped', () => {
      expect(canTransition('error', 'stopped')).toBe(false);
    });

    it('error → completed', () => {
      expect(canTransition('error', 'completed')).toBe(false);
    });

    it('starting → idle', () => {
      expect(canTransition('starting', 'idle')).toBe(false);
    });

    it('starting → paused', () => {
      expect(canTransition('starting', 'paused')).toBe(false);
    });

    it('starting → stopping', () => {
      expect(canTransition('starting', 'stopping')).toBe(false);
    });

    it('starting → stopped', () => {
      expect(canTransition('starting', 'stopped')).toBe(false);
    });

    it('starting → completed', () => {
      expect(canTransition('starting', 'completed')).toBe(false);
    });
  });
});
