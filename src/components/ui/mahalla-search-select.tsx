import { Check, ChevronDown, Loader2, Plus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { matchesLatinSearch } from '@/lib/transliterate';
import type { Neighborhood } from '@/types/models';

interface MahallaSearchSelectProps {
  mahallas: Neighborhood[];
  value: string | null | undefined;
  onChange: (mahallaId: string | null, mahalla?: Neighborhood) => void;
  placeholder?: string;
  disabledPlaceholder?: string;
  searchPlaceholder?: string;
  /** Qidirilgan mahalla topilmasa yoki yangi mahalla qo'shish uchun callback */
  onQuickAdd?: (searchQuery: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function MahallaSearchSelect({
  mahallas,
  value,
  onChange,
  placeholder = '-- MAHALLANI TANLANG --',
  disabledPlaceholder = 'AVVAL TUMANNI TANLANG...',
  searchPlaceholder = 'Mahalla nomini qidiring...',
  onQuickAdd,
  isLoading = false,
  disabled = false,
  allowClear = true,
  size = 'md',
  className = '',
}: MahallaSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const open = isOpen && !disabled;

  // Tashqariga bosilganda yoki Escape bosilganda yopish
  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Ochilganda qidiruv inputiga fokus berish
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 15);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const selectedMahalla = useMemo(
    () => mahallas.find((m) => m.id === value) || null,
    [mahallas, value],
  );

  const filteredMahallas = useMemo(() => {
    const q = search.trim();
    const list = q ? mahallas.filter((m) => matchesLatinSearch(m.name || '', q)) : mahallas;
    return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [mahallas, search]);

  const safeActiveIndex =
    filteredMahallas.length > 0 ? Math.min(activeIndex, filteredMahallas.length - 1) : -1;

  const heightCls = size === 'sm' ? 'h-9 px-3 py-1.5' : 'h-10 px-3 py-2';

  const handleSelect = (m: Neighborhood) => {
    onChange(m.id, m);
    setIsOpen(false);
    setSearch('');
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredMahallas.length > 0) {
        setActiveIndex((prev) => (prev + 1) % filteredMahallas.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredMahallas.length > 0) {
        setActiveIndex((prev) => (prev - 1 + filteredMahallas.length) % filteredMahallas.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (safeActiveIndex >= 0 && filteredMahallas[safeActiveIndex]) {
        handleSelect(filteredMahallas[safeActiveIndex]);
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setIsOpen((prev) => {
            if (prev) {
              setSearch('');
            } else {
              setActiveIndex(0);
            }
            return !prev;
          });
        }}
        className={`${heightCls} w-full rounded-md border border-input bg-background text-left text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-ring flex items-center justify-between gap-2 transition-colors ${
          disabled
            ? 'bg-muted/50 cursor-not-allowed opacity-60 text-muted-foreground'
            : 'cursor-pointer hover:border-primary/50'
        }`}
      >
        <span className="truncate flex items-center gap-1.5 min-w-0">
          {selectedMahalla ? (
            <span className="uppercase text-foreground truncate">
              {selectedMahalla.name || '—'}
            </span>
          ) : (
            <span className="uppercase text-muted-foreground">
              {disabled ? disabledPlaceholder : isLoading ? 'YUKLANMOQDA...' : placeholder}
            </span>
          )}
        </span>

        <span className="flex items-center gap-1 shrink-0">
          {isLoading && !disabled && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
          {allowClear && selectedMahalla && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange(null, undefined);
              }}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Tozalash"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-150 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {/* SELECT ICHIDAGI QIDIRUV INPUTI */}
          <div className="p-2 border-b border-border/70 bg-muted/20">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                className="w-full h-8 rounded-md border border-input bg-background pl-8 pr-7 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setActiveIndex(0);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* MAHALLALAR RO'YXATI */}
          <div className="max-h-64 overflow-y-auto p-1">
            {isLoading ? (
              <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Mahallalar yuklanmoqda...
              </div>
            ) : filteredMahallas.length === 0 ? (
              <div className="py-5 px-3 text-center space-y-2.5">
                <p className="text-xs text-muted-foreground">
                  {search.trim()
                    ? `«${search.trim()}» bo‘yicha mahalla topilmadi`
                    : 'Ushbu tumanda mahallalar kiritilmagan'}
                </p>
                {onQuickAdd && (
                  <button
                    type="button"
                    onClick={() => {
                      const q = search.trim();
                      setIsOpen(false);
                      setSearch('');
                      onQuickAdd(q);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {search.trim()
                      ? `«${search.trim()}» — yangi mahalla qo‘shish`
                      : 'Yangi mahalla qo‘shish'}
                  </button>
                )}
              </div>
            ) : (
              <div className="py-0.5 space-y-0.5">
                {filteredMahallas.map((m, idx) => {
                  const isSelected = m.id === value;
                  const isHighlighted = idx === safeActiveIndex && !isSelected;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => handleSelect(m)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : isHighlighted
                            ? 'bg-muted text-foreground font-medium'
                            : 'hover:bg-muted text-foreground font-medium'
                      }`}
                    >
                      <span className="uppercase truncate">{m.name || '—'}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {onQuickAdd && filteredMahallas.length > 0 && (
            <div className="border-t border-border/70 bg-muted/20 p-1.5">
              <button
                type="button"
                onClick={() => {
                  const q = search.trim();
                  setIsOpen(false);
                  setSearch('');
                  onQuickAdd(q);
                }}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Yangi mahalla qo‘shish
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
