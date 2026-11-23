import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  PauseCircle,
  ShieldAlert,
  Timer,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { applicationsApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { Application, ApplicationStatusHistoryItem } from '@/types/models';

export function computeSlaState(
  app: Pick<Application, 'deadline_at' | 'application_status' | 'extended_until' | 'closed_at'>,
) {
  const cat = app.application_status?.category;
  const tracks = app.application_status ? app.application_status.tracks_sla !== false : true;

  if (cat === 'CLOSED' || app.closed_at) {
    return { kind: 'closed' as const, label: 'Yakunlangan', hoursLeft: null };
  }
  if (cat === 'PAUSED' || !tracks) {
    return { kind: 'paused' as const, label: 'To‘xtatilgan', hoursLeft: null };
  }
  if (!app.deadline_at) {
    return { kind: 'none' as const, label: 'Muddat belgilanmagan', hoursLeft: null };
  }

  const diffMs = new Date(app.deadline_at).getTime() - Date.now();
  const hoursLeft = Math.round(diffMs / (60 * 60 * 1000));
  const absHours = Math.abs(hoursLeft);
  const days = Math.floor(absHours / 24);
  const remHours = absHours % 24;

  const formatDuration = () => {
    if (days >= 1) return remHours > 0 ? `${days} kun ${remHours} s` : `${days} kun`;
    return `${Math.max(1, absHours)} soat`;
  };

  if (diffMs < 0) {
    return {
      kind: 'overdue' as const,
      label: `${formatDuration()} kechikdi`,
      hoursLeft,
    };
  }
  if (hoursLeft <= 24) {
    return {
      kind: 'urgent' as const,
      label: `${formatDuration()} qoldi`,
      hoursLeft,
    };
  }
  if (hoursLeft <= 72) {
    return {
      kind: 'warning' as const,
      label: `${formatDuration()} qoldi`,
      hoursLeft,
    };
  }
  return {
    kind: app.extended_until || cat === 'EXTENDED' ? ('extended' as const) : ('ok' as const),
    label: `${days} kun qoldi`,
    hoursLeft,
  };
}

export function SlaBadge({
  app,
}: {
  app: Pick<Application, 'deadline_at' | 'application_status' | 'extended_until' | 'closed_at'>;
}) {
  const state = computeSlaState(app);

  if (state.kind === 'none') return null;

  if (state.kind === 'closed') {
    return (
      <Badge
        variant="outline"
        className="text-[10px] gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-medium"
      >
        <CheckCircle2 className="h-3 w-3" />
        {state.label}
      </Badge>
    );
  }

  if (state.kind === 'paused') {
    return (
      <Badge
        variant="outline"
        className="text-[10px] gap-1 border-slate-500/30 bg-slate-500/10 text-slate-600 font-medium"
      >
        <PauseCircle className="h-3 w-3" />
        {state.label}
      </Badge>
    );
  }

  if (state.kind === 'overdue') {
    return (
      <Badge
        variant="outline"
        className="text-[10px] gap-1 border-rose-500/40 bg-rose-500/15 text-rose-600 font-bold animate-pulse"
      >
        <ShieldAlert className="h-3 w-3" />
        {state.label}
      </Badge>
    );
  }

  if (state.kind === 'urgent') {
    return (
      <Badge
        variant="outline"
        className="text-[10px] gap-1 border-orange-500/40 bg-orange-500/15 text-orange-600 font-semibold"
      >
        <AlertTriangle className="h-3 w-3" />
        {state.label}
      </Badge>
    );
  }

  if (state.kind === 'warning') {
    return (
      <Badge
        variant="outline"
        className="text-[10px] gap-1 border-amber-500/40 bg-amber-500/15 text-amber-700 font-medium"
      >
        <Clock className="h-3 w-3" />
        {state.label}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={
        state.kind === 'extended'
          ? 'text-[10px] gap-1 border-indigo-500/30 bg-indigo-500/10 text-indigo-600 font-medium'
          : 'text-[10px] gap-1 border-sky-500/30 bg-sky-500/10 text-sky-600 font-medium'
      }
    >
      <Timer className="h-3 w-3" />
      {state.kind === 'extended' ? `Uzaytirildi • ${state.label}` : state.label}
    </Badge>
  );
}

export function SlaDashboardWidget() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['applications-sla-overview'],
    queryFn: () => applicationsApi.getSlaOverview(),
    refetchInterval: 60_000,
  });

  if (isLoading || !data) return null;

  return (
    <Card className="border-border/80 bg-card/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">
                Protsessual Muddat Nazorati (JPK 329-modda)
              </CardTitle>
              <CardDescription className="text-xs">
                Tergovga qadar tekshiruv (3 / 10 / 30 kun) bo‘yicha faol arizalar nazorati
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/applications?sla_filter=overdue')}
            className="h-8 text-xs gap-1.5 cursor-pointer"
          >
            Barchasini ko‘rish
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => navigate('/applications?sla_filter=overdue')}
            className="text-left rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 hover:bg-rose-500/15 transition-colors cursor-pointer"
          >
            <div className="text-[11px] font-medium text-rose-600">Muddati o‘tganlar</div>
            <div className="text-2xl font-bold text-rose-600 mt-0.5">{data.overdueCount}</div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/applications?sla_filter=due_24h')}
            className="text-left rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 hover:bg-orange-500/15 transition-colors cursor-pointer"
          >
            <div className="text-[11px] font-medium text-orange-600">24 soat ichida</div>
            <div className="text-2xl font-bold text-orange-600 mt-0.5">{data.due24hCount}</div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/applications?sla_filter=due_72h')}
            className="text-left rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 hover:bg-amber-500/15 transition-colors cursor-pointer"
          >
            <div className="text-[11px] font-medium text-amber-700">3 kun ichida</div>
            <div className="text-2xl font-bold text-amber-700 mt-0.5">{data.due72hCount}</div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/applications?sla_filter=extended')}
            className="text-left rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 hover:bg-indigo-500/15 transition-colors cursor-pointer"
          >
            <div className="text-[11px] font-medium text-indigo-600">Uzaytirilgan (1 oy)</div>
            <div className="text-2xl font-bold text-indigo-600 mt-0.5">{data.extendedCount}</div>
          </button>
        </div>

        {data.urgentItems.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Shoshilinch e’tibor talab qiladigan arizalar
            </div>
            <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-background/60">
              {data.urgentItems.slice(0, 5).map((item) => {
                const isOverdue = item.hours_remaining < 0;
                const absH = Math.abs(item.hours_remaining);
                const d = Math.floor(absH / 24);
                const label = d >= 1 ? `${d} kun` : `${Math.max(1, absH)} soat`;
                return (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/applications/${item.id}`)}
                    className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-semibold truncate">
                        <span className="font-mono text-primary">
                          № {item.application_number || 'Raqamsiz'}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="truncate">{item.citizen_name || 'Noma‘lum fuqaro'}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {item.district_name || 'Hudud ko‘rsatilmagan'} • {item.status_name}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        isOverdue
                          ? 'shrink-0 text-[10px] border-rose-500/40 bg-rose-500/15 text-rose-600 font-bold'
                          : 'shrink-0 text-[10px] border-amber-500/40 bg-amber-500/15 text-amber-700 font-semibold'
                      }
                    >
                      {isOverdue ? `${label} kechikdi` : `${label} qoldi`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SlaProgressCard({ app, canEdit }: { app: Application; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [extendDays, setExtendDays] = useState(30);
  const [reason, setReason] = useState('');
  const [approvalNumber, setApprovalNumber] = useState('');
  const [approvalDate, setApprovalDate] = useState('');

  const extendMut = useMutation({
    mutationFn: () =>
      applicationsApi.extendDeadline(app.id, {
        extend_days: extendDays,
        reason,
        prosecutor_approval_number: approvalNumber || undefined,
        prosecutor_approval_date: approvalDate || undefined,
        switch_to_extended_status: true,
      }),
    onSuccess: () => {
      setOpen(false);
      setReason('');
      setApprovalNumber('');
      setApprovalDate('');
      void queryClient.invalidateQueries({ queryKey: ['application', app.id] });
      void queryClient.invalidateQueries({ queryKey: ['application-detail', app.id] });
      void queryClient.invalidateQueries({ queryKey: ['applications-sla-overview'] });
      toast.success('Ariza muddati JPK 329-modda bo‘yicha uzaytirildi');
    },
    onError: (err) => {
      toast.error('Muddatni uzaytirishda xatolik', { description: getErrorMessage(err) });
    },
  });

  const [nowMs] = useState(() => Date.now());
  const state = computeSlaState(app);
  const baseMs = new Date(app.date || app.created_at || nowMs).getTime();
  const deadlineMs = app.deadline_at ? new Date(app.deadline_at).getTime() : null;
  const progress =
    deadlineMs && deadlineMs > baseMs
      ? Math.min(100, Math.max(0, Math.round(((nowMs - baseMs) / (deadlineMs - baseMs)) * 100)))
      : 0;

  const barColor =
    state.kind === 'overdue'
      ? 'bg-rose-500'
      : state.kind === 'urgent'
        ? 'bg-orange-500'
        : state.kind === 'warning'
          ? 'bg-amber-500'
          : state.kind === 'closed'
            ? 'bg-emerald-500'
            : 'bg-sky-500';

  return (
    <>
      <Card className="border-border/80 bg-card/70">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold">Protsessual muddat (JPK 329-modda)</span>
              <SlaBadge app={app} />
            </div>

            {canEdit && state.kind !== 'closed' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
                className="h-7 text-xs gap-1.5 cursor-pointer"
              >
                <Clock className="h-3.5 w-3.5 text-indigo-600" />
                Muddatni uzaytirish (1 oygacha)
              </Button>
            )}
          </div>

          {deadlineMs && (
            <div className="space-y-1.5">
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all ${barColor}`}
                  style={{ width: `${state.kind === 'overdue' ? 100 : progress}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2">
                <span>
                  Ro‘yxatga olingan:{' '}
                  <b className="text-foreground">{new Date(baseMs).toLocaleDateString('uz-UZ')}</b>
                </span>
                <span>
                  Muddat ({app.sla_days || 10} kun):{' '}
                  <b className="text-foreground">
                    {new Date(deadlineMs).toLocaleString('uz-UZ', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </b>
                </span>
              </div>
            </div>
          )}

          {app.extension_reason && (
            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-xs space-y-0.5">
              <div className="font-semibold text-indigo-700">
                Muddat uzaytirilgan
                {app.prosecutor_approval_number
                  ? ` • Prokuror roziligi: № ${app.prosecutor_approval_number}`
                  : ''}
              </div>
              <div className="text-muted-foreground">Sabab: {app.extension_reason}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Protsessual muddatni uzaytirish (JPK 329-modda)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Prokuror roziligi bilan tergovga qadar tekshiruv muddati ariza ro‘yxatga olingan
              kundan boshlab 30 kungacha uzaytirilishi mumkin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Umumiy muddat (kun)</label>
              <Input
                type="number"
                min={1}
                max={365}
                value={extendDays}
                onChange={(e) => setExtendDays(Number(e.target.value) || 30)}
                className="h-9 font-mono font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Prokuror roziligi raqami</label>
                <Input
                  placeholder="Masalan: PR-2026/145"
                  value={approvalNumber}
                  onChange={(e) => setApprovalNumber(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Rozilik sanasi</label>
                <Input
                  type="date"
                  value={approvalDate}
                  onChange={(e) => setApprovalDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Uzaytirish sababi *</label>
              <Input
                placeholder="Ekspertiza tayinlandi / Bank so‘rovi javobi kutilmoqda..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              size="sm"
              disabled={!reason.trim() || extendMut.isPending}
              loading={extendMut.isPending}
              onClick={() => extendMut.mutate()}
            >
              Uzaytirishni saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function StatusTimelineCard({ history }: { history?: ApplicationStatusHistoryItem[] }) {
  if (!history || history.length === 0) return null;

  const actionLabels: Record<ApplicationStatusHistoryItem['action'], string> = {
    CREATED: 'Ariza ro‘yxatga olindi',
    STATUS_CHANGED: 'Holat o‘zgartirildi',
    DEADLINE_EXTENDED: 'Muddat uzaytirildi (JPK 329-m.)',
    DEADLINE_CHANGED: 'Muddat yangilandi',
    CLOSED: 'Ariza yakunlandi',
  };

  return (
    <Card className="border-border/80 bg-card/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Status va Muddat Tarixi ({history.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative pl-4 border-l-2 border-border/70 space-y-3">
          {history.map((h) => {
            const actor = h.changed_by
              ? `${h.changed_by.last_name || ''} ${h.changed_by.first_name || ''}`.trim()
              : null;
            return (
              <div key={h.id} className="relative text-xs">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-semibold text-foreground">{actionLabels[h.action]}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Date(h.created_at).toLocaleString('uz-UZ')}
                  </span>
                </div>
                {(h.from_status_name || h.to_status_name) && (
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {h.from_status_name ? `${h.from_status_name} → ` : ''}
                    <span className="font-medium text-foreground">{h.to_status_name}</span>
                  </div>
                )}
                {h.new_deadline_at && (
                  <div className="text-[11px] text-indigo-600 mt-0.5">
                    Muddat: {new Date(h.new_deadline_at).toLocaleDateString('uz-UZ')}
                    {h.prosecutor_approval_number
                      ? ` (Prokuror roziligi: № ${h.prosecutor_approval_number})`
                      : ''}
                  </div>
                )}
                {h.note && (
                  <div className="text-[11px] text-muted-foreground italic mt-0.5">{h.note}</div>
                )}
                {actor && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">Xodim: {actor}</div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
