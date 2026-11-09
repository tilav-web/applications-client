import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { cn } from '@/lib/utils';
import { syncThemeClass, useAppStore } from '@/store';

export function AppLayout() {
  const theme = useAppStore((state) => state.theme);
  const location = useLocation();
  const isFinancialFlow = location.pathname.startsWith('/financial-flow');

  useEffect(() => {
    syncThemeClass(theme);
    // Prevent any window-level scroll; all scrolling happens inside sidebar-nav and main
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [theme]);

  return (
    <div className="h-screen w-screen max-h-screen max-w-full overflow-hidden flex flex-row bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* 1. SIDEBAR (Fixed window, scrollable nav list, fixed bottom logout) */}
      <AppSidebar />

      {/* 2. RIGHT CONTAINER (Header + Main) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* HEADER (Fixed height, right-side user info card) */}
        <AppHeader />

        {/* 3. MAIN: FULL WIDTH OCCUPATION (Financial Flow bo'lsa scroll yo'q, 100% to'la kadr) */}
        <main
          className={cn(
            'flex-1 min-w-0 w-full',
            isFinancialFlow
              ? 'overflow-hidden p-1.5 sm:p-2 flex flex-col min-h-0'
              : 'overflow-y-auto p-3 sm:p-4 lg:p-5',
          )}
        >
          <div className={cn('w-full', isFinancialFlow ? 'h-full flex-1 flex flex-col min-h-0' : '')}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
