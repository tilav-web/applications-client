import { Check, ChevronDown, Minus, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function useTableSelection<T extends { id: string }>(items: T[] = []) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const validSelectedIds = useMemo(() => {
    if (selectedIds.length === 0) return [];
    const currentSet = new Set(items.map((i) => i.id));
    return selectedIds.filter((id) => currentSet.has(id));
  }, [items, selectedIds]);

  const selectedSet = useMemo(() => new Set(validSelectedIds), [validSelectedIds]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedSet.has(item.id)),
    [items, selectedSet],
  );

  const singleSelected = selectedItems.length === 1 ? selectedItems[0] : null;
  const allSelected = items.length > 0 && validSelectedIds.length === items.length;
  const someSelected = validSelectedIds.length > 0 && !allSelected;

  const isSelected = useCallback((id: string) => selectedSet.has(id), [selectedSet]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const itemIds = items.map((i) => i.id);
      const allInPrev = itemIds.length > 0 && itemIds.every((id) => prev.includes(id));
      return allInPrev ? [] : itemIds;
    });
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return {
    selectedIds: validSelectedIds,
    selectedItems,
    singleSelected,
    allSelected,
    someSelected,
    isSelected,
    toggleOne,
    toggleAll,
    clearSelection,
  };
}

interface TableCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel?: string;
}

export const TableCheckbox: React.FC<TableCheckboxProps> = ({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel = 'Tanlash',
}) => {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={cn(
        'h-4 w-4 rounded-[4px] border flex items-center justify-center transition-all cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        checked || indeterminate
          ? 'bg-primary border-primary text-primary-foreground shadow-2xs'
          : 'bg-background border-muted-foreground/45 hover:border-primary',
      )}
    >
      {indeterminate ? (
        <Minus className="h-3 w-3 stroke-[3]" />
      ) : checked ? (
        <Check className="h-3 w-3 stroke-[3]" />
      ) : null}
    </button>
  );
};

interface TableActionSelectProps {
  selectedCount: number;
  singleLabel?: string | null;
  onClear: () => void;
  children: React.ReactNode;
}

/**
 * Qidiruv (Search) inputining o'ng yonida chiqadigan Select uslubidagi Amallar menyusi
 */
export const TableActionSelect: React.FC<TableActionSelectProps> = ({
  selectedCount,
  singleLabel,
  onClear,
  children,
}) => {
  useEffect(() => {
    if (selectedCount === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClear();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedCount, onClear]);

  if (selectedCount === 0) return null;

  return (
    <div className="inline-flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150 shrink-0 max-w-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-between gap-2 h-9 px-3 min-w-[165px] sm:min-w-[205px] max-w-full rounded-lg border border-primary/50 bg-primary/[0.07] hover:bg-primary/[0.12] text-xs font-semibold text-foreground shadow-2xs transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="inline-flex h-5 min-w-5 px-1.5 items-center justify-center rounded bg-primary text-primary-foreground text-[11px] font-bold font-mono shrink-0">
                {selectedCount}
              </span>
              <span className="truncate text-primary font-bold">
                {selectedCount === 1 ? 'Amalni tanlang...' : `${selectedCount} ta: Amallar...`}
              </span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-primary shrink-0" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-60 p-1.5">
          <DropdownMenuLabel className="text-[11px] text-muted-foreground flex items-center justify-between py-1 px-2">
            <span>
              {selectedCount === 1
                ? singleLabel || '1 ta yozuv tanlandi'
                : `${selectedCount} ta yozuv tanlandi`}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {children}
          <DropdownMenuSeparator />
          <button
            type="button"
            onClick={onClear}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            <span>Tanlovni bekor qilish (Esc)</span>
          </button>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={onClear}
        className="h-9 w-9 rounded-lg border border-border/80 bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shrink-0"
        title="Tanlovni tozalash (Esc)"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
