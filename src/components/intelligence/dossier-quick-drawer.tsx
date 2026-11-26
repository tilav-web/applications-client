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
  ShieldAlert,
  User,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { InlineRoleBadge } from '@/components/intelligence/dossier-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { applicationsApi, intelligenceApi } from '@/lib/api';
import {
  buildCardVerdict,
  buildCitizenVerdict,
  buildClueVerdict,
  type DossierLocationState,
  type DossierTrailItem,
  extractSuspectCluesFromTree,
  formatDossierCard,
  formatDossierDate,
  formatDossierMoney,
  formatDossierPhone,
  getRoleMeta,
} from '@/lib/dossier-navigation';
import type { Transfer } from '@/types/models';

export type QuickDrawerTarget = {
  type: 'citizen' | 'card' | 'application' | 'phone' | 'identifier';
  id: string;
};

interface DossierQuickDrawerProps {
  target: QuickDrawerTarget | null;
  onClose: () => void;
  trail?: DossierTrailItem[];
  /** Joriy sahifada boshqa arizalar bilan kesishgan (takrorlangan) tokenlar — masalan Telegram username, telefon */
  repeatedTokens?: Set<string>;
}

export function DossierQuickDrawer({
  target,
  onClose,
  trail,
  repeatedTokens,
}: DossierQuickDrawerProps) {
  const navigate = useNavigate();
  const rootKey = target ? `${target.type}:${target.id}` : '';
  const [extraState, setExtraState] = useState<{ rootKey: string; items: QuickDrawerTarget[] }>({
    rootKey: '',
    items: [],
  });

  const historyStack = target
    ? [target, ...(extraState.rootKey === rootKey ? extraState.items : [])]
    : [];

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

  // Arizadagi barcha o'tkazmalarni (asosiy + qo'shimcha custom_fields) birlashtirish
  const appTransfers = useMemo<Transfer[]>(() => {
    if (!applicationData) return [];
    const map = new Map<string, Transfer>();
    if (applicationData.transfer?.id) {
      map.set(applicationData.transfer.id, applicationData.transfer);
    }
    for (const cf of applicationData.custom_fields || []) {
      if (cf.transfer?.id && !map.has(cf.transfer.id)) {
        map.set(cf.transfer.id, cf.transfer);
      }
    }
    return Array.from(map.values());
  }, [applicationData]);

  // Arizadagi barcha gumonlanuvchi belgilari (Telegram, telefon, Instagram va b.)
  const appSuspectClues = useMemo(
    () => extractSuspectCluesFromTree(applicationData?.suspect_tree),
    [applicationData?.suspect_tree],
  );

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
      ? 'Fuqaro maʼlumotlari'
      : activeTarget.type === 'card'
        ? dossier?.card?.inferred_bank_name || dossier?.card?.bank?.name || 'Plastik karta'
        : activeTarget.type === 'application'
          ? 'Ariza tafsilotlari va belgilari'
          : activeTarget.type === 'phone'
            ? `Telefon${dossier?.phone?.operator ? ` · ${dossier.phone.operator}` : ''}`
            : dossier?.identifier?.type_label || 'Raqamli iz';

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
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 bg-muted/25">
          <div className="flex items-center gap-2.5 min-w-0">
            {historyStack.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={popTarget}
                className="h-8 w-8 p-0 shrink-0 cursor-pointer"
                title="Oldingi oynaga qaytish"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <HeaderIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate font-mono">{headerTitle}</h3>
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
              <span>Yuklanmoqda...</span>
            </div>
          ) : activeTarget.type === 'application' && applicationData ? (
            <>
              {/* Holat, sana, tuman */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline" className="font-semibold">
                  {applicationData.application_status?.name || applicationData.status || 'YANGI'}
                </Badge>
                {applicationData.date && (
                  <span className="text-muted-foreground font-mono inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDossierDate(applicationData.date)}
                  </span>
                )}
                {applicationData.district?.name && (
                  <Badge variant="secondary">{applicationData.district.name}</Badge>
                )}
                {applicationData.crime?.article && (
                  <Badge variant="outline">{applicationData.crime.article}</Badge>
                )}
              </div>

              {/* Arizachi fuqaro */}
              {applicationData.citizen && (
                <div
                  onClick={() => pushTarget({ type: 'citizen', id: applicationData.citizen!.id })}
                  className="p-3 rounded-lg border border-border hover:border-primary bg-muted/20 cursor-pointer transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Arizachi fuqaro
                    </p>
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

              {/* Arizaga biriktirilgan Gumonlanuvchi belgilari (Telegram, telefon, Instagram va b.) */}
              {appSuspectClues.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <Fingerprint className="h-3.5 w-3.5 text-purple-500" />
                    Gumonlanuvchi belgilari ({appSuspectClues.length})
                  </p>
                  <div className="space-y-1.5">
                    {appSuspectClues.map((clue, i) => {
                      const isRepeated = Boolean(repeatedTokens?.has(clue.normalized));
                      return (
                        <div
                          key={`${clue.path}-${clue.value}-${i}`}
                          className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                            isRepeated
                              ? 'border-rose-500/45 bg-rose-500/8'
                              : 'border-border/80 bg-muted/20'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="text-[10px] text-muted-foreground block">
                              {clue.path}
                            </span>
                            <span className="font-mono font-bold text-foreground break-all">
                              {clue.value}
                            </span>
                          </div>
                          {isRepeated && (
                            <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35 text-[10px] font-bold gap-1 shrink-0">
                              <ShieldAlert className="h-3 w-3" />
                              Takrorlangan
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Barcha pul o'tkazmalari (asosiy + qo'shimcha) */}
              {appTransfers.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground block">
                    Pul oʻtkazmalari ({appTransfers.length})
                  </span>
                  {appTransfers.map((tr, idx) => (
                    <div
                      key={tr.id || idx}
                      className="p-3 rounded-lg border border-border bg-muted/15 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground font-mono">
                          {formatDossierDate(tr.transfer_date)}{' '}
                          {tr.payment_provider?.name ? `· ${tr.payment_provider.name}` : ''}
                        </span>
                        <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400">
                          {formatDossierMoney(tr.amount, tr.currency || 'UZS')}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {tr.sender_card && (
                          <button
                            type="button"
                            onClick={() => pushTarget({ type: 'card', id: tr.sender_card!.id })}
                            className="w-full px-2.5 py-1.5 rounded border border-border bg-background hover:border-primary text-left cursor-pointer flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <span className="text-[10px] text-blue-600 font-semibold block">
                                Joʻnatuvchi karta
                              </span>
                              <span className="font-mono font-bold">
                                {formatDossierCard(
                                  tr.sender_card.card_number,
                                  tr.sender_card.masked_number,
                                )}
                              </span>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          </button>
                        )}
                        {tr.receiver_card && (
                          <button
                            type="button"
                            onClick={() => pushTarget({ type: 'card', id: tr.receiver_card!.id })}
                            className="w-full px-2.5 py-1.5 rounded border border-rose-500/35 bg-rose-500/5 hover:border-rose-500 text-left cursor-pointer flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <span className="text-[10px] text-rose-600 font-bold block">
                                Qabul qiluvchi (Firibgar / Dropper)
                              </span>
                              <span className="font-mono font-bold">
                                {formatDossierCard(
                                  tr.receiver_card.card_number,
                                  tr.receiver_card.masked_number,
                                )}
                              </span>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Ariza mazmuni */}
              {applicationData.description && (
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">
                    Ariza mazmuni
                  </p>
                  <p className="text-xs leading-relaxed text-foreground bg-muted/20 rounded-lg p-3 border border-border/60 whitespace-pre-wrap">
                    {applicationData.description}
                  </p>
                </div>
              )}
            </>
          ) : dossier ? (
            <>
              {/* Ixcham Rol Badge */}
              <div className="flex flex-wrap items-center gap-2">
                <InlineRoleBadge
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
              </div>

              {/* Egasi (karta yoki rekvizit uchun) */}
              {activeTarget.type !== 'citizen' && dossier.citizen && (
                <div
                  onClick={() => pushTarget({ type: 'citizen', id: dossier.citizen!.id })}
                  className="p-3 rounded-lg border border-border hover:border-primary bg-muted/20 cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
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

              {/* Fuqaro asosiy ma'lumotlari */}
              {activeTarget.type === 'citizen' && dossier.citizen && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono bg-muted/20 rounded-lg p-3 border border-border/60">
                  {dossier.citizen.phone_number && (
                    <span className="text-foreground font-semibold">
                      {formatDossierPhone(dossier.citizen.phone_number)}
                    </span>
                  )}
                  <span>Pasport: {dossier.citizen.passport || '—'}</span>
                  <span>JSHSHIR: {dossier.citizen.pinfl || '—'}</span>
                </div>
              )}

              {/* Kirim / Chiqim (faqat mavjud bo'lsa) */}
              {(dossier.stats.totalIncomingAmount > 0 || dossier.stats.totalOutgoingAmount > 0) && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg border border-border bg-muted/15">
                    <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                      <ArrowDownLeft className="h-3 w-3 text-emerald-500" /> Kirim
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-600 block mt-0.5">
                      {formatDossierMoney(dossier.stats.totalIncomingAmount)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-muted/15">
                    <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3 text-rose-500" /> Chiqim
                    </span>
                    <span className="font-mono text-xs font-bold text-rose-500 block mt-0.5">
                      {formatDossierMoney(dossier.stats.totalOutgoingAmount)}
                    </span>
                  </div>
                </div>
              )}

              {/* Fuqaroning kartalari */}
              {activeTarget.type === 'citizen' && dossier.ownedCards.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5" /> Kartalar ({dossier.ownedCards.length})
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

              {/* Bog'langan arizalar */}
              <div className="space-y-1.5">
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
                    Tranzaksiyalar ({dossier.transfers.length})
                  </span>
                  <div className="space-y-1.5">
                    {dossier.transfers.slice(0, 6).map((tr) => (
                      <div
                        key={tr.id}
                        className="p-2 rounded-lg border border-border/70 bg-muted/15 text-xs flex items-center justify-between gap-2"
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
        <div className="p-3.5 border-t border-border bg-muted/25 flex flex-col gap-2">
          <Button
            type="button"
            onClick={() => openFullPage(fullRoute)}
            className="w-full h-9 text-xs gap-2 cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>
              {activeTarget.type === 'application'
                ? 'Arizani toʻliq ochish'
                : 'Toʻliq sahifada ochish'}
            </span>
          </Button>
          {activeTarget.type === 'application' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => openFullPage(`/applications/${activeTarget.id}/relations`)}
              className="w-full h-8 text-xs gap-1.5 cursor-pointer"
            >
              <Link2 className="h-3.5 w-3.5" />
              <span>Shu arizaning bogʻliqliklarini ochish</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
