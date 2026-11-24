import { useAuthStore } from '@/store';

export function usePermissions() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role;
  const isBoss = role === 'BOSS';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isRootSuperAdmin = role === 'SUPER_ADMIN' && user?.is_root === true;
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  // Fail-closed: rol noma'lum, BOSS yoki USER bo'lsa faqat o'qish rejimi
  const canWrite = Boolean(role) && !isBoss && role !== 'USER';
  const isReadOnly = !canWrite;

  return {
    role,
    isBoss,
    isSuperAdmin,
    isRootSuperAdmin,
    isAdmin,
    isReadOnly,
    canWrite,
    canDelete: canWrite,
  };
}
