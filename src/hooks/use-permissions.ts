import { useAuthStore } from '@/store';

export function usePermissions() {
  const role = useAuthStore((state) => state.user?.role);
  const isBoss = role === 'BOSS';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isReadOnly = isBoss;

  return {
    role,
    isBoss,
    isSuperAdmin,
    isAdmin,
    isReadOnly,
    canWrite: !isReadOnly,
    canDelete: !isReadOnly,
  };
}
