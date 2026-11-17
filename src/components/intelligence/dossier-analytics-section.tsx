import {
  Calendar,
  Clock,
  CreditCard,
  ExternalLink,
  FileImage,
  Fingerprint,
  MapPin,
  Phone,
  Scale,
  Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getFileViewUrl } from '@/lib/api';
import type { CoOccurringClueItem, DossierMicroStats } from '@/types/models';

interface DossierAnalyticsSectionProps {
  stats: DossierMicroStats;
  coOccurringClues: CoOccurringClueItem[];
  evidenceFiles: {
    url: string;
    title: string;
    application_id: string;
    application_number: string;
    is_image: boolean;
  }[];
}

const formatMoney = (val?: number | null) =>
  `${new Intl.NumberFormat('uz-UZ').format(Math.round(Number(val || 0)))} UZS`;

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

export function DossierAnalyticsSection({
  stats,
  coOccurringClues,
  evidenceFiles,
}: DossierAnalyticsSectionProps) {
  const navigate = useNavigate();
  const maxHourCount = Math.max(...stats.hourlyDistribution.map((h) => h.count), 1);

  return (
    <div className="space-y-6 min-w-0">
      {/* 1. Vaqt va Faollik Ko'rsatkichlari */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden">
          <CardContent className="p-4 space-y-1 min-w-0">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="break-words">Birinchi marta qayd etilgan (First Seen)</span>
            </span>
            <p className="text-lg font-extrabold font-mono text-foreground break-words">
              {formatDate(stats.firstSeenDate)}
            </p>
          </CardContent>
        </Card>

        <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden">
          <CardContent className="p-4 space-y-1 min-w-0">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="break-words">Oxirgi faollik sanasi (Last Seen)</span>
            </span>
            <p className="text-lg font-extrabold font-mono text-foreground break-words">
              {formatDate(stats.lastSeenDate)}
            </p>
          </CardContent>
        </Card>

        <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden">
          <CardContent className="p-4 space-y-1 min-w-0">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="break-words">Faollik davomiyligi & Oʻrtacha chek</span>
            </span>
            <p className="text-base sm:text-lg font-extrabold font-mono text-foreground break-words">
              {stats.activeSpanDays} kun · {formatMoney(stats.avgTransactionAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Soatbay faollik, Tumanlar geografiyasi, To'lov tizimlari va JK moddalari */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Soatbay o'tkazmalar faolligi */}
        <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <span className="break-words">
                Sutka soatlari boʻyicha faollik (Kunduzgi / Tungi oʻtkazmalar)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2.5 min-w-0">
            {stats.hourlyDistribution.map((h) => {
              const pct = Math.round((h.count / maxHourCount) * 100);
              return (
                <div key={h.slot} className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                    <span className="font-mono text-muted-foreground">{h.slot}</span>
                    <span className="font-semibold break-words">
                      {h.count} ta ({formatMoney(h.amount)})
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.max(pct, h.count > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Tumanlar geografiyasi va To'lov provayderlari */}
        <div className="space-y-4 min-w-0">
          <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
                <span className="break-words">Hududlar (Tumanlar) kesimida bogʻliq arizalar</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 min-w-0">
              {stats.byDistrict.length === 0 ? (
                <p className="text-xs text-muted-foreground">Maʼlumot mavjud emas</p>
              ) : (
                <div className="space-y-2">
                  {stats.byDistrict.map((d) => (
                    <div
                      key={d.name}
                      className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-border/50 pb-1.5 last:border-0"
                    >
                      <span className="font-medium text-foreground break-words">{d.name}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {d.count} ta ish
                        </Badge>
                        <span className="font-mono font-bold text-rose-500">
                          {formatMoney(d.loss)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="break-words">Toʻlov tizimlari va JK Moddalari</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3 min-w-0">
              <div className="flex flex-wrap gap-1.5 min-w-0">
                {stats.byPaymentProvider.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Provayderlar yoʻq</span>
                ) : (
                  stats.byPaymentProvider.map((p) => (
                    <Badge
                      key={p.name}
                      variant="outline"
                      className="h-auto py-1 whitespace-normal break-words max-w-full text-xs gap-1"
                    >
                      <strong>{p.name}:</strong> {p.count} ta ({formatMoney(p.amount)})
                    </Badge>
                  ))
                )}
              </div>

              {stats.byCrime.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50 min-w-0">
                  {stats.byCrime.map((c) => (
                    <Badge
                      key={c.article}
                      className="h-auto py-1 whitespace-normal break-words max-w-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 text-xs gap-1"
                    >
                      <Scale className="h-3 w-3 shrink-0" />
                      <span>
                        {c.article} ({c.count})
                      </span>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3. Birga Uchragan Rekvizitlar Klasteri (Co-occurring Clues) */}
      <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-bold flex flex-wrap items-center gap-2">
            <Fingerprint className="h-4 w-4 text-purple-500 shrink-0" />
            <span className="break-words">
              Arizalarda birga kelgan boshqa rekvizitlar (Aloqador kartalar, raqamlar va niklar)
            </span>
            <Badge variant="outline" className="text-xs">
              {coOccurringClues.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 min-w-0">
          {coOccurringClues.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Birgalikda uchragan boshqa rekvizitlar aniqlanmadi.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {coOccurringClues.map((clue) => (
                <div
                  key={`${clue.entity_type}-${clue.id}`}
                  onClick={() => navigate(clue.target_route)}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border/80 bg-background/70 hover:border-primary/50 hover:bg-muted/40 transition-all cursor-pointer min-w-0 overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      {clue.entity_type === 'card' ? (
                        <CreditCard className="h-4 w-4" />
                      ) : clue.entity_type === 'phone' ? (
                        <Phone className="h-4 w-4" />
                      ) : (
                        <Fingerprint className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold font-mono text-foreground truncate">
                        {clue.value}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {clue.type_label}
                        {clue.owner_name ? ` · ${clue.owner_name}` : ''}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {clue.shared_apps_count} ta ish
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Dalil Rasmlar va Cheklar Galereyasi */}
      {evidenceFiles.length > 0 && (
        <Card className="border-border/80 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FileImage className="h-4 w-4 text-amber-500" />
              Bogʻliq arizalardagi chek va dalil fayllar ({evidenceFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {evidenceFiles.map((ef, idx) => (
                <a
                  key={idx}
                  href={getFileViewUrl({ url: ef.url })}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-lg border border-border overflow-hidden bg-muted/30 hover:border-primary transition-all flex flex-col"
                >
                  {ef.is_image ? (
                    <img
                      src={getFileViewUrl({ url: ef.url })}
                      alt={ef.title}
                      className="h-24 w-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="h-24 flex items-center justify-center text-muted-foreground">
                      <ExternalLink className="h-6 w-6" />
                    </div>
                  )}
                  <div className="p-1.5 text-[10px]">
                    <p className="font-semibold truncate">{ef.title}</p>
                    <p className="text-muted-foreground font-mono">№ {ef.application_number}</p>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
