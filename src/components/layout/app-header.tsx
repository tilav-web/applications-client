import { ChevronDown, LogOut, Moon, RefreshCw, Sun, User as UserIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
    <header className="h-16 px-4 sm:px-6 border-b border-border/80 bg-background/80 backdrop-blur-md flex items-center justify-between shrink-0 z-20 select-none">
      {/* Left: Page Title & Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground flex items-center gap-2">
            {currentItem?.title || 'Boshqaruv Paneli'}
          </h1>
          <span className="text-[11px] text-muted-foreground hidden sm:block">
            {currentItem?.description || 'Arizalar bazasi boshqaruv paneli'}
          </span>
        </div>
      </div>

      {/* Right: Theme Toggle & User Info Small Card */}
      <div className="flex items-center gap-3">
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
                    {user?.role || 'SUPER_ADMIN'}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px] hidden sm:inline">
                    {user?.profile?.phone_number || `@${user?.username}`}
                  </span>
                </div>
              </div>

              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors ml-1" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-semibold leading-none">{fullName}</p>
                <p className="text-[11px] leading-none text-muted-foreground font-mono">
                  username: @{user?.username}
                </p>
                {user?.profile?.phone_number && (
                  <p className="text-[10px] leading-none text-muted-foreground">
                    tel: {user.profile.phone_number}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <UserIcon className="h-4 w-4 mr-2 text-primary" />
              Mening profilim
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
              Chiqish (Logout)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
