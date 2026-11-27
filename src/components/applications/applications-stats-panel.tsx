import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  Scale,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { applicationsApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATS_PERIOD_KEY = 'uvd_applications_stats_period';

const PERIOD_OPTIONS = [
  { key: 'today', label: 'Bugun' },
  { key: 'week', label: 'Hafta' },
  { key: 'month', label: 'Oy' },
  { key: 'year', label: 'Yil' },
  { key: 'all', label: 'Barchasi' },
] as const;

const formatCurrency = (val?: number | null) => {
  if (!val) return '0 UZS';
  return `${new Intl.NumberFormat('uz-UZ').format(Math.round(val))} UZS`;
};

interface ApplicationsStatsPanelProps {
  onClose: () => void;
  /** Agar jadvalda sana filtri qo'yilgan bo'lsa statistika shu oraliqda hisoblanadi */
  dateFromFilter?: string;
  dateToFilter?: string;
  /** Jadvalda filtrlangan jami yozuvlar soni */
  filteredTotal?: number;
  hasActiveTableFilters?: boolean;
  /** Panel ichidan tuman yoki status bosilganda jadvalni tezkor filtrlash */
  activeDistrictId?: string;
  onSelectDistrict?: (districtId: string) => void;
  activeStatusFilter?: string;
  onSelectStatus?: (statusCodeOrId: string) => void;
}

export function ApplicationsStatsPanel({
  onClose,
  dateFromFilter,
  dateToFilter,
  filteredTotal,
  hasActiveTableFilters = false,
  activeDistrictId,
  onSelectDistrict,
  activeStatusFilter,
  onSelectStatus,
}: ApplicationsStatsPanelProps) {
  const [period, setPeriod] = useState<string>(() => {
    if (typeof window === 'undefined') return 'all';
    try {
      const saved = window.localStorage.getItem(STATS_PERIOD_KEY);
      if (saved && PERIOD_OPTIONS.some((o) => o.key === saved)) return saved;
    } catch {
      // ignore storage errors
    }
    return 'all';
  });

  const handlePeriodChange = (next: string) => {
    setPeriod(next);
    try {
      window.localStorage.setItem(STATS_PERIOD_KEY, next);
    } catch {
      // ignore storage errors
    }
  };

  const hasCustomDates = Boolean(dateFromFilter || dateToFilter);
  const effectivePeriod = hasCustomDates ? 'custom' : period;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'applications-side-statistics',
      {
        period: effectivePeriod,
        startDate: hasCustomDates ? dateFromFilter || undefined : undefined,
        endDate: hasCustomDates ? dateToFilter || undefined : undefined,
      },
    ],
    queryFn: () =>
      applicationsApi.getStatistics({
        period: effectivePeriod,
        startDate: hasCustomDates ? dateFromFilter || undefined : undefined,
        endDate: hasCustomDates ? dateToFilter || undefined : undefined,
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const summary = data?.summary || {
    totalApplications: 0,
    newApplications: 0,
    inProgressApplications: 0,
    resolvedApplications: 0,
    rejectedApplications: 0,
    totalLoss: 0,
    resolvedLoss: 0,
    avgLoss: 0,
    maxLoss: 0,
    resolutionRate: 0,
    comparison: {
      totalPercentChange: 0,
      lossPercentChange: 0,
    },
  };

  const statusData = data?.byStatus || [];
  const topDistricts = (data?.byDistrict || []).slice(0, 5);

  return (
    <aside className="w-full lg:w-[315px] xl:w-[345px] shrink-0 flex flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-5.5rem)] animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border border-border/80 bg-card/85 backdrop-blur-sm shadow-2xs shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground truncate">
            Asosiy Statistika
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Panelni yopish"
          className="inline-flex items-center gap-1 h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
        >
          <span>Yopish</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Davr tanlovi (yoki jadval sanasi filtri faol ekani haqida belgi) */}
      <div className="border border-border/80 bg-card/75 p-1 shrink-0">
        {hasCustomDates ? (
          <div className="px-2.5 py-1.5 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-primary">Filtr sanasi bo‘yicha</span>
            <span className="font-mono text-muted-foreground">
              {dateFromFilter || '…'} — {dateToFilter || '…'}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => handlePeriodChange(opt.key)}
                className={cn(
                  'py-1.5 text-[11px] font-semibold transition-colors cursor-pointer text-center',
                  period === opt.key
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isFetching && Boolean(data) && (
        <div className="h-0.5 w-full overflow-hidden bg-primary/15 shrink-0">
          <div className="h-full w-1/3 bg-primary animate-[loading-bar_1.2s_ease-in-out_infinite]" />
        </div>
      )}

      {/* Scrollable KPI & Breakdowns */}
      <div className="space-y-3 lg:overflow-y-auto lg:pr-0.5 pb-2">
        {isLoading && !data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border/80 bg-card/75 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-7 w-24" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <Skeleton className="h-11 w-11 shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {/* 1. Jami arizalar */}
              <Card className="border-border/80 bg-card/75 backdrop-blur-sm shadow-sm hover:border-primary/40 transition">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Jami Arizalar
                    </p>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="text-2xl font-black tracking-tight text-foreground font-mono">
                        {summary.totalApplications}
                      </h3>
                      {summary.comparison.totalPercentChange !== 0 && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 px-1.5 font-mono ${
                            summary.comparison.totalPercentChange > 0
                              ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10'
                              : 'border-rose-500/30 text-rose-500 bg-rose-500/10'
                          }`}
                        >
                          {summary.comparison.totalPercentChange > 0 ? (
                            <ArrowUpRight className="h-3 w-3 inline mr-0.5" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 inline mr-0.5" />
                          )}
                          {Math.abs(summary.comparison.totalPercentChange)}%
                        </Badge>
                      )}
                      {hasActiveTableFilters && typeof filteredTotal === 'number' && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 font-mono border-primary/35 text-primary bg-primary/10"
                        >
                          Filtrda: {filteredTotal}
                        </Badge>
                      )}
                    </div>
                    {data?.byRepeatType &&
                      (data.byRepeatType.repeat > 0 ||
                        data.byRepeatType.duplicate > 0 ||
                        data.byRepeatType.supplemental > 0) && (
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                            Birlamchi: {data.byRepeatType.primary}
                          </span>
                          {data.byRepeatType.repeat > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold">
                              Takroriy: {data.byRepeatType.repeat}
                            </span>
                          )}
                          {data.byRepeatType.duplicate > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/15 text-purple-600 dark:text-purple-400 font-semibold">
                              Dublikat: {data.byRepeatType.duplicate}
                            </span>
                          )}
                        </div>
                      )}
                  </div>
                  <div className="h-11 w-11 bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              {/* 2. Hal qilingan */}
              <Card className="border-border/80 bg-card/75 backdrop-blur-sm shadow-sm hover:border-emerald-500/40 transition">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Hal Qilingan (Fosh etilgan)
                    </p>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="text-2xl font-black tracking-tight text-emerald-500 font-mono">
                        {summary.resolvedApplications}
                      </h3>
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                        {summary.resolutionRate}% samaradorlik
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Tergov yakunlangan ishlar</p>
                  </div>
                  <div className="h-11 w-11 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              {/* 3. Jarayonda & Yangi */}
              <Card className="border-border/80 bg-card/75 backdrop-blur-sm shadow-sm hover:border-amber-500/40 transition">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Jarayonda (Tergovda)
                    </p>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="text-2xl font-black tracking-tight text-amber-500 font-mono">
                        {summary.inProgressApplications}
                      </h3>
                      <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-mono">
                        +{summary.newApplications} yangi
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Ko‘rib chiqilayotgan holatlar
                    </p>
                  </div>
                  <div className="h-11 w-11 bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              {/* 4. Yetkazilgan zarar */}
              <Card className="border-border/80 bg-card/75 backdrop-blur-sm shadow-sm hover:border-rose-500/40 transition">
                <CardContent className="p-4 flex items-center justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Yetkazilgan Zarar
                    </p>
                    <h3 className="text-lg sm:text-xl font-black tracking-tight text-rose-500 font-mono break-words">
                      {formatCurrency(summary.totalLoss)}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      O‘rtacha: {formatCurrency(summary.avgLoss)}
                    </p>
                  </div>
                  <div className="h-11 w-11 bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                    <Wallet className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 5. Holatlar kesimi (bosganda jadval filtrlanadi) */}
            {statusData.length > 0 && (
              <Card className="border-border/80 bg-card/75 shadow-sm">
                <CardContent className="p-3.5 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Scale className="h-3.5 w-3.5 text-primary" />
                    <span>Holatlar kesimi</span>
                  </div>
                  <div className="space-y-1.5">
                    {statusData.map((s) => {
                      const isActive =
                        activeStatusFilter &&
                        activeStatusFilter.toUpperCase() === s.status.toUpperCase();
                      return (
                        <button
                          key={s.status}
                          type="button"
                          onClick={() => onSelectStatus?.(isActive ? '' : s.status)}
                          className={cn(
                            'w-full flex items-center justify-between gap-2 px-2 py-1 text-xs transition-colors cursor-pointer text-left',
                            isActive
                              ? 'bg-primary/12 text-primary font-bold border border-primary/30'
                              : 'hover:bg-muted/60 text-foreground',
                          )}
                          title="Jadvalni ushbu holat bo‘yicha filtrlash"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span
                              className="h-2.5 w-2.5 shrink-0"
                              style={{ backgroundColor: s.color }}
                            />
                            <span className="truncate font-medium">{s.label}</span>
                          </span>
                          <span className="font-mono text-[11px] shrink-0">
                            <strong className="text-foreground">{s.count}</strong>{' '}
                            <span className="text-muted-foreground">({s.percent}%)</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 6. Top 5 tumanlar (bosganda jadval filtrlanadi) */}
            {topDistricts.length > 0 && (
              <Card className="border-border/80 bg-card/75 shadow-sm">
                <CardContent className="p-3.5 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>Top hududlar</span>
                  </div>
                  <div className="space-y-2">
                    {topDistricts.map((d) => {
                      const isActive = Boolean(activeDistrictId && d.id === activeDistrictId);
                      return (
                        <button
                          key={d.id || d.name}
                          type="button"
                          onClick={() => {
                            if (!d.id) return;
                            onSelectDistrict?.(isActive ? '' : d.id);
                          }}
                          className={cn(
                            'w-full space-y-1 p-1.5 transition-colors cursor-pointer text-left',
                            isActive
                              ? 'bg-primary/10 border border-primary/30'
                              : 'hover:bg-muted/50',
                          )}
                          title="Jadvalni ushbu tuman bo‘yicha filtrlash"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-foreground truncate">{d.name}</span>
                            <span className="font-mono font-bold text-primary shrink-0">
                              {d.count} ta
                            </span>
                          </div>
                          <div className="w-full bg-muted/50 h-1.5 overflow-hidden">
                            <div
                              className="bg-primary h-full transition-all duration-300"
                              style={{ width: `${Math.min(d.percent || 8, 100)}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
