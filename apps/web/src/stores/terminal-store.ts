import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  TerminalMessage,
  TerminalOutputMessage,
  TerminalInputMessage,
  TerminalResizeMessage,
} from '@command-center/shared';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'error' | 'disconnected';

const WS_BASE_URL = 'ws://localhost:4000';
const WS_TERMINAL_PATH = '/api/v1/tmux/sessions';
const RECONNECT_INITIAL_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
const RECONNECT_MULTIPLIER = 2;

export interface TerminalInstance {
  sessionName: string;
  agentId: string | null;
  connection: WebSocket | null;
  status: ConnectionStatus;
  reconnectAttempts: number;
  lastError: string | null;
  onOutput: ((data: string) => void) | null;
  onExit: ((exitCode: number | null, signal: string | null) => void) | null;
  onStatusChange: ((status: ConnectionStatus, error?: string) => void) | null;
}

export interface TerminalState {
  terminals: Map<string, TerminalInstance>;
  agentToSession: Map<string, string>;

  connectTerminal: (
    sessionName: string,
    agentId: string,
    options?: {
      onOutput?: (data: string) => void;
      onExit?: (exitCode: number | null, signal: string | null) => void;
      onStatusChange?: (status: ConnectionStatus, error?: string) => void;
    },
  ) => void;
  disconnectTerminal: (sessionName: string) => void;
  reconnectTerminal: (sessionName: string) => void;
  getTerminalStatus: (sessionName: string) => ConnectionStatus | undefined;
  getTerminalByAgent: (agentId: string) => TerminalInstance | undefined;

  sendInput: (sessionName: string, data: string) => boolean;
  sendResize: (sessionName: string, cols: number, rows: number) => boolean;
}

