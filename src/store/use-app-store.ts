import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light';

interface AppState {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () =>
        set((state) => {
          const next = state.theme === 'dark' ? 'light' : 'dark';
          syncThemeClass(next);
          return { theme: next };
        }),
      setTheme: (theme) => {
        syncThemeClass(theme);
        set({ theme });
      },
    }),
    {
      name: 'app-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          syncThemeClass(state.theme);
        } else {
          syncThemeClass('dark');
        }
      },
    },
  ),
);

export function syncThemeClass(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
