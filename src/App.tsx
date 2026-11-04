import { RouterProvider } from 'react-router-dom';

import { Toaster } from '@/components/ui/sonner';
import { QueryProvider } from '@/providers/query-provider';
import { router } from '@/router';

export function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors closeButton />
    </QueryProvider>
  );
}

export default App;
