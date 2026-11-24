import { useAuthStore } from '@/store';

export function usePermissions() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role;
  const isBoss = role === 'BOSS';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isRootSuperAdmin = role === 'SUPER_ADMIN' && Boolean(user?.is_root);
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isReadOnly = isBoss;

  return {
    role,
    isBoss,
    isSuperAdmin,
    isRootSuperAdmin,
    isAdmin,
    isReadOnly,
    canWrite: !isReadOnly,
    canDelete: !isReadOnly,
  };
}
