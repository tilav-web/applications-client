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

      let roleLabel = 'Karta';
      let roleClass = 'bg-muted text-muted-foreground border border-border';
      if (isBoth) {
        roleLabel = 'Tranzit';
        roleClass =
          'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35 font-semibold';
      } else if (isIncomingDanger) {
        roleLabel = 'Pul olgan (Firibgar / Dropper)';
        roleClass =
          'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/35 font-bold';
      } else if (totalOut > 0 || linkedApps.length > 0) {
        roleLabel = 'Jabrlanuvchi kartasi';
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

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const isExpanded = (cardId: string, idx: number, hasActivity: boolean, isDanger: boolean) => {
    if (expandedIds[cardId] !== undefined) return expandedIds[cardId];
    return hasActivity && (isDanger || idx < 2 || groups.length <= 3);
  };

  const toggleCard = (cardId: string, currentlyOpen: boolean) => {
    setExpandedIds((prev) => ({ ...prev, [cardId]: !currentlyOpen }));
  };

  if (groups.length === 0 && orphanTransfers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {groups.map((grp, idx) => {
        const hasActivity = grp.transfers.length > 0 || grp.linkedApps.length > 0;
        const open = isExpanded(grp.card.id, idx, hasActivity, grp.isDanger);

        return (
          <Card
            key={grp.card.id}
            className={`py-0 gap-0 overflow-hidden ${
              grp.isDanger
                ? 'border-l-4 border-l-rose-500 border-border/80 bg-card'
                : 'border-border/80 bg-card'
            }`}
          >
            {/* Karta 1-qator sarlavha */}
            <div
              onClick={() => hasActivity && toggleCard(grp.card.id, open)}
              className={`px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 ${
                hasActivity ? 'cursor-pointer hover:bg-muted/25' : ''
              } transition-colors`}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0">
                <CreditCard
                  className={`h-4 w-4 shrink-0 ${
                    grp.isDanger ? 'text-rose-500' : 'text-muted-foreground'
                  }`}
                />
                <span className="font-mono text-sm font-bold text-foreground">
                  {formatDossierCard(grp.card.card_number, grp.card.masked_number)}
                </span>
                <Badge className={`text-[11px] ${grp.roleClass}`}>{grp.roleLabel}</Badge>
                {grp.card.bank?.name && (
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {grp.card.bank.name}
                  </span>
                )}
                {grp.totalIn > 0 && (
                  <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    ↙ {formatDossierMoney(grp.totalIn)}
                  </span>
                )}
                {grp.totalOut > 0 && (
                  <span className="text-xs font-mono font-semibold text-rose-600 dark:text-rose-400">
                    ↗ {formatDossierMoney(grp.totalOut)}
                  </span>
                )}
                {hasActivity && (
                  <span className="text-xs text-muted-foreground">
                    · {grp.transfers.length} oʻtkazma · {grp.linkedApps.length} ariza
                  </span>
                )}
              </div>

              <div
                className="flex items-center gap-1 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onQuickViewCard(grp.card.id)}
                  className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Koʻrish
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenFullCard(grp.card.id)}
                  className="h-7 w-7 p-0 text-primary cursor-pointer"
                  title="Karta toʻliq sahifasi"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                {canMutate && onUnlinkCard && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onUnlinkCard(grp.card.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500 cursor-pointer"
                    title="Kartani uzish"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                {hasActivity && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCard(grp.card.id, open)}
                    className="h-7 w-7 p-0 text-muted-foreground cursor-pointer"
                  >
                    {open ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            {open && hasActivity && (
              <CardContent className="p-0 border-t border-border/60 bg-muted/10 divide-y divide-border/50">
                {grp.transfers.length > 0 && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/20">
                          <TableHead className="text-[11px] h-8">Yoʻnalish</TableHead>
                          <TableHead className="text-[11px] h-8">Summa</TableHead>
                          <TableHead className="text-[11px] h-8">Qarshi karta</TableHead>
                          <TableHead className="text-[11px] h-8">Provayder</TableHead>
                          <TableHead className="text-[11px] h-8">Sana</TableHead>
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
                                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                    <ArrowDownLeft className="h-3.5 w-3.5" /> Kirim
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                                    <ArrowUpRight className="h-3.5 w-3.5" /> Chiqim
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="py-2 font-mono font-bold whitespace-nowrap">
                                {formatDossierMoney(tr.amount, tr.currency)}
                              </TableCell>
                              <TableCell className="py-2">
                                {counterCardId ? (
                                  <button
                                    type="button"
                                    onClick={() => onQuickViewCard(counterCardId)}
                                    className="text-left hover:underline cursor-pointer"
                                  >
                                    <span className="font-mono font-semibold text-primary">
                                      {formatDossierCard(counterCardNum)}
                                    </span>
                                    {counterOwner && (
                                      <span className="text-[11px] text-muted-foreground ml-1.5">
                                        ({counterOwner})
                                      </span>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground">
                                    {counterCardNum || '—'}
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
                                  <span className="text-muted-foreground">Vipiska</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {grp.linkedApps.length > 0 && (
                  <div className="px-4 py-2.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground font-semibold inline-flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      Kartaga tushgan arizalar:
                    </span>
                    {grp.linkedApps.map((app) => {
                      const roleMeta = getRoleMeta(app.role_in_app);
                      return (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => onQuickViewApp(app.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-card hover:border-primary transition-colors cursor-pointer"
                        >
                          <span className="font-mono font-bold text-primary">
                            № {app.application_number}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            · {roleMeta.shortLabel}
                          </span>
                          {app.transfer_amount ? (
                            <span className="font-mono font-semibold text-rose-500">
                              · {formatDossierMoney(app.transfer_amount, app.currency)}
                            </span>
                          ) : null}
                          <ExternalLink
                            className="h-3 w-3 text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenFullApp(app.id);
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {orphanTransfers.length > 0 && (
        <Card className="py-0 gap-0 border-border/80 bg-card overflow-hidden">
          <div className="px-4 py-2.5 bg-muted/20 border-b border-border/60 text-xs font-bold flex items-center gap-1.5">
            <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
            Boshqa oʻtkazmalar ({orphanTransfers.length})
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableBody>
                {orphanTransfers.map((tr) => (
                  <TableRow key={tr.id} className="text-xs">
                    <TableCell className="py-2 font-semibold">
                      {tr.direction === 'INCOMING' ? (
                        <span className="text-emerald-600">↙ Kirim</span>
                      ) : (
                        <span className="text-rose-600">↗ Chiqim</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 font-mono font-bold">
                      {formatDossierMoney(tr.amount, tr.currency)}
                    </TableCell>
                    <TableCell className="py-2 font-mono">
                      {tr.sender_card_id ? (
                        <button
                          type="button"
                          onClick={() => onQuickViewCard(tr.sender_card_id!)}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          {formatDossierCard(tr.sender_card_number)}
                        </button>
                      ) : (
                        '—'
                      )}
                      {' → '}
                      {tr.receiver_card_id ? (
                        <button
                          type="button"
                          onClick={() => onQuickViewCard(tr.receiver_card_id!)}
                          className="text-primary hover:underline cursor-pointer"
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
