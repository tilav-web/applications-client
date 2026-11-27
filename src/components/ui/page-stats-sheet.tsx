import { BarChart3, ChevronLeft, ChevronRight, RefreshCw, X } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Sahifa o'ng tomonidan ochiladigan Statistika Sheet holatini localStorage da saqlash
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useStatsSheetState(storageKey: string, defaultOpen = false) {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return defaultOpen;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === '1' || saved === 'true') return true;
      if (saved === '0' || saved === 'false') return false;
    } catch {
      // ignore storage errors
    }
    return defaultOpen;
  });

  const setOpen = useCallback(
    (next: boolean) => {
      setIsOpen(next);
      try {
        window.localStorage.setItem(storageKey, next ? '1' : '0');
      } catch {
        // ignore storage errors
      }
    },
    [storageKey],
  );

  const open = useCallback(() => setOpen(true), [setOpen]);
  const close = useCallback(() => setOpen(false), [setOpen]);
  const toggle = useCallback(() => setOpen(!isOpen), [isOpen, setOpen]);

  return { isOpen, open, close, toggle };
}

interface PageStatsSheetProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badgeText?: string;
  icon?: ReactNode;
  isFetching?: boolean;
  onRefresh?: () => void;
  headerExtra?: ReactNode;
  children: ReactNode;
}

/**
 * O'ng tomondan jadvalni siqmasdan ustma-ust (slide-over) ochiladigan yagona Statistika Sheet.
 * Barcha asosiy ro'yxat sahifalarida bir xil zamonaviy va toza UI ni ta'minlaydi.
 */
