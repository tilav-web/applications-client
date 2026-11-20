import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Banknote, Building2, Coins, CreditCard, Globe } from 'lucide-react';
import { useState } from 'react';

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
import { intelligenceApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { Card, TransferDestinationType } from '@/types/models';

interface TransitTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableCards?: Card[];
  defaultSenderCardNumber?: string;
  onSuccessInvalidateKeys: unknown[][];
}

const DESTINATION_CHANNELS: Array<{
  value: TransferDestinationType;
  label: string;
  icon: typeof CreditCard;
  presets: string[];
  platformPlaceholder: string;
  valueLabel: string;
  valuePlaceholder: string;
}> = [
  {
    value: 'CARD',
    label: 'Plastik karta',
    icon: CreditCard,
    presets: [],
    platformPlaceholder: '',
    valueLabel: 'Qabul qiluvchi (Tranzit / Dropper) karta raqami *',
    valuePlaceholder: '9860 1234 5678 9012',
  },
  {
    value: 'CRYPTO',
    label: 'Kripto / Birja',
    icon: Coins,
    presets: ['Binance', 'Bybit', 'OKX', 'USDT TRC-20', 'TON'],
    platformPlaceholder: 'Binance, Bybit, OKX, TRC-20...',
    valueLabel: 'Birja UID yoki Kripto-hamyon manzili *',
    valuePlaceholder: 'Masalan: UID 48291034 yoki TX9aK... (TRC-20)',
  },
  {
    value: 'CASH',
    label: 'Naqd / ATM',
    icon: Banknote,
    presets: ['Bankomat (ATM)', 'Bank kassasi', 'Valyuta ayirboshlash'],
    platformPlaceholder: 'Bankomat / Bank filiali nomi',
    valueLabel: 'ATM ID yoki naqdlashtirilgan manzil *',
    valuePlaceholder: 'Masalan: ATM #402, Qarshi sh. Mustaqillik ko‘chasi',
  },
  {
    value: 'PLATFORM',
    label: 'Onlayn Servis',
    icon: Globe,
    presets: ['TikTok', 'Telegram', '1xBet', 'Steam', 'Visa Merchant'],
    platformPlaceholder: 'TikTok, Telegram, 1xBet, Visa Merchant...',
    valueLabel: 'Profil / Akkaunt ID yoki username *',
    valuePlaceholder: 'Masalan: @user_profile yoki ID 9912045',
  },
  {
    value: 'BANK_ACCOUNT',
    label: 'Hisob raqam',
    icon: Building2,
    presets: ['Kapitalbank', 'Ipak Yo‘li', 'Hamkorbank', 'NBU'],
    platformPlaceholder: 'Bank nomi / MFO',
    valueLabel: '20 talik bank hisob raqami *',
    valuePlaceholder: '20208000...',
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

  const [direction, setDirection] = useState<'OUTGOING' | 'INCOMING'>('OUTGOING');
  const [destinationType, setDestinationType] = useState<TransferDestinationType>('CARD');
  const [destinationPlatform, setDestinationPlatform] = useState('');
  const [destinationValue, setDestinationValue] = useState('');

  const [selectedOwnCardId, setSelectedOwnCardId] = useState<string>(availableCards[0]?.id || '');
  const [ownCardNumber, setOwnCardNumber] = useState(defaultSenderCardNumber);
  const [counterpartyCardNumber, setCounterpartyCardNumber] = useState('');
  const [counterpartyOwnerName, setCounterpartyOwnerName] = useState('');
  const [amount, setAmount] = useState('');
  const [providerName, setProviderName] = useState('Click');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [transferTime, setTransferTime] = useState('12:00');
  const [transactionId, setTransactionId] = useState('');

  const activeChannel =
    DESTINATION_CHANNELS.find((c) => c.value === destinationType) || DESTINATION_CHANNELS[0];

  const isOutgoingNonCard = direction === 'OUTGOING' && destinationType !== 'CARD';

  const mutation = useMutation({
    mutationFn: async () => {
      const chosenOwnCard = availableCards.find((c) => c.id === selectedOwnCardId);
      const ownNum = chosenOwnCard?.card_number || ownCardNumber;

      if (direction === 'OUTGOING') {
        if (destinationType !== 'CARD') {
          return intelligenceApi.createTransitTransfer({
            sender_card_id: chosenOwnCard?.id || undefined,
            sender_card_number: ownNum || undefined,
            amount: Number(amount.replace(/\D/g, '')),
            payment_provider_name: destinationPlatform || providerName,
            transfer_date: transferDate,
            transfer_time: transferTime,
            transaction_id: transactionId || undefined,
            destination_type: destinationType,
            destination_platform: destinationPlatform.trim() || undefined,
            destination_value: destinationValue.trim(),
            destination_label:
              destinationPlatform.trim() && destinationValue.trim()
                ? `${destinationPlatform.trim()}: ${destinationValue.trim()}`
                : destinationValue.trim() || destinationPlatform.trim(),
          });
        }

        return intelligenceApi.createTransitTransfer({
          sender_card_id: chosenOwnCard?.id || undefined,
          sender_card_number: ownNum || undefined,
          receiver_card_number: counterpartyCardNumber,
          receiver_owner_name: counterpartyOwnerName || undefined,
          amount: Number(amount.replace(/\D/g, '')),
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
        amount: Number(amount.replace(/\D/g, '')),
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
    !Number(amount.replace(/\D/g, '')) ||
    (isOutgoingNonCard
      ? destinationValue.trim().length < 2
      : counterpartyCardNumber.replace(/\D/g, '').length < 8);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <span>Bank Vipiskasi / Moliyaviy Oqim Oʻtkazmasi</span>
          </DialogTitle>
          <DialogDescription>
            Kartaga kirgan yoki undan boshqa karta, kripto-birja (Binance), naqdlashtirish (ATM)
            yoki onlayn servisga (TikTok va h.k.) chiqib ketgan oqimni kiriting.
          </DialogDescription>
        </DialogHeader>

        <fieldset disabled={mutation.isPending} className="space-y-4 py-2 border-0 p-0 m-0">
          {/* Yo'nalish tanlash */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/50 border border-border">
            <button
              type="button"
              onClick={() => setDirection('OUTGOING')}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                direction === 'OUTGOING'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Chiqim (Kartadan chiqib ketgan ↗)
            </button>
            <button
              type="button"
              onClick={() => {
                setDirection('INCOMING');
                setDestinationType('CARD');
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                direction === 'INCOMING'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Kirim (Boshqa kartadan tushgan ↙)
            </button>
          </div>

          {/* Chiqish kanali (faqat Chiqim bo'lganda) */}
          {direction === 'OUTGOING' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Pul qayerga chiqib ketdi? (Kanal)</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {DESTINATION_CHANNELS.map((ch) => {
                  const Icon = ch.icon;
                  const active = destinationType === ch.value;
                  return (
                    <button
                      key={ch.value}
                      type="button"
                      onClick={() => {
                        setDestinationType(ch.value);
                        setDestinationPlatform('');
                        setDestinationValue('');
                      }}
                      className={`flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="truncate">{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Joriy shaxs/dosye kartasi */}
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
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs font-mono font-semibold"
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
              <label className="text-xs font-semibold">Asosiy karta raqami (16 talik)</label>
              <Input
                value={ownCardNumber}
                onChange={(e) => setOwnCardNumber(e.target.value)}
                placeholder="8600 0000 0000 0000"
                className="font-mono"
              />
            </div>
          )}

          {/* Qabul qiluvchi: Karta yoki Kripto/Naqd/Servis */}
          {!isOutgoingNonCard ? (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold">
                    {direction === 'OUTGOING'
                      ? 'Qabul qiluvchi (Tranzit / Dropper) karta raqami *'
                      : 'Joʻnatuvchi karta raqami *'}
                  </label>
                  {counterpartyCardNumber && (
                    <LiveRadarBadge type="card_number" value={counterpartyCardNumber} />
                  )}
                </div>
                <Input
                  value={counterpartyCardNumber}
                  onChange={(e) => setCounterpartyCardNumber(e.target.value)}
                  placeholder="9860 1234 5678 9012"
                  className="font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">
                    Kontragent F.I.O (Vipiskada boʻlsa)
                  </label>
                  <Input
                    value={counterpartyOwnerName}
                    onChange={(e) => setCounterpartyOwnerName(e.target.value)}
                    placeholder="Masalan: ESHMATOV TOSHMAT"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Summa (UZS) *</label>
                  <Input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="15000000"
                    className="font-mono font-bold"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2 p-3 rounded-xl border border-primary/20 bg-primary/5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">
                    {destinationType === 'CRYPTO'
                      ? 'Birja / Tarmoq nomi'
                      : destinationType === 'CASH'
                        ? 'Naqdlashtirish joyi turi'
                        : destinationType === 'BANK_ACCOUNT'
                          ? 'Bank nomi / MFO'
                          : 'Platforma / Servis nomi'}
                  </label>
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {activeChannel.presets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDestinationPlatform(preset)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                          destinationPlatform === preset
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={destinationPlatform}
                    onChange={(e) => setDestinationPlatform(e.target.value)}
                    placeholder={activeChannel.platformPlaceholder}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">{activeChannel.valueLabel}</label>
                  <Input
                    value={destinationValue}
                    onChange={(e) => setDestinationValue(e.target.value)}
                    placeholder={activeChannel.valuePlaceholder}
                    className="font-mono font-semibold bg-background"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Summa (UZS) *</label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="15000000"
                  className="font-mono font-bold"
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Toʻlov tizimi</label>
              <Input
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="Click / Payme / Uzum / ATM"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Sana</label>
              <Input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Soat</label>
              <Input
                type="time"
                value={transferTime}
                onChange={(e) => setTransferTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Tranzaksiya / Chek ID (ixtiyoriy)</label>
            <Input
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="TRN-9928174..."
              className="font-mono text-xs"
            />
          </div>
        </fieldset>

        <DialogFooter>
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
            className="gap-2"
          >
            Oʻtkazmani saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
