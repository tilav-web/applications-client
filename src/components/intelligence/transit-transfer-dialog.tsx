import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Settings2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { LiveRadarBadge } from '@/components/intelligence/live-radar-badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { usePermissions } from '@/hooks/use-permissions';
import { intelligenceApi, transferChannelsApi } from '@/lib/api';
import { formatLocalDateISO } from '@/lib/date';
import { getErrorMessage } from '@/lib/error';
import type { Card, TransferChannel } from '@/types/models';

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
    value_label: 'Qabul qiluvchi (Tranzit / Dropper) karta raqami *',
    value_placeholder: '9860 1234 5678 9012',
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
    presets: ['Binance', 'Bybit', 'OKX', 'USDT TRC-20', 'TON'],
    platform_label: 'Birja / Tarmoq nomi',
    platform_placeholder: 'Binance, Bybit, OKX, TRC-20...',
    value_label: 'Birja UID yoki Kripto-hamyon manzili *',
    value_placeholder: 'Masalan: UID 48291034 yoki TX9aK... (TRC-20)',
    sort_order: 2,
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
    platform_label: 'Naqdlashtirish joyi turi',
    platform_placeholder: 'Bankomat / Bank filiali nomi',
    value_label: 'ATM ID yoki naqdlashtirilgan manzil *',
    value_placeholder: 'Masalan: ATM #402, Qarshi sh. Mustaqillik ko‘chasi',
    sort_order: 3,
    is_active: true,
  },
  {
    id: 'default-platform',
    name: 'Onlayn Servis',
    code: 'PLATFORM',
    category: 'PLATFORM',
    color: '#0891b2',
    icon: '🌐',
    presets: ['TikTok', 'Telegram', '1xBet', 'Steam', 'Visa Merchant'],
    platform_label: 'Platforma / Servis nomi',
    platform_placeholder: 'TikTok, Telegram, 1xBet, Visa Merchant...',
    value_label: 'Profil / Akkaunt ID yoki username *',
    value_placeholder: 'Masalan: @user_profile yoki ID 9912045',
    sort_order: 4,
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
    value_label: '20 talik bank hisob raqami *',
    value_placeholder: '20208000...',
    sort_order: 5,
    is_active: true,
  },
];

