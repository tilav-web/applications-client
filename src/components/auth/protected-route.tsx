import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useAuthStore } from '@/store';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !hasFetched.current) {
      hasFetched.current = true;
      fetchProfile();
    }
  }, [isAuthenticated, fetchProfile]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

interface RoleRouteProps {
  allowedRoles?: string[];
  disallowedRoles?: string[];
  requiresRoot?: boolean;
  children: ReactNode;
}

export function RoleRoute({
  allowedRoles,
  disallowedRoles,
  requiresRoot,
  children,
}: RoleRouteProps) {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const role = user?.role;

  // Fail-closed: profil hali yuklanmagan bo'lsa ruxsat bermaymiz
  if (!role) {
    if (isLoading) return null;
    return <Navigate to="/" replace />;
  }

  if (disallowedRoles && disallowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  if (allowedRoles && !allowedRoles.includes('*') && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  if (requiresRoot && !(role === 'SUPER_ADMIN' && user?.is_root === true)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
