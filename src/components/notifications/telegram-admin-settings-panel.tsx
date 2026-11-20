import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Bot,
  CheckCircle2,
  Power,
  Save,
  Send,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { notificationsApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';

export function TelegramAdminSettingsPanel() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notification-admin-settings'],
    queryFn: () => notificationsApi.getAdminSettings(),
  });

  const [botToken, setBotToken] = useState('');
  const [highValueThreshold, setHighValueThreshold] = useState(50000000);
  const [slaDays, setSlaDays] = useState(10);
  const [dailyDigestEnabled, setDailyDigestEnabled] = useState(true);
  const [dailyDigestHour, setDailyDigestHour] = useState(18);

  useEffect(() => {
    if (data?.rules) {
      setHighValueThreshold(data.rules.high_value_threshold);
      setSlaDays(data.rules.sla_days);
      setDailyDigestEnabled(data.rules.daily_digest_enabled);
      setDailyDigestHour(data.rules.daily_digest_hour);
    }
  }, [data]);

  const configureBotMut = useMutation({
    mutationFn: () => notificationsApi.configureTelegramBot({ token: botToken, enabled: true }),
    onSuccess: (bot) => {
      setBotToken('');
      void queryClient.invalidateQueries({ queryKey: ['notification-admin-settings'] });
      void queryClient.invalidateQueries({ queryKey: ['my-notification-prefs'] });
      toast.success(
        `Telegram Bot muvaffaqiyatli ulandi: @${bot.bot_username || bot.bot_name || 'Bot'}`,
      );
    },
    onError: (err) => {
      toast.error('Telegram Botni ulashda xatolik', { description: getErrorMessage(err) });
    },
  });

  const toggleBotMut = useMutation({
    mutationFn: (enabled: boolean) => notificationsApi.toggleTelegramBot(enabled),
    onSuccess: (bot) => {
      void queryClient.invalidateQueries({ queryKey: ['notification-admin-settings'] });
      void queryClient.invalidateQueries({ queryKey: ['my-notification-prefs'] });
      toast.success(bot.enabled ? 'Telegram Bot faollashtirildi' : 'Telegram Bot to‘xtatildi');
    },
    onError: (err) => {
      toast.error('Holatni o‘zgartirishda xatolik', { description: getErrorMessage(err) });
    },
  });

  const removeBotMut = useMutation({
    mutationFn: () => notificationsApi.removeTelegramBot(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-admin-settings'] });
      void queryClient.invalidateQueries({ queryKey: ['my-notification-prefs'] });
      toast.success('Telegram Bot sozlamalari o‘chirildi');
    },
    onError: (err) => {
      toast.error('O‘chirishda xatolik', { description: getErrorMessage(err) });
    },
  });

  const saveRulesMut = useMutation({
    mutationFn: () =>
      notificationsApi.updateAdminRules({
        high_value_threshold: Number(highValueThreshold) || 0,
        sla_days: Number(slaDays) || 10,
        daily_digest_enabled: dailyDigestEnabled,
        daily_digest_hour: Number(dailyDigestHour) || 18,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-admin-settings'] });
      toast.success('Bildirishnoma qoidalari saqlandi');
    },
    onError: (err) => {
      toast.error('Saqlashda xatolik', { description: getErrorMessage(err) });
    },
  });

  const sendDigestNowMut = useMutation({
    mutationFn: () => notificationsApi.sendDigestNow(),
    onSuccess: (res) => {
      toast.success(`Kunlik svodka ${res.sentCount} ta rahbar/adminga yuborildi`);
    },
    onError: (err) => {
      toast.error('Svodka yuborishda xatolik', { description: getErrorMessage(err) });
    },
  });

  const bot = data?.bot;

  return (
    <div className="space-y-5">
      {/* 1. Telegram Bot Sozlamalari */}
      <Card className="border-border/80 bg-card/70">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Telegram Bot Integratsiyasi</CardTitle>
                <CardDescription className="text-xs">
                  @BotFather dan olingan tokenni kiriting — tizim bot nomi, username va ID sini o‘zi
                  aniqlab bazaga saqlaydi va avtomatik ishga tushiradi
                </CardDescription>
              </div>
            </div>

            {bot?.is_configured && (
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    bot.enabled
                      ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1'
                      : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                  }
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {bot.enabled ? 'Faol (Polling ishlamoqda)' : 'To‘xtatilgan'}
                </Badge>
                <Badge variant="outline" className="gap-1 text-xs">
                  <Users className="h-3 w-3 text-primary" />
                  {data?.linkedUsersCount || 0} ta xodim ulangan
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="h-28 rounded-xl bg-muted/40 animate-pulse" />
          ) : (
            <>
              {/* Joriy ulangan bot kartasi */}
              {bot?.is_configured && (
                <div className="p-4 rounded-xl border border-sky-500/25 bg-sky-500/[0.04] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">
                        {bot.bot_name || 'Telegram Bot'}
                      </span>
                      {bot.bot_username && (
                        <a
                          href={`https://t.me/${bot.bot_username}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs font-semibold text-sky-600 hover:underline"
                        >
                          @{bot.bot_username}
                        </a>
                      )}
                      {bot.bot_id && (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          ID: {bot.bot_id}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Token: <span className="font-mono">{bot.token_masked}</span> &bull; Xodimlar{' '}
                      <b>Mening Profilim</b> sahifasidan 1 bosishda ulanishlari mumkin.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleBotMut.mutate(!bot.enabled)}
                      loading={toggleBotMut.isPending}
                      className="gap-1.5 text-xs cursor-pointer"
                    >
                      <Power className="h-3.5 w-3.5" />
                      {bot.enabled ? 'To‘xtatish' : 'Yoqish'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeBotMut.mutate()}
                      loading={removeBotMut.isPending}
                      className="gap-1.5 text-xs text-destructive hover:text-destructive border-destructive/30 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      O‘chirish
                    </Button>
                  </div>
                </div>
              )}

              {/* Token kiritish / yangilash */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-end">
                <div className="flex-1 w-full space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {bot?.is_configured
                      ? 'Bot tokenini almashtirish (ixtiyoriy)'
                      : 'Telegram Bot API Token *'}
                  </label>
                  <Input
                    type="password"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="1234567890:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="h-10 font-mono text-xs"
                    disabled={configureBotMut.isPending}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => configureBotMut.mutate()}
                  loading={configureBotMut.isPending}
                  disabled={!botToken.trim() || configureBotMut.isPending}
                  className="h-10 gap-2 bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shrink-0"
                >
                  <Send className="h-4 w-4" />
                  Tekshirish va Faollashtirish
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 2. Bildirishnoma Qoidalari va Chegaralari */}
      <Card className="border-border/80 bg-card/70">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Avtomatik Ogohlantirish Qoidalari</CardTitle>
                <CardDescription className="text-xs">
                  Rahbar (BOSS), tuman mas’ullari va xodimlar uchun bildirishnoma chegaralari va
                  kunlik svodka vaqti
                </CardDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => sendDigestNowMut.mutate()}
              loading={sendDigestNowMut.isPending}
              className="gap-1.5 text-xs cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 text-primary" />
              Hozir svodka yuborish
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <fieldset disabled={saveRulesMut.isPending} className="space-y-4 border-0 p-0 m-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                  Yirik zarar chegarasi (UZS)
                </label>
                <Input
                  type="number"
                  value={highValueThreshold}
                  onChange={(e) => setHighValueThreshold(Number(e.target.value))}
                  className="h-10 font-mono font-bold"
                />
                <p className="text-[11px] text-muted-foreground">
                  Shu summadan yuqori ariza tushsa Rahbar va Super Adminga darhol xabar boradi.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Ariza ko‘rib chiqish muddati (kun)</label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={slaDays}
                  onChange={(e) => setSlaDays(Number(e.target.value))}
                  className="h-10 font-mono font-bold"
                />
                <p className="text-[11px] text-muted-foreground">
                  Muddat tugashiga 2 kun qolganda ogohlantirish, o‘tganda Rahbarga signal ketadi.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Kunlik svodka vaqti (soat: 0-23)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={dailyDigestHour}
                    onChange={(e) => setDailyDigestHour(Number(e.target.value))}
                    className="h-10 font-mono font-bold w-24"
                  />
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dailyDigestEnabled}
                      onChange={(e) => setDailyDigestEnabled(e.target.checked)}
                      className="rounded border-input accent-primary h-4 w-4"
                    />
                    Kunlik svodka faol
                  </label>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Har kuni shu soatda Rahbar va Super Adminga kunlik hisobot yuboriladi.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border/60">
              <Button
                type="button"
                onClick={() => saveRulesMut.mutate()}
                loading={saveRulesMut.isPending}
                className="gap-2 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                Qoidalarni saqlash
              </Button>
            </div>
          </fieldset>
        </CardContent>
      </Card>
    </div>
  );
}