export function PageStatsSheet({
  isOpen,
  onOpen,
  onClose,
  title,
  subtitle,
  badgeText,
  icon,
  isFetching = false,
  onRefresh,
  headerExtra,
  children,
}: PageStatsSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${title} panelini ochish`}
        title={`${title}ni ochish`}
        className="fixed top-1/2 -translate-y-1/2 right-0 z-30 h-20 w-7 flex items-center justify-center border border-r-0 border-border/90 border-l-2 border-l-primary/70 bg-card/95 hover:bg-primary hover:text-primary-foreground hover:border-primary text-foreground shadow-[-4px_4px_18px_rgba(15,23,42,0.12)] dark:shadow-[-4px_4px_20px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all cursor-pointer group"
      >
        <ChevronLeft className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-transform group-hover:-translate-x-0.5" />
      </button>
    );
  }

  return (
    <>
      {/* Kichik ekranlarda orqa fonni yumshoq xiralashtirish (katta ekranlarda jadval ochiq va bosiluvchan qoladi) */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-x-0 top-16 bottom-0 z-30 bg-black/25 backdrop-blur-[1px] lg:hidden animate-in fade-in duration-150"
      />

      <aside
        role="complementary"
        aria-label={title}
        className="fixed top-16 bottom-0 right-0 z-40 w-[390px] sm:w-[420px] max-w-[94vw] bg-card border-l border-border shadow-[-12px_0_36px_rgba(15,23,42,0.14)] dark:shadow-[-12px_0_36px_rgba(0,0,0,0.5)] flex flex-col animate-in fade-in slide-in-from-right duration-200"
      >
        {/* Sheet chap chekkasiga yopishgan yig'ish tutqichi (>) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Statistika panelini yopish"
          title="Panelni yopish (Esc)"
          className="hidden sm:flex absolute top-1/2 -translate-y-1/2 -left-7 h-20 w-7 items-center justify-center border border-r-0 border-border bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary text-muted-foreground shadow-[-6px_2px_16px_rgba(15,23,42,0.1)] transition-all cursor-pointer group"
        >
          <ChevronRight className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-transform group-hover:translate-x-0.5" />
        </button>

        {/* Yuqori sarlavha */}
        <div className="shrink-0 border-b border-border bg-muted/25 px-4 py-3 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 bg-primary/10 border border-primary/25 text-primary flex items-center justify-center shrink-0">
              {icon || <BarChart3 className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-[13px] font-bold tracking-tight text-foreground truncate">
                  {title}
                </h2>
                {badgeText && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-primary/12 text-primary border border-primary/25 shrink-0">
                    {badgeText}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isFetching}
                title="Statistikani yangilash"
                aria-label="Statistikani yangilash"
                className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={cn('h-3.5 w-3.5', isFetching && 'animate-spin text-primary')}
                />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Yopish (Esc)"
              aria-label="Yopish"
              className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Qo'shimcha boshqaruv qatori (masalan, davr tanlagich) */}
        {headerExtra && (
          <div className="shrink-0 border-b border-border bg-muted/15 px-4 py-2">{headerExtra}</div>
        )}

        {/* Yangilanish indikatori (layout sakramasligi uchun nozik 2px chiziq) */}
        <div className="h-[2px] w-full shrink-0 bg-transparent overflow-hidden">
          {isFetching && (
            <div className="h-full w-1/3 bg-primary animate-[loading-bar_1.2s_ease-in-out_infinite]" />
          )}
        </div>

        {/* Asosiy skroll qismi — yagona toza vertikal bo'limlar */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/70">{children}</div>
      </aside>
    </>
  );
}

/* ============================================================================
 * SHEET ICHIDAGI IXCHAM VIZUAL BLOKLAR
 * ============================================================================ */

export function StatsSection({
  title,
  icon,
  hint,
  className,
  children,
}: {
  title?: string;
  icon?: ReactNode;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('px-4 py-3.5 space-y-2.5', className)}>
      {title && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {icon}
            <span>{title}</span>
          </div>
          {hint && <span className="text-[10px] text-muted-foreground/80">{hint}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

type TileAccent = 'primary' | 'emerald' | 'amber' | 'rose' | 'blue' | 'purple' | 'slate';

const TILE_ACCENT_STYLES: Record<
  TileAccent,
  { border: string; value: string; icon: string; activeBg: string }
> = {
  primary: {
    border: 'border-l-primary',
    value: 'text-foreground',
    icon: 'text-primary',
    activeBg: 'bg-primary/12 border-primary/50',
  },
  emerald: {
    border: 'border-l-emerald-500',
    value: 'text-emerald-600 dark:text-emerald-400',
    icon: 'text-emerald-500',
    activeBg: 'bg-emerald-500/12 border-emerald-500/50',
  },
  amber: {
    border: 'border-l-amber-500',
    value: 'text-amber-600 dark:text-amber-400',
    icon: 'text-amber-500',
    activeBg: 'bg-amber-500/12 border-amber-500/50',
  },
  rose: {
    border: 'border-l-rose-500',
    value: 'text-rose-600 dark:text-rose-400',
    icon: 'text-rose-500',
    activeBg: 'bg-rose-500/12 border-rose-500/50',
  },
  blue: {
    border: 'border-l-blue-500',
    value: 'text-blue-600 dark:text-blue-400',
    icon: 'text-blue-500',
    activeBg: 'bg-blue-500/12 border-blue-500/50',
  },
  purple: {
    border: 'border-l-purple-500',
    value: 'text-purple-600 dark:text-purple-400',
    icon: 'text-purple-500',
    activeBg: 'bg-purple-500/12 border-purple-500/50',
  },
  slate: {
    border: 'border-l-slate-400',
    value: 'text-foreground',
    icon: 'text-muted-foreground',
    activeBg: 'bg-muted/80 border-foreground/40',
  },
};

export function StatsMetricTile({
  label,
  value,
  subtext,
  pill,
  icon,
  accent = 'primary',
  active = false,
  onClick,
  title,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  pill?: ReactNode;
  icon?: ReactNode;
  accent?: TileAccent;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  const styles = TILE_ACCENT_STYLES[accent];
  const Comp = onClick ? 'button' : 'div';
  const formatted =
    typeof value === 'number' ? new Intl.NumberFormat('uz-UZ').format(value) : value;

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={title}
      className={cn(
        'text-left p-3 border border-border/80 border-l-[3px] bg-muted/20 transition-all flex flex-col justify-between gap-1.5 min-w-0',
        styles.border,
        onClick && 'cursor-pointer hover:bg-muted/50 hover:border-border',
        active && styles.activeBg,
      )}
    >
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </span>
        {icon && <span className={cn('shrink-0 opacity-85', styles.icon)}>{icon}</span>}
      </div>

      <div className="flex flex-wrap items-baseline gap-1.5 min-w-0">
        <span
          className={cn(
            'text-xl font-black font-mono tabular-nums tracking-tight leading-none',
            styles.value,
          )}
        >
          {formatted}
        </span>
        {pill}
      </div>

      {subtext && (
        <span className="text-[10px] text-muted-foreground truncate leading-tight">{subtext}</span>
      )}
    </Comp>
  );
}

export function StatsHeroBanner({
  label,
  value,
  subtext,
  badge,
  icon,
  accent = 'rose',
}: {
  label: string;
  value: string;
  subtext?: string;
  badge?: ReactNode;
  icon?: ReactNode;
  accent?: 'rose' | 'primary' | 'emerald' | 'blue';
}) {
  const accentMap = {
    rose: 'border-rose-500/25 bg-rose-500/[0.06] text-rose-600 dark:text-rose-400',
    primary: 'border-primary/25 bg-primary/[0.06] text-primary',
    emerald: 'border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-600 dark:text-emerald-400',
    blue: 'border-blue-500/25 bg-blue-500/[0.06] text-blue-600 dark:text-blue-400',
  };

  return (
    <div className={cn('border p-3.5 flex items-start justify-between gap-3', accentMap[accent])}>
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">{label}</span>
          {badge}
        </div>
        <div className="text-xl font-black font-mono tabular-nums tracking-tight break-words leading-snug">
          {value}
        </div>
        {subtext && <p className="text-[11px] text-muted-foreground leading-snug">{subtext}</p>}
      </div>
      {icon && (
        <div className="h-9 w-9 bg-background/70 border border-current/20 flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
    </div>
  );
}

export interface DistributionSegment {
  key: string;
  label: string;
  count: number;
  colorClass: string;
  dotColorClass: string;
  onClick?: () => void;
  active?: boolean;
}

export function StatsDistributionBar({
  segments,
  total,
}: {
  segments: DistributionSegment[];
  total: number;
}) {
  const nonZero = segments.filter((s) => s.count > 0);
  const sum = total > 0 ? total : nonZero.reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="space-y-2.5">
      {/* Yagona rangli proporsiya chizig'i */}
      <div className="h-2.5 w-full bg-muted/70 overflow-hidden flex gap-[1px]">
        {sum > 0 ? (
          nonZero.map((seg) => {
            const pct = Math.max(2, (seg.count / sum) * 100);
            return (
              <div
                key={seg.key}
                style={{ width: `${pct}%` }}
                className={cn('h-full transition-all duration-300', seg.colorClass)}
                title={`${seg.label}: ${seg.count} (${Math.round((seg.count / sum) * 100)}%)`}
              />
            );
          })
        ) : (
          <div className="h-full w-full bg-muted/60" />
        )}
      </div>

      {/* Ixcham legenda */}
      <div className="grid grid-cols-2 gap-1.5">
        {segments.map((seg) => {
          const pct = sum > 0 ? Math.round((seg.count / sum) * 100) : 0;
          const Comp = seg.onClick ? 'button' : 'div';
          return (
            <Comp
              key={seg.key}
              type={seg.onClick ? 'button' : undefined}
              onClick={seg.onClick}
              className={cn(
                'flex items-center justify-between gap-2 px-2 py-1.5 border border-border/60 bg-muted/15 text-[11px] min-w-0 transition-colors',
                seg.onClick && 'cursor-pointer hover:bg-muted/50',
                seg.active && 'bg-primary/10 border-primary/40',
              )}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <span className={cn('h-2 w-2 shrink-0', seg.dotColorClass)} />
                <span className="truncate font-medium text-foreground">{seg.label}</span>
              </span>
              <span className="font-mono text-[11px] shrink-0 tabular-nums">
                <strong className="text-foreground">{seg.count}</strong>
                <span className="text-muted-foreground ml-1">{pct}%</span>
              </span>
            </Comp>
          );
        })}
      </div>
    </div>
  );
}

export function StatsFilterRow({
  label,
  sublabel,
  count,
  percent,
  colorHex,
  active = false,
  onClick,
  countSuffix = '',
}: {
  label: string;
  sublabel?: string;
  count: number;
  percent: number;
  colorHex?: string;
  active?: boolean;
  onClick?: () => void;
  countSuffix?: string;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={onClick ? (active ? 'Filtrni tozalash' : `${label} bo‘yicha filtrlash`) : undefined}
      className={cn(
        'w-full text-left px-2.5 py-2 transition-colors space-y-1.5 border border-transparent',
        onClick && 'cursor-pointer hover:bg-muted/50',
        active && 'bg-primary/10 border-primary/35',
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          {colorHex && (
            <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: colorHex }} />
          )}
          <div className="min-w-0">
            <div
              className={cn(
                'truncate font-medium',
                active ? 'text-primary font-bold' : 'text-foreground',
              )}
            >
              {label}
            </div>
            {sublabel && (
              <div className="text-[10px] font-mono text-muted-foreground truncate">{sublabel}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0 tabular-nums">
          <strong className={active ? 'text-primary' : 'text-foreground'}>
            {new Intl.NumberFormat('uz-UZ').format(count)}
            {countSuffix}
          </strong>
          <span className="text-muted-foreground w-9 text-right">{percent}%</span>
        </div>
      </div>

      <div className="h-1 w-full bg-muted/65 overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${Math.min(100, Math.max(count > 0 ? 4 : 0, percent))}%`,
            backgroundColor: colorHex || 'var(--primary)',
          }}
        />
      </div>
    </Comp>
  );
}

export function StatsSheetSkeleton() {
  return (
    <div className="divide-y divide-border/70">
      <div className="p-4 space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 border border-border/70 bg-muted/15 space-y-2">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-6 w-14" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          ))}
        </div>
        <div className="p-3.5 border border-border/70 bg-muted/15 space-y-2">
          <Skeleton className="h-2.5 w-28" />
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-2.5 w-36" />
        </div>
      </div>
      <div className="p-4 space-y-2.5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-2.5 w-full" />
        <div className="grid grid-cols-2 gap-1.5">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
      <div className="p-4 space-y-2.5">
        <Skeleton className="h-3 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5 py-1">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-1 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
