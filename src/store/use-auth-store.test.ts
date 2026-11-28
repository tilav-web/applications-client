import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient, getInMemoryAccessToken } from '@/lib/axios';
import { queryClient } from '@/lib/query-client';
import type { AuthUser } from '@/types/auth';

import { useAuthStore } from './use-auth-store';

function makeAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'auth-1',
    username: 'officer1',
    role: 'DISTRICT_OFFICER',
    is_root: false,
    first_name: 'Ali',
    last_name: 'Valiyev',
    phone_number: '+998901234567',
    assigned_districts: [],
    ...overrides,
  } as AuthUser;
}

describe('useAuthStore & token XSS isolation', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores JWT ONLY in memory and NEVER persists access token in localStorage', () => {
    localStorage.setItem('auth_token', 'legacy-leaked-token');
    const user = makeAuthUser({ role: 'SUPER_ADMIN', is_root: true });

    useAuthStore.getState().setAuth('secret-jwt-access-token', user);

    expect(getInMemoryAccessToken()).toBe('secret-jwt-access-token');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(localStorage.getItem('auth_token')).toBeNull();

    // Persisted zustand storage must NOT contain the JWT token!
    const persistedRaw = localStorage.getItem('auth-storage') || '';
    expect(persistedRaw).not.toContain('secret-jwt-access-token');
    expect(persistedRaw).toContain('officer1');
  });

  it('clears in-memory token, localStorage caches, and React Query cache when fetchProfile fails', async () => {
    useAuthStore.getState().setAuth('active-token', makeAuthUser());
    localStorage.setItem('global_recent_searches_v1', '["8600"]');
    const clearSpy = vi.spyOn(queryClient, 'clear');
    vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('401 Unauthorized'));

    const result = await useAuthStore.getState().fetchProfile();

    expect(result).toBeNull();
    expect(getInMemoryAccessToken()).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem('global_recent_searches_v1')).toBeNull();
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('clears all client session state on logout even when server logout request fails', async () => {
    useAuthStore.getState().setAuth('active-token', makeAuthUser());
    localStorage.setItem('global_recent_searches_v1', '["9860"]');
    const clearSpy = vi.spyOn(queryClient, 'clear');
    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Network offline'));

    await useAuthStore.getState().logout();

    expect(getInMemoryAccessToken()).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem('global_recent_searches_v1')).toBeNull();
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });
});
