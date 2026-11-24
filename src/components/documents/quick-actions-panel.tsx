import {
  Check,
  Copy,
  CreditCard,
  FileText,
  type LucideIcon,
  MapPin,
  Phone,
  Search,
  User,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { copyTextToClipboard } from '@/lib/clipboard';
import { matchesLatinSearch } from '@/lib/transliterate';
import { cn } from '@/lib/utils';
import type { Application } from '@/types/models';

interface QuickActionsPanelProps {
  application: Application;
  onInsert: (text: string) => void;
  onClose?: () => void;
  className?: string;
}

interface ActionItem {
  id: string;
  category: string;
  categoryIcon: LucideIcon;
  label: string;
  value: string;
  description?: string;
}

// Raqamlarni so'z bilan ifodalash yordamchisi (o'zbek tilida)
function numberToWordsUz(num: number): string {
  if (num === 0) return 'nol';
  const units = ['', 'bir', 'ikki', 'uch', "to'rt", 'besh', 'olti', 'yetti', 'sakkiz', "to'qqiz"];
  const tens = [
    '',
    "o'n",
    'yigirma',
    "o'ttiz",
    'qirq',
    'ellik',
    'oltmish',
    'yetmish',
    'sakson',
    "to'qson",
  ];
  const scales = ['', 'ming', 'million', 'milliard', 'trillion'];

  function convertGroup(n: number): string {
    const parts: string[] = [];
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;
    const t = Math.floor(remainder / 10);
    const u = remainder % 10;

    if (hundreds > 0) {
      parts.push(`${units[hundreds]} yuz`);
    }
    if (t > 0) {
      parts.push(tens[t]);
    }
    if (u > 0) {
      parts.push(units[u]);
    }
    return parts.join(' ');
  }

  let current = Math.abs(num);
  let scaleIdx = 0;
  const groups: string[] = [];

  while (current > 0) {
    const chunk = current % 1000;
    if (chunk > 0) {
      const chunkStr = convertGroup(chunk);
      const scaleStr = scales[scaleIdx] ? ` ${scales[scaleIdx]}` : '';
      groups.unshift(`${chunkStr}${scaleStr}`);
    }
    current = Math.floor(current / 1000);
    scaleIdx++;
  }

  return groups.join(' ').trim();
}

export function QuickActionsPanel({
  application,
  onInsert,
  onClose,
  className,
}: QuickActionsPanelProps) {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    void copyTextToClipboard(text).then((ok) => {
      if (!ok) {
        toast.error('Nusxa olib bo‘lmadi');
        return;
      }
      setCopiedId(id);
      toast.success(`Nusxalandi: "${text.slice(0, 30)}${text.length > 30 ? '...' : ''}"`);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 1800);
    });
  };

  const handleInsertClick = (text: string) => {
    onInsert(text);
  };

  const items: ActionItem[] = useMemo(() => {
    const result: ActionItem[] = [];
    const cit = application.citizen;
    const appNum = application.application_number || '';
    const dateStr = application.date ? new Date(application.date).toLocaleDateString('uz-UZ') : '';

    // 1. ARIZA REKVIZITLARI
    if (appNum) {
      result.push({
        id: 'app_num',
        category: 'Ariza rekvizitlari',
        categoryIcon: FileText,
        label: 'Ariza raqami',
        value: `№ ${appNum}`,
      });
      result.push({
        id: 'app_num_plain',
        category: 'Ariza rekvizitlari',
        categoryIcon: FileText,
        label: 'Ariza raqami (shunchaki raqam)',
        value: appNum,
      });
    }

    if (dateStr) {
      result.push({
        id: 'app_date',
        category: 'Ariza rekvizitlari',
        categoryIcon: FileText,
        label: 'Ariza sanasi',
        value: `${dateStr} yil`,
      });
    }

    if (application.district?.name) {
      result.push({
        id: 'app_district',
        category: 'Ariza rekvizitlari',
        categoryIcon: MapPin,
        label: 'Tuman / Bo‘lim',
        value: application.district.name,
      });
    }

    if (application.crime?.article) {
      const crimeText = `${application.crime.article}${application.crime.title ? ` (${application.crime.title})` : ''}`;
      result.push({
        id: 'app_crime',
        category: 'Ariza rekvizitlari',
        categoryIcon: FileText,
        label: 'Jinoyat moddasi',
        value: crimeText,
      });
    }

    // 2. ASOSIY FUQARO (ARIZACHI)
    if (cit) {
      const fName = cit.first_name || '';
      const lName = cit.last_name || '';
      const mName = cit.middle_name || '';

      const fullName = `${lName} ${fName} ${mName}`.trim();
      const shortName = `${lName} ${fName}`.trim();
      const initials =
        `${lName} ${fName ? `${fName[0]}.` : ''} ${mName ? `${mName[0]}.` : ''}`.trim();

      if (fullName) {
        result.push({
          id: 'cit_full_name',
          category: 'Arizachi fuqaro',
          categoryIcon: User,
          label: 'To‘liq F.I.SH',
          value: fullName,
        });
      }

      if (shortName && shortName !== fullName) {
        result.push({
          id: 'cit_short_name',
          category: 'Arizachi fuqaro',
          categoryIcon: User,
          label: 'Familiya va Ism',
          value: shortName,
        });
      }

      if (initials) {
        result.push({
          id: 'cit_initials',
          category: 'Arizachi fuqaro',
          categoryIcon: User,
          label: 'F.I.SH (Initsial bilan)',
          value: initials,
        });
      }

      if (cit.passport) {
        result.push({
          id: 'cit_passport',
          category: 'Arizachi fuqaro',
          categoryIcon: UserCheck,
          label: 'Pasport seriya va raqam',
          value: cit.passport,
        });
      }

      if (cit.pinfl) {
        result.push({
          id: 'cit_pinfl',
          category: 'Arizachi fuqaro',
          categoryIcon: UserCheck,
          label: 'JSHSHIR (PINFL)',
          value: cit.pinfl,
        });
      }

      if (cit.phone_number) {
        const raw = cit.phone_number.replace(/\D/g, '');
        const formatted =
          raw.length === 12
            ? `+${raw.slice(0, 3)} ${raw.slice(3, 5)} ${raw.slice(5, 8)} ${raw.slice(8, 10)} ${raw.slice(10, 12)}`
            : cit.phone_number;

        result.push({
          id: 'cit_phone',
          category: 'Arizachi fuqaro',
          categoryIcon: Phone,
          label: 'Telefon raqami',
          value: formatted,
        });
      }

      const dist = cit.district?.name || application.district?.name;
      const mah = cit.neighborhood?.name;
      const addr = cit.address;

      if (dist && mah) {
        result.push({
          id: 'cit_dist_mah',
          category: 'Arizachi fuqaro',
          categoryIcon: MapPin,
          label: 'Tuman va mahalla',
          value: `${dist}, ${mah}`,
        });
      }

      if (addr) {
        result.push({
          id: 'cit_addr',
          category: 'Arizachi fuqaro',
          categoryIcon: MapPin,
          label: 'To‘liq yashash manzili',
          value: `${dist ? `${dist}, ` : ''}${mah ? `${mah}, ` : ''}${addr}`,
        });
      }
    }

    // 3. PLASTIK KARTA VA MOLIAVIY O'TKAZMA
    const card = application.card;
    if (card?.card_number) {
      const cleanCard = card.card_number.replace(/\D/g, '');
      const spacedCard = cleanCard.replace(/(\d{4})(?=\d)/g, '$1 ').trim();

      result.push({
        id: 'card_num_spaced',
        category: 'Plastik karta va Mablag‘',
        categoryIcon: CreditCard,
        label: 'Karta raqami (ajratilgan)',
        value: spacedCard,
      });

      result.push({
        id: 'card_num_clean',
        category: 'Plastik karta va Mablag‘',
        categoryIcon: CreditCard,
        label: 'Karta raqami (yaxlit)',
        value: cleanCard,
      });

      if (card.bank?.name) {
        result.push({
          id: 'card_bank',
          category: 'Plastik karta va Mablag‘',
          categoryIcon: CreditCard,
          label: 'Bank nomi',
          value: card.bank.name,
        });
      }
    }

    const transfer = application.transfer;
    if (transfer?.amount) {
      const numAmount = Number(transfer.amount);
      const curr = transfer.currency || 'UZS';
      const formattedAmount = `${new Intl.NumberFormat('uz-UZ').format(Math.round(numAmount))} ${curr}`;
      const wordsAmount = `${numberToWordsUz(Math.round(numAmount))} ${curr === 'UZS' ? "so'm" : curr}`;

      result.push({
        id: 'transfer_amount',
        category: 'Plastik karta va Mablag‘',
        categoryIcon: CreditCard,
        label: 'Zarar miqdori (raqamda)',
        value: formattedAmount,
      });

      result.push({
        id: 'transfer_amount_words',
        category: 'Plastik karta va Mablag‘',
        categoryIcon: CreditCard,
        label: 'Zarar miqdori (so‘z bilan)',
        value: wordsAmount,
      });

      result.push({
        id: 'transfer_amount_full',
        category: 'Plastik karta va Mablag‘',
        categoryIcon: CreditCard,
        label: 'Raqam va so‘zda birga',
        value: `${formattedAmount} (${wordsAmount})`,
      });

      if (transfer.payment_provider?.name) {
        result.push({
          id: 'transfer_provider',
          category: 'Plastik karta va Mablag‘',
          categoryIcon: CreditCard,
          label: 'To‘lov ilovasi / Tizimi',
          value: transfer.payment_provider.name,
        });
      }
    }

    // 4. QO'SHIMCHA FUQAROLAR (GUMONLANUVCHI, GUVOH...)
    if (application.custom_fields && Array.isArray(application.custom_fields)) {
      application.custom_fields.forEach((cf, idx) => {
        if (cf.type === 'CITIZEN' && cf.citizen) {
          const c = cf.citizen;
          const roleLabel = cf.label || `Qo‘shimcha fuqaro #${idx + 1}`;
          const cFullName =
            `${c.last_name || ''} ${c.first_name || ''} ${c.middle_name || ''}`.trim();
          const cShort = `${c.last_name || ''} ${c.first_name || ''}`.trim();

          if (cFullName) {
            result.push({
              id: `cf_cit_${cf.id}_name`,
              category: `Aloqador: ${roleLabel}`,
              categoryIcon: User,
              label: `${roleLabel} - To‘liq F.I.SH`,
              value: cFullName,
            });
          }

          if (cShort && cShort !== cFullName) {
            result.push({
              id: `cf_cit_${cf.id}_short`,
              category: `Aloqador: ${roleLabel}`,
              categoryIcon: User,
              label: `${roleLabel} - Qisqa ism`,
              value: cShort,
            });
          }

          if (c.passport) {
            result.push({
              id: `cf_cit_${cf.id}_pass`,
              category: `Aloqador: ${roleLabel}`,
              categoryIcon: UserCheck,
              label: `${roleLabel} - Pasport`,
              value: c.passport,
            });
          }

          if (c.phone_number) {
            result.push({
              id: `cf_cit_${cf.id}_phone`,
              category: `Aloqador: ${roleLabel}`,
              categoryIcon: Phone,
              label: `${roleLabel} - Telefon`,
              value: c.phone_number,
            });
          }

          if (c.address) {
            result.push({
              id: `cf_cit_${cf.id}_addr`,
              category: `Aloqador: ${roleLabel}`,
              categoryIcon: MapPin,
              label: `${roleLabel} - Manzil`,
              value: c.address,
            });
          }
        }
      });
    }

    return result;
  }, [application]);

  // Qidiruv bo'yicha filtrlash (krill va lotin qo'llab-quvvatlanadi)
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    return items.filter(
      (item) =>
        matchesLatinSearch(item.label, search) ||
        matchesLatinSearch(item.value, search) ||
        matchesLatinSearch(item.category, search),
    );
  }, [items, search]);

  // Kategoriyalar bo'yicha guruhlash
  const groupedItems = useMemo(() => {
    const groups: Record<string, ActionItem[]> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-white text-slate-800 select-none overflow-hidden border-l border-slate-200 shadow-2xl',
        className,
      )}
    >
      {/* Sarlavha: Microsoft Office uslubidagi toza oq sarlavha */}
      <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 backdrop-blur sticky top-0 z-10 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white shadow-sm">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 tracking-tight">Tezkor amallar</h3>
              <p className="text-[11px] text-slate-500">Hujjatga joylashtirish uchun bosing</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge
              variant="secondary"
              className="text-[10px] bg-slate-200/80 text-slate-700 font-medium py-0 px-1.5"
            >
              {items.length} ta
            </Badge>

            {onClose && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md"
                title="Panelni yopish"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Qidiruv input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qidirish (ism, karta, sana, pasport)..."
            className="h-8 pl-8 text-xs bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-600 shadow-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Ro'yxat */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-slate-50/30">
        {Object.keys(groupedItems).length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 space-y-1">
            <p className="font-medium">Ma'lumot topilmadi</p>
            <p className="text-[11px] text-slate-400">Qidiruv so‘zini o‘zgartiring</p>
          </div>
        ) : (
          Object.entries(groupedItems).map(([category, catItems]) => {
            const Icon = catItems[0]?.categoryIcon || Zap;

            return (
              <div key={category} className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-1 text-[11px] font-bold text-slate-600 tracking-tight">
                  <Icon className="h-3 w-3 text-blue-600" />
                  <span>{category}</span>
                </div>

                <div className="space-y-1.5">
                  {catItems.map((item) => {
                    const isCopied = copiedId === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleInsertClick(item.value)}
                        className="group relative flex flex-col justify-between p-2.5 rounded-lg bg-white hover:bg-blue-50/60 border border-slate-200/90 hover:border-blue-400 cursor-pointer transition-all duration-150 shadow-xs"
                        title="Hujjatga kiritish uchun bosing"
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[10px] font-medium text-slate-500 group-hover:text-blue-700">
                            {item.label}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleCopy(item.id, item.value, e)}
                            className="h-5 w-5 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Faqat nusxa olish"
                          >
                            {isCopied ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>

                        <div className="text-xs font-semibold text-slate-900 break-words group-hover:text-blue-900">
                          {item.value}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pastki yordamchi qator */}
      <div className="p-2.5 border-t border-slate-200 bg-white text-[11px] text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] font-mono text-slate-700">
            Click
          </kbd>
          Kursorga joylash
        </span>
        <span className="text-[10px] text-slate-400">Microsoft Word formati</span>
      </div>
    </div>
  );
}
