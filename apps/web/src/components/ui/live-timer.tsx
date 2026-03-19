import { useEffect, useState } from 'react';
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

export interface LiveTimerProps {
  startTime: string | number | Date;
  className?: string;
}

export function LiveTimer({ startTime, className }: LiveTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);

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