export const useTerminalStore = create<TerminalState>()(
  immer((set, get) => {
    const getReconnectDelay = (attempts: number): number => {
      const delay = RECONNECT_INITIAL_DELAY_MS * Math.pow(RECONNECT_MULTIPLIER, attempts);
      return Math.min(delay, RECONNECT_MAX_DELAY_MS);
    };

    const handleMessage = (sessionName: string, event: MessageEvent): void => {
      try {
        const message = JSON.parse(event.data as string) as TerminalMessage;

        switch (message.type) {
          case 'terminal:output': {
            const msg = message as TerminalOutputMessage;
            const term = get().terminals.get(sessionName);
            term?.onOutput?.(msg.data);
            break;
          }
          case 'terminal:exit': {
            const msg = message as { exitCode: number | null; signal: string | null };
            const term = get().terminals.get(sessionName);
            term?.onExit?.(msg.exitCode, msg.signal);
            set((state) => {
              const t = state.terminals.get(sessionName);
              if (t) {
                t.status = 'disconnected';
                t.connection?.close();
              }
            });
            break;
          }
          case 'terminal:error': {
            const msg = message as { error: string };
            const term = get().terminals.get(sessionName);
            if (term) {
              term.lastError = msg.error;
              term.onStatusChange?.('error', msg.error);
            }
            break;
          }
        }
      } catch {
        // Ignore malformed messages
      }
    };

    const reconnectFn = (sessionName: string): void => {
      if (!get().terminals.has(sessionName)) return;

      const url = `${WS_BASE_URL}${WS_TERMINAL_PATH}/${sessionName}/terminal`;
      const ws = new WebSocket(url);

      ws.onopen = () => {
        set((state) => {
          const term = state.terminals.get(sessionName);
          if (term) {
            term.status = 'connected';
            term.lastError = null;
            term.reconnectAttempts = 0;
            term.onStatusChange?.('connected');
          }
        });
      };

      ws.onmessage = (event: MessageEvent) => {
        handleMessage(sessionName, event);
      };

      ws.onerror = () => {
        set((state) => {
          const term = state.terminals.get(sessionName);
          if (term) {
            term.lastError = 'WebSocket connection error';
            term.onStatusChange?.('error', term.lastError);
          }
        });
      };

      ws.onclose = (event: CloseEvent) => {
        const currentTerminal = get().terminals.get(sessionName);
        if (!currentTerminal) return;

        if (event.wasClean) {
          set((state) => {
            const term = state.terminals.get(sessionName);
            if (term) {
              term.status = 'disconnected';
              term.onStatusChange?.('disconnected');
            }
          });
          return;
        }

        if (currentTerminal.status !== 'disconnected') {
          set((state) => {
            const term = state.terminals.get(sessionName);
            if (term) {
              term.status = 'reconnecting';
            }
          });

          const delay = getReconnectDelay(get().terminals.get(sessionName)?.reconnectAttempts ?? 0);
          setTimeout(() => {
            const term = get().terminals.get(sessionName);
            if (term && term.status === 'reconnecting') {
              reconnectFn(sessionName);
            }
          }, delay);
        }
      };

      set((state) => {
        const term = state.terminals.get(sessionName);
        if (!term) return;
        term.connection?.close();
        term.connection = ws;
        term.reconnectAttempts += 1;
        term.status = 'reconnecting';
      });
    };

    return {
      terminals: new Map<string, TerminalInstance>(),
      agentToSession: new Map<string, string>(),

      connectTerminal: (
        sessionName: string,
        agentId: string,
        options?: {
          onOutput?: (data: string) => void;
          onExit?: (exitCode: number | null, signal: string | null) => void;
          onStatusChange?: (status: ConnectionStatus, error?: string) => void;
        },
      ) => {
        const url = `${WS_BASE_URL}${WS_TERMINAL_PATH}/${sessionName}/terminal`;
        const ws = new WebSocket(url);

        ws.onopen = () => {
          set((state) => {
            const term = state.terminals.get(sessionName);
            if (term) {
              term.status = 'connected';
              term.lastError = null;
              term.reconnectAttempts = 0;
              term.onStatusChange?.('connected');
            }
          });
        };

        ws.onmessage = (event: MessageEvent) => {
          handleMessage(sessionName, event);
        };

        ws.onerror = () => {
          set((state) => {
            const term = state.terminals.get(sessionName);
            if (term) {
              term.lastError = 'WebSocket connection error';
              term.onStatusChange?.('error', term.lastError);
            }
          });
        };

        ws.onclose = (event: CloseEvent) => {
          const currentTerminal = get().terminals.get(sessionName);
          if (!currentTerminal) return;

          if (event.wasClean) {
            set((state) => {
              const term = state.terminals.get(sessionName);
              if (term) {
                term.status = 'disconnected';
                term.onStatusChange?.('disconnected');
              }
            });
            return;
          }

          if (currentTerminal.status !== 'disconnected') {
            set((state) => {
              const term = state.terminals.get(sessionName);
              if (term) {
                term.status = 'reconnecting';
              }
            });

            const delay = getReconnectDelay(get().terminals.get(sessionName)?.reconnectAttempts ?? 0);
            setTimeout(() => {
              const term = get().terminals.get(sessionName);
              if (term && term.status === 'reconnecting') {
                reconnectFn(sessionName);
              }
            }, delay);
          }
        };

        set((state) => {
          if (state.terminals.has(sessionName)) {
            const existing = state.terminals.get(sessionName)!;
            existing.agentId = agentId;
            existing.onOutput = options?.onOutput ?? null;
            existing.onExit = options?.onExit ?? null;
            existing.onStatusChange = options?.onStatusChange ?? null;
            existing.connection = ws;
            existing.status = 'connected';
            state.agentToSession.set(agentId, sessionName);
            return;
          }

          const terminal: TerminalInstance = {
            sessionName,
            agentId,
            connection: ws,
            status: 'connected',
            reconnectAttempts: 0,
            lastError: null,
            onOutput: options?.onOutput ?? null,
            onExit: options?.onExit ?? null,
            onStatusChange: options?.onStatusChange ?? null,
          };

          state.terminals.set(sessionName, terminal);
          state.agentToSession.set(agentId, sessionName);
        });
      },

      disconnectTerminal: (sessionName: string) => {
        set((state) => {
          const terminal = state.terminals.get(sessionName);
          if (!terminal) return;

          terminal.status = 'disconnected';
          terminal.connection?.close();
          terminal.connection = null;

          if (terminal.agentId) {
            state.agentToSession.delete(terminal.agentId);
          }

          terminal.onStatusChange?.('disconnected');
        });
      },

      reconnectTerminal: (sessionName: string) => {
        reconnectFn(sessionName);
      },

      getTerminalStatus: (sessionName: string): ConnectionStatus | undefined => {
        return get().terminals.get(sessionName)?.status;
      },

      getTerminalByAgent: (agentId: string): TerminalInstance | undefined => {
        const sessionName = get().agentToSession.get(agentId);
        if (!sessionName) return undefined;
        return get().terminals.get(sessionName);
      },

      sendInput: (sessionName: string, data: string): boolean => {
        const terminal = get().terminals.get(sessionName);
        if (!terminal?.connection || terminal.status !== 'connected') {
          return false;
        }

        const message: TerminalInputMessage = {
          type: 'terminal:input',
          sessionId: sessionName,
          data,
        };

        try {
          terminal.connection.send(JSON.stringify(message));
          return true;
        } catch {
          return false;
        }
      },

      sendResize: (sessionName: string, cols: number, rows: number): boolean => {
        const terminal = get().terminals.get(sessionName);
        if (!terminal?.connection || terminal.status !== 'connected') {
          return false;
        }

        const message: TerminalResizeMessage = {
          type: 'terminal:resize',
          sessionId: sessionName,
          cols,
          rows,
        };

        try {
          terminal.connection.send(JSON.stringify(message));
          return true;
        } catch {
          return false;
        }
      },
    };
  }),
);

export const terminalStore = useTerminalStore;
