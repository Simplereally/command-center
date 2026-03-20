import { BrowserRouter, Routes, Route, useNavigate, Link } from 'react-router';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { Blocks, Plus, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { BoardPage } from './routes/board';
import { SettingsPage } from './routes/settings';
import { api } from './lib/api-client.js';
import { useBoardStore } from './stores/board-store.js';

function RedirectToFirstBoard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'empty' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const createBoard = useBoardStore((s) => s.createBoard);

  useEffect(() => {
    setStatus('loading');
    api.boards
      .list()
      .then((boards) => {
        if (boards.length > 0) {
          navigate(`/boards/${boards[0]!.id}`, { replace: true });
        } else {
          setStatus('empty');
        }
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to connect to API');
        setStatus('error');
      });
  }, [navigate]);

  const handleCreateBoard = async () => {
    try {
      const board = await createBoard('Default Board');
      navigate(`/boards/${board.id}`, { replace: true });
    } catch {
      setErrorMsg('Failed to create board');
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <Blocks className="h-10 w-10 text-accent animate-pulse" />
        <Loader2 className="h-5 w-5 text-text-tertiary animate-spin" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <div className="rounded-full bg-status-error/10 p-4">
          <AlertCircle className="h-8 w-8 text-status-error" />
        </div>
        <h1 className="text-lg font-semibold text-text-primary">Connection Failed</h1>
        <p className="text-sm text-text-secondary max-w-sm text-center">{errorMsg}</p>
        <p className="text-xs text-text-tertiary">Make sure the API server is running on port 4000</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background gap-6">
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-2xl bg-accent/10 p-5">
          <Blocks className="h-10 w-10 text-accent" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Welcome to Command Center</h1>
        <p className="text-sm text-text-secondary max-w-md text-center">
          Your local-first orchestration layer for AI coding agents. Create a board to get started.
        </p>
      </div>
      <button
        onClick={handleCreateBoard}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Plus className="h-4 w-4" />
        Create Your First Board
      </button>
      <Link
        to="/settings"
        className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
      >
        Go to Settings
      </Link>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Toaster position="bottom-right" theme="dark" />
      <Routes>
        <Route path="/" element={<RedirectToFirstBoard />} />
        <Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
