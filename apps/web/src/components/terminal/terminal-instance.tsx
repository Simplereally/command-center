import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { TerminalReconnectBanner } from './terminal-reconnect-banner.js';
import { cn } from '../../lib/cn.js';
import type { TerminalMessage } from '@command-center/shared';

const RECONNECT_MAX_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1000;

interface XtermTerminal {
  write(data: string): void;
  open(element: HTMLElement): void;
  dispose(): void;
  onData(callback: (data: string) => void): void;
  cols: number;
  rows: number;
  loadAddon(addon: XtermAddon): void;
}

interface XtermAddon {
  fit(): void;
}

interface Xterm {
  new (options?: {
    cursorBlink?: boolean;
    fontSize?: number;
    fontFamily?: string;
    theme?: {
      background?: string;
      foreground?: string;
      cursor?: string;
    };
    convertEol?: boolean;
  }): XtermTerminal;
}

interface XtermFitAddon {
  new (): XtermAddon;
}

export interface TerminalInstanceProps {
  sessionId: string;
  wsUrl: string;
  className?: string;
}

export interface TerminalInstanceRef {
  write: (data: string) => void;
  clear: () => void;
  resize: (cols: number, rows: number) => void;
}

export function TerminalInstance({ sessionId, wsUrl, className }: TerminalInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XtermTerminal | null>(null);
  const fitAddonRef = useRef<XtermAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasReconnectingRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        const wasReconnecting = wasReconnectingRef.current;
        wasReconnectingRef.current = false;
        setIsConnected(true);
        setIsReconnecting(false);
        setReconnectAttempt(0);
        if (wasReconnecting) {
          toast.info('Terminal reconnected');
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: TerminalMessage = JSON.parse(event.data);
          if (message.type === 'terminal:output' && message.sessionId === sessionId) {
            terminalRef.current?.write(message.data);
          }
        } catch {
          terminalRef.current?.write(event.data);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch {
      toast.error('Failed to connect to terminal');
    }
  }, [sessionId, wsUrl]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsReconnecting(false);
  }, []);

  const handleResize = useCallback(() => {
    if (fitAddonRef.current && terminalRef.current) {
      fitAddonRef.current.fit();
      const { cols, rows } = terminalRef.current;
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'terminal:resize',
            sessionId,
            cols,
            rows,
          }),
        );
      }
    }
  }, [sessionId]);

  useEffect(() => {
    let mounted = true;

    const initTerminal = async () => {
      if (!containerRef.current) return;

      try {
        const [xtermModule, fitAddonModule] = await Promise.all([
          import('@xterm/xterm'),
          import('@xterm/addon-fit'),
        ]);

        if (!mounted || !containerRef.current) return;

        const Terminal = xtermModule.Terminal as unknown as Xterm;
        const FitAddon = fitAddonModule.FitAddon as unknown as XtermFitAddon;

        const terminal = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: '"Geist Mono", "JetBrains Mono", "Fira Code", monospace',
          theme: {
            background: '#0d1117',
            foreground: '#c9d1d9',
            cursor: '#c9d1d9',
          },
          convertEol: true,
        });

        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        fitAddonRef.current = fitAddon;

        terminal.open(containerRef.current);
        fitAddon.fit();

        terminalRef.current = terminal;

        terminal.onData((data: string) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'terminal:input',
                sessionId,
                data,
              }),
            );
          }
        });
        const resizeObserver = new ResizeObserver(() => {
          handleResize();
        });
        resizeObserver.observe(containerRef.current);
        connect();

        return () => {
          resizeObserver.disconnect();
        };
      } catch {
        toast.error(
          'Failed to initialize terminal. Please install @xterm/xterm and @xterm/addon-fit.',
        );
      }
    };

    initTerminal();

    return () => {
      mounted = false;
      disconnect();
      terminalRef.current?.dispose();
      terminalRef.current = null;
    };
  }, [sessionId, wsUrl, connect, disconnect, handleResize]);

  const handleRetry = useCallback(() => {
    setReconnectAttempt(0);
    setIsReconnecting(false);
    connect();
  }, [connect]);

  useEffect(() => {
    if (!isConnected && !isReconnecting && reconnectAttempt === 0) {
      return;
    }

    if (!isConnected && reconnectAttempt > 0 && reconnectAttempt < RECONNECT_MAX_ATTEMPTS) {
      wasReconnectingRef.current = true;
      setIsReconnecting(true);
      const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttempt - 1);
      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectAttempt((prev) => prev + 1);
        connect();
      }, delay);
    }
  }, [isConnected, isReconnecting, reconnectAttempt, connect]);

  return (
    <div
      data-testid="terminal-instance"
      data-session-id={sessionId}
      data-connected={isConnected}
      className={cn('relative h-full w-full overflow-hidden bg-terminal', className)}
    >
      <div ref={containerRef} className="h-full w-full" />
      <TerminalReconnectBanner
        isVisible={isReconnecting}
        attempt={reconnectAttempt}
        maxAttempts={RECONNECT_MAX_ATTEMPTS}
        onRetry={handleRetry}
      />
    </div>
  );
}
