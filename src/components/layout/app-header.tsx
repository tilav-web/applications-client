import { ChevronDown, LogOut, Moon, RefreshCw, Search, Sun, User as UserIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { openGlobalSearchModal } from '@/components/intelligence/global-search-modal';
import { NotificationBell } from '@/components/layout/notification-bell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { navigationConfig } from '@/config/navigation';
import { useAppStore, useAuthStore } from '@/store';

export function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useAppStore();
  const { user, logout, fetchProfile, isLoading } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const currentItem = navigationConfig.find((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path),
  );

  const fullName =
    user?.profile?.first_name || user?.profile?.last_name
      ? `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim()
      : user?.username || 'Admin';

  const userInitial = fullName.charAt(0).toUpperCase();

  return (
    <header className="h-16 px-3 sm:px-6 border-b border-border/80 bg-background/80 backdrop-blur-md flex items-center justify-between gap-2 shrink-0 z-20 select-none overflow-hidden">
      {/* Left: Page Title & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex flex-col min-w-0">
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground truncate">
            {currentItem?.title || 'Boshqaruv Paneli'}
          </h1>
          <span className="text-[11px] text-muted-foreground hidden md:block truncate">
            {currentItem?.description || 'Arizalar bazasi boshqaruv paneli'}
          </span>
        </div>
      </div>

      {/* Right: Global Search (Ctrl+K), Theme Toggle & User Info Small Card */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Global Search Trigger (Ctrl + K) */}
        <button
          type="button"
          onClick={() => openGlobalSearchModal()}
          className="flex items-center justify-center sm:justify-between gap-2.5 h-9 w-9 sm:w-auto sm:px-3 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/80 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer md:w-[240px] lg:w-[290px] shadow-2xs shrink-0"
          title="Tizim bo'yicha 360° qidiruv (Ctrl + K)"
        >
          <span className="flex items-center gap-2 text-xs min-w-0">
            <Search className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="hidden md:inline truncate">
              Karta, telefon, F.I.O, @nik qidiruv...
            </span>
            <span className="hidden sm:inline md:hidden">Qidiruv...</span>
          </span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground shrink-0">
            Ctrl K
          </kbd>
        </button>

        {/* Notifications Bell */}
        <NotificationBell />

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/10 h-9 w-9"
          title={theme === 'dark' ? "Yorug' rejim" : 'Tungi rejim'}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-300" />
          ) : (
            <Moon className="h-4 w-4 text-primary" />
          )}
        </Button>

        {/* User Info Small Card */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl border border-primary/25 bg-card hover:bg-muted/60 hover:border-primary/50 transition-all text-left shadow-sm group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {/* User Avatar */}
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-sm shadow-primary/30 group-hover:scale-105 transition-transform">
                {userInitial}
              </div>

              {/* Text Info */}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold leading-tight text-foreground truncate max-w-[120px] sm:max-w-[160px]">
                  {fullName}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge className="text-[9px] px-1 py-0 bg-primary/20 text-primary border-0 font-mono">
                    {user?.role || '—'}
                  </Badge>
                  {user?.is_root && (
                    <Badge className="text-[9px] px-1 py-0 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0 font-mono">
                      ROOT
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px] hidden sm:inline">
                    {user?.profile?.phone_number || `@${user?.username}`}
                  </span>
                </div>
              </div>

              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors ml-1" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <UserIcon className="h-4 w-4 mr-2 text-primary" />
              Sozlamalar
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => fetchProfile()} disabled={isLoading}>
              <RefreshCw
                className={`h-4 w-4 mr-2 text-primary ${isLoading ? 'animate-spin' : ''}`}
              />
              Profilni yangilash
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Chiqish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
