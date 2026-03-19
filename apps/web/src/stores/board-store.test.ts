import type { BoardResponse, SwimlaneResponse } from '@command-center/shared';

const mockBoards: BoardResponse[] = [
  {
    id: 'board-1',
    name: 'Board 1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'board-2',
    name: 'Board 2',
    createdAt: '2025-01-02T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
  },
];

const mockSwimlanes: SwimlaneResponse[] = [
  {
    id: 'lane-1',
    boardId: 'board-1',
    slug: 'not-started',
    name: 'Not Started',
    position: 0,
    color: '#94a3b8',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'lane-2',
    boardId: 'board-1',
    slug: 'in-progress',
    name: 'In Progress',
    position: 1,
    color: '#3b82f6',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'lane-3',
    boardId: 'board-1',
    slug: 'done',
    name: 'Done',
    position: 2,
    color: '#22c55e',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
];

let listResolve: BoardResponse[] = mockBoards;
let getResolve: BoardResponse = mockBoards[0]!;
let createResolve: BoardResponse = {
  id: 'board-3',
  name: 'New Board',
  createdAt: '2025-01-03T00:00:00.000Z',
  updatedAt: '2025-01-03T00:00:00.000Z',
};
let swimlanesResolve: SwimlaneResponse[] = mockSwimlanes;
let listReject: unknown = null;
let getReject: unknown = null;
let createReject: unknown = null;
let swimlanesReject: unknown = null;

vi.mock('../lib/api-client.js', () => ({
  api: {
    boards: {
      list: async () => {
        if (listReject) throw listReject;
        return listResolve;
      },
      get: async () => {
        if (getReject) throw getReject;
        return getResolve;
      },
      create: async () => {
        if (createReject) throw createReject;
        return createResolve;
      },
    },
    swimlanes: {
      list: async () => {
        if (swimlanesReject) throw swimlanesReject;
        return swimlanesResolve;
      },
    },
  },
}));

import { useBoardStore, boardStore } from './board-store.js';

function resetMocks() {
  listResolve = mockBoards;
  getResolve = mockBoards[0]!;
  createResolve = {
    id: 'board-3',
    name: 'New Board',
    createdAt: '2025-01-03T00:00:00.000Z',
    updatedAt: '2025-01-03T00:00:00.000Z',
  };
  swimlanesResolve = mockSwimlanes;
  listReject = null;
  getReject = null;
  createReject = null;
  swimlanesReject = null;
}

function resetStore() {
  useBoardStore.setState({
    boards: [],
    currentBoard: null,
    swimlanes: [],
    loading: false,
    error: null,
  });
}

describe('boardStore', () => {
  beforeEach(() => {
    resetMocks();
    resetStore();
  });

  describe('initial state', () => {
    it('has empty boards, no current board, empty swimlanes', () => {
      const state = useBoardStore.getState();
      expect(state.boards).toEqual([]);
      expect(state.currentBoard).toBeNull();
      expect(state.swimlanes).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('exports', () => {
    it('exports useBoardStore hook and boardStore reference', () => {
      expect(useBoardStore).toBeDefined();
      expect(boardStore).toBe(useBoardStore);
    });
  });

  describe('fetchBoards', () => {
    it('loads boards and clears loading state', async () => {
      await useBoardStore.getState().fetchBoards();

      const state = useBoardStore.getState();
      expect(state.boards).toEqual(mockBoards);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error on failure', async () => {
      listReject = new Error('Network error');

      await useBoardStore.getState().fetchBoards();

      const state = useBoardStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.loading).toBe(false);
      expect(state.boards).toEqual([]);
    });

    it('sets generic error for non-Error rejections', async () => {
      listReject = 'string error';

      await useBoardStore.getState().fetchBoards();

      expect(useBoardStore.getState().error).toBe('Failed to fetch boards');
    });
  });

  describe('fetchBoard', () => {
    it('loads a single board into currentBoard', async () => {
      await useBoardStore.getState().fetchBoard('board-1');

      const state = useBoardStore.getState();
      expect(state.currentBoard).toEqual(mockBoards[0]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error on failure', async () => {
      getReject = new Error('Not found');

      await useBoardStore.getState().fetchBoard('bad-id');

      const state = useBoardStore.getState();
      expect(state.error).toBe('Not found');
      expect(state.currentBoard).toBeNull();
      expect(state.loading).toBe(false);
    });
  });

  describe('fetchSwimlanes', () => {
    it('loads swimlanes for a board', async () => {
      await useBoardStore.getState().fetchSwimlanes('board-1');

      const state = useBoardStore.getState();
      expect(state.swimlanes).toEqual(mockSwimlanes);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error on failure', async () => {
      swimlanesReject = new Error('Server error');

      await useBoardStore.getState().fetchSwimlanes('board-1');

      const state = useBoardStore.getState();
      expect(state.error).toBe('Server error');
      expect(state.swimlanes).toEqual([]);
      expect(state.loading).toBe(false);
    });
  });

  describe('createBoard', () => {
    it('creates a board and appends it to boards list', async () => {
      const result = await useBoardStore.getState().createBoard('New Board');

      expect(result.id).toBe('board-3');
      expect(useBoardStore.getState().boards).toContainEqual(
        expect.objectContaining({ id: 'board-3' }),
      );
    });

    it('appends to existing boards without clearing them', async () => {
      useBoardStore.setState({ boards: [mockBoards[0]!] });

      await useBoardStore.getState().createBoard('Another');

      expect(useBoardStore.getState().boards).toHaveLength(2);
    });
  });

  describe('setCurrentBoard', () => {
    it('sets the current board', () => {
      useBoardStore.getState().setCurrentBoard(mockBoards[0]!);
      expect(useBoardStore.getState().currentBoard).toEqual(mockBoards[0]);
    });

    it('clears the current board with null', () => {
      useBoardStore.setState({ currentBoard: mockBoards[0]! });
      useBoardStore.getState().setCurrentBoard(null);
      expect(useBoardStore.getState().currentBoard).toBeNull();
    });
  });

  describe('getSwimlaneBySlug', () => {
    beforeEach(() => {
      useBoardStore.setState({ swimlanes: mockSwimlanes });
    });

    it('returns the swimlane matching the slug', () => {
      const lane = useBoardStore.getState().getSwimlaneBySlug('in-progress');
      expect(lane).toBeDefined();
      expect(lane?.id).toBe('lane-2');
      expect(lane?.name).toBe('In Progress');
    });

    it('returns undefined for non-existent slug', () => {
      const lane = useBoardStore.getState().getSwimlaneBySlug('nonexistent');
      expect(lane).toBeUndefined();
    });
  });

  describe('getSwimlaneById', () => {
    beforeEach(() => {
      useBoardStore.setState({ swimlanes: mockSwimlanes });
    });

    it('returns the swimlane matching the id', () => {
      const lane = useBoardStore.getState().getSwimlaneById('lane-3');
      expect(lane).toBeDefined();
      expect(lane?.slug).toBe('done');
      expect(lane?.name).toBe('Done');
    });

    it('returns undefined for non-existent id', () => {
      const lane = useBoardStore.getState().getSwimlaneById('nonexistent');
      expect(lane).toBeUndefined();
    });
  });
});
