import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { BoardPage } from './routes/board';
import { SettingsPage } from './routes/settings';
import { api } from './lib/api-client.js';

function RedirectToFirstBoard() {
  const navigate = useNavigate();

  useEffect(() => {
    api.boards.list().then((boards) => {
      if (boards.length > 0) {
        navigate(`/boards/${boards[0]!.id}`, { replace: true });
      } else {
        navigate('/settings', { replace: true });
      }
    });
  }, [navigate]);

  return null;
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
