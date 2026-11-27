import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Hash,
  Settings2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { LiveRadarBadge } from '@/components/intelligence/live-radar-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { useDebounce } from '@/hooks/use-debounce';
import { usePermissions } from '@/hooks/use-permissions';
import {
  banksApi,
  cardsApi,
  intelligenceApi,
  paymentProvidersApi,
  transferChannelsApi,
} from '@/lib/api';
import { formatLocalDateISO } from '@/lib/date';
import { getErrorMessage } from '@/lib/error';
import { cleanCardNumber, formatAmountWords, formatCardNumberDisplay } from '@/lib/formatters';
import type { Bank, Card, PaymentProvider, TransferChannel } from '@/types/models';

function formatFlexibleAmountInput(raw: string): string {
  const cleaned = raw.replace(/\s+/g, '').replace(',', '.');
  if (!cleaned) return '';
  const parts = cleaned.split('.');
  const intPart = parts[0].replace(/\D/g, '');
  if (!intPart && parts.length <= 1) return '';
  const formattedInt = (intPart || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (parts.length > 1) {
    const decimals = parts.slice(1).join('').replace(/\D/g, '').slice(0, 6);
    return `${formattedInt}.${decimals}`;
  }
  return formattedInt;
}

function parseDecimalAmount(raw: string): number {
  const cleaned = raw
    .replace(/\s+/g, '')
    .replace(',', '.')
    .replace(/[^0-9.]/g, '');
  if (!cleaned) return 0;
  const parts = cleaned.split('.');
  const normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

interface TransitTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableCards?: Card[];
  defaultSenderCardNumber?: string;
  onSuccessInvalidateKeys: unknown[][];
}

interface EndpointPartyState {
  channelCode: string;
  cardId: string | null;
  cardNumber: string;
  ownerName: string;
  bankName: string;
  platform: string;
  network: string;
  value: string;
}

const CRYPTO_EXCHANGE_PRESETS = [
  'Binance',
  'Bybit',
  'OKX',
  'Trust Wallet',
  'Telegram Wallet',
  'Tonkeeper',
];

const CRYPTO_NETWORK_PRESETS = ['TRC-20', 'ERC-20', 'BEP-20', 'TON', 'BTC', 'SOL', 'Binance UID'];

const CURRENCY_OPTIONS = ['UZS', 'USDT', 'USD', 'RUB', 'BTC', 'TON', 'ETH'] as const;

const CRYPTO_PROVIDER_OPTIONS = ['Blockchain / On-chain', 'Birja ichki (UID / Pay)', 'P2P Savdo'];

const FALLBACK_CHANNELS: TransferChannel[] = [
  {
    id: 'default-card',
    name: 'Plastik karta',
    code: 'CARD',
    category: 'CARD',
    color: '#e74c3c',
    icon: '💳',
    presets: [],
    platform_label: null,
    platform_placeholder: null,
    value_label: 'Karta raqami (16 talik) *',
    value_placeholder: '8600 0000 0000 0000',
    sort_order: 1,
    is_active: true,
  },
  {
    id: 'default-crypto',
    name: 'Kripto / Birja',
    code: 'CRYPTO',
    category: 'CRYPTO',
    color: '#8b5cf6',
    icon: '🪙',
    presets: CRYPTO_EXCHANGE_PRESETS,
    platform_label: 'Birja / Hamyon',
    platform_placeholder: 'Binance, Bybit, OKX, Trust Wallet...',
    value_label: 'Hamyon manzili yoki Birja UID *',
    value_placeholder: 'TX9aK... (TRC-20) yoki UID 48291034',
    sort_order: 2,
    is_active: true,
  },
  {
    id: 'default-platform',
    name: 'Onlayn servis',
    code: 'PLATFORM',
    category: 'PLATFORM',
    color: '#0891b2',
    icon: '🌐',
    presets: ['1xBet', 'TikTok', 'Telegram', 'Steam', 'OLX'],
    platform_label: 'Platforma / Servis',
    platform_placeholder: '1xBet, TikTok, Telegram...',
    value_label: 'Profil / Akkaunt ID yoki @username *',
    value_placeholder: '@user_profile yoki ID 9912045',
    sort_order: 3,
    is_active: true,
  },
  {
    id: 'default-bank',
    name: 'Hisob raqam',
    code: 'BANK_ACCOUNT',
    category: 'BANK_ACCOUNT',
    color: '#475569',
    icon: '🏦',
    presets: ['Kapitalbank', 'Ipak Yo‘li', 'Hamkorbank', 'NBU'],
    platform_label: 'Bank nomi / MFO',
    platform_placeholder: 'Bank nomi yoki MFO kodi',
    value_label: '20 xonali bank hisob raqami *',
    value_placeholder: '20208000...',
    sort_order: 4,
    is_active: true,
  },
  {
    id: 'default-cash',
    name: 'Naqd / ATM',
    code: 'CASH',
    category: 'CASH',
    color: '#059669',
    icon: '🏧',
    presets: ['Bankomat (ATM)', 'Bank kassasi', 'Valyuta ayirboshlash'],
    platform_label: 'Naqdlashtirish joyi',
    platform_placeholder: 'Bankomat / Bank filiali nomi',
    value_label: 'ATM ID yoki manzil *',
    value_placeholder: 'ATM #402, Qarshi sh...',
    sort_order: 5,
    is_active: true,
  },
];

function createEmptyParty(card?: Card | null, defaultCardNum = ''): EndpointPartyState {
  if (card) {
    return {
      channelCode: 'CARD',
      cardId: card.id,
      cardNumber: formatCardNumberDisplay(card.card_number || card.masked_number || ''),
      ownerName: (card.full_name || '').toUpperCase(),
      bankName: card.bank?.name || '',
      platform: '',
      network: '',
      value: '',
    };
  }
  return {
    channelCode: 'CARD',
    cardId: null,
    cardNumber: defaultCardNum ? formatCardNumberDisplay(defaultCardNum) : '',
    ownerName: '',
    bankName: '',
    platform: '',
    network: '',
    value: '',
  };
}

function getRadarTypeForCategory(category: string): string {
  if (category === 'CRYPTO') return 'crypto_wallet';
  if (category === 'BANK_ACCOUNT') return 'bank_account';
  if (category === 'PLATFORM') return 'online_platform';
  return 'other_info';
}

function isPartyValid(party: EndpointPartyState, channel: TransferChannel): boolean {
  if (channel.category === 'CARD') {
    return Boolean(party.cardId || cleanCardNumber(party.cardNumber).length >= 8);
  }
  return party.value.trim().length >= 2;
}

function formatPartyPreview(
  party: EndpointPartyState,
  channel: TransferChannel,
): { title: string; subtitle: string; filled: boolean } {
  if (channel.category === 'CARD') {
    const clean = cleanCardNumber(party.cardNumber);
    if (!clean) {
      return { title: 'Karta kiritilmagan', subtitle: '16 talik raqam kiriting', filled: false };
    }
    const subParts = [party.ownerName.trim(), party.bankName.trim()].filter(Boolean);
    return {
      title: formatCardNumberDisplay(clean),
      subtitle: subParts.join(' · ') || 'Plastik karta',
      filled: true,
    };
  }

  const val = party.value.trim();
  const plat = party.platform.trim() || channel.name;
  const net = party.network.trim();
  const head = net && !plat.toLowerCase().includes(net.toLowerCase()) ? `${plat} (${net})` : plat;
  if (!val) {
    return { title: head, subtitle: 'Hamyon / ID kiritilmagan', filled: false };
  }
  const shortVal = val.length > 26 ? `${val.slice(0, 14)}…${val.slice(-8)}` : val;
  return {
    title: shortVal,
    subtitle: [head, party.ownerName.trim()].filter(Boolean).join(' · '),
    filled: true,
  };
}

interface EndpointPartyCardProps {
  role: 'source' | 'destination';
  party: EndpointPartyState;
  onChange: (patch: Partial<EndpointPartyState>) => void;
  channels: TransferChannel[];
  allBanks: Bank[];
  availableCards: Card[];
}

function EndpointPartyCard({
  role,
  party,
  onChange,
  channels,
  allBanks,
  availableCards,
}: EndpointPartyCardProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const activeChannel =
    channels.find((c) => c.code === party.channelCode) || channels[0] || FALLBACK_CHANNELS[0];
  const isCard = activeChannel.category === 'CARD';
  const isCrypto = activeChannel.category === 'CRYPTO';
  const isSource = role === 'source';

  const cardDigits = cleanCardNumber(party.cardNumber);
  const debouncedCardSearch = useDebounce(cardDigits, 220);

  const { data: matchedCardsRes } = useQuery({
    queryKey: ['transit-card-autocomplete', role, debouncedCardSearch],
    queryFn: () => cardsApi.getAll({ search: debouncedCardSearch, limit: 8 }),
    enabled: isCard && popoverOpen && !party.cardId && debouncedCardSearch.length >= 4,
    staleTime: 30_000,
  });

  const matchedCards = matchedCardsRes?.items || [];

  useEffect(() => {
    if (!popoverOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [popoverOpen]);

  const borderTone = isSource
    ? isCrypto
      ? 'border-violet-500/40 bg-violet-500/[0.03]'
      : 'border-blue-500/35 bg-blue-500/[0.03]'
    : isCrypto
      ? 'border-purple-500/40 bg-purple-500/[0.03]'
      : 'border-rose-500/35 bg-rose-500/[0.03]';

  const stepBadgeTone = isSource
    ? 'bg-blue-600 text-white'
    : isCrypto
      ? 'bg-purple-600 text-white'
      : 'bg-rose-600 text-white';

  const activePillTone = isSource
    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
    : isCrypto
      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
      : 'bg-rose-600 text-white border-rose-600 shadow-2xs';

  const presets =
    activeChannel.presets && activeChannel.presets.length > 0
      ? activeChannel.presets
      : isCrypto
        ? CRYPTO_EXCHANGE_PRESETS
        : [];

  return (
    <div className={`p-4 rounded-2xl border shadow-2xs space-y-3.5 flex flex-col ${borderTone}`}>
      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${stepBadgeTone}`}
          >
            {isSource ? '1' : '3'}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-foreground">
              {isSource ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              ) : (
                <ArrowDownLeft className="h-3.5 w-3.5 text-rose-600 shrink-0" />
              )}
              <span className="truncate">{isSource ? 'Qayerdan chiqdi' : 'Qayerga tushdi'}</span>
            </div>
          </div>
        </div>

        {isCard ? (
          party.cardId ? (
            <Badge className="bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[10px] shrink-0">
              <CheckCircle2 className="h-3 w-3" />
              Bazadagi karta
              <button
                type="button"
                onClick={() => onChange({ cardId: null })}
                className="ml-0.5 hover:text-foreground cursor-pointer"
                title="Bog‘lanishni bekor qilish"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ) : cardDigits.length >= 8 ? (
            <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
              Yangi karta
            </Badge>
          ) : null
        ) : (
          <Badge
            className={`text-[10px] shrink-0 ${
              isCrypto
                ? 'bg-purple-500/12 text-purple-600 dark:text-purple-400 border-purple-500/30'
                : 'bg-primary/10 text-primary border-primary/25'
            }`}
          >
            {activeChannel.icon} {activeChannel.name}
          </Badge>
        )}
      </div>

      {/* Channel selector — full readable labels, never truncated */}
      <div className="flex flex-wrap gap-1.5">
        {channels.map((ch) => {
          const active = activeChannel.code === ch.code;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => {
                if (ch.code === party.channelCode) return;
                onChange({
                  channelCode: ch.code,
                  ...(ch.category !== 'CARD'
                    ? { cardId: null, cardNumber: '', bankName: '' }
                    : { platform: '', network: '', value: '' }),
                });
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                active
                  ? activePillTone
                  : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              }`}
            >
              <span className="text-xs leading-none">{ch.icon || '🌐'}</span>
              <span>{ch.name}</span>
            </button>
          );
        })}
      </div>

      {/* Quick dossier card picker (when opened from Card/Citizen Dossier) */}
      {isCard && availableCards.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Dosyedagi kartadan tanlash:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {availableCards.map((c) => {
              const selected = party.cardId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      cardId: c.id,
                      cardNumber: formatCardNumberDisplay(c.card_number || c.masked_number || ''),
                      ownerName: (c.full_name || '').toUpperCase(),
                      bankName: c.bank?.name || '',
                    })
                  }
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                    selected
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-background border-border hover:border-primary text-foreground'
                  }`}
                >
                  <CreditCard className="h-3 w-3 shrink-0" />
                  <span>{formatCardNumberDisplay(c.card_number || c.masked_number)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Body Fields */}
      {isCard ? (
        <div className="space-y-3 flex-1">
          <div ref={popoverRef} className="relative space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Karta raqami (16 talik) *
              </label>
              {cardDigits.length >= 8 && <LiveRadarBadge type="card_number" value={cardDigits} />}
            </div>
            <Input
              placeholder={isSource ? '8600 0000 0000 0000' : '9860 0000 0000 0000'}
              value={formatCardNumberDisplay(party.cardNumber)}
              onFocus={() => setPopoverOpen(true)}
              onChange={(e) => {
                const formatted = formatCardNumberDisplay(e.target.value);
                onChange({ cardNumber: formatted, cardId: null });
                setPopoverOpen(true);
              }}
              className="h-10 text-xs sm:text-sm font-mono font-bold tracking-wider bg-background"
              maxLength={19}
            />

            {popoverOpen && !party.cardId && matchedCards.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border shadow-xl rounded-xl p-1.5 max-h-44 overflow-y-auto">
                <div className="text-[10px] font-semibold text-muted-foreground px-2 py-1 border-b border-border/50 mb-1">
                  Bazada mavjud kartalar:
                </div>
                {matchedCards.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onChange({
                        cardId: c.id,
                        cardNumber: formatCardNumberDisplay(c.card_number || ''),
                        ownerName: (c.full_name || '').toUpperCase(),
                        bankName: c.bank?.name || '',
                      });
                      setPopoverOpen(false);
                    }}
                    className="w-full p-2 rounded-lg hover:bg-muted cursor-pointer flex items-center justify-between gap-2 text-left"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-bold text-foreground">
                        {formatCardNumberDisplay(c.card_number)}
                      </div>
                      {c.full_name && (
                        <div className="text-[10px] text-muted-foreground truncate">
                          {c.full_name}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
                      {c.bank?.name || 'Bank'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">
              Karta egasining F.I.SH. (ixtiyoriy)
            </label>
            <Input
              placeholder="ESHMURODOV TOSHPULAT..."
              value={party.ownerName}
              onChange={(e) => onChange({ ownerName: e.target.value.toUpperCase() })}
              className="h-10 text-xs uppercase bg-background"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">
              Xizmat ko‘rsatuvchi bank
            </label>
            <select
              value={party.bankName}
              onChange={(e) => onChange({ bankName: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold uppercase shadow-2xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="">-- BANKNI TANLANG --</option>
              {allBanks.map((b) => (
                <option key={b.id} value={b.name || ''}>
                  {b.name?.toUpperCase()}
                </option>
              ))}
              {party.bankName &&
                !allBanks.some(
                  (b) => b.name?.trim().toUpperCase() === party.bankName.trim().toUpperCase(),
                ) && <option value={party.bankName}>{party.bankName.toUpperCase()}</option>}
            </select>
          </div>
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          {/* Birja / Platforma / Bank / Joy nomi + presets */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">
              {activeChannel.platform_label ||
                (isCrypto ? 'Birja / Hamyon turi' : 'Platforma / Joy nomi')}
            </label>
            <Input
              value={party.platform}
              onChange={(e) => onChange({ platform: e.target.value })}
              placeholder={
                activeChannel.platform_placeholder ||
                (isCrypto ? 'Binance, Bybit, OKX, Trust Wallet...' : 'Platforma yoki joy nomi')
              }
              className="h-9 text-xs bg-background"
            />
            {presets.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {presets.map((preset) => {
                  const active = party.platform.trim().toLowerCase() === preset.toLowerCase();
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onChange({ platform: preset })}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Kripto uchun maxsus Tarmoq (Network) tanlovi */}
          {isCrypto && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Tarmoq (Network) / Turi
              </label>
              <div className="flex flex-wrap gap-1">
                {CRYPTO_NETWORK_PRESETS.map((net) => {
                  const active = party.network.trim().toUpperCase() === net.toUpperCase();
                  return (
                    <button
                      key={net}
                      type="button"
                      onClick={() => onChange({ network: active ? '' : net })}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border transition-colors cursor-pointer ${
                        active
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-purple-400'
                      }`}
                    >
                      {net}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hamyon / UID / Hisob raqam / Profil ID */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-semibold text-muted-foreground">
                {activeChannel.value_label ||
                  (isCrypto ? 'Hamyon manzili yoki Birja UID *' : 'UID / Profil / Hisob raqam *')}
              </label>
              {party.value.trim().length >= 3 && activeChannel.category !== 'CASH' && (
                <LiveRadarBadge
                  type={getRadarTypeForCategory(activeChannel.category)}
                  value={party.value.trim()}
                />
              )}
            </div>
            <Input
              value={party.value}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder={
                activeChannel.value_placeholder ||
                (isCrypto ? 'TX9aK... yoki UID 48291034' : 'ID, hisob raqam yoki manzil...')
              }
              className="h-10 font-mono font-semibold text-xs bg-background"
            />
          </div>

          {/* Egasi / @username (ixtiyoriy) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">
              {isCrypto ? 'Egasi / Nikneyim (ixtiyoriy)' : 'Egasi / Izoh (ixtiyoriy)'}
            </label>
            <Input
              value={party.ownerName}
              onChange={(e) => onChange({ ownerName: e.target.value })}
              placeholder={isCrypto ? '@trader_uz yoki F.I.SH.' : 'Kontragent F.I.SH. yoki izoh'}
              className="h-9 text-xs bg-background"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TransitTransferDialogBody({
  onOpenChange,
  availableCards,
  defaultSenderCardNumber,
  onSuccessInvalidateKeys,
}: Omit<TransitTransferDialogProps, 'open'>) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isAdmin } = usePermissions();

  const { data: channelsRes } = useQuery({
    queryKey: ['transfer-channels'],
    queryFn: () => transferChannelsApi.getAll({ limit: 100 }),
    staleTime: 60_000,
  });

  const { data: banksRes } = useQuery({
    queryKey: ['banks-transit-select'],
    queryFn: () => banksApi.getAll({ limit: 100 }),
    staleTime: 5 * 60_000,
  });

  const { data: providersRes } = useQuery({
    queryKey: ['providers-transit-select'],
    queryFn: () => paymentProvidersApi.getAll({ limit: 100 }),
    staleTime: 5 * 60_000,
  });

  const channels = useMemo(() => {
    const active = (channelsRes?.items || []).filter((c) => c.is_active !== false);
    return active.length > 0 ? active : FALLBACK_CHANNELS;
  }, [channelsRes]);

  const allBanks: Bank[] = banksRes?.items || [];
  const allProviders: PaymentProvider[] = providersRes?.items || [];

  const [source, setSource] = useState<EndpointPartyState>(() =>
    createEmptyParty(availableCards?.[0] || null, defaultSenderCardNumber || ''),
  );
  const [destination, setDestination] = useState<EndpointPartyState>(() => createEmptyParty());

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<string>('UZS');
  const [providerName, setProviderName] = useState('');
  const [transferDate, setTransferDate] = useState(() => formatLocalDateISO());
  const [transferTime, setTransferTime] = useState('12:00');
  const [transactionId, setTransactionId] = useState('');

  const sourceChannel =
    channels.find((c) => c.code === source.channelCode) || channels[0] || FALLBACK_CHANNELS[0];
  const destChannel =
    channels.find((c) => c.code === destination.channelCode) || channels[0] || FALLBACK_CHANNELS[0];

  const hasCrypto = sourceChannel.category === 'CRYPTO' || destChannel.category === 'CRYPTO';
  const parsedAmount = parseDecimalAmount(amount);

  const sourceValid = isPartyValid(source, sourceChannel);
  const destValid = isPartyValid(destination, destChannel);
  const isSameCard =
    sourceChannel.category === 'CARD' &&
    destChannel.category === 'CARD' &&
    cleanCardNumber(source.cardNumber).length >= 8 &&
    cleanCardNumber(source.cardNumber) === cleanCardNumber(destination.cardNumber);

  const sourcePreview = formatPartyPreview(source, sourceChannel);
  const destPreview = formatPartyPreview(destination, destChannel);

  const handleSwapSides = () => {
    setSource(destination);
    setDestination(source);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const srcIsCard = sourceChannel.category === 'CARD';
      const dstIsCard = destChannel.category === 'CARD';

      const srcPlatform = source.platform.trim() || (!srcIsCard ? sourceChannel.name : '');
      const srcNet = source.network.trim();
      const srcVal = source.value.trim();

      const dstPlatform = destination.platform.trim() || (!dstIsCard ? destChannel.name : '');
      const dstNet = destination.network.trim();
      const dstVal = destination.value.trim();

      const buildLabel = (plat: string, net: string, val: string) => {
        const prefix =
          plat && net && !plat.toLowerCase().includes(net.toLowerCase())
            ? `${plat} (${net})`
            : plat || net;
        if (prefix && val) return `${prefix}: ${val}`;
        return val || prefix || undefined;
      };

      const matchedProvider = allProviders.find(
        (p) => p.name?.trim().toUpperCase() === providerName.trim().toUpperCase(),
      );

      const effectiveProviderName =
        providerName.trim() || (!dstIsCard ? dstPlatform : !srcIsCard ? srcPlatform : '');

      return intelligenceApi.createTransitTransfer({
        source_type: sourceChannel.category,
        sender_card_id: srcIsCard ? source.cardId || undefined : undefined,
        sender_card_number: srcIsCard ? cleanCardNumber(source.cardNumber) || undefined : undefined,
        sender_owner_name: source.ownerName.trim() || undefined,
        sender_bank_name: srcIsCard ? source.bankName.trim() || undefined : undefined,
        source_platform: !srcIsCard ? srcPlatform || undefined : undefined,
        source_network: !srcIsCard ? srcNet || undefined : undefined,
        source_value: !srcIsCard ? srcVal || undefined : undefined,
        source_label: !srcIsCard ? buildLabel(srcPlatform, srcNet, srcVal) : undefined,

        destination_type: destChannel.category,
        receiver_card_id: dstIsCard ? destination.cardId || undefined : undefined,
        receiver_card_number: dstIsCard
          ? cleanCardNumber(destination.cardNumber) || undefined
          : undefined,
        receiver_owner_name: destination.ownerName.trim() || undefined,
        receiver_bank_name: dstIsCard ? destination.bankName.trim() || undefined : undefined,
        destination_platform: !dstIsCard ? dstPlatform || undefined : undefined,
        destination_network: !dstIsCard ? dstNet || undefined : undefined,
        destination_value: !dstIsCard ? dstVal || undefined : undefined,
        destination_label: !dstIsCard ? buildLabel(dstPlatform, dstNet, dstVal) : undefined,
        destination_details: !dstIsCard
          ? {
              channel_code: destChannel.code,
              channel_name: destChannel.name,
              channel_icon: destChannel.icon,
              channel_color: destChannel.color,
              platform: dstPlatform,
              ...(dstNet ? { network: dstNet } : {}),
              value: dstVal,
            }
          : undefined,

        amount: parsedAmount,
        currency,
        payment_provider_id: matchedProvider?.id || undefined,
        payment_provider_name: effectiveProviderName || undefined,
        transfer_date: transferDate || undefined,
        transfer_time: transferTime || undefined,
        transaction_id: transactionId.trim() || undefined,
      });
    },
    onSuccess: async () => {
      for (const key of onSuccessInvalidateKeys) {
        await queryClient.invalidateQueries({ queryKey: key });
      }
      await queryClient.invalidateQueries({ queryKey: ['financial-flow-graph'] });
      toast.success('Moliyaviy oqim o‘tkazmasi muvaffaqiyatli saqlandi');
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error('O‘tkazmani saqlashda xatolik', { description: getErrorMessage(err) });
    },
  });

  const isSubmitDisabled =
    mutation.isPending || parsedAmount <= 0 || !sourceValid || !destValid || isSameCard;

  return (
    <>
      <DialogHeader className="pb-3 border-b border-border/60 pr-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <span>Moliyaviy Oqim / O‘tkazma Kiritish</span>
          </DialogTitle>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                navigate('/references?tab=transfer_channels');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Kanallarni boshqarish</span>
            </button>
          )}
        </div>
      </DialogHeader>

      <fieldset disabled={mutation.isPending} className="space-y-4 py-1 border-0 p-0 m-0">
        {/* LIVE VISUAL FLOW PREVIEW BAR — Pul qayerdan chiqib qayerga tushayotgani vizual ko'rinadi */}
        <div className="rounded-2xl border border-border/80 bg-muted/30 p-3 sm:p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3">
            {/* LEFT: QAYERDAN */}
            <div
              className={`rounded-xl border px-3.5 py-2.5 transition-colors ${
                sourcePreview.filled
                  ? 'border-blue-500/40 bg-blue-500/[0.07]'
                  : 'border-dashed border-border bg-background/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <span className="inline-flex items-center gap-1">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Qayerdan chiqdi
                </span>
                <span className="font-semibold normal-case text-muted-foreground">
                  {sourceChannel.icon} {sourceChannel.name}
                </span>
              </div>
              <div
                className={`mt-1 font-mono text-xs sm:text-sm font-extrabold truncate ${
                  sourcePreview.filled ? 'text-foreground' : 'text-muted-foreground/70'
                }`}
              >
                {sourcePreview.title}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {sourcePreview.subtitle}
              </div>
            </div>

            {/* CENTER: DIRECTIONAL ARROW + AMOUNT + SWAP */}
            <div className="flex flex-col items-center justify-center gap-1.5 px-1">
              <div
                className={`px-3 py-1 rounded-full border text-xs font-mono font-extrabold whitespace-nowrap ${
                  parsedAmount > 0
                    ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/35'
                    : 'bg-background text-muted-foreground border-border'
                }`}
              >
                {parsedAmount > 0 ? `${amount} ${currency}` : `0 ${currency}`}
              </div>

              <div className="hidden md:flex items-center gap-1 text-primary w-32 justify-center">
                <span className="h-[2px] flex-1 bg-gradient-to-r from-blue-500 via-primary to-rose-500 rounded-full" />
                <ArrowRight className="h-4 w-4 text-rose-500 shrink-0 -ml-1.5" />
              </div>

              <button
                type="button"
                onClick={handleSwapSides}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border border-border bg-background hover:bg-muted text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Qayerdan va Qayerga tomonlarini o‘rnini almashtirish"
              >
                <ArrowLeftRight className="h-3 w-3" />
                <span>Almashtirish</span>
              </button>
            </div>

            {/* RIGHT: QAYERGA */}
            <div
              className={`rounded-xl border px-3.5 py-2.5 transition-colors ${
                destPreview.filled
                  ? destChannel.category === 'CRYPTO'
                    ? 'border-purple-500/40 bg-purple-500/[0.07]'
                    : 'border-rose-500/40 bg-rose-500/[0.07]'
                  : 'border-dashed border-border bg-background/60'
              }`}
            >
              <div
                className={`flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider ${
                  destChannel.category === 'CRYPTO'
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  Qayerga tushdi
                </span>
                <span className="font-semibold normal-case text-muted-foreground">
                  {destChannel.icon} {destChannel.name}
                </span>
              </div>
              <div
                className={`mt-1 font-mono text-xs sm:text-sm font-extrabold truncate ${
                  destPreview.filled ? 'text-foreground' : 'text-muted-foreground/70'
                }`}
              >
                {destPreview.title}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {destPreview.subtitle}
              </div>
            </div>
          </div>
        </div>

        {/* 3-USTUNLI ASOSIY FORMA (HUDDI ARIZADAGI KABI: QAYERDAN -> O'TKAZMA -> QAYERGA) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_24px_1fr_24px_1fr] items-stretch gap-3 lg:gap-1.5">
          {/* 1. QAYERDAN PUL CHIQDI */}
          <EndpointPartyCard
            role="source"
            party={source}
            onChange={(patch) => setSource((prev) => ({ ...prev, ...patch }))}
            channels={channels}
            allBanks={allBanks}
            availableCards={availableCards || []}
          />

          {/* YO'NALISH O'QI 1 */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="h-7 w-7 rounded-full border border-border bg-card shadow-xs flex items-center justify-center text-primary">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          {/* 2. O'TKAZMA MA'LUMOTI */}
          <div className="p-4 rounded-2xl border border-primary/35 bg-primary/[0.04] shadow-2xs space-y-3.5 flex flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-primary/20 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-extrabold">
                  2
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wide text-foreground">
                  O‘tkazma
                </span>
              </div>
              {transferDate && (
                <Badge
                  variant="outline"
                  className="text-[10px] border-primary/40 text-primary font-mono"
                >
                  {transferDate} {transferTime ? `· ${transferTime}` : ''}
                </Badge>
              )}
            </div>

            <div className="space-y-3 flex-1">
              {/* Summa + Valyuta */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      O‘tkazma Summasi *
                    </label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder={currency === 'UZS' ? '15 000 000' : '500'}
                      value={amount}
                      onChange={(e) => setAmount(formatFlexibleAmountInput(e.target.value))}
                      className="h-10 text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Valyuta
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-2 text-xs font-mono font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {CURRENCY_OPTIONS.map((cur) => (
                        <option key={cur} value={cur}>
                          {cur}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {hasCrypto && (
                  <div className="flex flex-wrap gap-1">
                    {(['UZS', 'USDT', 'USD', 'TON', 'BTC'] as const).map((cur) => (
                      <button
                        key={cur}
                        type="button"
                        onClick={() => setCurrency(cur)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                          currency === cur
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-background border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {cur}
                      </button>
                    ))}
                  </div>
                )}

                {parsedAmount > 0 && (
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-0.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>{formatAmountWords(parsedAmount, currency)}</span>
                  </div>
                )}
              </div>

              {/* To'lov tizimi / Provayder */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  {hasCrypto ? 'To‘lov tizimi / P2P / Tarmoq' : 'To‘lov provayderi / Ilova'}
                </label>
                <select
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold uppercase shadow-2xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">-- PROVAYDERNI TANLANG --</option>
                  {hasCrypto && (
                    <optgroup label="Kripto / P2P">
                      {CRYPTO_PROVIDER_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p.toUpperCase()}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="To‘lov tizimlari">
                    {allProviders.map((p) => (
                      <option key={p.id} value={p.name || ''}>
                        {p.name?.toUpperCase()}
                      </option>
                    ))}
                  </optgroup>
                  {providerName &&
                    !allProviders.some(
                      (p) => p.name?.trim().toUpperCase() === providerName.trim().toUpperCase(),
                    ) &&
                    !CRYPTO_PROVIDER_OPTIONS.includes(providerName) && (
                      <option value={providerName}>{providerName.toUpperCase()}</option>
                    )}
                </select>
              </div>

              {/* Sana & Vaqt */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-primary" /> Sana
                  </label>
                  <Input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="h-10 text-xs bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3 text-primary" /> Soat
                  </label>
                  <Input
                    type="time"
                    value={transferTime}
                    onChange={(e) => setTransferTime(e.target.value)}
                    className="h-10 text-xs bg-background"
                  />
                </div>
              </div>

              {/* Chek ID / Crypto TxHash */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Hash className="h-3 w-3 text-primary" />
                  {hasCrypto
                    ? 'TxHash / Tranzaksiya ID (ixtiyoriy)'
                    : 'Chek / Tranzaksiya ID (ixtiyoriy)'}
                </label>
                <Input
                  placeholder={hasCrypto ? '0x8f4a... yoki TRN-9928174' : 'Masalan: 184920194812'}
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="h-10 text-xs font-mono bg-background"
                />
              </div>
            </div>
          </div>

          {/* YO'NALISH O'QI 2 */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="h-7 w-7 rounded-full border border-border bg-card shadow-xs flex items-center justify-center text-rose-500">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          {/* 3. QAYERGA PUL TUSHDI */}
          <EndpointPartyCard
            role="destination"
            party={destination}
            onChange={(patch) => setDestination((prev) => ({ ...prev, ...patch }))}
            channels={channels}
            allBanks={allBanks}
            availableCards={availableCards || []}
          />
        </div>

        {isSameCard && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Jo‘natuvchi va qabul qiluvchi plastik karta bir xil bo‘lishi mumkin emas.</span>
          </div>
        )}
      </fieldset>

      <DialogFooter className="pt-3 border-t border-border/60 gap-3 sm:items-center sm:justify-between">
        {/* Tayyorlik indikatori — nimasi yetishmayotgani 1 qarashda ko'rinadi */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
              sourceValid
                ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-muted/60 text-muted-foreground border-border'
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            Qayerdan
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
              parsedAmount > 0
                ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-muted/60 text-muted-foreground border-border'
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            Summa
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
              destValid && !isSameCard
                ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-muted/60 text-muted-foreground border-border'
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            Qayerga
          </span>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
            className="cursor-pointer"
          >
            Bekor qilish
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={isSubmitDisabled}
            className="gap-2 min-w-[175px] cursor-pointer font-semibold"
          >
            O‘tkazmani saqlash
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

export function TransitTransferDialog({
  open,
  onOpenChange,
  availableCards = [],
  defaultSenderCardNumber = '',
  onSuccessInvalidateKeys,
}: TransitTransferDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="sm:max-w-6xl w-[96vw] max-h-[94vh] overflow-y-auto"
      >
        {open && (
          <TransitTransferDialogBody
            key={`${defaultSenderCardNumber}:${availableCards[0]?.id || ''}`}
            onOpenChange={onOpenChange}
            availableCards={availableCards}
            defaultSenderCardNumber={defaultSenderCardNumber}
            onSuccessInvalidateKeys={onSuccessInvalidateKeys}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
