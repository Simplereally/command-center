import type { BoardResponse } from '@command-center/shared';

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

let deleteReject: unknown = null;
let updateReject: unknown = null;

vi.mock('../lib/api-client.js', () => ({
  api: {
    boards: {
      list: async () => mockBoards,
      get: async () => mockBoards[0],
      create: async () => ({
        id: 'board-3',
        name: 'New Board',
        createdAt: '2025-01-03T00:00:00.000Z',
        updatedAt: '2025-01-03T00:00:00.000Z',
      }),
      delete: async () => {
        if (deleteReject) throw deleteReject;
        return { success: true };
      },
      update: async (_id: string, data: { name?: string }) => {
        if (updateReject) throw updateReject;
        return {
          id: _id,
          name: data.name ?? 'Updated',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-03T00:00:00.000Z',
        };
      },
    },
    swimlanes: {
      list: async () => [],
    },
  },
}));

import { useBoardStore } from './board-store.js';

function resetStore() {
  useBoardStore.setState({
    boards: [],
    currentBoard: null,
    swimlanes: [],
    loading: false,
    error: null,
  });
}

describe('boardStore deleteBoard', () => {
  beforeEach(() => {
    resetStore();
    deleteReject = null;
    updateReject = null;
  });

  it('removes board from state optimistically', async () => {
    useBoardStore.setState({ boards: [...mockBoards] });

    await useBoardStore.getState().deleteBoard('board-1');

    expect(useBoardStore.getState().boards.find((b) => b.id === 'board-1')).toBeUndefined();
    expect(useBoardStore.getState().boards).toHaveLength(1);
  });

  it('sets currentBoard to next available board if deleting the current board', async () => {
    useBoardStore.setState({
      boards: [...mockBoards],
      currentBoard: mockBoards[0]!,
    });

    const result = await useBoardStore.getState().deleteBoard('board-1');

    expect(result.wasCurrentBoard).toBe(true);
    expect(result.nextBoard).toEqual(mockBoards[1]);
    expect(useBoardStore.getState().currentBoard).toEqual(mockBoards[1]);
  });

  it('does not clear currentBoard if deleting a different board', async () => {
    useBoardStore.setState({
      boards: [...mockBoards],
      currentBoard: mockBoards[0]!,
    });

    await useBoardStore.getState().deleteBoard('board-2');

    expect(useBoardStore.getState().currentBoard).toEqual(mockBoards[0]);
    expect(useBoardStore.getState().boards).toHaveLength(1);
  });

  it('rolls back on API failure — board re-inserted at original position', async () => {
    useBoardStore.setState({ boards: [...mockBoards] });
    deleteReject = new Error('Server error');

    await expect(
      useBoardStore.getState().deleteBoard('board-1'),
    ).rejects.toThrow('Server error');

    const boards = useBoardStore.getState().boards;
    expect(boards).toHaveLength(2);
    expect(boards[0]!.id).toBe('board-1');
  });

  it('rolls back currentBoard on API failure', async () => {
    useBoardStore.setState({
      boards: [...mockBoards],
      currentBoard: mockBoards[0]!,
    });
    deleteReject = new Error('Server error');

    await expect(
      useBoardStore.getState().deleteBoard('board-1'),
    ).rejects.toThrow('Server error');

    expect(useBoardStore.getState().currentBoard).toEqual(mockBoards[0]);
  });

  it('does not restore currentBoard if a different board was current', async () => {
    useBoardStore.setState({
      boards: [...mockBoards],
      currentBoard: mockBoards[1]!,
    });
    deleteReject = new Error('Server error');

    await expect(
      useBoardStore.getState().deleteBoard('board-1'),
    ).rejects.toThrow('Server error');

    expect(useBoardStore.getState().currentBoard).toEqual(mockBoards[1]);
  });
});

describe('boardStore updateBoard', () => {
  beforeEach(() => {
    resetStore();
    deleteReject = null;
    updateReject = null;
  });

  it('updates a board in the list', async () => {
    useBoardStore.setState({ boards: [...mockBoards] });

    await useBoardStore.getState().updateBoard('board-1', { name: 'Renamed Board' });

    const board = useBoardStore.getState().boards.find((b) => b.id === 'board-1');
    expect(board?.name).toBe('Renamed Board');
  });

  it('updates currentBoard if it is the one being updated', async () => {
    useBoardStore.setState({
      boards: [...mockBoards],
      currentBoard: mockBoards[0]!,
    });

    await useBoardStore.getState().updateBoard('board-1', { name: 'Renamed Board' });

    expect(useBoardStore.getState().currentBoard?.name).toBe('Renamed Board');
  });

  it('does not update currentBoard if a different board is updated', async () => {
    useBoardStore.setState({
      boards: [...mockBoards],
      currentBoard: mockBoards[0]!,
    });

    await useBoardStore.getState().updateBoard('board-2', { name: 'Renamed Board 2' });

    expect(useBoardStore.getState().currentBoard?.name).toBe('Board 1');
  });

  it('sets error on API failure', async () => {
    useBoardStore.setState({ boards: [...mockBoards] });
    updateReject = new Error('Update failed');

    await expect(
      useBoardStore.getState().updateBoard('board-1', { name: 'Fail' }),
    ).rejects.toThrow('Update failed');

    expect(useBoardStore.getState().error).toBe('Update failed');
  });
});
