import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Calendar,
  CreditCard,
  ExternalLink,
  FileText,
  Fingerprint,
  Link2,
  Loader2,
  Phone,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { RoleVerdictBanner } from '@/components/intelligence/dossier-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { applicationsApi, intelligenceApi } from '@/lib/api';
import {
  buildCardVerdict,
  buildCitizenVerdict,
  buildClueVerdict,
  type DossierLocationState,
  type DossierTrailItem,
  formatDossierCard,
  formatDossierDate,
  formatDossierMoney,
  formatDossierPhone,
  getRoleMeta,
} from '@/lib/dossier-navigation';

export type QuickDrawerTarget = {
  type: 'citizen' | 'card' | 'application' | 'phone' | 'identifier';
  id: string;
};

interface DossierQuickDrawerProps {
  target: QuickDrawerTarget | null;
  onClose: () => void;
  trail?: DossierTrailItem[];
}

export function DossierQuickDrawer({ target, onClose, trail }: DossierQuickDrawerProps) {
  const navigate = useNavigate();
  const rootKey = target ? `${target.type}:${target.id}` : '';
  const [extraState, setExtraState] = useState<{ rootKey: string; items: QuickDrawerTarget[] }>({
    rootKey: '',
    items: [],
  });

  const historyStack = target
    ? [target, ...(extraState.rootKey === rootKey ? extraState.items : [])]
    : [];

  // Escape bilan yopish
  useEffect(() => {
    if (!target) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [target, onClose]);

  const activeTarget = historyStack[historyStack.length - 1] || target;

  const { data: dossier, isLoading: isDossierLoading } = useQuery({
    queryKey: ['quick-dossier-preview', activeTarget?.type, activeTarget?.id],
    queryFn: () => {
      if (activeTarget!.type === 'citizen') {
        return intelligenceApi.getCitizenDossier(activeTarget!.id);
      }
      if (activeTarget!.type === 'card') {
        return intelligenceApi.getCardDossier(activeTarget!.id);
      }
      if (activeTarget!.type === 'phone') {
        return intelligenceApi.getPhoneDossier(activeTarget!.id);
      }
      return intelligenceApi.getIdentifierDossier(activeTarget!.id);
    },
    enabled: Boolean(activeTarget && activeTarget.type !== 'application'),
  });

  const { data: applicationData, isLoading: isAppLoading } = useQuery({
    queryKey: ['quick-application-preview', activeTarget?.id],
    queryFn: () => applicationsApi.getOne(activeTarget!.id),
    enabled: Boolean(activeTarget && activeTarget.type === 'application'),
  });

  if (!target || !activeTarget) return null;

  const isLoading = activeTarget.type === 'application' ? isAppLoading : isDossierLoading;

  const pushTarget = (next: QuickDrawerTarget) => {
    if (next.type === activeTarget.type && next.id === activeTarget.id) return;
    setExtraState((prev) => ({
      rootKey,
      items: prev.rootKey === rootKey ? [...prev.items, next] : [next],
    }));
  };

  const popTarget = () => {
    setExtraState((prev) => {
      if (prev.rootKey !== rootKey || prev.items.length === 0) return prev;
      return { rootKey, items: prev.items.slice(0, -1) };
    });
  };

  const openFullPage = (route: string) => {
    onClose();
    navigate(route, {
      state: trail && trail.length > 0 ? ({ trail } satisfies DossierLocationState) : undefined,
    });
  };

  const fullRoute =
    activeTarget.type === 'citizen'
      ? `/citizens/${activeTarget.id}`
      : activeTarget.type === 'card'
        ? `/cards/${activeTarget.id}`
        : activeTarget.type === 'application'
          ? `/applications/${activeTarget.id}`
          : `/dossier/${activeTarget.type}/${activeTarget.id}`;

  const headerTitle =
    activeTarget.type === 'citizen'
      ? dossier?.citizen?.full_name?.trim() || 'Fuqaro profili'
      : activeTarget.type === 'card'
        ? formatDossierCard(dossier?.card?.card_number, dossier?.card?.masked_number)
        : activeTarget.type === 'application'
          ? `Ariza № ${applicationData?.application_number || '—'}`
          : activeTarget.type === 'phone'
            ? dossier?.phone?.formatted_number ||
              formatDossierPhone(dossier?.phone?.phone_number) ||
              'Telefon'
            : dossier?.identifier?.raw_value || 'Raqamli iz';

  const headerSubtitle =
    activeTarget.type === 'citizen'
      ? 'Fuqaro — tezkor koʻrinish'
      : activeTarget.type === 'card'
        ? dossier?.card?.inferred_bank_name ||
          dossier?.card?.bank?.name ||
          'Plastik karta — tezkor koʻrinish'
        : activeTarget.type === 'application'
          ? 'Ariza — tezkor koʻrinish'
          : activeTarget.type === 'phone'
            ? `Telefon raqami${dossier?.phone?.operator ? ` · ${dossier.phone.operator}` : ''}`
            : dossier?.identifier?.type_label || 'Raqamli iz — tezkor koʻrinish';

  const HeaderIcon =
    activeTarget.type === 'citizen'
      ? User
      : activeTarget.type === 'card'
        ? CreditCard
        : activeTarget.type === 'application'
          ? FileText
          : activeTarget.type === 'phone'
            ? Phone
            : Fingerprint;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-2 bg-muted/30">
          <div className="flex items-center gap-2.5 min-w-0">
            {historyStack.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={popTarget}
                className="h-8 w-8 p-0 shrink-0 cursor-pointer"
                title="Oldingi tezkor oynaga qaytish"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <HeaderIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold truncate font-mono">{headerTitle}</h3>
              <p className="text-[11px] text-muted-foreground truncate">{headerSubtitle}</p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Maʼlumotlar yuklanmoqda...</span>
            </div>
          ) : activeTarget.type === 'application' && applicationData ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold">
                  {applicationData.application_status?.name || applicationData.status || 'YANGI'}
                </Badge>
                {applicationData.date && (
                  <span className="text-xs text-muted-foreground font-mono inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDossierDate(applicationData.date)}
                  </span>
                )}
                {applicationData.district?.name && (
                  <Badge variant="secondary" className="text-xs">
                    {applicationData.district.name}
                  </Badge>
                )}
              </div>

              {applicationData.citizen && (
                <div
                  onClick={() => pushTarget({ type: 'citizen', id: applicationData.citizen!.id })}
                  className="p-3 rounded-xl border border-primary/25 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold text-primary">Arizachi fuqaro</p>
                    <p className="text-sm font-bold text-foreground truncate">
                      {applicationData.citizen.full_name || 'Fuqaro'}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {[
                        applicationData.citizen.phone_number
                          ? formatDossierPhone(applicationData.citizen.phone_number)
                          : null,
                        applicationData.citizen.passport,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                </div>
              )}

              {applicationData.transfer && (
                <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-muted-foreground">
                      Asosiy pul oʻtkazmasi
                    </span>
                    <span className="font-mono text-sm font-extrabold text-rose-600 dark:text-rose-400">
                      {formatDossierMoney(
                        applicationData.transfer.amount,
                        applicationData.transfer.currency || 'UZS',
                      )}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 text-xs">
                    {applicationData.transfer.sender_card && (
                      <button
                        type="button"
                        onClick={() =>
                          pushTarget({
                            type: 'card',
                            id: applicationData.transfer!.sender_card!.id,
                          })
                        }
                        className="p-2 rounded-lg border border-border bg-background hover:border-primary text-left cursor-pointer"
                      >
                        <span className="text-[10px] text-blue-600 font-semibold block">
                          Joʻnatuvchi (Jabrlanuvchi)
                        </span>
                        <span className="font-mono font-bold">
                          {formatDossierCard(
                            applicationData.transfer.sender_card.card_number,
                            applicationData.transfer.sender_card.masked_number,
                          )}
                        </span>
                      </button>
                    )}
                    {applicationData.transfer.receiver_card && (
                      <button
                        type="button"
                        onClick={() =>
                          pushTarget({
                            type: 'card',
                            id: applicationData.transfer!.receiver_card!.id,
                          })
                        }
                        className="p-2 rounded-lg border border-rose-500/35 bg-rose-500/5 hover:border-rose-500 text-left cursor-pointer"
                      >
                        <span className="text-[10px] text-rose-600 font-bold block">
                          Qabul qiluvchi (Firibgar / Dropper)
                        </span>
                        <span className="font-mono font-bold">
                          {formatDossierCard(
                            applicationData.transfer.receiver_card.card_number,
                            applicationData.transfer.receiver_card.masked_number,
                          )}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {applicationData.description && (
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">
                    Ariza mazmuni
                  </p>
                  <p className="text-xs leading-relaxed text-foreground bg-muted/30 rounded-xl p-3 border border-border/60 whitespace-pre-wrap">
                    {applicationData.description}
                  </p>
                </div>
              )}
            </>
          ) : dossier ? (
            <>
              {/* Aniq o‘zbekcha Rol Hukmi */}
              <RoleVerdictBanner
                compact
                riskScore={dossier.stats.riskScore}
                verdict={
                  activeTarget.type === 'citizen'
                    ? buildCitizenVerdict(dossier.stats)
                    : activeTarget.type === 'card'
                      ? buildCardVerdict(dossier.stats, dossier.directApplications)
                      : buildClueVerdict(
                          dossier.stats,
                          activeTarget.type === 'phone' ? 'Telefon' : 'Raqamli iz',
                        )
                }
              />

              {/* Karta yoki rekvizit egasi */}
              {activeTarget.type !== 'citizen' && dossier.citizen && (
                <div
                  onClick={() => pushTarget({ type: 'citizen', id: dossier.citizen!.id })}
                  className="p-3 rounded-xl border border-primary/25 bg-primary/5 hover:bg-primary/10 cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase text-primary block">
                      Egasi (Fuqaro)
                    </span>
                    <span className="text-sm font-bold text-foreground truncate block">
                      {dossier.citizen.full_name || 'Fuqaro'}
                    </span>
                    {dossier.citizen.phone_number && (
                      <span className="text-xs font-mono text-muted-foreground">
                        {formatDossierPhone(dossier.citizen.phone_number)}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                </div>
              )}

              {/* Fuqaro asosiy pasport ma'lumotlari */}
              {activeTarget.type === 'citizen' && dossier.citizen && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-border/70 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Pasport</span>
                    <span className="font-mono font-bold">{dossier.citizen.passport || '—'}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/70 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">JSHSHIR</span>
                    <span className="font-mono font-bold">{dossier.citizen.pinfl || '—'}</span>
                  </div>
                </div>
              )}

              {/* Kirim / Chiqim */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl border border-border bg-background/60">
                  <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                    <ArrowDownLeft className="h-3 w-3 text-emerald-500" /> Kirim
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-600 block mt-0.5">
                    {formatDossierMoney(dossier.stats.totalIncomingAmount)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl border border-border bg-background/60">
                  <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-rose-500" /> Chiqim
                  </span>
                  <span className="font-mono text-xs font-bold text-rose-500 block mt-0.5">
                    {formatDossierMoney(dossier.stats.totalOutgoingAmount)}
                  </span>
                </div>
              </div>

              {/* Fuqaroning kartalari */}
              {activeTarget.type === 'citizen' && dossier.ownedCards.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5" /> Plastik kartalar (
                    {dossier.ownedCards.length})
                  </span>
                  <div className="space-y-1.5">
                    {dossier.ownedCards.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => pushTarget({ type: 'card', id: c.id })}
                        className="p-2.5 rounded-lg border border-border hover:border-primary cursor-pointer flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-mono font-bold text-foreground">
                            {formatDossierCard(c.card_number, c.masked_number)}
                          </p>
                          {c.bank?.name && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-3 w-3" /> {c.bank.name}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Telefonlar */}
              {dossier.ownedPhones.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> Telefonlar ({dossier.ownedPhones.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {dossier.ownedPhones.map((p) => (
                      <Badge
                        key={p.id}
                        variant="outline"
                        onClick={() => pushTarget({ type: 'phone', id: p.id })}
                        className="font-mono text-xs cursor-pointer hover:border-primary"
                      >
                        {p.formatted_number || formatDossierPhone(p.phone_number)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Bog'langan Arizalar */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> Bogʻlangan arizalar (
                  {dossier.directApplications.length})
                </span>
                {dossier.directApplications.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Bogʻliq ariza topilmadi</p>
                ) : (
                  <div className="space-y-1.5">
                    {dossier.directApplications.slice(0, 8).map((app) => {
                      const role = getRoleMeta(app.role_in_app);
                      return (
                        <div
                          key={app.id}
                          onClick={() => pushTarget({ type: 'application', id: app.id })}
                          className="p-2.5 rounded-lg border border-border hover:border-primary cursor-pointer flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-primary">
                                № {app.application_number}
                              </span>
                              <Badge className={`text-[10px] ${role.badgeClass}`}>
                                {role.shortLabel}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {app.match_reasons[0] ||
                                app.district_name ||
                                formatDossierDate(app.date)}
                            </p>
                          </div>
                          {app.transfer_amount ? (
                            <span className="font-mono font-bold text-rose-500 shrink-0">
                              {formatDossierMoney(app.transfer_amount, app.currency)}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Oxirgi tranzaksiyalar */}
              {dossier.transfers.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground">
                    Oxirgi tranzaksiyalar ({dossier.transfers.length})
                  </span>
                  <div className="space-y-1.5">
                    {dossier.transfers.slice(0, 5).map((tr) => (
                      <div
                        key={tr.id}
                        className="p-2.5 rounded-lg border border-border/80 bg-muted/20 text-xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span
                            className={`text-[10px] font-bold ${
                              tr.direction === 'INCOMING' ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {tr.direction === 'INCOMING' ? '↙ Kirim' : '↗ Chiqim'}
                          </span>
                          <p className="font-mono text-[11px] text-muted-foreground truncate">
                            {formatDossierDate(tr.transfer_date)}
                            {tr.application_number ? ` · № ${tr.application_number}` : ''}
                          </p>
                        </div>
                        <span className="font-mono font-bold shrink-0">
                          {formatDossierMoney(tr.amount, tr.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">
              Maʼlumotni yuklab boʻlmadi.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30 flex flex-col gap-2">
          <Button
            type="button"
            onClick={() => openFullPage(fullRoute)}
            className="w-full gap-2 cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
            <span>
              {activeTarget.type === 'application'
                ? 'Arizani toʻliq sahifada ochish'
                : 'Toʻliq dosye sahifasini ochish'}
            </span>
          </Button>
          {activeTarget.type === 'application' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => openFullPage(`/applications/${activeTarget.id}/relations`)}
              className="w-full gap-2 cursor-pointer text-xs"
            >
              <Link2 className="h-3.5 w-3.5" />
              <span>Ushbu arizaning bogʻliqliklarini ochish</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
