import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, Radar, ShieldAlert, TrendingUp, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebounce } from '@/hooks/use-debounce';
import { intelligenceApi } from '@/lib/api';
import { cn } from '@/lib/utils';

interface LiveRadarBadgeProps {
  type: string;
  value: string;
  excludeAppId?: string;
  className?: string;
}

const formatMoney = (val?: number | null) => {
  if (!val) return '0 UZS';
  return `${new Intl.NumberFormat('uz-UZ').format(Math.round(val))} UZS`;
};

export function LiveRadarBadge({ type, value, excludeAppId, className }: LiveRadarBadgeProps) {
  const navigate = useNavigate();
  const debouncedValue = useDebounce((value || '').trim(), 380);

  const { data } = useQuery({
    queryKey: ['intelligence-live-radar', type, debouncedValue, excludeAppId],
    queryFn: () =>
      intelligenceApi.checkRadar({
        type,
        value: debouncedValue,
        excludeAppId,
      }),
    enabled: debouncedValue.length >= 4,
    staleTime: 20_000,
  });

  if (!data?.found) return null;

  const isDangerous = data.suspectCount > 0;
  const hasApps = data.appsCount > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold transition-all cursor-pointer shrink-0 shadow-2xs',
            isDangerous
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 hover:bg-rose-500/25 animate-pulse'
              : hasApps
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25',
            className,
          )}
          title="Bazadagi bog'liqliklarni ko'rish uchun bosing"
        >
          {isDangerous ? (
            <ShieldAlert className="h-3 w-3 shrink-0" />
          ) : hasApps ? (
            <Radar className="h-3 w-3 shrink-0" />
          ) : (
            <CheckCircle2 className="h-3 w-3 shrink-0" />
          )}
          <span>
            {hasApps ? `${data.appsCount} ta ariza` : data.ownerCitizen ? 'Bazada bor' : 'Topildi'}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)] p-3.5 space-y-3 shadow-xl border-primary/30 overflow-hidden"
      >
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Radar
                className={cn('h-4 w-4 shrink-0', isDangerous ? 'text-rose-500' : 'text-primary')}
              />
              <span>Jonli Radar Maʼlumoti</span>
            </div>
            <p className="text-xs font-mono font-semibold text-primary mt-0.5 break-all">
              {data.title}
            </p>
            {data.subtitle && (
              <p className="text-[11px] text-muted-foreground break-words">{data.subtitle}</p>
            )}
          </div>

          {isDangerous ? (
            <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px]">
              Xavfli ({data.suspectCount})
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              Bazada mavjud
            </Badge>
          )}
        </div>

        {data.ownerCitizen && (
          <div className="rounded-lg border border-border bg-muted/40 p-2 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-semibold truncate">{data.ownerCitizen.fullName}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/citizens/${data.ownerCitizen!.id}`)}
              className="text-[11px] text-primary hover:underline shrink-0 cursor-pointer"
            >
              Profil ➔
            </button>
          </div>
        )}

        {data.totalLoss > 0 && (
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-muted-foreground">Jami bogʻliq zarar:</span>
            <span className="font-mono font-bold text-rose-500 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {formatMoney(data.totalLoss)}
            </span>
          </div>
        )}

        {data.recentApplications.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-border/60">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Uchragan arizalar:
            </span>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {data.recentApplications.map((ra) => (
                <div
                  key={ra.id}
                  onClick={() => navigate(`/applications/${ra.id}`)}
                  className="flex items-center justify-between text-xs p-1.5 rounded-md hover:bg-muted cursor-pointer"
                >
                  <span className="font-mono font-bold text-primary">
                    № {ra.application_number}
                  </span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {ra.role}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.targetRoute && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => navigate(data.targetRoute!)}
            className="w-full h-8 text-xs gap-1.5 cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>360° Tahliliy Dosyeni ochish</span>
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
