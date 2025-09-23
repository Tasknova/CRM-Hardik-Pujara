import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ProjectTasksPage from './components/dashboard/ProjectTasksPage';
import { Toaster } from 'sonner';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster position="bottom-right" richColors closeButton duration={4500} />
  </StrictMode>
);
