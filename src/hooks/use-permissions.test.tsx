import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore } from '@/store';
import type { AuthUser } from '@/types/auth';

import { usePermissions } from './use-permissions';

// Enable React 19 act() environment in Vitest/jsdom
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderPermissionsForUser(user: Partial<AuthUser> | null) {
  useAuthStore.setState({
    user: user as AuthUser | null,
    isAuthenticated: Boolean(user),
    token: null,
    isLoading: false,
  });

  let captured: ReturnType<typeof usePermissions> | null = null;
  function Probe() {
    captured = usePermissions();
    return null;
  }

  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => {
    root.render(<Probe />);
  });
  act(() => {
    root.unmount();
  });

  return captured!;
}

describe('usePermissions (fail-closed RBAC)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false, token: null, isLoading: false });
  });

  it('fails closed (read-only) when unauthenticated or when role is BOSS or USER', () => {
    expect(renderPermissionsForUser(null)).toMatchObject({
      canWrite: false,
      canDelete: false,
      isReadOnly: true,
      isBoss: false,
      isAdmin: false,
      isRootSuperAdmin: false,
    });

    expect(renderPermissionsForUser({ role: 'BOSS' })).toMatchObject({
      isBoss: true,
      canWrite: false,
      canDelete: false,
      isReadOnly: true,
      isAdmin: false,
    });

    expect(renderPermissionsForUser({ role: 'USER' })).toMatchObject({
      canWrite: false,
      canDelete: false,
      isReadOnly: true,
    });
  });

  it('distinguishes root SUPER_ADMIN from non-root SUPER_ADMIN, ADMIN, and DISTRICT_OFFICER', () => {
    expect(renderPermissionsForUser({ role: 'SUPER_ADMIN', is_root: true })).toMatchObject({
      isSuperAdmin: true,
      isRootSuperAdmin: true,
      isAdmin: true,
      canWrite: true,
      canDelete: true,
      isReadOnly: false,
    });

    expect(renderPermissionsForUser({ role: 'SUPER_ADMIN', is_root: false })).toMatchObject({
      isSuperAdmin: true,
      isRootSuperAdmin: false,
      isAdmin: true,
      canWrite: true,
    });

    expect(renderPermissionsForUser({ role: 'DISTRICT_OFFICER', is_root: false })).toMatchObject({
      isSuperAdmin: false,
      isRootSuperAdmin: false,
      isAdmin: false,
      canWrite: true,
      isReadOnly: false,
    });
  });
});
