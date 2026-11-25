import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Calendar, GitBranch, Loader2, Plus, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '@/hooks/use-permissions';
import { applicationsApi } from '@/lib/api';
import type { AppealType, ApplicationRepeatType } from '@/types/models';

const REPEAT_BADGE: Record<ApplicationRepeatType, { label: string; cls: string }> = {
  PRIMARY: {
    label: 'Birlamchi',
    cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  REPEAT: {
    label: 'Takroriy',
    cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
  DUPLICATE: {
    label: 'Dublikat',
    cls: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  },
  SUPPLEMENTAL: {
    label: 'Qo‘shimcha',
    cls: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
};

const APPEAL_LABEL: Record<AppealType, string> = {
  APPEAL: 'Ariza',
  COMPLAINT: 'Shikoyat',
  PROPOSAL: 'Taklif',
};

const formatDate = (d?: string | null) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return d;
  }
};

interface ApplicationChainCardProps {
  applicationId: string;
}

export function ApplicationChainCard({ applicationId }: ApplicationChainCardProps) {
  const navigate = useNavigate();
  const { canWrite } = usePermissions();

  const { data: chain, isLoading } = useQuery({
    queryKey: ['application-chain', applicationId],
    queryFn: () => applicationsApi.getChain(applicationId),
    enabled: Boolean(applicationId),
    staleTime: 30 * 1000,
  });

  const items = chain?.items || [];

  return (
    <Card className="border-border/80 bg-card/70 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <GitBranch className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <span>Murojaat zanjiri (Takroriy / Dublikat / Qo‘shimcha)</span>
                {items.length > 1 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {items.length} ta murojaat
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-[11px]">
                Birlamchi arizadan boshlab barcha qayta, dublikat va qo‘shimcha murojaatlar tarixi
              </CardDescription>
            </div>
          </div>

          {canWrite && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  navigate(`/applications/create?parentId=${applicationId}&repeatType=REPEAT`)
                }
                className="h-7 text-[11px] gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                Takroriy
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  navigate(`/applications/create?parentId=${applicationId}&repeatType=DUPLICATE`)
                }
                className="h-7 text-[11px] gap-1 border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                Dublikat
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  navigate(`/applications/create?parentId=${applicationId}&repeatType=SUPPLEMENTAL`)
                }
                className="h-7 text-[11px] gap-1 border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                Qo‘shimcha
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Zanjir yuklanmoqda...
          </div>
        ) : items.length <= 1 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-3 text-xs text-muted-foreground flex items-center justify-between gap-2">
            <span>
              Ushbu murojaatga hali takroriy, dublikat yoki qo‘shimcha ariza bog‘lanmagan.
            </span>
          </div>
        ) : (
          <div className="relative pl-5 space-y-2.5 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {items.map((item) => {
              const isCurrent = item.id === applicationId;
              const badge = REPEAT_BADGE[item.repeat_type] || REPEAT_BADGE.PRIMARY;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!isCurrent) navigate(`/applications/${item.id}`);
                  }}
                  className={`relative rounded-xl border p-3 transition-all ${
                    isCurrent
                      ? 'border-primary bg-primary/5 shadow-xs'
                      : 'border-border/70 bg-background/80 hover:border-primary/50 hover:bg-muted/30 cursor-pointer'
                  }`}
                >
                  <span
                    className={`absolute -left-[16px] top-4 h-3 w-3 rounded-full border-2 border-background ${
                      isCurrent
                        ? 'bg-primary ring-2 ring-primary/30'
                        : item.repeat_type === 'PRIMARY'
                          ? 'bg-emerald-500'
                          : item.repeat_type === 'REPEAT'
                            ? 'bg-amber-500'
                            : item.repeat_type === 'DUPLICATE'
                              ? 'bg-purple-500'
                              : 'bg-blue-500'
                    }`}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-foreground">
                        #{item.repeat_sequence}
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${badge.cls}`}>
                        {badge.label}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {APPEAL_LABEL[item.appeal_type] || 'Ariza'}
                      </Badge>
                      <span className="font-mono text-xs font-bold text-primary">
                        {item.application_number || 'Raqamsiz'}
                      </span>
                      {isCurrent && (
                        <Badge className="text-[10px] bg-primary text-primary-foreground">
                          Joriy
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(item.date)}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {item.status_name}
                      </Badge>
                      {!isCurrent && <ArrowUpRight className="h-3.5 w-3.5 text-primary" />}
                    </div>
                  </div>

                  {(item.repeat_reason || item.source_name || item.decision_type_name) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      {item.source_name && <span>Manba: {item.source_name}</span>}
                      {item.district_name && <span>Bo‘lim: {item.district_name}</span>}
                      {item.decision_type_name && (
                        <span className="text-foreground/80 font-medium">
                          Qaror: {item.decision_type_name}
                        </span>
                      )}
                      {item.repeat_reason && (
                        <span className="text-foreground/90 italic">«{item.repeat_reason}»</span>
                      )}
                    </div>
                  )}

                  {item.is_review_terminated && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        O‘RQ-445 30-modda: ko‘rib chiqish tugatilgan
                        {item.termination_note ? ` — ${item.termination_note}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
