import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, Copy, ExternalLink, Send, Unlink } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { type NotificationPrefs, notificationsApi } from '@/lib/api';
import { copyTextToClipboard } from '@/lib/clipboard';
import { getErrorMessage } from '@/lib/error';

const PREF_ITEMS: Array<{ key: keyof NotificationPrefs; label: string; desc: string }> = [
  {
    key: 'high_value',
    label: 'Yirik zararli arizalar',
    desc: 'Belgilangan limitdan yuqori zararli yangi arizalar',
  },
  {
    key: 'cross_case',
    label: 'Takroriy firibgar kartalari',
    desc: 'Bir xil karta 2+ arizada yoki boshqa tumanda chiqqanda',
  },
  {
    key: 'sla',
    label: 'Muddat nazorati (SLA)',
    desc: 'Ariza muddati tugashiga 1-2 kun qolganda yoki o‘tib ketganda',
  },
  {
    key: 'new_application',
    label: 'Yangi arizalar',
    desc: 'Biriktirilgan tumanga yangi ariza tushganda',
  },
  {
    key: 'status_changed',
    label: 'Holat o‘zgarishlari',
    desc: 'Ariza holati yangilanganda',
  },
  {
    key: 'daily_digest',
    label: 'Kunlik svodka',
    desc: 'Har kuni kechki qisqa statistik hisobot',
  },
];

