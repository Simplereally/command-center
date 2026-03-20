import { useEffect, useState, useCallback } from 'react';
import { cn } from '../../lib/cn.js';

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function toMs(startTime: string | number | Date): number {
  if (startTime instanceof Date) return startTime.getTime();
  if (typeof startTime === 'number') return startTime;
  return new Date(startTime).getTime();
}

let subscribers = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  subscribers++;
  if (subscribers === 1) {
    intervalId = setInterval(() => listeners.forEach((fn) => fn()), 1000);
  }
  return () => {
    listeners.delete(callback);
    subscribers--;
    if (subscribers === 0 && intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

export interface LiveTimerProps {
  startTime: string | number | Date;
  className?: string;
}

export function LiveTimer({ startTime, className }: LiveTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  const tick = useCallback(() => {
    setNow(Date.now());
  }, []);

  useEffect(() => {
    return subscribe(tick);
  }, [tick]);

  const elapsed = now - toMs(startTime);

  return (
    <span
      data-testid="live-timer"
      className={cn('font-mono text-sm text-text-secondary', className)}
    >
      {formatDuration(elapsed)}
    </span>
  );
}
