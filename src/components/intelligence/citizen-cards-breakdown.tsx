import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Building2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatDossierCard,
  formatDossierDate,
  formatDossierMoney,
  getRoleMeta,
} from '@/lib/dossier-navigation';
import type {
  Card as CardModel,
  DossierApplicationItem,
  DossierTransferItem,
} from '@/types/models';

interface CitizenCardsBreakdownProps {
  cards: CardModel[];
  transfers: DossierTransferItem[];
  directApplications: DossierApplicationItem[];
  canMutate?: boolean;
  onUnlinkCard?: (cardId: string) => void;
  onQuickViewCard: (cardId: string) => void;
  onOpenFullCard: (cardId: string) => void;
  onQuickViewApp: (appId: string) => void;
  onOpenFullApp: (appId: string) => void;
}

interface CardGroupData {
  card: CardModel;
  transfers: (DossierTransferItem & { cardDirection: 'INCOMING' | 'OUTGOING' })[];
  linkedApps: DossierApplicationItem[];
  totalIn: number;
  totalOut: number;
  isDanger: boolean;
  roleLabel: string;
  roleClass: string;
}

export function CitizenCardsBreakdown({
  cards,
  transfers,
  directApplications,
  canMutate = false,
  onUnlinkCard,
  onQuickViewCard,
  onOpenFullCard,
  onQuickViewApp,
  onOpenFullApp,
}: CitizenCardsBreakdownProps) {
  const { groups, orphanTransfers } = useMemo(() => {
    const ownedIds = new Set(cards.map((c) => c.id));
    const appById = new Map(directApplications.map((a) => [a.id, a]));

    const computedGroups: CardGroupData[] = cards.map((card) => {
      const cardTransfers = transfers
        .filter((tr) => tr.sender_card_id === card.id || tr.receiver_card_id === card.id)
        .map((tr) => ({
          ...tr,
          cardDirection: (tr.receiver_card_id === card.id ? 'INCOMING' : 'OUTGOING') as
            'INCOMING' | 'OUTGOING',
        }));

      let totalIn = 0;
      let totalOut = 0;
      const linkedAppIds = new Set<string>();

      for (const tr of cardTransfers) {
        const amt = Number(tr.amount || 0);
        if (tr.cardDirection === 'INCOMING') totalIn += amt;
        else totalOut += amt;
        if (tr.application_id) linkedAppIds.add(tr.application_id);
      }

      const cleanDigits = (card.card_number || '').replace(/\D/g, '');
      const last4 = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : '';

      for (const app of directApplications) {
        if (linkedAppIds.has(app.id)) continue;
        const reasonsText = app.match_reasons.join(' ');
        if (
          (cleanDigits.length >= 8 && reasonsText.replace(/\D/g, '').includes(cleanDigits)) ||
          (last4 && reasonsText.includes(last4))
        ) {
          linkedAppIds.add(app.id);
        }
      }

      const linkedApps = Array.from(linkedAppIds)
        .map((aid) => appById.get(aid))
        .filter((a): a is DossierApplicationItem => Boolean(a));

      const isIncomingDanger =
        totalIn > 0 || linkedApps.some((a) => getRoleMeta(a.role_in_app).isDanger);
      const isBoth = totalIn > 0 && totalOut > 0;

      let roleLabel = 'Biriktirilgan karta';
      let roleClass = 'bg-muted text-muted-foreground border border-border';
      if (isBoth) {
        roleLabel = 'Tranzit (Kirim + Chiqim)';
        roleClass =
          'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35 font-bold';
      } else if (isIncomingDanger) {
        roleLabel = 'Pul tushgan (Firibgar / Dropper)';
        roleClass =
          'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/35 font-bold';
      } else if (totalOut > 0 || linkedApps.length > 0) {
        roleLabel = 'Jabrlanuvchi kartasi (Chiqim)';
        roleClass =
          'bg-blue-500/12 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-semibold';
      }

      return {
        card,
        transfers: cardTransfers,
        linkedApps,
        totalIn,
        totalOut,
        isDanger: isIncomingDanger,
        roleLabel,
        roleClass,
      };
    });

    // Eng muhim (firibgar/pul tushgan yoki tranzaksiyali) kartalar birinchi chiqadi
    computedGroups.sort((a, b) => {
      if (a.isDanger !== b.isDanger) return a.isDanger ? -1 : 1;
      return b.transfers.length + b.linkedApps.length - (a.transfers.length + a.linkedApps.length);
    });

    const orphans = transfers.filter(
      (tr) =>
        (!tr.sender_card_id || !ownedIds.has(tr.sender_card_id)) &&
        (!tr.receiver_card_id || !ownedIds.has(tr.receiver_card_id)),
    );

    return { groups: computedGroups, orphanTransfers: orphans };
  }, [cards, transfers, directApplications]);

  // Birinchi 2 ta (yoki barcha xavfli) kartalar ochiq turadi — darhol scroll qilib o‘qish oson
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const isExpanded = (cardId: string, idx: number, hasActivity: boolean, isDanger: boolean) => {
    if (expandedIds[cardId] !== undefined) return expandedIds[cardId];
    return isDanger || idx < 2 || (groups.length <= 3 && hasActivity);
  };

  const toggleCard = (cardId: string, currentlyOpen: boolean) => {
    setExpandedIds((prev) => ({ ...prev, [cardId]: !currentlyOpen }));
  };

  if (groups.length === 0 && orphanTransfers.length === 0) {
    return (
      <Card className="border-border/70 bg-muted/20">
        <CardContent className="p-6 text-center text-xs text-muted-foreground">
          Ushbu fuqaroga biriktirilgan plastik kartalar va pul oʻtkazmalari topilmadi.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3.5">
      {groups.map((grp, idx) => {
        const hasActivity = grp.transfers.length > 0 || grp.linkedApps.length > 0;
        const open = isExpanded(grp.card.id, idx, hasActivity, grp.isDanger);

        return (
          <Card
            key={grp.card.id}
            className={`py-0 gap-0 overflow-hidden transition-colors ${
              grp.isDanger ? 'border-rose-500/45 bg-rose-500/[0.02]' : 'border-border/80 bg-card/70'
            }`}
          >
            {/* Karta Sarlavha Qatori */}
            <div
              onClick={() => toggleCard(grp.card.id, open)}
              className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    grp.isDanger
                      ? 'bg-rose-500/12 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      : 'bg-primary/10 text-primary border-primary/20'
                  }`}
                >
                  <CreditCard className="h-5 w-5" />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm sm:text-base font-extrabold tracking-wide text-foreground">
                      {formatDossierCard(grp.card.card_number, grp.card.masked_number)}
                    </span>
                    <Badge className={`text-[11px] ${grp.roleClass}`}>{grp.roleLabel}</Badge>
                    {grp.card.bank?.name && (
                      <Badge variant="outline" className="text-[11px] gap-1">
                        <Building2 className="h-3 w-3" />
                        {grp.card.bank.name}
                      </Badge>
                    )}
                    {grp.card.expire_date && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {grp.card.expire_date}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                      Kirim: {formatDossierMoney(grp.totalIn)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-mono font-semibold">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Chiqim: {formatDossierMoney(grp.totalOut)}
                    </span>
                    <span className="text-muted-foreground">
                      {grp.transfers.length} ta tranzaksiya · {grp.linkedApps.length} ta ariza
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="flex flex-wrap items-center gap-1.5 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onQuickViewCard(grp.card.id)}
                  className="h-7 px-2.5 text-xs gap-1 cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Tez ko‘rish
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenFullCard(grp.card.id)}
                  className="h-7 px-2.5 text-xs gap-1 text-primary cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  To‘liq
                </Button>
                {canMutate && onUnlinkCard && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onUnlinkCard(grp.card.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500 cursor-pointer"
                    title="Kartani fuqarodan uzish"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleCard(grp.card.id, open)}
                  className="h-7 w-7 p-0 text-muted-foreground cursor-pointer"
                  aria-label={open ? 'Yopish' : 'Ochish'}
                >
                  {open ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Karta ichidagi Tranzaksiyalar va Tushgan Arizalar */}
            {open && (
              <CardContent className="p-0 border-t border-border/70 bg-background/50">
                {!hasActivity ? (
                  <div className="p-4 text-xs text-muted-foreground text-center">
                    Bu karta boʻyicha hali tranzaksiyalar yoki bogʻliq arizalar kiritilmagan.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {/* A. Ushbu kartadagi tranzaksiyalar */}
                    {grp.transfers.length > 0 && (
                      <div className="p-3.5 space-y-2">
                        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
                          <span>Ushbu kartadagi tranzaksiyalar ({grp.transfers.length})</span>
                        </p>

                        <div className="rounded-lg border border-border/70 overflow-x-auto bg-card">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/20">
                                <TableHead className="text-[11px] h-8">Yo‘nalish</TableHead>
                                <TableHead className="text-[11px] h-8">Summa</TableHead>
                                <TableHead className="text-[11px] h-8">Qarshi karta</TableHead>
                                <TableHead className="text-[11px] h-8">Provayder</TableHead>
                                <TableHead className="text-[11px] h-8">Sana / Vaqt</TableHead>
                                <TableHead className="text-[11px] h-8">Ariza</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {grp.transfers.map((tr) => {
                                const isIncoming = tr.cardDirection === 'INCOMING';
                                const counterCardId = isIncoming
                                  ? tr.sender_card_id
                                  : tr.receiver_card_id;
                                const counterCardNum = isIncoming
                                  ? tr.sender_card_number
                                  : tr.receiver_card_number;
                                const counterOwner = isIncoming
                                  ? tr.sender_owner_name
                                  : tr.receiver_owner_name;

                                return (
                                  <TableRow key={tr.id} className="text-xs">
                                    <TableCell className="py-2">
                                      {isIncoming ? (
                                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] gap-1">
                                          <ArrowDownLeft className="h-3 w-3" /> Kirim
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] gap-1">
                                          <ArrowUpRight className="h-3 w-3" /> Chiqim
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="py-2 font-mono font-bold">
                                      {formatDossierMoney(tr.amount, tr.currency)}
                                    </TableCell>
                                    <TableCell className="py-2">
                                      {counterCardId ? (
                                        <button
                                          type="button"
                                          onClick={() => onQuickViewCard(counterCardId)}
                                          className="text-left hover:underline cursor-pointer"
                                        >
                                          <span className="font-mono font-semibold text-primary block">
                                            {isIncoming ? '← ' : '→ '}
                                            {formatDossierCard(counterCardNum)}
                                          </span>
                                          {counterOwner && (
                                            <span className="text-[11px] text-muted-foreground">
                                              {counterOwner}
                                            </span>
                                          )}
                                        </button>
                                      ) : (
                                        <span className="text-muted-foreground">
                                          {counterCardNum || 'Karta ko‘rsatilmagan'}
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="py-2 text-muted-foreground">
                                      {tr.payment_provider || '—'}
                                    </TableCell>
                                    <TableCell className="py-2 font-mono text-muted-foreground whitespace-nowrap">
                                      {formatDossierDate(tr.transfer_date)} {tr.transfer_time || ''}
                                    </TableCell>
                                    <TableCell className="py-2">
                                      {tr.application_id ? (
                                        <button
                                          type="button"
                                          onClick={() => onQuickViewApp(tr.application_id!)}
                                          className="font-mono font-bold text-primary hover:underline cursor-pointer"
                                        >
                                          № {tr.application_number || 'Ariza'}
                                        </button>
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground">
                                          Vipiska
                                        </span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* B. Ushbu kartaga tushgan arizalar */}
                    {grp.linkedApps.length > 0 && (
                      <div className="p-3.5 space-y-2">
                        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-amber-500" />
                          <span>Ushbu kartaga bogʻlangan arizalar ({grp.linkedApps.length})</span>
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {grp.linkedApps.map((app) => {
                            const roleMeta = getRoleMeta(app.role_in_app);
                            return (
                              <div
                                key={app.id}
                                onClick={() => onQuickViewApp(app.id)}
                                className="p-2.5 rounded-lg border border-border/80 bg-card hover:border-primary/50 cursor-pointer transition-colors flex items-center justify-between gap-2 min-w-0"
                              >
                                <div className="min-w-0 space-y-0.5">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-mono text-xs font-bold text-primary">
                                      № {app.application_number}
                                    </span>
                                    <Badge className={`text-[10px] ${roleMeta.badgeClass}`}>
                                      {roleMeta.shortLabel}
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {app.victim_name ? `Arizachi: ${app.victim_name}` : ''}
                                    {app.district_name ? ` · ${app.district_name}` : ''}
                                    {app.date ? ` · ${formatDossierDate(app.date)}` : ''}
                                  </p>
                                </div>

                                <div
                                  className="flex items-center gap-1.5 shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {app.transfer_amount ? (
                                    <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                                      {formatDossierMoney(app.transfer_amount, app.currency)}
                                    </span>
                                  ) : null}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onOpenFullApp(app.id)}
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-primary cursor-pointer"
                                    title="Arizani to‘liq ochish"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Biriktirilgan kartalardan tashqaridagi qo‘shimcha o‘tkazmalar (agar mavjud bo‘lsa) */}
      {orphanTransfers.length > 0 && (
        <Card className="py-0 gap-0 border-border/80 bg-card/70 overflow-hidden">
          <div className="p-3.5 bg-muted/30 border-b border-border/60 flex items-center justify-between">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
              Boshqa kartalar orqali aloqador tranzaksiyalar ({orphanTransfers.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px] h-8">Yo‘nalish</TableHead>
                  <TableHead className="text-[11px] h-8">Summa</TableHead>
                  <TableHead className="text-[11px] h-8">Jo‘natuvchi</TableHead>
                  <TableHead className="text-[11px] h-8">Qabul qiluvchi</TableHead>
                  <TableHead className="text-[11px] h-8">Sana</TableHead>
                  <TableHead className="text-[11px] h-8">Ariza</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orphanTransfers.map((tr) => (
                  <TableRow key={tr.id} className="text-xs">
                    <TableCell className="py-2">
                      {tr.direction === 'INCOMING' ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[10px]">
                          Kirim
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-500/15 text-rose-700 border-rose-500/30 text-[10px]">
                          Chiqim
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2 font-mono font-bold">
                      {formatDossierMoney(tr.amount, tr.currency)}
                    </TableCell>
                    <TableCell className="py-2">
                      {tr.sender_card_id ? (
                        <button
                          type="button"
                          onClick={() => onQuickViewCard(tr.sender_card_id!)}
                          className="font-mono text-primary hover:underline cursor-pointer"
                        >
                          {formatDossierCard(tr.sender_card_number)}
                        </button>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      {tr.receiver_card_id ? (
                        <button
                          type="button"
                          onClick={() => onQuickViewCard(tr.receiver_card_id!)}
                          className="font-mono text-primary hover:underline cursor-pointer"
                        >
                          {formatDossierCard(tr.receiver_card_number)}
                        </button>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="py-2 font-mono text-muted-foreground">
                      {formatDossierDate(tr.transfer_date)}
                    </TableCell>
                    <TableCell className="py-2">
                      {tr.application_id ? (
                        <button
                          type="button"
                          onClick={() => onQuickViewApp(tr.application_id!)}
                          className="font-mono font-bold text-primary hover:underline cursor-pointer"
                        >
                          № {tr.application_number || 'Ariza'}
                        </button>
                      ) : (
                        'Vipiska'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
