import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { apiClient, setAuthClearCallback, setTokenUpdateCallback } from '@/lib/axios';
import type { AuthUser } from '@/types/auth';

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
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (token: string, user: AuthUser) => {
        localStorage.setItem('auth_token', token);
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
        const token = get().token || localStorage.getItem('auth_token');
        if (!token) {
          localStorage.removeItem('auth_token');
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          return null;
        }

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
          localStorage.removeItem('auth_token');
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
          localStorage.removeItem('auth_token');
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
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// Axios interceptorlaridan keladigan yangilanishlarni Zustand holatiga sinxronlash
setAuthClearCallback(() => {
  useAuthStore.setState({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
  });
});

setTokenUpdateCallback((newToken: string) => {
  useAuthStore.setState({
    token: newToken,
  });
});