export function TransitTransferDialog({
  open,
  onOpenChange,
  availableCards = [],
  defaultSenderCardNumber = '',
  onSuccessInvalidateKeys,
}: TransitTransferDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isAdmin } = usePermissions();

  const { data: channelsRes } = useQuery({
    queryKey: ['transfer-channels'],
    queryFn: () => transferChannelsApi.getAll({ limit: 100 }),
    staleTime: 60_000,
    enabled: open,
  });

  const channels = useMemo(() => {
    const active = (channelsRes?.items || []).filter((c) => c.is_active !== false);
    return active.length > 0 ? active : FALLBACK_CHANNELS;
  }, [channelsRes]);

  const [direction, setDirection] = useState<'OUTGOING' | 'INCOMING'>('OUTGOING');
  const [selectedChannelCode, setSelectedChannelCode] = useState<string>('CARD');
  const [destinationPlatform, setDestinationPlatform] = useState('');
  const [destinationValue, setDestinationValue] = useState('');

  const [selectedOwnCardId, setSelectedOwnCardId] = useState<string>(availableCards[0]?.id || '');
  const [ownCardNumber, setOwnCardNumber] = useState(defaultSenderCardNumber);
  const [counterpartyCardNumber, setCounterpartyCardNumber] = useState('');
  const [counterpartyOwnerName, setCounterpartyOwnerName] = useState('');
  const [amount, setAmount] = useState('');
  const [providerName, setProviderName] = useState('Click');
  const [transferDate, setTransferDate] = useState(() => formatLocalDateISO());
  const [transferTime, setTransferTime] = useState('12:00');
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    if (!open) return;
    if (availableCards.length > 0) {
      setSelectedOwnCardId((prev) =>
        availableCards.some((c) => c.id === prev) ? prev : availableCards[0].id,
      );
    } else {
      setSelectedOwnCardId('');
    }
    if (defaultSenderCardNumber) {
      setOwnCardNumber(defaultSenderCardNumber);
    }
  }, [open, availableCards, defaultSenderCardNumber]);

  const parsedAmount = parseDecimalAmount(amount);

  const activeChannel =
    channels.find((c) => c.code === selectedChannelCode) || channels[0] || FALLBACK_CHANNELS[0];

  const isOutgoingNonCard = direction === 'OUTGOING' && activeChannel.category !== 'CARD';

  const mutation = useMutation({
    mutationFn: async () => {
      const chosenOwnCard = availableCards.find((c) => c.id === selectedOwnCardId);
      const ownNum = chosenOwnCard?.card_number || ownCardNumber;

      if (direction === 'OUTGOING') {
        if (activeChannel.category !== 'CARD') {
          const platformStr = destinationPlatform.trim() || activeChannel.name;
          return intelligenceApi.createTransitTransfer({
            sender_card_id: chosenOwnCard?.id || undefined,
            sender_card_number: ownNum || undefined,
            amount: parsedAmount,
            payment_provider_name: platformStr || providerName,
            transfer_date: transferDate,
            transfer_time: transferTime,
            transaction_id: transactionId || undefined,
            destination_type: activeChannel.category,
            destination_platform: platformStr,
            destination_value: destinationValue.trim(),
            destination_label:
              platformStr && destinationValue.trim()
                ? `${platformStr}: ${destinationValue.trim()}`
                : destinationValue.trim() || platformStr,
            destination_details: {
              channel_code: activeChannel.code,
              channel_name: activeChannel.name,
              channel_icon: activeChannel.icon,
              channel_color: activeChannel.color,
              platform: platformStr,
              value: destinationValue.trim(),
            },
          });
        }

        return intelligenceApi.createTransitTransfer({
          sender_card_id: chosenOwnCard?.id || undefined,
          sender_card_number: ownNum || undefined,
          receiver_card_number: counterpartyCardNumber,
          receiver_owner_name: counterpartyOwnerName || undefined,
          amount: parsedAmount,
          payment_provider_name: providerName,
          transfer_date: transferDate,
          transfer_time: transferTime,
          transaction_id: transactionId || undefined,
          destination_type: 'CARD',
        });
      }

      return intelligenceApi.createTransitTransfer({
        sender_card_number: counterpartyCardNumber,
        sender_owner_name: counterpartyOwnerName || undefined,
        receiver_card_id: chosenOwnCard?.id || undefined,
        receiver_card_number: ownNum || undefined,
        amount: parsedAmount,
        payment_provider_name: providerName,
        transfer_date: transferDate,
        transfer_time: transferTime,
        transaction_id: transactionId || undefined,
        destination_type: 'CARD',
      });
    },
    onSuccess: async () => {
      for (const key of onSuccessInvalidateKeys) {
        await queryClient.invalidateQueries({ queryKey: key });
      }
      await queryClient.invalidateQueries({ queryKey: ['financial-flow-graph'] });
      toast.success('Bank vipiskasi / Moliyaviy oqim yozuvi muvaffaqiyatli saqlandi');
      setCounterpartyCardNumber('');
      setCounterpartyOwnerName('');
      setDestinationPlatform('');
      setDestinationValue('');
      setAmount('');
      setTransactionId('');
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error('Oʻtkazmani saqlashda xatolik', { description: getErrorMessage(err) });
    },
  });

  const isSubmitDisabled =
    mutation.isPending ||
    parsedAmount <= 0 ||
    (isOutgoingNonCard
      ? destinationValue.trim().length < 2
      : counterpartyCardNumber.replace(/\D/g, '').length < 8);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-[95vw] max-h-[92vh] overflow-y-auto p-6">
        <DialogHeader className="pb-2 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <span>Bank Vipiskasi / Moliyaviy Oqim Oʻtkazmasi</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Kartaga kirgan yoki undan boshqa karta, kripto-birja (Binance), naqdlashtirish (ATM),
            onlayn servis (TikTok va h.k.) yoki boshqa chiqish kanallariga ketgan oqimni kiriting.
          </DialogDescription>
        </DialogHeader>

        <fieldset disabled={mutation.isPending} className="space-y-5 py-3 border-0 p-0 m-0">
          {/* 1. Yo'nalish tanlash */}
          <div className="grid grid-cols-2 gap-2.5 p-1.5 rounded-xl bg-muted/50 border border-border">
            <button
              type="button"
              onClick={() => setDirection('OUTGOING')}
              className={`py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                direction === 'OUTGOING'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Chiqim (Kartadan chiqib ketgan ↗)
            </button>
            <button
              type="button"
              onClick={() => {
                setDirection('INCOMING');
                setSelectedChannelCode('CARD');
              }}
              className={`py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                direction === 'INCOMING'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Kirim (Boshqa kartadan tushgan ↙)
            </button>
          </div>

          {/* 2. Dinamik chiqish kanallari (faqat Chiqim bo'lganda) */}
          {direction === 'OUTGOING' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs sm:text-sm font-semibold">
                  Pul qayerga chiqib ketdi? (Chiqish kanali)
                </label>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      navigate('/references?tab=transfer_channels');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    <span>Kanallarni boshqarish</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {channels.map((ch) => {
                  const active = activeChannel.code === ch.code;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        setSelectedChannelCode(ch.code);
                        setDestinationPlatform('');
                        setDestinationValue('');
                      }}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <span className="text-base leading-none">{ch.icon || '🌐'}</span>
                      <span className="truncate">{ch.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Asosiy karta + Summa (2 ustunli qulay joylashuv) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableCards.length > 0 ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">
                  {direction === 'OUTGOING'
                    ? 'Pul chiqqan karta (Asosiy karta)'
                    : 'Pul tushgan karta'}
                </label>
                <select
                  value={selectedOwnCardId}
                  onChange={(e) => setSelectedOwnCardId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs sm:text-sm font-mono font-semibold"
                >
                  {availableCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.card_number || c.masked_number} ({c.bank?.name || 'Bank'})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">
                  {direction === 'OUTGOING'
                    ? 'Pul chiqqan karta raqami (16 talik)'
                    : 'Pul tushgan karta raqami (16 talik)'}
                </label>
                <Input
                  value={ownCardNumber}
                  onChange={(e) => setOwnCardNumber(e.target.value)}
                  placeholder="8600 0000 0000 0000"
                  className="h-10 font-mono text-sm"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Summa (UZS) *</label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="15 000 000"
                className="h-10 font-mono font-bold text-sm"
              />
            </div>
          </div>

          {/* 4. Qabul qiluvchi: Karta yoki Dinamik Kanal (Kripto / Naqd / Servis / Hisob) */}
          {!isOutgoingNonCard ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-border/80 bg-muted/20">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold">
                    {direction === 'OUTGOING'
                      ? activeChannel.value_label ||
                        'Qabul qiluvchi (Tranzit / Dropper) karta raqami *'
                      : 'Joʻnatuvchi karta raqami *'}
                  </label>
                  {counterpartyCardNumber && (
                    <LiveRadarBadge type="card_number" value={counterpartyCardNumber} />
                  )}
                </div>
                <Input
                  value={counterpartyCardNumber}
                  onChange={(e) => setCounterpartyCardNumber(e.target.value)}
                  placeholder={activeChannel.value_placeholder || '9860 1234 5678 9012'}
                  className="h-10 font-mono font-bold text-sm bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Kontragent F.I.O (Vipiskada boʻlsa)</label>
                <Input
                  value={counterpartyOwnerName}
                  onChange={(e) => setCounterpartyOwnerName(e.target.value)}
                  placeholder="Masalan: ESHMATOV TOSHMAT"
                  className="h-10 text-sm bg-background"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-4 rounded-xl border border-primary/25 bg-primary/[0.04]">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <span className="text-base">{activeChannel.icon || '🌐'}</span>
                <span>{activeChannel.name} tafsilotlari</span>
              </div>

              {activeChannel.presets && activeChannel.presets.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {activeChannel.presets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDestinationPlatform(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        destinationPlatform === preset
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">
                    {activeChannel.platform_label || 'Platforma / Birja / Joy nomi'}
                  </label>
                  <Input
                    value={destinationPlatform}
                    onChange={(e) => setDestinationPlatform(e.target.value)}
                    placeholder={
                      activeChannel.platform_placeholder || 'Binance, TikTok, ATM #402...'
                    }
                    className="h-10 text-sm bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">
                    {activeChannel.value_label || 'UID / Hamyon / Profil ID yoki manzil *'}
                  </label>
                  <Input
                    value={destinationValue}
                    onChange={(e) => setDestinationValue(e.target.value)}
                    placeholder={
                      activeChannel.value_placeholder || 'Masalan: UID 48291034, @user, ATM...'
                    }
                    className="h-10 font-mono font-semibold text-sm bg-background"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. Qo'shimcha ma'lumotlar (4 ustunli ixcham qator) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Toʻlov tizimi</label>
              <Input
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="Click / Payme / ATM"
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Sana</label>
              <Input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Soat</label>
              <Input
                type="time"
                value={transferTime}
                onChange={(e) => setTransferTime(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Tranzaksiya / Chek ID</label>
              <Input
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="TRN-9928174..."
                className="h-10 font-mono text-xs"
              />
            </div>
          </div>
        </fieldset>

        <DialogFooter className="pt-3 border-t border-border/60 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Bekor qilish
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={isSubmitDisabled}
            className="gap-2 min-w-[160px]"
          >
            Oʻtkazmani saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
