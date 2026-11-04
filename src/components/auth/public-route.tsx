import { Navigate, Outlet } from 'react-router-dom';

import { useAuthStore } from '@/store';

export function PublicRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);

  if (isAuthenticated && token) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
