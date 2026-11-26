import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  Phone,
  ShieldAlert,
  User,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { intelligenceApi } from '@/lib/api';

interface DossierQuickDrawerProps {
  target: { type: 'citizen' | 'card'; id: string } | null;
  onClose: () => void;
}

const formatMoney = (val?: number | null) =>
  `${new Intl.NumberFormat('uz-UZ').format(Math.round(Number(val || 0)))} UZS`;

export function DossierQuickDrawer({ target, onClose }: DossierQuickDrawerProps) {
  const navigate = useNavigate();

  const { data: dossier, isLoading } = useQuery({
    queryKey: ['quick-dossier-preview', target?.type, target?.id],
    queryFn: () =>
      target!.type === 'citizen'
        ? intelligenceApi.getCitizenDossier(target!.id)
        : intelligenceApi.getCardDossier(target!.id),
    enabled: Boolean(target),
  });

  if (!target) return null;

  const fullRoute = target.type === 'citizen' ? `/citizens/${target.id}` : `/cards/${target.id}`;

  const title =
    target.type === 'citizen'
      ? dossier?.citizen?.full_name?.trim() || 'Fuqaro'
      : dossier?.card?.card_number || dossier?.card?.masked_number || 'Karta';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]">
      <div className="w-full max-w-md h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {target.type === 'citizen' ? (
                <User className="h-4 w-4" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold truncate font-mono">{title}</h3>
              <p className="text-[11px] text-muted-foreground">360° Tezkor Tahliliy Koʻrinish</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading || !dossier ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Maʼlumotlar tahlil qilinmoqda...</span>
            </div>
          ) : (
            <>
              <div className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Xavf bahosi:</span>
                <Badge
                  className={
                    dossier.stats.riskScore >= 60
                      ? 'bg-rose-500/15 text-rose-600 border-rose-500/30 font-bold gap-1'
                      : 'bg-blue-500/15 text-blue-600 border-blue-500/30'
                  }
                >
                  {dossier.stats.riskScore >= 60 && <ShieldAlert className="h-3 w-3" />}
                  {dossier.stats.riskScore}% · {dossier.stats.riskLevel}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl border border-border bg-background/60">
                  <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                    <ArrowDownLeft className="h-3 w-3 text-emerald-500" /> Kirim oqimi
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-600 block mt-1">
                    {formatMoney(dossier.stats.totalIncomingAmount)}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-background/60">
                  <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-rose-500" /> Chiqim oqimi
                  </span>
                  <span className="font-mono text-xs font-bold text-rose-500 block mt-1">
                    {formatMoney(dossier.stats.totalOutgoingAmount)}
                  </span>
                </div>
              </div>

              {dossier.ownedPhones.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Telefonlar ({dossier.ownedPhones.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {dossier.ownedPhones.map((p) => (
                      <Badge key={p.id} variant="outline" className="font-mono text-xs">
                        {p.formatted_number || `+${p.phone_number}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Bogʻlangan Arizalar (
                  {dossier.directApplications.length})
                </span>
                {dossier.directApplications.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Bogʻliq ariza topilmadi</p>
                ) : (
                  <div className="space-y-1.5">
                    {dossier.directApplications.slice(0, 6).map((app) => (
                      <div
                        key={app.id}
                        onClick={() => {
                          onClose();
                          navigate(`/applications/${app.id}`);
                        }}
                        className="p-2.5 rounded-lg border border-border hover:border-primary cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-primary">
                            № {app.application_number}
                          </span>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                            {app.match_reasons[0]}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {app.role_in_app}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <Button
            onClick={() => {
              onClose();
              navigate(fullRoute);
            }}
            className="w-full gap-2 cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Toʻliq 360° Dosye sahifasini ochish</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
