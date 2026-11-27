import {
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Filter,
  Loader2,
  RefreshCw,
  RotateCcw,
  X,
} from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TableFilterPanelProps {
  title?: string;
  activeFiltersCount: number;
  onClearAll: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onExportExcel?: () => void;
  isExporting?: boolean;
  exportLabel?: string;
  /** Tanlangan qatorlar uchun TableActionSelect yoki qo'shimcha element */
  selectionSlot?: React.ReactNode;
  /** O'ng tomonda qo'shimcha ma'lumot yoki tugma */
  rightExtraSlot?: React.ReactNode;
  /** Grid ustunlar klassi (default: 4 ustunli moslashuvchan setka) */
  gridClassName?: string;
  defaultOpen?: boolean;
  /** localStorage kaliti (berilmasa sahifa yo'li + sarlavha bo'yicha avtomatik saqlanadi) */
  storageKey?: string;
  children: React.ReactNode;
}

const FILTER_PANEL_STORAGE_PREFIX = 'uvd_filter_panel_open:';

function readPersistedFilterOpen(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === 'true' || raw === '1') return true;
    if (raw === 'false' || raw === '0') return false;
  } catch {
    // localStorage mavjud bo'lmasa fallback ishlatiladi
  }
  return fallback;
}

export const TableFilterPanel: React.FC<TableFilterPanelProps> = ({
  title = 'Aniq qidiruv va filtrlar',
  activeFiltersCount,
  onClearAll,
  onRefresh,
  isRefreshing = false,
  onExportExcel,
  isExporting = false,
  exportLabel = 'Excel yuklab olish',
  selectionSlot,
  rightExtraSlot,
  gridClassName = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
  defaultOpen = false,
  storageKey,
  children,
}) => {
  const resolvedStorageKey =
    storageKey ||
    `${FILTER_PANEL_STORAGE_PREFIX}${typeof window !== 'undefined' ? window.location.pathname : ''}:${title}`;

  const [isOpen, setIsOpen] = useState<boolean>(() =>
    readPersistedFilterOpen(resolvedStorageKey, defaultOpen),
  );

  const handleToggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(resolvedStorageKey, next ? '1' : '0');
      } catch {
        // ignore storage quota / privacy mode errors
      }
      return next;
    });
  };

  return (
    <Card className="py-0 gap-0 border-border/80 bg-card/75 backdrop-blur-sm shadow-2xs overflow-hidden min-w-0">
      {/* Yuqori Boshqaruv Qatori */}
      <div
        className={cn(
          'px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 bg-muted/25',
          isOpen && 'border-b border-border/60',
        )}
      >
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleToggleOpen}
            className="inline-flex items-center gap-2 h-8 px-2.5 rounded-lg border border-border/80 bg-background/80 hover:bg-muted/70 text-xs font-semibold text-foreground transition-colors cursor-pointer shrink-0"
          >
            <Filter className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{title}</span>
            {activeFiltersCount > 0 && (
              <Badge className="h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground font-mono">
                {activeFiltersCount}
              </Badge>
            )}
            {isOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>

          {selectionSlot}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {rightExtraSlot}

          {activeFiltersCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearAll}
              className="h-8 text-xs gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer font-medium"
              title="Barcha filtrlarni tozalash"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Tozalash ({activeFiltersCount})</span>
            </Button>
          )}

          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0 border-border/80 hover:bg-muted/80 cursor-pointer shrink-0"
              title="Ma'lumotlarni yangilash"
              aria-label="Ma'lumotlarni yangilash"
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin text-primary')}
              />
            </Button>
          )}

          {onExportExcel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExportExcel}
              disabled={isExporting}
              className="h-8 text-xs gap-1.5 font-medium border-emerald-500/35 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 cursor-pointer shadow-2xs"
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span className="hidden sm:inline">{exportLabel}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Aniq Alohida Filtr Inputlari Setkasi */}
      {isOpen && <div className={cn('p-3.5 grid gap-3 min-w-0', gridClassName)}>{children}</div>}
    </Card>
  );
};

interface FilterInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'date' | 'number';
  icon?: React.ReactNode;
  mono?: boolean;
  className?: string;
}

export const FilterInput: React.FC<FilterInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon,
  mono = false,
  className,
}) => {
  const hasValue = Boolean(value && value.trim());

  return (
    <div className={cn('space-y-1 min-w-0', className)}>
      <label className="block text-[11px] font-semibold text-muted-foreground truncate">
        {label}
      </label>
      <div className="relative min-w-0">
        {icon && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'h-8 text-xs bg-background/90 transition-colors',
            icon ? 'pl-8' : 'pl-2.5',
            hasValue ? 'pr-7 border-primary/50 bg-primary/[0.03]' : 'pr-2.5',
            mono && 'font-mono',
            type === 'date' && '[color-scheme:light] dark:[color-scheme:dark]',
          )}
        />
        {hasValue && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive p-0.5 rounded cursor-pointer"
            title="Tozalash"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
};

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  label,
  value,
  onChange,
  children,
  className,
}) => {
  const hasValue = Boolean(value && value.trim());

  return (
    <div className={cn('space-y-1 min-w-0', className)}>
      <label className="block text-[11px] font-semibold text-muted-foreground truncate">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-8 w-full rounded-md border bg-background/90 px-2.5 text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer truncate transition-colors',
          hasValue
            ? 'border-primary/50 bg-primary/[0.03] text-primary font-semibold'
            : 'border-input',
        )}
      >
        {children}
      </select>
    </div>
  );
};
