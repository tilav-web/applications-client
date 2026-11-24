import { Check, ChevronDown, MapPin, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { matchesLatinSearch } from '@/lib/transliterate';
import type { District } from '@/types/models';

interface DistrictSearchSelectProps {
  districts: District[];
  value: string | null | undefined;
  onChange: (districtId: string | null, district?: District) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  /** Agar berilsa (masalan 'QASHQADARYO'), ro'yxatda faqat shu viloyat tumanlari chiqadi */
  onlyRegionCode?: string;
  /** True bo'lsa tumanlar viloyatlar bo'yicha guruhlab ko'rsatiladi (Yashash tumani uchun) */
  groupedByRegion?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const DEFAULT_REGION_CODE = 'QASHQADARYO';

export function DistrictSearchSelect({
  districts,
  value,
  onChange,
  placeholder = '-- TUMANNI TANLANG --',
  searchPlaceholder = 'Tuman yoki viloyat nomini qidiring...',
  onlyRegionCode,
  groupedByRegion = false,
  disabled = false,
  allowClear = true,
  size = 'md',
  className = '',
}: DistrictSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Tashqariga bosilganda yoki Escape bosilganda yopish
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Ochilganda qidiruv inputiga fokus berish
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 15);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const scopedDistricts = useMemo(() => {
    if (!onlyRegionCode) return districts;
    const target = onlyRegionCode.toUpperCase();
    const filtered = districts.filter((d) => {
      const rCode = d.region?.code?.toUpperCase();
      if (rCode) return rCode === target;
      // Agar region ulanmagan eski tuman bo'lsa faqat joriy tanlangan bo'lsagina ko'rsatamiz
      return false;
    });
    // Agar viloyat bo'yicha bitta ham topilmasa (masalan kesh eski), hamma tumanlarni fallback sifatida ko'rsatamiz
    return filtered.length > 0 ? filtered : districts;
  }, [districts, onlyRegionCode]);

  const selectedDistrict = useMemo(
    () => districts.find((d) => d.id === value) || null,
    [districts, value],
  );

  const filteredDistricts = useMemo(() => {
    const q = search.trim();
    if (!q) return scopedDistricts;
    return scopedDistricts.filter((d) => {
      const dName = d.name || '';
      const rName = d.region?.name || '';
      return matchesLatinSearch(dName, q) || matchesLatinSearch(rName, q);
    });
  }, [scopedDistricts, search]);

  const groupedList = useMemo(() => {
    if (!groupedByRegion) {
      return [
        {
          key: 'all',
          label: '',
          isDefault: true,
          items: [...filteredDistricts].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
        },
      ];
    }

    const map = new Map<
      string,
      { key: string; label: string; isDefault: boolean; items: District[] }
    >();

    for (const d of filteredDistricts) {
      const isDefault = d.region?.code?.toUpperCase() === DEFAULT_REGION_CODE;
      const key = d.region?.id || '__other__';
      const label = d.region?.name || 'Boshqa hududlar';
      if (!map.has(key)) {
        map.set(key, { key, label, isDefault, items: [] });
      }
      map.get(key)!.items.push(d);
    }

    const groups = Array.from(map.values());
    groups.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      if (a.key === '__other__') return 1;
      if (b.key === '__other__') return -1;
      return a.label.localeCompare(b.label);
    });
    for (const g of groups) {
      g.items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return groups;
  }, [filteredDistricts, groupedByRegion]);

  const heightCls = size === 'sm' ? 'h-9 px-3 py-1.5' : 'h-10 px-3 py-2';

  const handleSelect = (d: District) => {
    onChange(d.id, d);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setIsOpen((prev) => {
            if (prev) setSearch('');
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
          {selectedDistrict ? (
            <>
              <span className="uppercase text-foreground truncate">
                {selectedDistrict.name || '—'}
              </span>
              {groupedByRegion && selectedDistrict.region?.name && (
                <span className="text-[10px] font-medium normal-case text-muted-foreground shrink-0 hidden sm:inline">
                  ({selectedDistrict.region.name})
                </span>
              )}
            </>
          ) : (
            <span className="uppercase text-muted-foreground">{placeholder}</span>
          )}
        </span>

        <span className="flex items-center gap-1 shrink-0">
          {allowClear && selectedDistrict && !disabled && (
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
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {/* SELECT ICHIDAGI QIDIRUV INPUTI */}
          <div className="p-2 border-b border-border/70 bg-muted/20">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-8 rounded-md border border-input bg-background pl-8 pr-7 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* GURUHLANGAN YOKI ODDIY RO'YXAT */}
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredDistricts.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-muted-foreground">
                «{search}» bo‘yicha tuman topilmadi
              </div>
            ) : (
              groupedList.map((group) => (
                <div key={group.key} className="mb-1 last:mb-0">
                  {groupedByRegion && group.label && (
                    <div className="sticky top-0 z-10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-popover/95 backdrop-blur-xs border-b border-border/40 flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{group.label}</span>
                      <span className="ml-auto font-mono text-muted-foreground">
                        {group.items.length}
                      </span>
                    </div>
                  )}
                  <div className="py-0.5 space-y-0.5">
                    {group.items.map((d) => {
                      const isSelected = d.id === value;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => handleSelect(d)}
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-primary-foreground font-semibold'
                              : 'hover:bg-muted text-foreground font-medium'
                          }`}
                        >
                          <span className="uppercase truncate">{d.name || '—'}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
