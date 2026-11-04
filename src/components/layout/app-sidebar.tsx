import { ChevronRight, LogOut, Palette } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { navigationConfig } from '@/config/navigation';
import { useAuthStore } from '@/store';
import type { NavItem } from '@/types/navigation';

export function AppSidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Filter navigation items dynamically based on the authenticated user's role
  const userRole = user?.role || 'SUPER_ADMIN';
  const allowedItems = navigationConfig.filter(
    (item) => item.allowedRoles.includes('*') || item.allowedRoles.includes(userRole),
  );

  const mainItems = allowedItems.filter((i) => i.category === 'main');
  const operationItems = allowedItems.filter((i) => i.category === 'operations');
  const systemItems = allowedItems.filter(
    (i) => i.category === 'management' || i.category === 'system',
  );

  const renderNavGroup = (title: string, items: NavItem[]) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-1">
        <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </div>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-primary-foreground' : 'text-primary'
                      }`}
                    />
                    <span className="truncate">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge && (
                      <Badge
                        variant="secondary"
                        className={`text-[9px] px-1.5 py-0 ${
                          isActive
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {item.badge}
                      </Badge>
                    )}
                    <ChevronRight
                      className={`h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ${
                        isActive ? 'opacity-100 text-primary-foreground' : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    );
  };

  return (
    <aside className="w-64 lg:w-72 border-r border-border/80 bg-card/60 backdrop-blur-md flex flex-col h-full shrink-0 select-none">
      {/* 1. TOP HEADER (Fixed, Outside Scroll) */}
      <div className="h-16 px-5 border-b border-border/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
            <Palette className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-foreground flex items-center gap-1.5">
              Arizalar bazasi
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              Yagona Axborot Tizimi
            </span>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION AREA (Scrollable independently, overflow-y-auto) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {renderNavGroup("Asosiy Bo'limlar", mainItems)}
        {renderNavGroup('Operativ & Hududiy', operationItems)}
        {renderNavGroup('Boshqaruv & Tizim', systemItems)}
      </div>

      {/* 3. BOTTOM FOOTER WITH LOGOUT BUTTON (Fixed, completely outside scroll!) */}
      <div className="p-3 border-t border-border/60 bg-card/90 shrink-0 space-y-2">
        <div className="flex items-center justify-between px-1 text-xs">
          <span className="text-muted-foreground text-[11px]">Foydalanuvchi:</span>
          <span className="font-mono font-bold text-primary text-[11px]">@{user?.username}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-center gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 h-9 text-xs transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Tizimdan chiqish (Logout)</span>
        </Button>
      </div>
    </aside>
  );
}
