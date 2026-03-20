import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { TerminalReconnectBanner } from './terminal-reconnect-banner.js';
import { cn } from '../../lib/cn.js';
import type { TerminalMessage } from '@command-center/shared';

const RECONNECT_MAX_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;

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
    cursorStyle?: 'bar' | 'block' | 'underline';
    fontSize?: number;
    fontFamily?: string;
    theme?: {
      background?: string;
      foreground?: string;
      cursor?: string;
      cursorAccent?: string;
      selectionBackground?: string;
      selectionForeground?: string;
    };
    convertEol?: boolean;
    scrollback?: number;
    allowProposedApi?: boolean;
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
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mountedRef = useRef(true);
  const hadConnectionRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const connectRef = useRef<(attempt?: number) => void>(() => {});

  const scheduleReconnect = useCallback((attempt: number) => {
    if (!mountedRef.current) return;
    if (attempt >= RECONNECT_MAX_ATTEMPTS) {
      setIsReconnecting(true);
      setReconnectAttempt(RECONNECT_MAX_ATTEMPTS);
      return;
    }

    setIsReconnecting(true);
    setReconnectAttempt(attempt);

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt),
      RECONNECT_MAX_DELAY_MS,
    );
    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        connectRef.current(attempt + 1);
      }
    }, delay);
  }, []);

  const connect = useCallback((attempt = 0) => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return; }
        const wasReconnecting = hadConnectionRef.current && attempt > 0;
        hadConnectionRef.current = true;
        setIsConnected(true);
        setIsReconnecting(false);
        setReconnectAttempt(0);
        if (wasReconnecting) {
          toast.info('Terminal reconnected');
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string) as TerminalMessage;
          switch (message.type) {
            case 'terminal:output':
              if (message.sessionId === sessionId) {
                terminalRef.current?.write(message.data);
              }
              break;
            case 'terminal:exit':
              terminalRef.current?.write(
                `\r\n\x1b[90m[Process exited with code ${message.exitCode ?? 'unknown'}]\x1b[0m\r\n`,
              );
              break;
            case 'terminal:error':
              terminalRef.current?.write(
                `\r\n\x1b[31m[Error: ${message.error}]\x1b[0m\r\n`,
              );
              break;
          }
        } catch {
          if (typeof event.data === 'string') {
            terminalRef.current?.write(event.data);
          }
        }
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        wsRef.current = null;

        if (!event.wasClean && hadConnectionRef.current) {
          scheduleReconnect(attempt);
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch {
      toast.error('Failed to connect to terminal');
      if (hadConnectionRef.current) {
        scheduleReconnect(attempt);
      }
    }
  }, [sessionId, wsUrl, scheduleReconnect]);

  connectRef.current = connect;

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsReconnecting(false);
  }, []);

  const handleResize = useCallback(() => {
    if (fitAddonRef.current && terminalRef.current) {
      try {
        fitAddonRef.current.fit();
      } catch {
        return;
      }
      const { cols, rows } = terminalRef.current;
      if (wsRef.current?.readyState === WebSocket.OPEN && cols > 0 && rows > 0) {
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
    mountedRef.current = true;
    hadConnectionRef.current = false;

    const initTerminal = async () => {
      if (!containerRef.current) return;

      try {
        const [xtermModule, fitAddonModule] = await Promise.all([
          import('@xterm/xterm'),
          import('@xterm/addon-fit'),
        ]);

        if (!mountedRef.current || !containerRef.current) return;

        const Terminal = xtermModule.Terminal as unknown as Xterm;
        const FitAddon = fitAddonModule.FitAddon as unknown as XtermFitAddon;

        const terminal = new Terminal({
          cursorBlink: true,
          cursorStyle: 'bar',
          fontSize: 14,
          fontFamily: '"Geist Mono", "JetBrains Mono", "Fira Code", monospace',
          theme: {
            background: '#0a0a0a',
            foreground: '#f2f2f2',
            cursor: '#f2f2f2',
            cursorAccent: '#0a0a0a',
            selectionBackground: 'rgba(59, 130, 246, 0.3)',
          },
          convertEol: true,
          scrollback: 5000,
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
          requestAnimationFrame(() => {
            handleResize();
          });
        });
        resizeObserver.observe(containerRef.current);
        resizeObserverRef.current = resizeObserver;

        connect();
      } catch {
        toast.error(
          'Failed to initialize terminal. Please install @xterm/xterm and @xterm/addon-fit.',
        );
      }
    };

    initTerminal();

    return () => {
      mountedRef.current = false;
      disconnect();
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      terminalRef.current?.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId, wsUrl, connect, disconnect, handleResize]);

  const handleRetry = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setReconnectAttempt(0);
    setIsReconnecting(false);
    hadConnectionRef.current = true;
    connect(0);
  }, [connect]);

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
