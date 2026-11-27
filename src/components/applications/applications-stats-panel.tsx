import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  MapPin,
  Scale,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

import {
  PageStatsSheet,
  StatsDistributionBar,
  StatsFilterRow,
  StatsHeroBanner,
  StatsMetricTile,
  StatsSection,
  StatsSheetSkeleton,
} from '@/components/ui/page-stats-sheet';
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
  isOpen: boolean;
  onOpen: () => void;
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
  isOpen,
  onOpen,
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

  const { data, isLoading, isFetching, refetch } = useQuery({
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
    enabled: isOpen,
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
  const repeat = data?.byRepeatType;
  const hasRepeatBreakdown =
    repeat && (repeat.repeat > 0 || repeat.duplicate > 0 || repeat.supplemental > 0);

  return (
    <PageStatsSheet
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
      title="Arizalar Statistikasi"
      subtitle="Tezkor ko‘rsatkichlar va kesimlar"
      badgeText={
        hasActiveTableFilters && typeof filteredTotal === 'number'
          ? `Filtr: ${filteredTotal}`
          : undefined
      }
      icon={<BarChart3 className="h-4 w-4" />}
      isFetching={isFetching && Boolean(data)}
      onRefresh={() => void refetch()}
      headerExtra={
        hasCustomDates ? (
          <div className="flex items-center justify-between text-[11px]">
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
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )
      }
    >
      {isLoading && !data ? (
        <StatsSheetSkeleton />
      ) : (
        <>
          {/* 1. Asosiy KPI Grid + Zarar Banner */}
          <StatsSection>
            <div className="grid grid-cols-2 gap-2.5">
              <StatsMetricTile
                label="Jami Arizalar"
                value={summary.totalApplications}
                accent="primary"
                icon={<FileText className="h-3.5 w-3.5" />}
                pill={
                  summary.comparison.totalPercentChange !== 0 ? (
                    <span
                      className={cn(
                        'inline-flex items-center text-[10px] font-mono font-bold px-1 py-0.5',
                        summary.comparison.totalPercentChange > 0
                          ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/12 text-rose-600 dark:text-rose-400',
                      )}
                    >
                      {summary.comparison.totalPercentChange > 0 ? (
                        <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />
                      ) : (
                        <ArrowDownRight className="h-2.5 w-2.5 mr-0.5" />
                      )}
                      {Math.abs(summary.comparison.totalPercentChange)}%
                    </span>
                  ) : null
                }
                subtext="Tanlangan davrda"
              />

              <StatsMetricTile
                label="Hal Qilingan"
                value={summary.resolvedApplications}
                accent="emerald"
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                pill={
                  <span className="text-[10px] font-mono font-bold px-1 py-0.5 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                    {summary.resolutionRate}%
                  </span>
                }
                subtext="Fosh etilgan ishlar"
              />

              <StatsMetricTile
                label="Tergovda"
                value={summary.inProgressApplications}
                accent="amber"
                icon={<Clock className="h-3.5 w-3.5" />}
                pill={
                  summary.newApplications > 0 ? (
                    <span className="text-[10px] font-mono font-bold px-1 py-0.5 bg-blue-500/12 text-blue-600 dark:text-blue-400">
                      +{summary.newApplications} yangi
                    </span>
                  ) : null
                }
                subtext="Ko‘rib chiqilmoqda"
              />

              <StatsMetricTile
                label="Rad Etilgan"
                value={summary.rejectedApplications}
                accent="slate"
                icon={<XCircle className="h-3.5 w-3.5" />}
                subtext="Yakunlangan / rad"
              />
            </div>

            <StatsHeroBanner
              label="Yetkazilgan Zarar"
              value={formatCurrency(summary.totalLoss)}
              subtext={`O‘rtacha zarar: ${formatCurrency(summary.avgLoss)}`}
              accent="rose"
              icon={<Wallet className="h-4 w-4" />}
            />
          </StatsSection>

          {/* 2. Takroriylik ulushi */}
          {hasRepeatBreakdown && repeat && (
            <StatsSection
              title="Murojaat turlari"
              icon={<Layers className="h-3.5 w-3.5 text-primary" />}
            >
              <StatsDistributionBar
                total={summary.totalApplications}
                segments={[
                  {
                    key: 'primary',
                    label: 'Birlamchi',
                    count: repeat.primary,
                    colorClass: 'bg-emerald-500',
                    dotColorClass: 'bg-emerald-500',
                  },
                  {
                    key: 'repeat',
                    label: 'Takroriy',
                    count: repeat.repeat,
                    colorClass: 'bg-amber-500',
                    dotColorClass: 'bg-amber-500',
                  },
                  {
                    key: 'duplicate',
                    label: 'Dublikat',
                    count: repeat.duplicate,
                    colorClass: 'bg-purple-500',
                    dotColorClass: 'bg-purple-500',
                  },
                  ...(repeat.supplemental > 0
                    ? [
                        {
                          key: 'supplemental',
                          label: 'Qo‘shimcha',
                          count: repeat.supplemental,
                          colorClass: 'bg-blue-500',
                          dotColorClass: 'bg-blue-500',
                        },
                      ]
                    : []),
                ]}
              />
            </StatsSection>
          )}

          {/* 3. Holatlar kesimi (bosganda jadval filtrlanadi) */}
          {statusData.length > 0 && (
            <StatsSection
              title="Holatlar kesimi"
              icon={<Scale className="h-3.5 w-3.5 text-primary" />}
              hint="Bosib filtrlang"
            >
              <div className="space-y-0.5">
                {statusData.map((s) => {
                  const isActive = Boolean(
                    activeStatusFilter &&
                    activeStatusFilter.toUpperCase() === s.status.toUpperCase(),
                  );
                  return (
                    <StatsFilterRow
                      key={s.status}
                      label={s.label}
                      count={s.count}
                      percent={s.percent}
                      colorHex={s.color}
                      active={isActive}
                      onClick={() => onSelectStatus?.(isActive ? '' : s.status)}
                    />
                  );
                })}
              </div>
            </StatsSection>
          )}

          {/* 4. Top 5 tumanlar (bosganda jadval filtrlanadi) */}
          {topDistricts.length > 0 && (
            <StatsSection
              title="Top hududlar"
              icon={<MapPin className="h-3.5 w-3.5 text-primary" />}
              hint="Bosib filtrlang"
            >
              <div className="space-y-0.5">
                {topDistricts.map((d) => {
                  const isActive = Boolean(activeDistrictId && d.id === activeDistrictId);
                  return (
                    <StatsFilterRow
                      key={d.id || d.name}
                      label={d.name}
                      count={d.count}
                      percent={d.percent}
                      active={isActive}
                      onClick={() => {
                        if (!d.id) return;
                        onSelectDistrict?.(isActive ? '' : d.id);
                      }}
                    />
                  );
                })}
              </div>
            </StatsSection>
          )}
        </>
      )}
    </PageStatsSheet>
  );
}
