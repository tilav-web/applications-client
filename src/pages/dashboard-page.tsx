import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Filter,
  LayoutList,
  Loader2,
  MapPin,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Table as TableIcon,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { SlaDashboardWidget } from '@/components/applications/sla-components';
import { QashqadaryoYandexMap } from '@/components/dashboard/qashqadaryo-yandex-map';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DashboardSkeleton } from '@/components/ui/page-skeletons';
import { applicationsApi } from '@/lib/api';

const formatCurrency = (amount?: number | null) => {
  if (amount === undefined || amount === null) return '0 UZS';
  return new Intl.NumberFormat('uz-UZ').format(Math.round(amount)) + ' UZS';
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

const STATUS_CONFIG: Record<string, { label: string; color: string; badgeClass: string }> = {
  YANGI: {
    label: 'Yangi',
    color: '#3b82f6',
    badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  },
  JARAYONDA: {
    label: 'Jarayonda',
    color: '#f59e0b',
    badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  },
  HAL_QILINDI: {
    label: 'Hal qilindi',
    color: '#10b981',
    badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  },
  RAD_ETILDI: {
    label: 'Rad etildi',
    color: '#ef4444',
    badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
  },
};

export function DashboardPage() {
  const navigate = useNavigate();

  // Filter state
  const [period, setPeriod] = useState<string>('month');
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().substring(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().substring(0, 10));

  // Tab view states (list vs table) for breakdown cards
  const [districtView, setDistrictView] = useState<'list' | 'table'>('list');
  const [crimeView, setCrimeView] = useState<'list' | 'table'>('list');
  const [providerView, setProviderView] = useState<'list' | 'table'>('list');

  // Query stats
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['dashboard-statistics', { period, startDate, endDate }],
    queryFn: () =>
      applicationsApi.getStatistics({
        period,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
      }),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    if (newPeriod === 'custom') {
      setShowCustomRange(true);
    } else {
      setShowCustomRange(false);
    }
  };

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

  const timelineData = data?.timeline || [];
  const statusData = data?.byStatus || [];
  const districtData = data?.byDistrict || [];
  const mahallaData = data?.byMahalla || [];
  const crimeData = data?.byCrime || [];
  const providerData = data?.byPaymentProvider || [];
  const recentApps = data?.recentApplications || [];

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* ===================================================================== */}
      {/* HEADER & TIME CONTROLS */}
      {/* ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary mb-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Kiberxavfsizlik & Monitoring Markazi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Boshqaruv Markazi & Analitika
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Fuqarolar murojaatlari, jinoyat turlari va moliyaviy zararlar bo‘yicha tahliliy
            statistika
          </p>
        </div>

        {/* PERIOD SELECTOR */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-1 rounded-xl border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <button
              type="button"
              onClick={() => handlePeriodChange('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                period === 'today'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Bugun
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                period === 'week'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Haftalik
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                period === 'month'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Oylik
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                period === 'year'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yillik
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                period === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Barchasi
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                period === 'custom'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="h-3 w-3" />
              <span>Sana oralig‘i</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 px-3 gap-1.5 text-xs shadow-sm shrink-0"
            title="Ma‘lumotlarni yangilash"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
            <span className="hidden sm:inline">Yangilash</span>
          </Button>
        </div>
      </div>

      {/* CUSTOM DATE RANGE FILTER PANEL */}
      {showCustomRange && (
        <Card className="border-primary/30 bg-primary/[0.03] backdrop-blur-sm p-4 animate-in fade-in-50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Filter className="h-4 w-4" />
              <span>Maxsus sana oralig‘ini belgilash:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Dan:</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-xs font-mono w-36 bg-background"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Gacha:</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-xs font-mono w-36 bg-background"
                />
              </div>
              <Button
                size="sm"
                onClick={() => refetch()}
                className="h-8 text-xs font-semibold px-4"
              >
                Ko‘rish
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 1. TOP STATS KPI CARDS (Skeleton while loading) */}
      {/* ===================================================================== */}
      {isLoading && !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Jami arizalar */}
            <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-sm hover:border-primary/40 transition">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Jami Arizalar
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-mono">
                      {isLoading ? '...' : summary.totalApplications}
                    </h3>
                    {summary.comparison.totalPercentChange !== 0 && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] py-0 px-1.5 font-mono ${
                          summary.comparison.totalPercentChange > 0
                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                            : 'border-rose-500/30 text-rose-400 bg-rose-500/10'
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
                  </div>
                  <p className="text-[11px] text-muted-foreground">O‘tgan davrga nisbatan</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <FileText className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Hal qilinganlar (Fosh etish) */}
            <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-sm hover:border-emerald-500/40 transition">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Hal Qilingan (Fosh etilgan)
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-400 font-mono">
                      {isLoading ? '...' : summary.resolvedApplications}
                    </h3>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                      {summary.resolutionRate}% samaradorlik
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Tergov yakunlangan ishlar</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Jarayonda & Yangi */}
            <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-sm hover:border-amber-500/40 transition">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Jarayonda (Tergovda)
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-amber-400 font-mono">
                      {isLoading ? '...' : summary.inProgressApplications}
                    </h3>
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] font-mono">
                      +{summary.newApplications} yangi
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Ko‘rib chiqilayotgan holatlar</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Clock className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Jami Moliyaviy Zarar */}
            <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-sm hover:border-rose-500/40 transition">
              <CardContent className="p-5 flex items-center justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Yetkazilgan Zarar
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-rose-400 font-mono whitespace-nowrap">
                      {isLoading ? '...' : formatCurrency(summary.totalLoss)}
                    </h3>
                  </div>
                  <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                    O‘rtacha: {formatCurrency(summary.avgLoss)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <Wallet className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 1.5. PROTSESSUAL MUDDAT NAZORATI (JPK 329-MODDA SLA) */}
          <SlaDashboardWidget />

          {/* ===================================================================== */}
          {/* 2. QASHQADARYO VILOYATI INTERAKTIV YANDEX XARITASI */}
          {/* ===================================================================== */}
          <QashqadaryoYandexMap
            districtsData={districtData}
            mahallasData={mahallaData}
            allowedDistrictNames={data?.scopedDistrictNames ?? undefined}
            isLoading={isLoading}
            periodLabel={
              period === 'today'
                ? 'Bugun'
                : period === 'week'
                  ? 'Haftalik'
                  : period === 'month'
                    ? 'Oylik'
                    : period === 'year'
                      ? 'Yillik'
                      : period === 'custom'
                        ? `${startDate} — ${endDate}`
                        : 'Barcha davr'
            }
          />

          {/* ===================================================================== */}
          {/* 3. DYNAMIC CHARTS (TIMELINE & STATUS PIE) */}
          {/* ===================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* TIMELINE AREA CHART (2 COLS) */}
            <Card className="lg:col-span-2 border-border/80 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardHeader className="p-5 pb-2 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span>Arizalar Dinamikasi va Fosh Etish Oqimi</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Vaqt kesimida kelib tushgan murojaatlar va hal qilingan ishlar statistikasi
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {timelineData.length} ta davr nuqtasi
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-6">
                {isLoading ? (
                  <div className="h-72 flex items-center justify-center text-xs text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Grafik yuklanmoqda...</span>
                  </div>
                ) : timelineData.length === 0 ? (
                  <div className="h-72 flex flex-col items-center justify-center text-xs text-muted-foreground">
                    <FileText className="h-8 w-8 mb-2 opacity-40" />
                    <span>Ushbu oraliqda hech qanday ariza mavjud emas</span>
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={timelineData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="resolvedColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis
                          dataKey="label"
                          stroke="rgba(255,255,255,0.4)"
                          fontSize={11}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="rgba(255,255,255,0.4)"
                          fontSize={11}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.75rem',
                            fontSize: '12px',
                          }}
                          formatter={(value: unknown, name: unknown) => {
                            const valNum = Number(value) || 0;
                            if (name === 'total') return [`${valNum} ta ariza`, 'Jami kelgan'];
                            if (name === 'resolved') return [`${valNum} ta ariza`, 'Hal qilingan'];
                            return [valNum, String(name)];
                          }}
                        />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          iconType="circle"
                          wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
                          formatter={(value) =>
                            value === 'total' ? 'Jami arizalar' : 'Hal qilinganlar'
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="total"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#totalColor)"
                        />
                        <Area
                          type="monotone"
                          dataKey="resolved"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#resolvedColor)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* STATUS DISTRIBUTION DONUT / PIE (1 COL) */}
            <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-sm flex flex-col">
              <CardHeader className="p-5 pb-2 border-b border-border/40">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  <span>Arizalar Holati Taqsimoti</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Murojaatlarning ijro va tergovdagi holatlari
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 flex-1 flex flex-col justify-between">
                {summary.totalApplications === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-xs text-muted-foreground">
                    <ShieldAlert className="h-8 w-8 mb-2 opacity-40" />
                    <span>Holatlar bo‘yicha ma‘lumot yo‘q</span>
                  </div>
                ) : (
                  <>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="count"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '0.75rem',
                              fontSize: '11px',
                            }}
                            formatter={(val: unknown) => [
                              `${val} ta (${summary.totalApplications ? Math.round(((Number(val) || 0) / summary.totalApplications) * 100) : 0}%)`,
                              'Arizalar',
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Status legends list */}
                    <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
                      {statusData.map((s) => (
                        <div key={s.status} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: s.color }}
                            />
                            <span className="font-medium text-foreground">{s.label}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-foreground">{s.count} ta</span>
                            <span className="text-muted-foreground text-[10px]">
                              ({s.percent}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ===================================================================== */}
          {/* 3. DEEP BREAKDOWNS (DISTRICTS & CRIMES & PAYMENT PROVIDERS) */}
          {/* ===================================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* A. TOP DISTRICTS */}
            <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardHeader className="p-5 pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>Hududlar / Tumanlar Kesimi</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/50">
                      <button
                        type="button"
                        onClick={() => setDistrictView('list')}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                          districtView === 'list'
                            ? 'bg-card text-foreground shadow-xs font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Grafik / Ro‘yxat ko‘rinishi"
                      >
                        <LayoutList className="h-3 w-3" />
                        <span>Ro‘yxat</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDistrictView('table')}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                          districtView === 'table'
                            ? 'bg-card text-foreground shadow-xs font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Jadval ko‘rinishi"
                      >
                        <TableIcon className="h-3 w-3" />
                        <span>Jadval</span>
                      </button>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {districtData.length} ta
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {districtData.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Tumanlar bo‘yicha ma‘lumot kiritilmagan
                  </p>
                ) : districtView === 'table' ? (
                  <div className="overflow-x-auto -mx-5 -my-2">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-y border-border/40">
                        <tr>
                          <th className="py-2 px-3 w-8">#</th>
                          <th className="py-2 px-3">Tuman / Hudud</th>
                          <th className="py-2 px-3 text-right">Arizalar</th>
                          <th className="py-2 px-3 text-right">Ulush</th>
                          <th className="py-2 px-4 text-right">Zarar miqdori</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30 font-medium">
                        {districtData.map((d, idx) => (
                          <tr key={d.id || idx} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 font-semibold text-foreground">{d.name}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                              {d.count} ta
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                              {d.percent}%
                            </td>
                            <td className="py-2 px-4 text-right font-mono text-[11px] font-semibold text-foreground whitespace-nowrap">
                              {formatCurrency(d.totalLoss)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  districtData.map((d, idx) => (
                    <div key={d.id || idx} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-muted-foreground w-4">
                            #{idx + 1}
                          </span>
                          {d.name}
                        </span>
                        <span className="font-mono font-bold text-primary">{d.count} ta</span>
                      </div>
                      <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(d.percent || 10, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                        <span>{d.percent}% ulush</span>
                        <span>Zarar: {formatCurrency(d.totalLoss)}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* B. TOP CRIMES */}
            <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardHeader className="p-5 pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-400" />
                    <span>Jinoyat Turlari</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/50">
                      <button
                        type="button"
                        onClick={() => setCrimeView('list')}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                          crimeView === 'list'
                            ? 'bg-card text-foreground shadow-xs font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Grafik / Ro‘yxat ko‘rinishi"
                      >
                        <LayoutList className="h-3 w-3" />
                        <span>Ro‘yxat</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCrimeView('table')}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                          crimeView === 'table'
                            ? 'bg-card text-foreground shadow-xs font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Jadval ko‘rinishi"
                      >
                        <TableIcon className="h-3 w-3" />
                        <span>Jadval</span>
                      </button>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {crimeData.length} ta
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {crimeData.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Jinoyat moddalari kiritilmagan
                  </p>
                ) : crimeView === 'table' ? (
                  <div className="overflow-x-auto -mx-5 -my-2">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-y border-border/40">
                        <tr>
                          <th className="py-2 px-3 w-8">#</th>
                          <th className="py-2 px-3">Jinoyat moddasi / Nomi</th>
                          <th className="py-2 px-3 text-right">Arizalar</th>
                          <th className="py-2 px-4 text-right">Ulush</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30 font-medium">
                        {crimeData.map((c, idx) => (
                          <tr key={c.id || idx} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-semibold text-foreground truncate max-w-[180px]">
                                {c.article}
                              </div>
                              {c.title && (
                                <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                                  {c.title}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-500 whitespace-nowrap">
                              {c.count} ta
                            </td>
                            <td className="py-2 px-4 text-right font-mono text-muted-foreground">
                              {c.percent}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  crimeData.map((c, idx) => (
                    <div key={c.id || idx} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground flex items-center gap-1.5 truncate max-w-[200px]">
                          <span className="font-mono text-[10px] text-muted-foreground w-4">
                            #{idx + 1}
                          </span>
                          {c.article}
                        </span>
                        <span className="font-mono font-bold text-amber-400">{c.count} ta</span>
                      </div>
                      <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(c.percent || 10, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span className="truncate max-w-[160px]">
                          {c.title || 'Kiberjinoyat turi'}
                        </span>
                        <span className="font-mono">{c.percent}%</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* C. TOP PAYMENT PROVIDERS & APPS */}
            <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-sm md:col-span-2 lg:col-span-1">
              <CardHeader className="p-5 pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-rose-400" />
                    <span>To‘lov Tizimlari / Ilovalar Zarari</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/50">
                      <button
                        type="button"
                        onClick={() => setProviderView('list')}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                          providerView === 'list'
                            ? 'bg-card text-foreground shadow-xs font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Grafik / Ro‘yxat ko‘rinishi"
                      >
                        <LayoutList className="h-3 w-3" />
                        <span>Ro‘yxat</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProviderView('table')}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                          providerView === 'table'
                            ? 'bg-card text-foreground shadow-xs font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Jadval ko‘rinishi"
                      >
                        <TableIcon className="h-3 w-3" />
                        <span>Jadval</span>
                      </button>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {providerData.length} ta
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {providerData.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    To‘lov tizimlari bo‘yicha ma‘lumot yo‘q
                  </p>
                ) : providerView === 'table' ? (
                  <div className="overflow-x-auto -mx-5 -my-2">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-y border-border/40">
                        <tr>
                          <th className="py-2 px-3 w-8">#</th>
                          <th className="py-2 px-3">To‘lov tizimi</th>
                          <th className="py-2 px-3 text-right">O‘tkazmalar</th>
                          <th className="py-2 px-3 text-right">Ulush</th>
                          <th className="py-2 px-4 text-right">Yetkazilgan zarar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30 font-medium">
                        {providerData.map((p, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 font-semibold text-foreground">
                              <span className="flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span>{p.name}</span>
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-foreground whitespace-nowrap">
                              {p.count} ta
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                              {p.percent}%
                            </td>
                            <td className="py-2 px-4 text-right font-mono text-[11px] font-bold text-rose-500 whitespace-nowrap">
                              {formatCurrency(p.totalAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  providerData.map((p, idx) => (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          {p.name}
                        </span>
                        <span className="font-mono font-bold text-foreground">{p.count} ta</span>
                      </div>
                      <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(p.percent || 10, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                        <span>{p.percent}% jami zarardan</span>
                        <span className="text-rose-400 font-bold">
                          {formatCurrency(p.totalAmount)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* ===================================================================== */}
          {/* 4. RECENT LIVE APPLICATIONS TABLE */}
          {/* ===================================================================== */}
          <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>So‘nggi Qayd Etilgan Arizalar</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Tizimga kelib tushgan eng so‘nggi arizalar va ularning holati
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/applications')}
                className="text-xs gap-1 text-primary hover:text-primary font-semibold"
              >
                <span>Barchasini ko‘rish</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {recentApps.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Arizalar ro‘yxati bo‘sh
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 border-b border-border/50 text-muted-foreground uppercase text-[10px] font-semibold">
                      <tr>
                        <th className="px-4 py-3">№ Ariza Raqami</th>
                        <th className="px-4 py-3">Murojaat / Jabrlanuvchi</th>
                        <th className="px-4 py-3">Hudud & Jinoyat Turi</th>
                        <th className="px-4 py-3">Zarar Summasi</th>
                        <th className="px-4 py-3">Holati</th>
                        <th className="px-4 py-3 text-right">Sana</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {recentApps.map((app) => {
                        const statusCfg =
                          STATUS_CONFIG[app.status || 'YANGI'] || STATUS_CONFIG.YANGI;
                        return (
                          <tr
                            key={app.id}
                            onClick={() => navigate(`/applications/${app.id}`)}
                            className="hover:bg-muted/40 transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-3 font-mono font-bold text-primary">
                              {app.application_number || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-foreground truncate max-w-xs">
                                {app.description || 'Murojaat tafsiloti'}
                              </p>
                              {app.citizen_name && (
                                <p className="text-[11px] text-muted-foreground">
                                  {app.citizen_name}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-0.5">
                                {app.district_name && (
                                  <p className="text-foreground">{app.district_name}</p>
                                )}
                                {app.crime_article && (
                                  <p className="font-mono text-[10px] text-primary">
                                    {app.crime_article}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-rose-400">
                              {app.amount ? formatCurrency(app.amount) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={`text-[10px] font-mono ${statusCfg.badgeClass}`}>
                                {statusCfg.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                              {formatDate(app.date || app.created_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
