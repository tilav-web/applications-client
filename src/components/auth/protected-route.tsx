import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useAuthStore } from '@/store';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (isAuthenticated && token && !hasFetched.current) {
      hasFetched.current = true;
      fetchProfile();
    }
  }, [isAuthenticated, token, fetchProfile]);

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

interface RoleRouteProps {
  allowedRoles?: string[];
  disallowedRoles?: string[];
  children: ReactNode;
}

export function RoleRoute({ allowedRoles, disallowedRoles, children }: RoleRouteProps) {
  const role = useAuthStore((state) => state.user?.role);

  if (role) {
    if (disallowedRoles && disallowedRoles.includes(role)) {
      return <Navigate to="/" replace />;
    }
    if (allowedRoles && !allowedRoles.includes('*') && !allowedRoles.includes(role)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
