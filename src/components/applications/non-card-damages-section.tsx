import {
  AlertCircle,
  Banknote,
  Building2,
  Calendar,
  FileText,
  Landmark,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatAmountInput, formatAmountWords } from '@/lib/formatters';
import {
  APPLICATION_DAMAGE_TYPE_LABELS,
  type ApplicationDamageType,
  type Bank,
  type PaymentProvider,
} from '@/types/models';

import type { NonCardDamageEntry } from './application-form.types';

const QUICK_PLATFORMS = [
  'Uzum Nasiya',
  'Alif Nasiya',
  'Open',
  'Payme Nasiya',
  'TBC Bank',
  'Anorbank',
  'Tenge Bank',
  'OLX',
];

interface NonCardDamagesSectionProps {
  hasNonCardDamage: boolean;
  setHasNonCardDamage: (val: boolean) => void;
  nonCardDamages: NonCardDamageEntry[];
  allBanks: Bank[];
  allProviders: PaymentProvider[];
  onUpdateDamageEntry: (index: number, patch: Partial<NonCardDamageEntry>) => void;
  onAddDamageEntry: () => void;
  onRemoveDamageEntry: (index: number) => void;
}

export function NonCardDamagesSection({
  hasNonCardDamage,
  setHasNonCardDamage,
  nonCardDamages,
  allBanks,
  allProviders,
  onUpdateDamageEntry,
  onAddDamageEntry,
  onRemoveDamageEntry,
}: NonCardDamagesSectionProps) {
  const totalNonCardUzs = nonCardDamages.reduce((sum, item) => {
    const clean = Number(String(item.amount || '').replace(/\s/g, ''));
    if (!Number.isFinite(clean) || clean <= 0) return sum;
    if (!item.currency || item.currency === 'UZS') return sum + clean;
    return sum;
  }, 0);

  const orgSuggestions = Array.from(
    new Set([
      ...QUICK_PLATFORMS,
      ...allBanks.map((b) => b.name).filter((n): n is string => Boolean(n)),
      ...allProviders.map((p) => p.name).filter((n): n is string => Boolean(n)),
    ]),
  );

  return (
    <div className="p-5 sm:p-6 space-y-5 bg-amber-50/70 dark:bg-amber-950/15 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/70 dark:border-amber-800/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <Landmark className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              3.2. Kartasiz Moddiy Zarar (Onlayn Kredit, Nasiya, Tovar/Xizmat)
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Fuqaro nomiga kredit, Uzum/Alif Nasiya, bo‘lib to‘lash yoki pasport/telefon orqali
              xarid rasmiylashtirilgan bo‘lsa yoqing
            </p>
          </div>
        </div>

        {/* INTERAKTIV TOGGLE SWITCH */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto bg-card border border-border px-3 py-1.5 rounded-xl shadow-sm">
          <span className="text-xs font-semibold text-foreground select-none">
            Kartasiz zarar bormi?
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={hasNonCardDamage}
            onClick={() => setHasNonCardDamage(!hasNonCardDamage)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
              hasNonCardDamage ? 'bg-amber-600' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                hasNonCardDamage ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {!hasNonCardDamage ? (
        <div className="p-4 rounded-xl border border-dashed border-amber-300/80 dark:border-amber-800/50 bg-background/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Kartadan pul yechilmasdan, fuqaro nomiga onlayn kredit, nasiya (Uzum Nasiya, Alif,
              Open) yoki boshqa moddiy zarar yetkazilgan bo‘lsa — bir yoki bir nechta band qilib
              kiritishingiz mumkin.
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setHasNonCardDamage(true)}
            className="h-8 text-xs shrink-0 gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Kredit / Nasiya zararini kiritish
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <datalist id="non-card-damage-orgs">
            {orgSuggestions.map((org) => (
              <option key={org} value={org} />
            ))}
          </datalist>

          {nonCardDamages.map((entry, idx) => {
            const numericAmount = Number(String(entry.amount || '').replace(/\s/g, ''));
            return (
              <div
                key={entry.clientId}
                className="rounded-xl border border-amber-200/90 dark:border-amber-800/60 bg-card p-4 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {idx === 0
                        ? 'Asosiy kartasiz zarar bandi'
                        : `Qo‘shimcha zarar bandi #${idx + 1}`}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-amber-500/35 text-amber-700 dark:text-amber-300"
                    >
                      {APPLICATION_DAMAGE_TYPE_LABELS[entry.damageType]}
                    </Badge>
                  </div>

                  {nonCardDamages.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveDamageEntry(idx)}
                      className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-500/10 gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      O‘chirish
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* 1. Zarar turi */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <ShoppingBag className="h-3.5 w-3.5 text-amber-600" />
                      Zarar turi *
                    </label>
                    <select
                      value={entry.damageType}
                      onChange={(e) =>
                        onUpdateDamageEntry(idx, {
                          damageType: e.target.value as ApplicationDamageType,
                        })
                      }
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs font-medium shadow-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      {(
                        Object.entries(APPLICATION_DAMAGE_TYPE_LABELS) as Array<
                          [ApplicationDamageType, string]
                        >
                      ).map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Tashkilot / Platforma */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-amber-600" />
                      Bank / Platforma / Tashkilot
                    </label>
                    <Input
                      list="non-card-damage-orgs"
                      value={entry.organizationName}
                      onChange={(e) =>
                        onUpdateDamageEntry(idx, { organizationName: e.target.value })
                      }
                      placeholder="Masalan: Uzum Nasiya, TBC Bank, Alif..."
                      className="h-9 text-xs"
                    />
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {QUICK_PLATFORMS.slice(0, 5).map((plat) => (
                        <button
                          key={plat}
                          type="button"
                          onClick={() => onUpdateDamageEntry(idx, { organizationName: plat })}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-amber-500/15 hover:text-amber-700 dark:hover:text-amber-300 text-muted-foreground transition-colors cursor-pointer"
                        >
                          {plat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Zarar summasi va valyuta */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Banknote className="h-3.5 w-3.5 text-amber-600" />
                      Zarar miqdori *
                    </label>
                    <div className="flex gap-1.5">
                      <Input
                        value={formatAmountInput(entry.amount)}
                        onChange={(e) =>
                          onUpdateDamageEntry(idx, {
                            amount: e.target.value.replace(/[^\d]/g, ''),
                          })
                        }
                        placeholder="Masalan: 15 000 000"
                        className="h-9 text-xs font-mono font-bold"
                      />
                      <select
                        value={entry.currency}
                        onChange={(e) => onUpdateDamageEntry(idx, { currency: e.target.value })}
                        className="h-9 rounded-lg border border-input bg-background px-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="UZS">UZS</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="RUB">RUB</option>
                      </select>
                    </div>
                    {numericAmount > 0 && entry.currency === 'UZS' && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                        {formatAmountWords(numericAmount)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* 4. Shartnoma / Buyurtma raqami */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      Shartnoma / Buyurtma №
                    </label>
                    <Input
                      value={entry.contractNumber}
                      onChange={(e) => onUpdateDamageEntry(idx, { contractNumber: e.target.value })}
                      placeholder="Masalan: UZN-2026-88412"
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  {/* 5. Sana */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      Rasmiylashtirilgan sana
                    </label>
                    <Input
                      type="date"
                      value={entry.damageDate}
                      onChange={(e) => onUpdateDamageEntry(idx, { damageDate: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  {/* 6. Tafsilot */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Tafsilot (nima olingani / izoh)
                    </label>
                    <Input
                      value={entry.description}
                      onChange={(e) => onUpdateDamageEntry(idx, { description: e.target.value })}
                      placeholder="Masalan: iPhone 15 Pro — 12 oyga nasiya"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddDamageEntry}
              className="gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer font-semibold self-start"
            >
              <Plus className="h-4 w-4" />
              Yana kredit / nasiya / zarar bandi qo‘shish
            </Button>

            {totalNonCardUzs > 0 && (
              <div className="text-xs font-semibold text-foreground bg-card border border-amber-500/30 rounded-lg px-3 py-1.5">
                Kartasiz zararlar jami:{' '}
                <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                  {new Intl.NumberFormat('uz-UZ').format(Math.round(totalNonCardUzs))} UZS
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
