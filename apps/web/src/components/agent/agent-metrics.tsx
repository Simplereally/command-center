import { useEffect, useRef, useState, useCallback } from 'react';
import { Cpu, HardDrive } from 'lucide-react';
import type { MetricResponse } from '@command-center/shared';
import { api } from '../../lib/api-client.js';
import { cn } from '../../lib/cn.js';

interface AgentMetricsProps {
  agentId: string;
}

function cpuColor(cpu: number): string {
  if (cpu >= 80) return 'bg-red-500';
  if (cpu >= 50) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function memoryColor(memoryMb: number): string {
  if (memoryMb >= 1024) return 'bg-red-500';
  if (memoryMb >= 512) return 'bg-amber-500';
  return 'bg-blue-500';
}

export function AgentMetrics({ agentId }: AgentMetricsProps) {
  const [metrics, setMetrics] = useState<MetricResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await api.metrics.latest(agentId);
      setMetrics(data);
    } catch {
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    setLoading(true);
    setMetrics(null);
    void fetchMetrics();

    intervalRef.current = setInterval(() => {
      void fetchMetrics();
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div data-testid="agent-metrics" className="flex items-center gap-2 text-sm text-text-tertiary">
        Loading metrics…
      </div>
    );
  }

  if (!metrics) {
    return (
      <div data-testid="agent-metrics" className="text-sm text-text-tertiary">
        No metrics yet
      </div>
    );
  }

  const memoryMb = Math.round(metrics.memory / (1024 * 1024));

  return (
    <div data-testid="agent-metrics" className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
        <Cpu className="h-4 w-4 shrink-0 text-text-tertiary" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">CPU</span>
            <span className="text-sm font-semibold text-text-primary">{metrics.cpu.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-surface-hover overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-300', cpuColor(metrics.cpu))}
              style={{ width: `${Math.min(metrics.cpu, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
        <HardDrive className="h-4 w-4 shrink-0 text-text-tertiary" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Memory</span>
            <span className="text-sm font-semibold text-text-primary">{memoryMb.toLocaleString()} MB</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-surface-hover overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-300', memoryColor(memoryMb))}
              style={{ width: `${Math.min((memoryMb / 2048) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
