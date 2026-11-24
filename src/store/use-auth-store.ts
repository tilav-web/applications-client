import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  apiClient,
  setAuthClearCallback,
  setInMemoryAccessToken,
  setTokenUpdateCallback,
} from '@/lib/axios';
import { queryClient } from '@/lib/query-client';
import type { AuthUser } from '@/types/auth';

function clearClientSessionCaches() {
  setInMemoryAccessToken(null);
  try {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('global_recent_searches_v1');
  } catch {
    // ignore storage errors
  }
  queryClient.clear();
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  fetchProfile: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (token: string, user: AuthUser) => {
        setInMemoryAccessToken(token);
        localStorage.removeItem('auth_token');
        set({
          token,
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      setUser: (user: AuthUser) => {
        set({ user });
      },

      fetchProfile: async () => {
        try {
          set({ isLoading: true });
          const { data } = await apiClient.get<AuthUser>('/auth/me');
          set({
            user: data,
            isAuthenticated: true,
            isLoading: false,
          });
          return data;
        } catch {
          clearClientSessionCaches();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return null;
        }
      },

      logout: async () => {
        try {
          await apiClient.post('/auth/logout', {});
        } catch {
          // Ignore network errors on logout
        } finally {
          clearClientSessionCaches();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      // Xavfsizlik: JWT token localStorage da saqlanmaydi (faqat HttpOnly cookie + in-memory)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// Axios interceptorlaridan keladigan yangilanishlarni Zustand holatiga sinxronlash
setAuthClearCallback(() => {
  clearClientSessionCaches();
  useAuthStore.setState({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
  });
});

setTokenUpdateCallback((newToken: string) => {
  setInMemoryAccessToken(newToken);
  useAuthStore.setState({
    token: newToken,
  });
});
