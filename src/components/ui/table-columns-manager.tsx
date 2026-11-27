import { ArrowDown, ArrowUp, Check, Columns3, RotateCcw, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TableColumnDef {
  id: string;
  label: string;
  defaultVisible?: boolean;
  /** Agar true bo'lsa, ustun yashirib bo'lmaydi */
  locked?: boolean;
}

interface PersistedColumnsState {
  visibleIds: string[];
  order: string[];
}

const STORAGE_PREFIX = 'uvd_table_columns:';

function readPersistedColumns(
  storageKey: string,
  columns: readonly TableColumnDef[],
): PersistedColumnsState {
  const defaultOrder = columns.map((c) => c.id);
  const defaultVisible = columns.filter((c) => c.defaultVisible !== false).map((c) => c.id);
  const validIdSet = new Set(defaultOrder);
  const lockedIds = columns.filter((c) => c.locked).map((c) => c.id);

  if (typeof window === 'undefined') {
    return { visibleIds: defaultVisible, order: defaultOrder };
  }

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
    if (!raw) return { visibleIds: defaultVisible, order: defaultOrder };
    const parsed = JSON.parse(raw) as Partial<PersistedColumnsState>;

    const savedOrder = Array.isArray(parsed.order)
      ? parsed.order.filter((id): id is string => typeof id === 'string' && validIdSet.has(id))
      : [];
    const seenOrder = new Set(savedOrder);
    const mergedOrder = [...savedOrder];
    for (const id of defaultOrder) {
      if (!seenOrder.has(id)) mergedOrder.push(id);
    }

    const savedVisible = Array.isArray(parsed.visibleIds)
      ? parsed.visibleIds.filter((id): id is string => typeof id === 'string' && validIdSet.has(id))
      : defaultVisible;

    const visibleSet = new Set(savedVisible);
    for (const lid of lockedIds) visibleSet.add(lid);

    // Agar tasodifan hammasi o'chib qolgan bo'lsa defaultlarni tiklaymiz
    if (visibleSet.size === 0) {
      for (const id of defaultVisible) visibleSet.add(id);
    }

    return {
      visibleIds: mergedOrder.filter((id) => visibleSet.has(id)),
      order: mergedOrder,
    };
  } catch {
    return { visibleIds: defaultVisible, order: defaultOrder };
  }
}

function savePersistedColumns(storageKey: string, state: PersistedColumnsState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, JSON.stringify(state));
  } catch {
    // localStorage cheklangan rejimda e'tiborsiz qoldiriladi
  }
}

export function useTableColumns<T extends TableColumnDef>(
  storageKey: string,
  columns: readonly T[],
) {
  const [state, setState] = useState<PersistedColumnsState>(() =>
    readPersistedColumns(storageKey, columns),
  );

  const columnMap = useMemo(() => {
    const m = new Map<string, T>();
    for (const col of columns) m.set(col.id, col);
    return m;
  }, [columns]);

  const visibleSet = useMemo(() => new Set(state.visibleIds), [state.visibleIds]);

  const orderedColumns = useMemo(() => {
    const list: T[] = [];
    const seen = new Set<string>();
    for (const id of state.order) {
      const col = columnMap.get(id);
      if (col && !seen.has(id)) {
        list.push(col);
        seen.add(id);
      }
    }
    for (const col of columns) {
      if (!seen.has(col.id)) {
        list.push(col);
        seen.add(col.id);
      }
    }
    return list;
  }, [state.order, columnMap, columns]);

  const visibleColumns = useMemo(
    () => orderedColumns.filter((c) => visibleSet.has(c.id)),
    [orderedColumns, visibleSet],
  );

  const defaultOrder = useMemo(() => columns.map((c) => c.id), [columns]);
  const defaultVisibleIds = useMemo(
    () => columns.filter((c) => c.defaultVisible !== false).map((c) => c.id),
    [columns],
  );

  const isCustomized = useMemo(() => {
    if (state.visibleIds.length !== defaultVisibleIds.length) return true;
    for (let i = 0; i < state.visibleIds.length; i++) {
      if (state.visibleIds[i] !== defaultVisibleIds[i]) return true;
    }
    if (state.order.length !== defaultOrder.length) return true;
    for (let i = 0; i < state.order.length; i++) {
      if (state.order[i] !== defaultOrder[i]) return true;
    }
    return false;
  }, [state.visibleIds, state.order, defaultVisibleIds, defaultOrder]);

  const updateState = (updater: (prev: PersistedColumnsState) => PersistedColumnsState) => {
    setState((prev) => {
      const next = updater(prev);
      savePersistedColumns(storageKey, next);
      return next;
    });
  };

  const toggleColumn = (id: string) => {
    const col = columnMap.get(id);
    if (!col || col.locked) return;
    updateState((prev) => {
      const exists = prev.visibleIds.includes(id);
      if (exists && prev.visibleIds.length <= 1) {
        // Kamida 1 ta ustun ko'rinib turishi shart
        return prev;
      }
      const nextSet = new Set(prev.visibleIds);
      if (exists) nextSet.delete(id);
      else nextSet.add(id);
      return {
        ...prev,
        visibleIds: prev.order.filter((colId) => nextSet.has(colId)),
      };
    });
  };

  const moveColumn = (id: string, direction: 'up' | 'down') => {
    updateState((prev) => {
      const idx = prev.order.indexOf(id);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.order.length) return prev;
      const nextOrder = [...prev.order];
      const [moved] = nextOrder.splice(idx, 1);
      nextOrder.splice(targetIdx, 0, moved);
      const visSet = new Set(prev.visibleIds);
      return {
        order: nextOrder,
        visibleIds: nextOrder.filter((colId) => visSet.has(colId)),
      };
    });
  };

  const showAll = () => {
    updateState((prev) => ({
      ...prev,
      visibleIds: [...prev.order],
    }));
  };

  const resetDefaults = () => {
    const next: PersistedColumnsState = {
      order: defaultOrder,
      visibleIds: defaultVisibleIds,
    };
    setState(next);
    savePersistedColumns(storageKey, next);
  };

  return {
    orderedColumns,
    visibleColumns,
    visibleSet,
    isCustomized,
    toggleColumn,
    moveColumn,
    showAll,
    resetDefaults,
  };
}

