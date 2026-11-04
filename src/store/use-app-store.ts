import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light';

interface AppState {
  theme: ThemeMode;
  count: number;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  increment: () => void;
  decrement: () => void;
  resetCount: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      count: 0,
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
      increment: () => set((state) => ({ count: state.count + 1 })),
      decrement: () => set((state) => ({ count: Math.max(0, state.count - 1) })),
      resetCount: () => set({ count: 0 }),
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
