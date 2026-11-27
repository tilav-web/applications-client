import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { GlobalSearchModal } from '@/components/intelligence/global-search-modal';
import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { DashboardSkeleton, PageSkeleton } from '@/components/ui/page-skeletons';
import { cn } from '@/lib/utils';
import { syncThemeClass, useAppStore } from '@/store';

export function AppLayout() {
  const theme = useAppStore((state) => state.theme);
  const location = useLocation();
  const isDashboard = location.pathname === '/';
  const isFinancialFlow = location.pathname.startsWith('/financial-flow');
  const isReferences = location.pathname.startsWith('/references');
  const isSplitViewport = isFinancialFlow || isReferences;
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const isGlobalBusy = isFetching > 0 || isMutating > 0;
  const dashboardStatsPanelPref = (() => {
    if (typeof window === 'undefined') return false;
    try {
      const raw = window.localStorage.getItem('uvd_dashboard_stats_panel_open');
      return raw === '1' || raw === 'true';
    } catch {
      return false;
    }
  })();

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
      <GlobalSearchModal />

      {/* 2. RIGHT CONTAINER (Header + Main) */}
      <div className="relative flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Global Top Progress Bar (har qanday backend so'rovi ketayotganda ko'rinadi) */}
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden transition-opacity duration-200',
            isGlobalBusy ? 'opacity-100' : 'opacity-0',
          )}
        >
          <div className="h-full w-full bg-primary/20">
            <div className="h-full w-1/3 bg-primary animate-[loading-bar_1.1s_ease-in-out_infinite]" />
          </div>
        </div>

        {/* HEADER (Fixed height, right-side user info card) */}
        <AppHeader />

        {/* 3. MAIN: FULL WIDTH OCCUPATION (Financial Flow / References bo'lsa ichki mustaqil scroll) */}
        <main
          className={cn(
            'flex-1 min-w-0 w-full',
            isFinancialFlow
              ? 'overflow-hidden p-1.5 sm:p-2 flex flex-col min-h-0'
              : isReferences
                ? 'overflow-hidden p-0 flex flex-col min-h-0'
                : 'overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-5',
          )}
        >
          <div
            className={cn(
              'w-full min-w-0',
              isSplitViewport ? 'h-full flex-1 flex flex-col min-h-0' : '',
            )}
          >
            <Suspense
              fallback={
                isDashboard ? (
                  <DashboardSkeleton includeToolbar showStatsPanel={dashboardStatsPanelPref} />
                ) : (
                  <PageSkeleton />
                )
              }
            >
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