interface TableColumnsManagerProps {
  orderedColumns: readonly TableColumnDef[];
  visibleSet: ReadonlySet<string>;
  isCustomized: boolean;
  onToggle: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onShowAll: () => void;
  onReset: () => void;
  className?: string;
}

export function TableColumnsManager({
  orderedColumns,
  visibleSet,
  isCustomized,
  onToggle,
  onMove,
  onShowAll,
  onReset,
  className,
}: TableColumnsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const filteredColumns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orderedColumns;
    return orderedColumns.filter((col) => col.label.toLowerCase().includes(q));
  }, [orderedColumns, search]);

  const visibleCount = visibleSet.size;
  const totalCount = orderedColumns.length;
  const isSearching = search.trim().length > 0;

  return (
    <div ref={containerRef} className={cn('relative inline-flex', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'h-7 px-2.5 text-[11px] font-semibold gap-1.5 cursor-pointer bg-background hover:bg-muted/70',
          (isOpen || isCustomized) && 'border-primary/50 text-foreground',
        )}
      >
        <Columns3 className="h-3.5 w-3.5 text-primary shrink-0" />
        <span>Ustunlar</span>
        <Badge
          variant="secondary"
          className={cn(
            'h-4 px-1.5 text-[10px] font-mono',
            isCustomized && 'bg-primary/12 text-primary border border-primary/30',
          )}
        >
          {visibleCount}/{totalCount}
        </Badge>
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-76 sm:w-80 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-border/70 bg-muted/25 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-foreground">Jadval ustunlari</span>
            <div className="flex items-center gap-2">
              {visibleCount < totalCount && (
                <button
                  type="button"
                  onClick={onShowAll}
                  className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  Barchasi
                </button>
              )}
              {isCustomized && (
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Standart holatga qaytarish"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Standart</span>
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          {totalCount > 8 && (
            <div className="p-2 border-b border-border/60 bg-muted/10">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ustun nomini qidiring..."
                  className="w-full h-7.5 rounded-md border border-input bg-background pl-8 pr-7 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Column List */}
          <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
            {filteredColumns.length === 0 ? (
              <div className="py-5 text-center text-xs text-muted-foreground">Ustun topilmadi</div>
            ) : (
              filteredColumns.map((col, idx) => {
                const checked = visibleSet.has(col.id);
                const isOnlyVisible = checked && visibleCount <= 1;
                const disabled = Boolean(col.locked || isOnlyVisible);
                return (
                  <div
                    key={col.id}
                    className={cn(
                      'group flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors',
                      checked ? 'hover:bg-muted/70' : 'hover:bg-muted/40 opacity-80',
                    )}
                  >
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onToggle(col.id)}
                      className={cn(
                        'flex-1 flex items-center gap-2.5 text-left min-w-0',
                        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                          checked
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-input bg-background',
                        )}
                      >
                        {checked && <Check className="h-3 w-3 stroke-[2.5]" />}
                      </span>
                      <span
                        className={cn(
                          'truncate',
                          checked
                            ? 'font-semibold text-foreground'
                            : 'font-medium text-muted-foreground',
                        )}
                      >
                        {col.label}
                      </span>
                    </button>

                    {/* Ustun tartibini o'zgartirish */}
                    {!isSearching && (
                      <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => onMove(col.id, 'up')}
                          className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                          title="Yuqoriga (chapga) surish"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === orderedColumns.length - 1}
                          onClick={() => onMove(col.id, 'down')}
                          className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                          title="Pastga (o‘ngga) surish"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
