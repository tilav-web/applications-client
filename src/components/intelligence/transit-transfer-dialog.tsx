import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
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
import type { Card } from '@/types/models';

interface TransitTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableCards?: Card[];
  defaultSenderCardNumber?: string;
  onSuccessInvalidateKeys: unknown[][];
}

export function TransitTransferDialog({
  open,
  onOpenChange,
  availableCards = [],
  defaultSenderCardNumber = '',
  onSuccessInvalidateKeys,
}: TransitTransferDialogProps) {
  const queryClient = useQueryClient();

  const [direction, setDirection] = useState<'OUTGOING' | 'INCOMING'>('OUTGOING');
  const [selectedOwnCardId, setSelectedOwnCardId] = useState<string>(availableCards[0]?.id || '');
  const [ownCardNumber, setOwnCardNumber] = useState(defaultSenderCardNumber);
  const [counterpartyCardNumber, setCounterpartyCardNumber] = useState('');
  const [counterpartyOwnerName, setCounterpartyOwnerName] = useState('');
  const [amount, setAmount] = useState('');
  const [providerName, setProviderName] = useState('Click');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [transferTime, setTransferTime] = useState('12:00');
  const [transactionId, setTransactionId] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const chosenOwnCard = availableCards.find((c) => c.id === selectedOwnCardId);
      const ownNum = chosenOwnCard?.card_number || ownCardNumber;

      if (direction === 'OUTGOING') {
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
      });
    },
    onSuccess: async () => {
      for (const key of onSuccessInvalidateKeys) {
        await queryClient.invalidateQueries({ queryKey: key });
      }
      toast.success('Bank vipiskasi / Tranzit oʻtkazma muvaffaqiyatli saqlandi');
      setCounterpartyCardNumber('');
      setCounterpartyOwnerName('');
      setAmount('');
      setTransactionId('');
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error('Oʻtkazmani saqlashda xatolik', { description: getErrorMessage(err) });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <span>Bank Vipiskasi / Tranzit Pul Oʻtkazmasini Kiritish</span>
          </DialogTitle>
          <DialogDescription>
            Kartaga kirgan yoki undan keyingi tranzit kartaga chiqib ketgan oqimni kiriting.
            Kontragent karta bazada boʻlsa avtomatik zanjirga ulanadi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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
              Chiqim (Boshqa kartaga ketgan ↗)
            </button>
            <button
              type="button"
              onClick={() => setDirection('INCOMING')}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                direction === 'INCOMING'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Kirim (Boshqa kartadan tushgan ↙)
            </button>
          </div>

          {/* Joriy shaxs/dosye kartasi */}
          {availableCards.length > 0 ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">
                {direction === 'OUTGOING'
                  ? 'Pul chiqqan karta (Fuqaro kartasi)'
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

          {/* Kontragent karta + Live Radar */}
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
              <label className="text-xs font-semibold">Kontragent F.I.O (Vipiskada boʻlsa)</label>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={
              mutation.isPending ||
              counterpartyCardNumber.replace(/\D/g, '').length < 8 ||
              !Number(amount.replace(/\D/g, ''))
            }
            className="gap-2"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Oqimga saqlash</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
