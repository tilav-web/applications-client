import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { applicationsApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import type { Application, ApplicationRowColor, PaginatedResponse } from '@/types/models';

interface RowColorUpdatedItem {
  id: string;
  row_color: ApplicationRowColor | null;
  row_color_by: string | null;
  row_color_updated_at: string | null;
}

interface RowColorUpdatedEventPayload {
  type: 'row_color_updated';
  items: RowColorUpdatedItem[];
  actor_auth_id: string | null;
  actor_name: string | null;
}

interface PresenceEventPayload {
  type: 'presence';
  online_users: number;
}

interface UseApplicationsRealtimeOptions {
  activeRowColorFilter?: string;
}

/**
 * Arizalar ro'yxati uchun real-vaqt SSE ulanishi.
 * Boshqa hodim qator rangini o'zgartirganda React Query keshini joyida
 * (qayta yuklamasdan va skrollni yo'qotmasdan) bir zumda yangilaydi.
 */
export function useApplicationsRealtime(options?: UseApplicationsRealtimeOptions) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const activeFilter = options?.activeRowColorFilter || '';

  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(1);
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState<Set<string>>(() => new Set());

  const activeFilterRef = useRef(activeFilter);
  const currentUserIdRef = useRef(currentUserId);
  const hadDisconnectRef = useRef(false);
  const flashTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    activeFilterRef.current = activeFilter;
  }, [activeFilter]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const url = applicationsApi.getEventsStreamUrl();
    const es = new EventSource(url, { withCredentials: true });
    const timersMap = flashTimersRef.current;

    const handleOpen = () => {
      setConnected(true);
      if (hadDisconnectRef.current) {
        hadDisconnectRef.current = false;
        void queryClient.invalidateQueries({ queryKey: ['applications'] });
      }
    };

    const handleError = () => {
      setConnected(false);
      hadDisconnectRef.current = true;
    };

    const handlePresence = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as PresenceEventPayload;
        if (typeof data.online_users === 'number' && data.online_users >= 0) {
          setOnlineUsers(data.online_users);
        }
      } catch {
        // ignore malformed presence frame
      }
    };

    const handleRowColorUpdated = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as RowColorUpdatedEventPayload;
        if (!Array.isArray(payload.items) || payload.items.length === 0) return;

        const updateMap = new Map<string, RowColorUpdatedItem>();
        for (const item of payload.items) {
          updateMap.set(item.id, item);
        }

        // Barcha keshlangan ['applications', ...] sahifalarini joyida yangilaymiz
        queryClient.setQueriesData<PaginatedResponse<Application>>(
          { queryKey: ['applications'] },
          (old) => {
            if (!old || !Array.isArray(old.items)) return old;
            let touched = false;
            const nextItems = old.items.map((app) => {
              const patch = updateMap.get(app.id);
              if (!patch) return app;
              touched = true;
              return {
                ...app,
                row_color: patch.row_color,
                row_color_by: patch.row_color_by,
                row_color_updated_at: patch.row_color_updated_at,
              };
            });
            return touched ? { ...old, items: nextItems } : old;
          },
        );

        // Yakka ariza keshini ham (agar ochilgan bo'lsa) sinxronlaymiz
        for (const item of payload.items) {
          queryClient.setQueryData<Application>(['application', item.id], (old) =>
            old
              ? {
                  ...old,
                  row_color: item.row_color,
                  row_color_by: item.row_color_by,
                  row_color_updated_at: item.row_color_updated_at,
                }
              : old,
          );
        }

        // Agar foydalanuvchi aynan rang filtri bilan ko'rayotgan bo'lsa ro'yxatni ham yangilab qo'yamiz
        if (activeFilterRef.current) {
          void queryClient.invalidateQueries({ queryKey: ['applications'] });
        }

        // Agar o'zgarishni boshqa hodim qilgan bo'lsa, qatorda qisqa jonli ishora ko'rsatamiz
        const isRemoteChange =
          !currentUserIdRef.current || payload.actor_auth_id !== currentUserIdRef.current;

        if (isRemoteChange) {
          const updatedIds = payload.items.map((i) => i.id);
          setRecentlyUpdatedIds((prev) => {
            const next = new Set(prev);
            for (const id of updatedIds) next.add(id);
            return next;
          });

          for (const id of updatedIds) {
            const prevTimer = timersMap.get(id);
            if (prevTimer) window.clearTimeout(prevTimer);
            const timer = window.setTimeout(() => {
              timersMap.delete(id);
              setRecentlyUpdatedIds((prev) => {
                if (!prev.has(id)) return prev;
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
            }, 1800);
            timersMap.set(id, timer);
          }
        }
      } catch {
        // ignore malformed row_color_updated frame
      }
    };

    es.addEventListener('open', handleOpen);
    es.addEventListener('error', handleError);
    es.addEventListener('presence', handlePresence as EventListener);
    es.addEventListener('row_color_updated', handleRowColorUpdated as EventListener);

    return () => {
      es.removeEventListener('open', handleOpen);
      es.removeEventListener('error', handleError);
      es.removeEventListener('presence', handlePresence as EventListener);
      es.removeEventListener('row_color_updated', handleRowColorUpdated as EventListener);
      es.close();
      setConnected(false);
      for (const timer of timersMap.values()) {
        window.clearTimeout(timer);
      }
      timersMap.clear();
    };
  }, [isAuthenticated, queryClient]);

  return {
    isConnected: isAuthenticated && connected,
    onlineUsers,
    recentlyUpdatedIds,
  };
}