export function TelegramProfileCard() {
  const queryClient = useQueryClient();
  const [deepLink, setDeepLink] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-notification-prefs'],
    queryFn: () => notificationsApi.getPreferences(),
    refetchInterval: deepLink ? 5000 : false,
  });

  const generateLinkMut = useMutation({
    mutationFn: () => notificationsApi.generateTelegramLink(),
    onSuccess: (res) => {
      if (!res.available || !res.deep_link) {
        toast.error(res.message || 'Telegram Bot hali faollashtirilmagan');
        return;
      }
      setDeepLink(res.deep_link);
      window.open(res.deep_link, '_blank', 'noopener,noreferrer');
      toast.success('Telegram havolasi ochildi — botda "Start" tugmasini bosing');
    },
    onError: (err) => {
      toast.error('Havola yaratishda xatolik', { description: getErrorMessage(err) });
    },
  });

  const unlinkMut = useMutation({
    mutationFn: () => notificationsApi.unlinkTelegram(),
    onSuccess: () => {
      setDeepLink(null);
      void queryClient.invalidateQueries({ queryKey: ['my-notification-prefs'] });
      toast.success('Telegram hisobi uzildi');
    },
    onError: (err) => {
      toast.error('Uzishda xatolik', { description: getErrorMessage(err) });
    },
  });

  const updatePrefsMut = useMutation({
    mutationFn: (patch: Partial<NotificationPrefs>) => notificationsApi.updatePreferences(patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-notification-prefs'] });
      toast.success('Sozlamalar saqlandi');
    },
    onError: (err) => {
      toast.error('Saqlashda xatolik', { description: getErrorMessage(err) });
    },
  });

  const testMut = useMutation({
    mutationFn: () => notificationsApi.sendTest(),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
      toast.success(
        res.sentToTelegram
          ? 'Sinov xabari tizimga va Telegramga yuborildi!'
          : 'Sinov xabari tizim ichida yuborildi',
      );
    },
    onError: (err) => {
      toast.error('Sinov xabari yuborilmadi', { description: getErrorMessage(err) });
    },
  });

  const prefs = data?.prefs;
  const isConnected = Boolean(data?.telegram_connected);

  useEffect(() => {
    if (isConnected && deepLink) {
      setDeepLink(null);
    }
  }, [isConnected, deepLink]);

  return (
    <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Bildirishnomalar & Telegram Bot</CardTitle>
              <CardDescription className="text-xs">
                Muhim ogohlantirishlarni tizim ichida va Telegram orqali real vaqtda qabul qiling
              </CardDescription>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => testMut.mutate()}
            loading={testMut.isPending}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <Bell className="h-3.5 w-3.5" />
            Sinov xabari
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-24 rounded-xl bg-muted/40 animate-pulse" />
        ) : (
          <>
            {/* Telegram connection status */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Telegram holati:</span>
                  {isConnected ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Ulangan
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Ulanmagan
                    </Badge>
                  )}
                </div>

                {isConnected ? (
                  <p className="text-xs text-muted-foreground">
                    Hisob:{' '}
                    <span className="font-mono font-semibold text-foreground">
                      {data?.telegram_username
                        ? `@${data.telegram_username}`
                        : data?.telegram_first_name || 'Telegram foydalanuvchi'}
                    </span>
                    {data?.bot_username && (
                      <>
                        {' '}
                        &bull; Bot: <span className="font-mono">@{data.bot_username}</span>
                      </>
                    )}
                  </p>
                ) : data?.bot_available ? (
                  <p className="text-xs text-muted-foreground">
                    Bot (<span className="font-mono font-medium">@{data.bot_username}</span>) faol.
                    Telegramingizni ulash uchun tugmani bosing va botda <b>Start</b> ni bosing.
                  </p>
                ) : (
                  <p className="text-xs text-amber-600">
                    Telegram Bot hali Super Admin tomonidan sozlanmagan. Hozircha bildirishnomalar
                    tizim ichida (🔔) ishlaydi.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isConnected ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => unlinkMut.mutate()}
                    loading={unlinkMut.isPending}
                    className="gap-1.5 text-xs text-destructive hover:text-destructive border-destructive/30 cursor-pointer"
                  >
                    <Unlink className="h-3.5 w-3.5" />
                    Telegramni uzish
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={!data?.bot_available}
                    onClick={() => generateLinkMut.mutate()}
                    loading={generateLinkMut.isPending}
                    className="gap-1.5 text-xs bg-sky-600 hover:bg-sky-700 text-white cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Telegramni ulash
                  </Button>
                )}
              </div>
            </div>

            {/* Deep link box if generated */}
            {deepLink && !isConnected && (
              <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-sky-700 dark:text-sky-400">
                    1 martalik bog‘lash havolasi (15 daqiqa amal qiladi):
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground truncate">{deepLink}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void copyTextToClipboard(deepLink).then((ok) => {
                        if (ok) toast.success('Havola nusxalandi');
                        else toast.error('Havolani nusxalab bo‘lmadi');
                      });
                    }}
                    className="h-8 gap-1 text-xs cursor-pointer"
                  >
                    <Copy className="h-3 w-3" />
                    Nusxa
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => window.open(deepLink, '_blank', 'noopener,noreferrer')}
                    className="h-8 gap-1 text-xs bg-sky-600 hover:bg-sky-700 text-white cursor-pointer"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ochish
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void refetch()}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Tekshirish
                  </Button>
                </div>
              </div>
            )}

            {/* Preferences checkboxes */}
            {prefs && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Telegramga yuboriladigan xabar turlari
                  </span>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.telegram_enabled}
                      onChange={(e) =>
                        updatePrefsMut.mutate({ telegram_enabled: e.target.checked })
                      }
                      className="rounded border-input accent-primary h-4 w-4"
                    />
                    Telegram xabarlarini yoqish
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PREF_ITEMS.map((item) => (
                    <label
                      key={item.key}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border border-border/70 bg-background/60 transition-colors cursor-pointer ${
                        !prefs.telegram_enabled ? 'opacity-50' : 'hover:border-primary/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={!prefs.telegram_enabled || updatePrefsMut.isPending}
                        checked={Boolean(prefs[item.key])}
                        onChange={(e) => updatePrefsMut.mutate({ [item.key]: e.target.checked })}
                        className="mt-0.5 rounded border-input accent-primary h-4 w-4"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-foreground">{item.label}</div>
                        <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
