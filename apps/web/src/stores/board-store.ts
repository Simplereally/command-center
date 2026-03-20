import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { BoardResponse, SwimlaneResponse } from '@command-center/shared';
import { api } from '../lib/api-client.js';

export interface BoardState {
  boards: BoardResponse[];
  currentBoard: BoardResponse | null;
  swimlanes: SwimlaneResponse[];
  loading: boolean;
  error: string | null;

  fetchBoards: () => Promise<void>;
  fetchBoard: (boardId: string) => Promise<void>;
  fetchSwimlanes: (boardId: string) => Promise<void>;
  createBoard: (name: string) => Promise<BoardResponse>;
  updateBoard: (id: string, data: { name?: string }) => Promise<BoardResponse>;
  deleteBoard: (id: string) => Promise<void>;
  setCurrentBoard: (board: BoardResponse | null) => void;
  clearSwimlanes: () => void;

  getSwimlaneBySlug: (slug: string) => SwimlaneResponse | undefined;
  getSwimlaneById: (id: string) => SwimlaneResponse | undefined;
}

export const useBoardStore = create<BoardState>()(
  immer((set, get) => ({
    boards: [],
    currentBoard: null,
    swimlanes: [],
    loading: false,
    error: null,

    fetchBoards: async () => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });
      try {
        const boards = await api.boards.list();
        set((state) => {
          state.boards = boards;
          state.loading = false;
        });
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to fetch boards';
          state.loading = false;
        });
      }
    },

    fetchBoard: async (boardId: string) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });
      try {
        const board = await api.boards.get(boardId);
        set((state) => {
          state.currentBoard = board;
          state.loading = false;
        });
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to fetch board';
          state.loading = false;
        });
      }
    },

    fetchSwimlanes: async (boardId: string) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });
      try {
        const swimlanes = await api.swimlanes.list(boardId);
        set((state) => {
          state.swimlanes = swimlanes;
          state.loading = false;
        });
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to fetch swimlanes';
          state.loading = false;
        });
      }
    },

    createBoard: async (name: string) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });
      try {
        const board = await api.boards.create({ name });
        set((state) => {
          state.boards.push(board);
          state.loading = false;
        });
        return board;
      } catch (err) {
        set((state) => {
          state.loading = false;
          state.error = err instanceof Error ? err.message : 'Failed to create board';
        });
        throw err;
      }
    },

    updateBoard: async (id: string, data: { name?: string }) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });
      try {
        const board = await api.boards.update(id, data);
        set((state) => {
          const index = state.boards.findIndex((b) => b.id === id);
          if (index !== -1) {
            state.boards[index] = board;
          }
          if (state.currentBoard?.id === id) {
            state.currentBoard = board;
          }
          state.loading = false;
        });
        return board;
      } catch (err) {
        set((state) => {
          state.loading = false;
          state.error = err instanceof Error ? err.message : 'Failed to update board';
        });
        throw err;
      }
    },

    deleteBoard: async (id: string) => {
      const boardIndex = get().boards.findIndex((b) => b.id === id);
      const boardToDelete = boardIndex !== -1 ? get().boards[boardIndex] : null;
      const wasCurrentBoard = get().currentBoard?.id === id;

      set((state) => {
        state.boards = state.boards.filter((b) => b.id !== id);
        if (wasCurrentBoard) {
          state.currentBoard = null;
        }
      });

      try {
        await api.boards.delete(id);
      } catch (err) {
        set((state) => {
          if (boardToDelete) {
            state.boards.splice(boardIndex, 0, boardToDelete);
          }
          if (wasCurrentBoard && boardToDelete) {
            state.currentBoard = boardToDelete;
          }
        });
        throw err;
      }
    },

    setCurrentBoard: (board: BoardResponse | null) => {
      set((state) => {
        state.currentBoard = board;
      });
    },

    clearSwimlanes: () => {
      set((state) => {
        state.swimlanes = [];
        state.loading = true;
      });
    },

    getSwimlaneBySlug: (slug: string) => {
      return get().swimlanes.find((lane) => lane.slug === slug);
    },

    getSwimlaneById: (id: string) => {
      return get().swimlanes.find((lane) => lane.id === id);
    },
  })),
);

export const boardStore = useBoardStore;
