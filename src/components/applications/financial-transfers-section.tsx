import {
  AlertCircle,
  ArrowLeftRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Hash,
  Plus,
  ShieldAlert,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import type { RefObject } from 'react';

import { LiveRadarBadge } from '@/components/intelligence/live-radar-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatAmountInput, formatAmountWords, formatCardNumberDisplay } from '@/lib/formatters';
import type { Bank, Card, PaymentProvider, TransferDestinationType } from '@/types/models';

import type { FinancialTransferEntry } from './application-form.types';

const DESTINATION_CHANNEL_OPTIONS: Array<{
  type: TransferDestinationType;
  label: string;
  platformLabel: string;
  platformPlaceholder: string;
  valueLabel: string;
  valuePlaceholder: string;
  radarType: string;
  presets: string[];
}> = [
  {
    type: 'CARD',
    label: 'Plastik karta',
    platformLabel: '',
    platformPlaceholder: '',
    valueLabel: 'Karta raqami (16 talik) *',
    valuePlaceholder: '9860 0000 0000 0000',
    radarType: 'card_number',
    presets: [],
  },
  {
    type: 'CRYPTO',
    label: 'Kripto / Birja',
    platformLabel: 'Birja / Tarmoq',
    platformPlaceholder: 'Binance, Bybit, OKX, USDT TRC-20...',
    valueLabel: 'Birja UID yoki Kripto-hamyon *',
    valuePlaceholder: 'UID 48291034 yoki TR7NHq...',
    radarType: 'crypto_wallet',
    presets: ['Binance', 'Bybit', 'OKX', 'USDT TRC-20', 'TON'],
  },
  {
    type: 'PLATFORM',
    label: 'Onlayn Servis',
    platformLabel: 'Platforma / Servis',
    platformPlaceholder: 'TikTok, Telegram, 1xBet, Steam...',
    valueLabel: 'Profil / Akkaunt ID yoki @username *',
    valuePlaceholder: '@user_profile yoki ID 9912045',
    radarType: 'online_platform',
    presets: ['1xBet', 'TikTok', 'Telegram', 'Steam', 'OLX'],
  },
  {
    type: 'BANK_ACCOUNT',
    label: 'Hisob raqam',
    platformLabel: 'Bank nomi / MFO',
    platformPlaceholder: 'Kapitalbank, Ipak Yo‘li, NBU...',
    valueLabel: '20 xonali bank hisob raqami *',
    valuePlaceholder: '20208000...',
    radarType: 'bank_account',
    presets: ['Kapitalbank', 'Ipak Yo‘li', 'Hamkorbank', 'NBU'],
  },
  {
    type: 'CASH',
    label: 'Naqd / ATM',
    platformLabel: 'Naqdlashtirish joyi',
    platformPlaceholder: 'Bankomat (ATM), Bank kassasi...',
    valueLabel: 'ATM ID yoki manzil',
    valuePlaceholder: 'ATM #402, Qarshi sh...',
    radarType: 'other_info',
    presets: ['Bankomat (ATM)', 'Bank kassasi', 'Valyuta ayirboshlash'],
  },
];

export type ActiveTransferPopover = {
  index: number;
  type: 'victimCard' | 'receiverCard';
} | null;

interface FinancialTransfersSectionProps {
  excludeAppId?: string;
  hasFinancialLoss: boolean;
  setHasFinancialLoss: (val: boolean) => void;
  transferContainerRef: RefObject<HTMLDivElement | null>;
  financialTransfers: FinancialTransferEntry[];
  activeTransferPopover: ActiveTransferPopover;
  setActiveTransferPopover: (val: ActiveTransferPopover) => void;
  filteredVictimCards: Card[];
  filteredReceiverCards: Card[];
  allBanks: Bank[];
  allProviders: PaymentProvider[];
  onUpdateTransferEntry: (index: number, patch: Partial<FinancialTransferEntry>) => void;
  onAddTransferEntry: () => void;
  onRemoveTransferEntry: (index: number) => void;
  onFillApplicantName: (index: number) => void;
}

export function FinancialTransfersSection({
  excludeAppId,
  hasFinancialLoss,
  setHasFinancialLoss,
  transferContainerRef,
  financialTransfers,
  activeTransferPopover,
  setActiveTransferPopover,
  filteredVictimCards,
  filteredReceiverCards,
  allBanks,
  allProviders,
  onUpdateTransferEntry,
  onAddTransferEntry,
  onRemoveTransferEntry,
  onFillApplicantName,
}: FinancialTransfersSectionProps) {
  return (
    <div className="p-5 sm:p-6 space-y-5 bg-emerald-50 dark:bg-emerald-950/20 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/70 dark:border-emerald-800/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              3. Bank Plastik Kartasi & Noqonuniy Pul O‘tkazmasi
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Mazkur holatda bank kartalari orqali moliyaviy zarar yetkazilgan bo‘lsa yoqing
            </p>
          </div>
        </div>

        {/* INTERAKTIV TOGGLE SWITCH */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto bg-card border border-border px-3 py-1.5 rounded-xl shadow-sm">
          <span className="text-xs font-semibold text-foreground select-none">
            Pul o‘tkazmasi bormi?
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={hasFinancialLoss}
            onClick={() => setHasFinancialLoss(!hasFinancialLoss)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              hasFinancialLoss ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                hasFinancialLoss ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {!hasFinancialLoss ? (
        <div className="p-4 rounded-xl border border-dashed border-border/80 bg-background/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>
              Ushbu ariza bo‘yicha bank kartasi yoki pul o‘tkazmasi kiritilmagan. Agar karta orqali
              mablag‘ yechilgan bo‘lsa, yuqoridagi tugmani yoqing.
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setHasFinancialLoss(true)}
            className="h-8 text-xs shrink-0 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Karta va o‘tkazmani kiritish
          </Button>
        </div>
      ) : (
        <div ref={transferContainerRef} className="space-y-6 animate-in fade-in-50 duration-200">
          {financialTransfers.map((entry, index) => (
            <div
              key={entry.clientId}
              className="p-4 sm:p-5 rounded-2xl border border-border bg-card/70 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {index === 0 ? '1-O‘tkazma shakli (Asosiy)' : `${index + 1}-O‘tkazma shakli`}
                  </span>
                </div>
                {financialTransfers.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveTransferEntry(index)}
                    className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1 px-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    O‘chirish
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* 1. JABRLANUVCHI KARTASI */}
                <div className="p-4 rounded-xl border border-border bg-muted/10 shadow-sm space-y-3 relative">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-primary" />
                      Jabrlanuvchi Bank Kartasi
                    </span>
                    {entry.victimCardId ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                        <CheckCircle2 className="h-3 w-3" />
                        Bazadagi karta
                        <button
                          type="button"
                          onClick={() => onUpdateTransferEntry(index, { victimCardId: null })}
                          className="ml-1 hover:text-foreground"
                          title="Bog‘lanishni bekor qilish"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : entry.victimCardNumber ? (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Yangi karta
                      </Badge>
                    ) : null}
                  </div>

                  <div className="relative space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Karta raqami (16 talik) *
                    </label>
                    <Input
                      placeholder="8600 0000 0000 0000"
                      value={formatCardNumberDisplay(entry.victimCardNumber)}
                      onFocus={() => setActiveTransferPopover({ index, type: 'victimCard' })}
                      onChange={(e) => {
                        const val = formatCardNumberDisplay(e.target.value);
                        onUpdateTransferEntry(index, {
                          victimCardNumber: val,
                          victimCardId: null,
                        });
                        setActiveTransferPopover({ index, type: 'victimCard' });
                      }}
                      className="h-9 text-xs font-mono font-bold tracking-wider"
                      maxLength={19}
                    />
                    {activeTransferPopover?.index === index &&
                      activeTransferPopover.type === 'victimCard' &&
                      filteredVictimCards.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border shadow-xl rounded-xl p-2 max-h-40 overflow-y-auto">
                          <div className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 border-b border-border/50 mb-1">
                            Bazada mavjud kartalar:
                          </div>
                          {filteredVictimCards.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => {
                                onUpdateTransferEntry(index, {
                                  victimCardId: c.id,
                                  victimCardNumber: formatCardNumberDisplay(c.card_number || ''),
                                  victimCardFullName: c.full_name || '',
                                  victimBankName: c.bank?.name || '',
                                });
                                setActiveTransferPopover(null);
                              }}
                              className="p-1.5 rounded hover:bg-muted cursor-pointer flex justify-between font-mono text-xs"
                            >
                              <span className="font-bold text-foreground">
                                {formatCardNumberDisplay(c.card_number)}
                              </span>
                              <span className="text-muted-foreground">
                                {c.bank?.name || 'Bank'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        Karta egasining F.I.SH.
                      </label>
                      <button
                        type="button"
                        onClick={() => onFillApplicantName(index)}
                        className="text-[10px] font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded transition-colors"
                      >
                        <UserCheck className="h-3 w-3" />
                        Arizachining o‘zi
                      </button>
                    </div>
                    <Input
                      placeholder="ESHMURODOV TOSHPULAT..."
                      value={entry.victimCardFullName}
                      onChange={(e) =>
                        onUpdateTransferEntry(index, {
                          victimCardFullName: e.target.value.toUpperCase(),
                        })
                      }
                      className="h-9 text-xs uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Xizmat ko‘rsatuvchi bank
                    </label>
                    <select
                      value={entry.victimBankName || ''}
                      onChange={(e) =>
                        onUpdateTransferEntry(index, {
                          victimBankName: e.target.value,
                        })
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold uppercase shadow-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="">-- BANKNI TANLANG --</option>
                      {allBanks.map((b) => (
                        <option key={b.id} value={b.name || ''}>
                          {b.name?.toUpperCase()}
                        </option>
                      ))}
                      {entry.victimBankName &&
                        !allBanks.some(
                          (b) =>
                            b.name?.trim().toUpperCase() ===
                            entry.victimBankName?.trim().toUpperCase(),
                        ) && (
                          <option value={entry.victimBankName}>
                            {entry.victimBankName.toUpperCase()}
                          </option>
                        )}
                    </select>
                  </div>
                </div>

                {/* 2. O'TKAZMA MA'LUMOTI */}
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <ArrowLeftRight className="h-4 w-4 text-primary" />
                      O‘tkazma Ma‘lumoti
                    </span>
                    {entry.transferDate && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-primary/40 text-primary"
                      >
                        {entry.transferDate} {entry.transferTime ? `(${entry.transferTime})` : ''}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[11px] font-semibold text-foreground">
                        O‘tkazma Summasi *
                      </label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="1 000 000"
                        value={formatAmountInput(entry.amount)}
                        onChange={(e) =>
                          onUpdateTransferEntry(index, {
                            amount: formatAmountInput(e.target.value),
                          })
                        }
                        className="h-9 text-xs font-mono font-bold text-emerald-400 bg-background"
                      />
                      {entry.amount && (
                        <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-0.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>{formatAmountWords(entry.amount, entry.currency)}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        Valyuta
                      </label>
                      <select
                        value={entry.currency}
                        onChange={(e) => onUpdateTransferEntry(index, { currency: e.target.value })}
                        className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs font-mono font-bold"
                      >
                        <option value="UZS">UZS</option>
                        <option value="USD">USD</option>
                        <option value="RUB">RUB</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      To‘lov Provayderi / Ilova Nomi
                    </label>
                    <select
                      value={entry.providerName || ''}
                      onChange={(e) => {
                        const pName = e.target.value;
                        const found = allProviders.find(
                          (p) => p.name?.toUpperCase() === pName.toUpperCase(),
                        );
                        onUpdateTransferEntry(index, {
                          providerName: pName,
                          providerId: found?.id || null,
                        });
                      }}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold uppercase shadow-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="">-- PROVAYDERNI TANLANG --</option>
                      {allProviders.map((p) => (
                        <option key={p.id} value={p.name || ''}>
                          {p.name?.toUpperCase()}
                        </option>
                      ))}
                      {entry.providerName &&
                        !allProviders.some(
                          (p) =>
                            p.name?.trim().toUpperCase() ===
                            entry.providerName?.trim().toUpperCase(),
                        ) && (
                          <option value={entry.providerName}>
                            {entry.providerName.toUpperCase()}
                          </option>
                        )}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-primary" /> O‘tkazma Sanasi
                      </label>
                      <Input
                        type="date"
                        value={entry.transferDate}
                        onChange={(e) => {
                          const newDate = e.target.value;
                          onUpdateTransferEntry(index, {
                            transferDate: newDate,
                            transferTime: newDate ? entry.transferTime : '',
                          });
                        }}
                        className="h-9 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 text-primary" /> O‘tkazma Vaqti
                      </label>
                      <Input
                        type="time"
                        value={entry.transferTime}
                        disabled={!entry.transferDate}
                        onChange={(e) =>
                          onUpdateTransferEntry(index, { transferTime: e.target.value })
                        }
                        className={`h-9 text-xs bg-background ${!entry.transferDate ? 'opacity-50 cursor-not-allowed bg-muted' : ''}`}
                        title={!entry.transferDate ? 'Avval o‘tkazma sanasini tanlang' : undefined}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Hash className="h-3 w-3 text-primary" /> Chek / Tranzaksiya ID (ixtiyoriy)
                    </label>
                    <Input
                      placeholder="Masalan: 184920194812"
                      value={entry.transactionId || ''}
                      onChange={(e) =>
                        onUpdateTransferEntry(index, { transactionId: e.target.value })
                      }
                      className="h-9 text-xs font-mono bg-background"
                    />
                  </div>
                </div>

                {/* 3. FIRIBGAR (QABUL QILUVCHI) KARTASI YOKI CHIQISH KANALI */}
                {(() => {
                  const activeDestType: TransferDestinationType = entry.destinationType || 'CARD';
                  const activeChannel =
                    DESTINATION_CHANNEL_OPTIONS.find((c) => c.type === activeDestType) ||
                    DESTINATION_CHANNEL_OPTIONS[0];
                  return (
                    <div className="p-4 rounded-xl border border-red-500/30 bg-muted/10 shadow-sm space-y-3 relative">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2 gap-1.5">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
                          Qabul Qiluvchi (Firibgar)
                        </span>
                        {activeDestType === 'CARD' ? (
                          entry.receiverCardId ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                              <CheckCircle2 className="h-3 w-3" />
                              Bazadagi karta
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateTransferEntry(index, { receiverCardId: null })
                                }
                                className="ml-1 hover:text-foreground"
                                title="Bog‘lanishni bekor qilish"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ) : entry.receiverCardNumber ? (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Yangi karta
                            </Badge>
                          ) : null
                        ) : (
                          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px]">
                            {activeChannel.label}
                          </Badge>
                        )}
                      </div>

                      {/* Chiqish kanali tanlovi */}
                      <div className="flex flex-wrap gap-1">
                        {DESTINATION_CHANNEL_OPTIONS.map((ch) => (
                          <button
                            key={ch.type}
                            type="button"
                            onClick={() =>
                              onUpdateTransferEntry(index, {
                                destinationType: ch.type,
                                ...(ch.type !== 'CARD'
                                  ? {
                                      receiverCardId: null,
                                      receiverCardNumber: '',
                                      receiverCardFullName: '',
                                      receiverBankName: '',
                                    }
                                  : {
                                      destinationPlatform: '',
                                      destinationValue: '',
                                      destinationLabel: '',
                                    }),
                              })
                            }
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                              activeDestType === ch.type
                                ? 'bg-rose-600 text-white border-rose-600'
                                : 'bg-background text-muted-foreground border-border hover:border-rose-400 hover:text-foreground'
                            }`}
                          >
                            {ch.label}
                          </button>
                        ))}
                      </div>

                      {activeDestType === 'CARD' ? (
                        <>
                          <div className="relative space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <label className="text-[11px] font-semibold text-muted-foreground">
                                Karta raqami (16 talik) *
                              </label>
                              {entry.receiverCardNumber && (
                                <LiveRadarBadge
                                  type="card_number"
                                  value={entry.receiverCardNumber}
                                  excludeAppId={excludeAppId}
                                />
                              )}
                            </div>
                            <Input
                              placeholder="9860 0000 0000 0000"
                              value={formatCardNumberDisplay(entry.receiverCardNumber)}
                              onFocus={() =>
                                setActiveTransferPopover({ index, type: 'receiverCard' })
                              }
                              onChange={(e) => {
                                const val = formatCardNumberDisplay(e.target.value);
                                onUpdateTransferEntry(index, {
                                  receiverCardNumber: val,
                                  receiverCardId: null,
                                });
                                setActiveTransferPopover({ index, type: 'receiverCard' });
                              }}
                              className="h-9 text-xs font-mono font-bold tracking-wider"
                              maxLength={19}
                            />
                            {activeTransferPopover?.index === index &&
                              activeTransferPopover.type === 'receiverCard' &&
                              filteredReceiverCards.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border shadow-xl rounded-xl p-2 max-h-40 overflow-y-auto">
                                  <div className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 border-b border-border/50 mb-1">
                                    Bazada mavjud kartalar:
                                  </div>
                                  {filteredReceiverCards.map((c) => (
                                    <div
                                      key={c.id}
                                      onClick={() => {
                                        onUpdateTransferEntry(index, {
                                          receiverCardId: c.id,
                                          receiverCardNumber: formatCardNumberDisplay(
                                            c.card_number || '',
                                          ),
                                          receiverCardFullName: c.full_name || '',
                                          receiverBankName: c.bank?.name || '',
                                        });
                                        setActiveTransferPopover(null);
                                      }}
                                      className="p-1.5 rounded hover:bg-muted cursor-pointer flex justify-between font-mono text-xs"
                                    >
                                      <span className="font-bold text-foreground">
                                        {formatCardNumberDisplay(c.card_number)}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {c.bank?.name || 'Bank'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted-foreground">
                              Karta egasining F.I.SH.
                            </label>
                            <Input
                              placeholder="FIRIBGAR / NOMA‘LUM SHAXS F.I.SH."
                              value={entry.receiverCardFullName}
                              onChange={(e) =>
                                onUpdateTransferEntry(index, {
                                  receiverCardFullName: e.target.value.toUpperCase(),
                                })
                              }
                              className="h-9 text-xs uppercase"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted-foreground">
                              Firibgar kartasi banki
                            </label>
                            <select
                              value={entry.receiverBankName || ''}
                              onChange={(e) =>
                                onUpdateTransferEntry(index, {
                                  receiverBankName: e.target.value,
                                })
                              }
                              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold uppercase shadow-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                            >
                              <option value="">-- BANKNI TANLANG --</option>
                              {allBanks.map((b) => (
                                <option key={b.id} value={b.name || ''}>
                                  {b.name?.toUpperCase()}
                                </option>
                              ))}
                              {entry.receiverBankName &&
                                !allBanks.some(
                                  (b) =>
                                    b.name?.trim().toUpperCase() ===
                                    entry.receiverBankName?.trim().toUpperCase(),
                                ) && (
                                  <option value={entry.receiverBankName}>
                                    {entry.receiverBankName.toUpperCase()}
                                  </option>
                                )}
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted-foreground">
                              {activeChannel.platformLabel}
                            </label>
                            <Input
                              placeholder={activeChannel.platformPlaceholder}
                              value={entry.destinationPlatform || ''}
                              onChange={(e) =>
                                onUpdateTransferEntry(index, {
                                  destinationPlatform: e.target.value,
                                })
                              }
                              className="h-9 text-xs"
                            />
                            {activeChannel.presets.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {activeChannel.presets.map((p) => (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() =>
                                      onUpdateTransferEntry(index, { destinationPlatform: p })
                                    }
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-rose-500/15 hover:text-rose-600 text-muted-foreground cursor-pointer"
                                  >
                                    {p}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <label className="text-[11px] font-semibold text-muted-foreground">
                                {activeChannel.valueLabel}
                              </label>
                              {entry.destinationValue && activeDestType !== 'CASH' && (
                                <LiveRadarBadge
                                  type={activeChannel.radarType}
                                  value={entry.destinationValue}
                                  excludeAppId={excludeAppId}
                                />
                              )}
                            </div>
                            <Input
                              placeholder={activeChannel.valuePlaceholder}
                              value={entry.destinationValue || ''}
                              onChange={(e) =>
                                onUpdateTransferEntry(index, { destinationValue: e.target.value })
                              }
                              className="h-9 text-xs font-mono"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}

          {/* + TUGMASI: YANGI KARTA VA O'TKAZMA SHAKLI QO'SHISH */}
          <Button
            type="button"
            variant="outline"
            onClick={onAddTransferEntry}
            className="w-full border-dashed py-5 text-xs font-semibold gap-2 border-primary/40 hover:border-primary text-primary hover:bg-primary/5 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Yangi karta & o‘tkazma shaklini qo‘shish
          </Button>
        </div>
      )}
    </div>
  );
}
