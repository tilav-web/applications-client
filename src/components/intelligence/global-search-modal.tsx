import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowRightLeft,
  Clock,
  CreditCard,
  FileText,
  Fingerprint,
  Loader2,
  Phone,
  Search,
  ShieldAlert,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useDebounce } from '@/hooks/use-debounce';
import { intelligenceApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { GlobalSearchResultItem } from '@/types/models';

const RECENT_SEARCHES_KEY = 'global_recent_searches_v1';

const CATEGORIES = [
  { key: 'all', label: 'Barchasi' },
  { key: 'citizens', label: 'Fuqarolar' },
  { key: 'cards', label: 'Kartalar' },
  { key: 'phones', label: 'Telefonlar' },
  { key: 'identifiers', label: 'Raqamli izlar' },
  { key: 'applications', label: 'Arizalar' },
  { key: 'transfers', label: 'Oʻtkazmalar' },
] as const;

function formatSumCompact(amount: number): string {
  if (!amount || amount <= 0) return '';
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} mlrd UZS`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} mln UZS`;
  return `${new Intl.NumberFormat('uz-UZ').format(Math.round(amount))} UZS`;
}

function getCategoryIcon(category: GlobalSearchResultItem['category']) {
  switch (category) {
    case 'citizens':
      return <User className="h-4 w-4 text-blue-500" />;
    case 'cards':
      return <CreditCard className="h-4 w-4 text-amber-500" />;
    case 'phones':
      return <Phone className="h-4 w-4 text-emerald-500" />;
    case 'identifiers':
      return <Fingerprint className="h-4 w-4 text-purple-500" />;
    case 'applications':
      return <FileText className="h-4 w-4 text-primary" />;
    case 'transfers':
      return <ArrowRightLeft className="h-4 w-4 text-cyan-500" />;
  }
}

export function openGlobalSearchModal(initialQuery = '') {
  window.dispatchEvent(
    new CustomEvent('app:open-global-search', { detail: { query: initialQuery } }),
  );
}

export function GlobalSearchModal() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });

  const debouncedQuery = useDebounce(query, 220);

  // Global Ctrl+K / Cmd+K klaviatura tinglovchisi va maxsus event
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    const onCustomOpen = (e: Event) => {
      const custom = e as CustomEvent<{ query?: string }>;
      if (custom.detail?.query !== undefined) {
        setQuery(custom.detail.query);
      }
      setOpen(true);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('app:open-global-search', onCustomOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('app:open-global-search', onCustomOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: ['global-intelligence-search', debouncedQuery, category],
    queryFn: () =>
      intelligenceApi.globalSearch({
        q: debouncedQuery,
        category,
        limit: 35,
      }),
    enabled: open && debouncedQuery.trim().length >= 2,
    staleTime: 15_000,
  });

  const items = useMemo(() => data?.items || [], [data]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items.length, category, debouncedQuery]);

  const saveRecentSearch = useCallback((term: string) => {
    const clean = term.trim();
    if (clean.length < 2) return;
    setRecentSearches((prev) => {
      const next = [clean, ...prev.filter((item) => item !== clean)].slice(0, 6);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const handleSelectItem = useCallback(
    (item: GlobalSearchResultItem) => {
      saveRecentSearch(query);
      setOpen(false);
      navigate(item.targetRoute);
    },
    [navigate, query, saveRecentSearch],
  );

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (e.key === 'Enter' && items[selectedIndex]) {
      e.preventDefault();
      handleSelectItem(items[selectedIndex]);
    }
  };

  const renderBadge = (item: GlobalSearchResultItem) => {
    const styles: Record<GlobalSearchResultItem['badgeVariant'], string> = {
      danger: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold',
      warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      info: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      neutral: 'bg-muted text-muted-foreground border-border',
    };
    return (
      <Badge
        variant="outline"
        className={cn('text-[10px] px-1.5 py-0 h-5 shrink-0', styles[item.badgeVariant])}
      >
        {item.badgeVariant === 'danger' && <ShieldAlert className="w-2.5 h-2.5 mr-1" />}
        {item.badgeLabel}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden border-primary/30 shadow-2xl bg-card/95 backdrop-blur-xl">
        <DialogTitle className="sr-only">Tizim boʻyicha global qidiruv</DialogTitle>

        {/* Qidiruv kiritish qatori */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/80 bg-muted/20">
          {isFetching ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
          ) : (
            <Search className="h-5 w-5 text-primary shrink-0" />
          )}

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Qidirish (karta, telefon, F.I.Sh, JSHSHIR, ariza raqami...)"
            className="flex-1 bg-transparent text-sm sm:text-base font-medium text-foreground placeholder:text-muted-foreground/65 focus:outline-none pr-6"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer mr-5"
              title="Tozalash"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Kategoriya Tablari */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/60 bg-background/50 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => {
            const count =
              cat.key === 'all' ? data?.totalCount || 0 : data?.countsByCategory?.[cat.key] || 0;
            const active = category === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer',
                  active
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
              >
                <span>{cat.label}</span>
                {debouncedQuery.trim().length >= 2 && (
                  <span
                    className={cn(
                      'text-[10px] font-mono px-1 rounded',
                      active
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Natijalar Ro'yxati */}
        <div className="max-h-[62vh] overflow-y-auto p-2">
          {debouncedQuery.trim().length < 2 ? (
            recentSearches.length > 0 ? (
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Soʻnggi qidiruvlar
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setRecentSearches([]);
                      localStorage.removeItem(RECENT_SEARCHES_KEY);
                    }}
                    className="text-[11px] hover:text-rose-500 cursor-pointer"
                  >
                    Tozalash
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setQuery(term)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-muted/40 hover:bg-primary/10 hover:border-primary/40 text-xs font-mono text-foreground transition-colors cursor-pointer"
                    >
                      <Search className="h-3 w-3 text-muted-foreground" />
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Qidirish uchun kamida 2 ta belgi kiriting
              </div>
            )
          ) : items.length === 0 && !isFetching ? (
            <div className="py-12 text-center space-y-2">
              <Search className="h-9 w-9 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-semibold text-foreground">
                &ldquo;{debouncedQuery}&rdquo; boʻyicha hech qanday maʼlumot topilmadi
              </p>
              <p className="text-xs text-muted-foreground">
                Raqamning bir qismini, familiyani yoki Telegram nikni qisqaroq yozib koʻring
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const formattedAmount = formatSumCompact(item.totalAmount);

                return (
                  <div
                    key={`${item.category}-${item.id}`}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => handleSelectItem(item)}
                    className={cn(
                      'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border',
                      isSelected
                        ? 'bg-primary/10 border-primary/40 shadow-xs'
                        : 'bg-transparent border-transparent hover:bg-muted/50',
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg border border-border/80 bg-background flex items-center justify-center shrink-0">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-foreground truncate font-mono">
                            {item.title}
                          </span>
                          {renderBadge(item)}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right hidden sm:block">
                        {item.appsCount > 0 && (
                          <span className="text-[11px] font-semibold text-foreground block">
                            {item.appsCount} ta ariza
                          </span>
                        )}
                        {formattedAmount && (
                          <span className="text-[11px] font-mono font-bold text-rose-500 flex items-center justify-end gap-0.5">
                            <TrendingUp className="h-3 w-3" />
                            {formattedAmount}
                          </span>
                        )}
                      </div>
                      <ArrowRight
                        className={cn(
                          'h-4 w-4 transition-transform',
                          isSelected ? 'text-primary translate-x-0.5' : 'text-muted-foreground/40',
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
