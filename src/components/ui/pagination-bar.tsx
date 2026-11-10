import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from './button';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
  isLoading?: boolean;
}

export function PaginationBar({
  page,
  totalPages,
  total,
  limit,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  onLimitChange,
  isLoading,
}: PaginationBarProps) {
  if (total === 0) return null;

  const isAll = limit >= 10000 || limit >= total;
  const start = isAll ? 1 : (page - 1) * limit + 1;
  const end = isAll ? total : Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/60 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          Jami <span className="font-semibold text-foreground">{total}</span> ta yozuvdan{' '}
          <span className="font-semibold text-foreground">{start}</span>–
          <span className="font-semibold text-foreground">{end}</span> ko&apos;rsatilmoqda
          {isAll && total > 0 && (
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
              Barchasi
            </span>
          )}
        </div>

        {onLimitChange && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground hidden sm:inline">Ko&apos;rsatish:</span>
            <select
              value={limit >= 10000 ? 10000 : limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              disabled={isLoading}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
              title="Har sahifadagi yozuvlar soni"
            >
              <option value={25}>25 ta</option>
              <option value={50}>50 ta</option>
              <option value={100}>100 ta</option>
              <option value={200}>200 ta</option>
              <option value={10000}>Barchasi (All)</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs">
          Sahifa <strong className="text-foreground">{isAll ? 1 : page}</strong> /{' '}
          {isAll ? 1 : totalPages || 1}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPreviousPage || isAll || isLoading}
            className="h-8 w-8 p-0"
            title="Oldingi sahifa"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNextPage || isAll || isLoading}
            className="h-8 w-8 p-0"
            title="Keyingi sahifa"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
