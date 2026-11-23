import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { tryReloadOnceOnChunkError } from '@/components/ui/route-error-boundary';

import { App } from './App';

// Yangi deploydan keyin eski JS chunk 404 bersa, avtomatik 1 marta sahifani yangilash
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  tryReloadOnceOnChunkError();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
