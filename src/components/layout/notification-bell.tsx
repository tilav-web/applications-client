import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Send, Settings } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type NotificationItem, notificationsApi } from '@/lib/api';

function formatRelativeTime(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return 'Hozirgina';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} daqiqa oldin`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} soat oldin`;
  return new Date(iso).toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['my-notifications'],
    queryFn: () => notificationsApi.getMine({ limit: 15 }),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
    },
  });

  const markAllReadMut = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
    },
  });

  const items = data?.items || [];
  const unreadCount = data?.unreadCount || 0;

  const handleItemClick = (item: NotificationItem) => {
    if (!item.is_read) {
      markReadMut.mutate(item.id);
    }
    setOpen(false);
    if (item.link_url) {
      navigate(item.link_url);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/10 h-9 w-9 cursor-pointer"
          title="Bildirishnomalar"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[360px] sm:w-[400px] p-0 overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Bildirishnomalar</span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-600">
                {unreadCount} ta yangi
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllReadMut.mutate()}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Barchasini o‘qish</span>
            </button>
          )}
        </div>

        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60">
          {items.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-1">
              <Bell className="h-7 w-7 text-muted-foreground/40 mx-auto" />
              <p className="text-xs font-medium text-muted-foreground">
                Hozircha bildirishnomalar yo‘q
              </p>
            </div>
          ) : (
            items.map((item) => {
              const dotClass =
                item.priority === 'CRITICAL'
                  ? 'bg-red-500'
                  : item.priority === 'WARNING'
                    ? 'bg-amber-500'
                    : 'bg-blue-500';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left px-3.5 py-2.5 transition-colors hover:bg-muted/60 cursor-pointer flex items-start gap-2.5 ${
                    !item.is_read ? 'bg-primary/[0.04]' : ''
                  }`}
                >
                  <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${dotClass}`} />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs truncate ${
                          !item.is_read
                            ? 'font-bold text-foreground'
                            : 'font-medium text-muted-foreground'
                        }`}
                      >
                        {item.title}
                      </span>
                      {item.sent_to_telegram && (
                        <span
                          className="text-[10px] text-sky-500 shrink-0 inline-flex items-center gap-0.5"
                          title="Telegramga ham yuborilgan"
                        >
                          <Send className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground whitespace-pre-line line-clamp-2">
                      {item.message}
                    </p>
                    <span className="text-[10px] text-muted-foreground/70 block">
                      {formatRelativeTime(item.created_at)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-border bg-muted/20 px-3.5 py-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/profile?tab=notifications');
            }}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Telegram va bildirishnoma sozlamalari</span>
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
