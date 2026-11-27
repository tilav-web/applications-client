import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';

export function TableRowsSkeleton({
  rows = 8,
  columns = 6,
  nativeTr = false,
}: {
  rows?: number;
  columns?: number;
  nativeTr?: boolean;
}) {
  const widths = ['w-24', 'w-36', 'w-28', 'w-44', 'w-20', 'w-32', 'w-16'];

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) =>
        nativeTr ? (
          <tr key={rowIdx} className="border-b border-border/60">
            {Array.from({ length: columns }).map((__, colIdx) => (
              <td key={colIdx} className="px-3 py-3">
                <Skeleton
                  className={`h-4 ${widths[(rowIdx + colIdx) % widths.length]} max-w-full`}
                />
              </td>
            ))}
          </tr>
        ) : (
          <TableRow key={rowIdx} className="border-b border-border/60">
            {Array.from({ length: columns }).map((__, colIdx) => (
              <TableCell key={colIdx} className="py-3">
                <Skeleton
                  className={`h-4 ${widths[(rowIdx + colIdx) % widths.length]} max-w-full`}
                />
              </TableCell>
            ))}
          </TableRow>
        ),
      )}
    </>
  );
}

export function PageSkeleton() {
  return (
    <div className="w-full space-y-5 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-3.5 w-80 max-w-[70vw]" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-3.5 flex flex-wrap gap-2.5">
          <Skeleton className="h-9 flex-1 min-w-[200px]" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div className="divide-y divide-border/60">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div key={idx} className="px-4 py-3.5 flex items-center gap-4">
                <Skeleton className="h-4 w-8 shrink-0" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28 hidden sm:block" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-20 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const MAP_SKELETON_PINS = [
  { cx: 215, cy: 168, r: 12 },
  { cx: 298, cy: 196, r: 16 },
  { cx: 365, cy: 165, r: 12 },
  { cx: 268, cy: 232, r: 11 },
  { cx: 410, cy: 205, r: 11 },
  { cx: 175, cy: 208, r: 10 },
  { cx: 330, cy: 248, r: 12 },
];

export function MapCanvasSkeleton({
  statusText,
  showControls = true,
  className = '',
}: {
  statusText?: string;
  showControls?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-slate-100/90 dark:bg-slate-950/95 ${className}`}
    >
      {/* Xarita topografik panjara fon chiziqlari */}
      <div
        className="absolute inset-0 opacity-45 dark:opacity-25"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(148, 163, 184, 0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.22) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Qashqadaryo hududining yumshoq kontur silueti va aylana nishonlar */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg
          viewBox="0 0 600 380"
          className="w-[78%] max-w-[680px] h-auto opacity-80 dark:opacity-55"
          aria-hidden="true"
        >
          <path
            d="M115,195 L165,120 L255,95 L325,112 L405,92 L475,135 L505,195 L455,255 L380,295 L295,282 L220,290 L145,255 Z"
            className="fill-primary/10 stroke-primary/30"
            strokeWidth="2.5"
            strokeDasharray="6 6"
          />
          <path
            d="M255,95 L285,185 L220,290 M325,112 L345,205 L380,295 M165,120 L285,185 L455,255 M285,185 L405,92"
            className="stroke-primary/20"
            strokeWidth="1.5"
            fill="none"
          />
          {MAP_SKELETON_PINS.map((pin, idx) => (
            <g key={idx} className="animate-pulse">
              <circle cx={pin.cx} cy={pin.cy} r={pin.r + 5} className="fill-primary/10" />
              <circle
                cx={pin.cx}
                cy={pin.cy}
                r={pin.r}
                className="fill-slate-300 dark:fill-slate-700 stroke-card"
                strokeWidth="2.5"
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Chap tomondagi zoom slayder skeleti */}
      {showControls && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 hidden sm:flex flex-col items-center gap-1.5 z-10">
          <Skeleton className="h-7 w-7 border border-border/70 bg-card/90" />
          <Skeleton className="h-28 w-2.5 bg-card/90 border border-border/70" />
          <Skeleton className="h-7 w-7 border border-border/70 bg-card/90" />
        </div>
      )}

      {/* O'ng-yuqori toolbar skeleti (Sxema | Sputnik | Gibrid + Surish + tugmalar) */}
      {showControls && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-1 h-9 px-1.5 border border-border/80 bg-card/90">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-14" />
            <Skeleton className="h-6 w-12" />
          </div>
          <Skeleton className="h-9 w-20 border border-border/80 bg-card/90" />
          <Skeleton className="h-9 w-9 border border-border/80 bg-card/90" />
          <Skeleton className="h-9 w-9 border border-border/80 bg-card/90" />
          <Skeleton className="h-9 w-9 border border-border/80 bg-card/90" />
          <Skeleton className="h-9 w-9 border border-border/80 bg-card/90" />
        </div>
      )}

      {/* Pastki-chap legenda skeleti */}
      {showControls && (
        <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-3 border border-border/80 bg-card/90 px-3.5 py-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3.5 w-11" />
        </div>
      )}

      {/* O'ng chekkadagi statistika panelini ochish tugmasi skeleti */}
      {showControls && (
        <div className="absolute top-1/2 -translate-y-1/2 right-0 z-10 h-20 w-7 border border-r-0 border-border/80 bg-card/95 flex items-center justify-center">
          <Skeleton className="h-4 w-3" />
        </div>
      )}

      {/* Markaziy ixcham yuklanish indikatori (faqat statusText berilsa) */}
      {statusText && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="flex items-center gap-2.5 border border-border/90 bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur-md">
            <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
            <span className="text-xs font-semibold text-foreground">{statusText}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function SlaWidgetSkeleton() {
  return (
    <Card className="border-border/80 bg-card/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-9 shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-64 max-w-[60vw]" />
              <Skeleton className="h-3 w-80 max-w-[70vw]" />
            </div>
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-border/70 bg-muted/30 p-3 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-12" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const CHART_BAR_HEIGHTS = [
  'h-24',
  'h-36',
  'h-28',
  'h-48',
  'h-32',
  'h-52',
  'h-40',
  'h-44',
  'h-28',
  'h-36',
];

export function DashboardSkeleton({ showStatsPanel = false }: { showStatsPanel?: boolean }) {
  return (
    <div className="w-full space-y-4 animate-in fade-in duration-150">
      {/* 1. Asosiy 640px Xarita (+ ochiq bo'lsa o'ng statistika paneli) */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch min-w-0">
        <div className="relative flex-1 min-w-0 h-[580px] md:h-[640px] border border-border/80 bg-card shadow-sm overflow-hidden">
          <MapCanvasSkeleton statusText="Boshqaruv markazi yuklanmoqda..." />
        </div>

        {showStatsPanel && (
          <aside className="w-full lg:w-[315px] xl:w-[350px] 2xl:w-[380px] shrink-0 flex flex-col gap-3 lg:h-[640px]">
            <div className="flex items-center justify-between px-3.5 py-2.5 border border-border/80 bg-card/80 shrink-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-3.5 w-28" />
              </div>
              <Skeleton className="h-6 w-14" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 flex-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card
                  key={i}
                  className="border-border/80 bg-card/75 shadow-sm flex flex-col justify-center"
                >
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="space-y-2 flex-1 min-w-0">
                      <Skeleton className="h-3 w-28" />
                      <div className="flex items-baseline gap-2">
                        <Skeleton className="h-7 w-24" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                      <Skeleton className="h-3 w-36" />
                    </div>
                    <Skeleton className="h-11 w-11 shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* 2. SLA Nazorati skeleti */}
      <SlaWidgetSkeleton />

      {/* 3. Dinamika grafigi (2 ustun) + Holatlar taqsimoti (1 ustun) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/80 bg-card/60 shadow-sm">
          <CardHeader className="p-5 pb-3 border-b border-border/40">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-3 w-80 max-w-[65vw]" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-6">
            <div className="h-72 flex flex-col justify-between">
              <div className="flex items-end justify-between gap-2.5 flex-1 px-2 pb-3 border-b border-border/50">
                {CHART_BAR_HEIGHTS.map((hCls, idx) => (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full"
                  >
                    <Skeleton className={`w-full ${hCls}`} />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2.5 px-2">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-3 w-10" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/60 shadow-sm flex flex-col">
          <CardHeader className="p-5 pb-3 border-b border-border/40 space-y-1.5">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-56" />
          </CardHeader>
          <CardContent className="p-5 flex-1 flex flex-col justify-between gap-4">
            <div className="h-44 flex items-center justify-center">
              <svg viewBox="0 0 144 144" className="h-36 w-36 animate-pulse" aria-hidden="true">
                <circle
                  cx="72"
                  cy="72"
                  r="52"
                  fill="none"
                  className="stroke-slate-200 dark:stroke-slate-800"
                  strokeWidth="20"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="52"
                  fill="none"
                  className="stroke-primary/35"
                  strokeWidth="20"
                  strokeDasharray="110 220"
                  strokeDashoffset="-15"
                />
              </svg>
            </div>
            <div className="space-y-2.5 pt-2 border-t border-border/40">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-2.5 w-2.5" />
                    <Skeleton className="h-3.5 w-24" />
                  </div>
                  <Skeleton className="h-3.5 w-14" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. 3 ta tahlil kartochkasi (Tumanlar / Jinoyat turlari / To'lov tizimlari) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, cardIdx) => (
          <Card
            key={cardIdx}
            className={`border-border/80 bg-card/60 shadow-sm ${cardIdx === 2 ? 'md:col-span-2 lg:col-span-1' : ''}`}
          >
            <CardHeader className="p-5 pb-3 border-b border-border/40">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-40" />
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-5 w-10" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-3.5">
              {Array.from({ length: 5 }).map((__, rowIdx) => (
                <div key={rowIdx} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3.5 w-12" />
                  </div>
                  <Skeleton className="h-1.5 w-full" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-2.5 w-16" />
                    <Skeleton className="h-2.5 w-24" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 5. So'nggi arizalar jadvali skeleti */}
      <Card className="border-border/80 bg-card/60 shadow-sm overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-border/40 flex flex-row items-center justify-between gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-3 w-72 max-w-[65vw]" />
          </div>
          <Skeleton className="h-8 w-28" />
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border/50">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="px-4 py-3.5 flex items-center gap-4">
              <Skeleton className="h-4 w-28 shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-3.5 w-3/4 max-w-xs" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-4 w-28 hidden md:block" />
              <Skeleton className="h-5 w-24 hidden sm:block" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3.5 w-16 hidden sm:block" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
