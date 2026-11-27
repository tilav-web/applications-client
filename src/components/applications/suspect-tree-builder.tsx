import { useQuery } from '@tanstack/react-query';
import {
  Camera,
  Coins,
  CreditCard,
  Globe,
  Hash,
  Phone,
  Plus,
  Send,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { LiveRadarBadge } from '@/components/intelligence/live-radar-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { suspectFieldConfigsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { SuspectFieldConfig, SuspectFieldItem } from '@/types/models';

interface SuspectTreeBuilderProps {
  value: readonly unknown[] | null | undefined;
  onChange?: (items: SuspectFieldItem[]) => void;
  readOnly?: boolean;
  excludeAppId?: string;
}

interface RawSuspectNode {
  id?: string;
  field_key?: string;
  key?: string;
  field_label?: string;
  label?: string;
  value?: string;
  note?: string;
  description?: string;
  children?: RawSuspectNode[];
}

// Fallback parametrlar (agar API hali yuklanmagan bo'lsa)
const FALLBACK_CONFIGS: SuspectFieldConfig[] = [
  {
    id: 'f-1',
    key: 'telegram_username',
    label: 'Telegram Username',
    category: 'Telegram',
    icon: 'Send',
    is_linkable: true,
  },
  {
    id: 'f-2',
    key: 'telegram_id',
    label: 'Telegram ID',
    category: 'Telegram',
    icon: 'Send',
    is_linkable: true,
  },
  {
    id: 'f-3',
    key: 'telegram_bot',
    label: 'Telegram Bot',
    category: 'Telegram',
    icon: 'Send',
    is_linkable: true,
  },
  {
    id: 'f-4',
    key: 'telegram_channel',
    label: 'Telegram Kanal / Guruh',
    category: 'Telegram',
    icon: 'Send',
    is_linkable: true,
  },
  {
    id: 'f-5',
    key: 'telegram_bio',
    label: 'Telegram Bio / Izoh',
    category: 'Telegram',
    icon: 'Send',
    is_linkable: false,
  },
  {
    id: 'f-6',
    key: 'phone_number',
    label: 'Telefon raqami',
    category: 'Aloqa',
    icon: 'Phone',
    is_linkable: true,
  },
  {
    id: 'f-7',
    key: 'whatsapp_number',
    label: 'WhatsApp raqami',
    category: 'Aloqa',
    icon: 'Phone',
    is_linkable: true,
  },
  {
    id: 'f-8',
    key: 'instagram_username',
    label: 'Instagram Username',
    category: 'Instagram',
    icon: 'Camera',
    is_linkable: true,
  },
  {
    id: 'f-9',
    key: 'tiktok_username',
    label: 'TikTok Username',
    category: 'Ijtimoiy tarmoq',
    icon: 'Hash',
    is_linkable: true,
  },
  {
    id: 'f-10',
    key: 'olx_account',
    label: 'OLX / Savdo akkaunti',
    category: 'Savdo platforma',
    icon: 'Globe',
    is_linkable: true,
  },
  {
    id: 'f-11',
    key: 'card_number',
    label: 'Bank plastik karta',
    category: 'Moliya',
    icon: 'CreditCard',
    is_linkable: true,
  },
  {
    id: 'f-12',
    key: 'bank_account',
    label: 'Bank hisob raqami',
    category: 'Moliya',
    icon: 'CreditCard',
    is_linkable: true,
  },
  {
    id: 'f-13',
    key: 'crypto_wallet',
    label: 'Kripto-hamyon',
    category: 'Moliya',
    icon: 'Coins',
    is_linkable: true,
  },
  {
    id: 'f-14',
    key: 'exchange_uid',
    label: 'Kripto-birja UID',
    category: 'Moliya',
    icon: 'Coins',
    is_linkable: true,
  },
  {
    id: 'f-15',
    key: 'website_domain',
    label: 'Phishing sayt / Havola',
    category: 'Tarmoq',
    icon: 'Globe',
    is_linkable: true,
  },
  {
    id: 'f-16',
    key: 'apk_file',
    label: 'Zararli APK / Ilova',
    category: 'Tarmoq',
    icon: 'Globe',
    is_linkable: true,
  },
  {
    id: 'f-17',
    key: 'ip_address',
    label: 'IP Manzil',
    category: 'Tarmoq',
    icon: 'Globe',
    is_linkable: true,
  },
  {
    id: 'f-18',
    key: 'imei',
    label: 'IMEI Kod',
    category: 'Qurilma',
    icon: 'Hash',
    is_linkable: true,
  },
  {
    id: 'f-19',
    key: 'email',
    label: 'Email manzil',
    category: 'Aloqa',
    icon: 'Globe',
    is_linkable: true,
  },
  {
    id: 'f-20',
    key: 'car_plate',
    label: 'Avtoraqam',
    category: 'Boshqa',
    icon: 'Hash',
    is_linkable: true,
  },
  {
    id: 'f-21',
    key: 'other_info',
    label: 'Boshqa maʼlumot (Izoh)',
    category: 'Boshqa',
    icon: 'Hash',
    is_linkable: false,
  },
];

const NON_LINKABLE_KEYS = new Set(['telegram_bio', 'other_info']);

function isFieldLinkable(key: string, cfg?: SuspectFieldConfig): boolean {
  if (cfg && typeof cfg.is_linkable === 'boolean') return cfg.is_linkable;
  return !NON_LINKABLE_KEYS.has((key || '').toLowerCase());
}

function getCategoryIcon(key: string, category?: string | null, className = 'w-3.5 h-3.5') {
  const k = (key || '').toLowerCase();
  const c = (category || '').toLowerCase();
  if (k.includes('telegram') || k.includes('tg') || c.includes('telegram')) {
    return <Send className={cn('text-sky-500', className)} />;
  }
  if (k.includes('instagram') || k.includes('insta') || c.includes('instagram')) {
    return <Camera className={cn('text-pink-500', className)} />;
  }
  if (
    k.includes('phone') ||
    k.includes('telefon') ||
    k.includes('whatsapp') ||
    c.includes('aloqa')
  ) {
    return <Phone className={cn('text-emerald-500', className)} />;
  }
  if (k.includes('card') || k.includes('karta') || k.includes('bank_account')) {
    return <CreditCard className={cn('text-amber-500', className)} />;
  }
  if (
    k.includes('crypto') ||
    k.includes('wallet') ||
    k.includes('kripto') ||
    k.includes('exchange')
  ) {
    return <Coins className={cn('text-yellow-500', className)} />;
  }
  if (
    k.includes('ip') ||
    k.includes('server') ||
    k.includes('website') ||
    k.includes('apk') ||
    k.includes('olx') ||
    c.includes('tarmoq')
  ) {
    return <Globe className={cn('text-indigo-500', className)} />;
  }
  return <Hash className={cn('text-muted-foreground', className)} />;
}

let globalRowCounter = 0;
function generateRowId(): string {
  globalRowCounter += 1;
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : `${globalRowCounter}`;
  return `suspect-row-${globalRowCounter}-${rand}`;
}

/**
 * Eski daraxt formatidagi ma'lumotlarni tekis 3-ustunli ro'yxatga aylantirish
 */
function normalizeSuspectData(val: unknown): SuspectFieldItem[] {
  if (!val || !Array.isArray(val)) return [];

  const result: SuspectFieldItem[] = [];

  for (let i = 0; i < val.length; i++) {
    const item = val[i] as RawSuspectNode | null | undefined;
    if (!item || typeof item !== 'object') continue;

    // Yangi format: { field_key, value, note }
    if (item.field_key !== undefined || (item.value !== undefined && !item.children)) {
      result.push({
        id: item.id || generateRowId(),
        field_key: item.field_key || item.key || 'other_info',
        field_label: item.field_label || item.label || 'Boshqa',
        value: item.value || '',
        note: item.note || item.description || '',
      });
    } else {
      // Eski daraxt formati: { label, children }
      const walk = (nodes: RawSuspectNode[], path: string[] = []) => {
        for (const n of nodes) {
          if (!n) continue;
          const text = (n.label || n.value || '').trim();
          const newPath = [...path, text];
          if (n.children && n.children.length > 0) {
            walk(n.children, newPath);
          } else {
            result.push({
              id: n.id || generateRowId(),
              field_key: 'other_info',
              field_label: path[0] || 'Gumonlanuvchi',
              value: text,
              note: newPath.join(' ➔ '),
            });
          }
        }
      };
      walk([item]);
    }
  }

  return result;
}

export function SuspectTreeBuilder({
  value,
  onChange,
  readOnly = false,
  excludeAppId,
}: SuspectTreeBuilderProps) {
  // 1. Admin tomonidan yaratilgan parametrlarni API dan olish
  const { data: activeConfigsData } = useQuery({
    queryKey: ['suspect-field-configs-active'],
    queryFn: () => suspectFieldConfigsApi.getAllActive(),
    staleTime: 60_000,
  });

  const availableConfigs: SuspectFieldConfig[] = useMemo(() => {
    if (activeConfigsData && activeConfigsData.length > 0) {
      return activeConfigsData;
    }
    return FALLBACK_CONFIGS;
  }, [activeConfigsData]);

  // 2. Mahalliy elementlar holati
  const items = useMemo(() => normalizeSuspectData(value), [value]);

  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  // 3. Yangi qator qo'shish
  const handleAddRow = (indexToInsertAfter?: number) => {
    if (readOnly) return;

    const defaultConfig = availableConfigs[0] || FALLBACK_CONFIGS[0];
    const newItem: SuspectFieldItem = {
      id: generateRowId(),
      field_key: defaultConfig.key,
      field_label: defaultConfig.label,
      value: '',
      note: '',
    };

    let nextItems: SuspectFieldItem[];
    if (indexToInsertAfter !== undefined && indexToInsertAfter >= 0) {
      nextItems = [...items];
      nextItems.splice(indexToInsertAfter + 1, 0, newItem);
    } else {
      nextItems = [...items, newItem];
    }

    onChange?.(nextItems);
  };

  // 4. Elementni o'chirish
  const handleRemoveRow = (id: string) => {
    if (readOnly) return;
    const nextItems = items.filter((it) => it.id !== id);
    onChange?.(nextItems);
  };

  // 5. Select o'zgarganda
  const handleSelectField = (id: string, newKey: string) => {
    if (readOnly) return;
    const cfg = availableConfigs.find((c) => c.key === newKey);
    const nextItems = items.map((it) => {
      if (it.id === id) {
        return {
          ...it,
          field_key: newKey,
          field_label: cfg?.label || newKey,
        };
      }
      return it;
    });
    onChange?.(nextItems);
  };

  // 6. Qiymat o'zgarganda
  const handleValueChange = (id: string, newValue: string) => {
    if (readOnly) return;
    const nextItems = items.map((it) => {
      if (it.id === id) {
        return { ...it, value: newValue };
      }
      return it;
    });
    onChange?.(nextItems);
  };

  // 7. Izoh o'zgarganda
  const handleNoteChange = (id: string, newNote: string) => {
    if (readOnly) return;
    const nextItems = items.map((it) => {
      if (it.id === id) {
        return { ...it, note: newNote };
      }
      return it;
    });
    onChange?.(nextItems);
  };

  // 8. Tozalash
  const handleClearAll = () => {
    onChange?.([]);
    setIsClearConfirmOpen(false);
  };

  // --------------------------------------------------------------------------
  // ReadOnly rejimi (Application Detail Page)
  // --------------------------------------------------------------------------
  if (readOnly) {
    if (items.length === 0) {
      return (
        <div className="py-2 text-xs text-muted-foreground italic">
          Gumonlanuvchiga tegishli belgilar kiritilmagan
        </div>
      );
    }

    return (
      <div className="space-y-2.5 w-full min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="text-xs font-bold tracking-wider uppercase text-foreground">
            Firibgar / Gumonlanuvchi maʼlumotlari
          </span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono">
            {items.length} ta belgi
          </Badge>
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-2.5 w-full min-w-0">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex flex-col gap-1.5 p-3 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs text-xs w-full min-w-0 overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-md bg-muted/60 shrink-0">
                    {getCategoryIcon(it.field_key)}
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground truncate">
                    {it.field_label || it.field_key}
                  </span>
                </div>
                {it.value &&
                isFieldLinkable(
                  it.field_key,
                  availableConfigs.find((c) => c.key === it.field_key),
                ) ? (
                  <LiveRadarBadge
                    type={it.field_key}
                    value={it.value}
                    excludeAppId={excludeAppId}
                  />
                ) : !isFieldLinkable(
                    it.field_key,
                    availableConfigs.find((c) => c.key === it.field_key),
                  ) ? (
                  <Badge variant="outline" className="text-[9px] text-muted-foreground">
                    Faqat izoh
                  </Badge>
                ) : null}
              </div>

              <div className="font-bold text-foreground font-mono text-xs sm:text-sm break-all pl-0.5">
                {it.value || '—'}
              </div>

              {it.note && (
                <div className="text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md break-words w-full">
                  {it.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Tahrirlash rejimi (Application Form: 3 ta bog'langan input + qatorlar)
  // --------------------------------------------------------------------------
  return (
    <div className="w-full space-y-3">
      {/* Sarlavha paneli */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-rose-500/10 text-rose-500">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold tracking-wider uppercase text-foreground">
            2.1. FIRIBGAR / GUMONLANUVCHI BELGILARI VA MAʼLUMOTLARI
          </span>
          {items.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono">
              {items.length} TA BELGI
            </Badge>
          )}
        </div>

        {items.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsClearConfirmOpen(true)}
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 gap-1 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            Tozalash
          </Button>
        )}
      </div>

      {/* Asosiy Ish Maydoni (Responsive qatorlar, ekrandan chiqib ketmaydi) */}
      <div className="relative w-full rounded-xl border border-border/80 bg-slate-500/[0.02] dark:bg-slate-900/30 p-3 sm:p-4 overflow-hidden">
        {/* Orqa fon nuqtalari */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />

        {items.length === 0 ? (
          /* Bo'sh holat */
          <div className="relative py-8 flex flex-col items-center justify-center text-center">
            <div className="p-3 rounded-full bg-primary/10 text-primary mb-2.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-foreground mb-1">
              Hozircha hech qanday gumonlanuvchi belgisi kiritilmagan
            </p>
            <p className="text-[11px] text-muted-foreground mb-3 max-w-sm">
              Telegram ID, nik, telefon, karta raqami yoki boshqa maʼlumotlarni 3 ta ustunli
              zanjirda kiriting
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => handleAddRow()}
              className="h-8 px-4 text-xs gap-1.5 shadow-sm font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Gumonlanuvchi maʼlumotini qo‘shish
            </Button>
          </div>
        ) : (
          /* Qatorlar ro'yxati (Responsive: kichik ekranda ustma-ust, katta ekranda 1 qatorda) */
          <div className="relative space-y-3 w-full min-w-0">
            {items.map((row, index) => {
              const currentCfg = availableConfigs.find((c) => c.key === row.field_key);

              return (
                <div
                  key={row.id}
                  className="group relative flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-0 p-2.5 xl:p-0 rounded-xl xl:rounded-none border xl:border-0 border-border/60 bg-background/50 xl:bg-transparent transition-all duration-150 w-full min-w-0"
                >
                  <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                    {/* Tartib raqami */}
                    <span className="w-5 text-[11px] font-mono text-muted-foreground/70 shrink-0 text-right pr-1 select-none">
                      {index + 1}.
                    </span>

                    {/* 1-USTUN: SELECT (Admin qo'shgan parametrlar turi) */}
                    <div className="relative flex items-center h-9 px-2.5 rounded-lg border border-border/80 bg-card/90 shadow-2xs hover:border-primary/50 transition-colors flex-1 xl:flex-initial xl:w-[205px] min-w-0">
                      <div className="mr-2 shrink-0">
                        {getCategoryIcon(row.field_key, currentCfg?.category)}
                      </div>
                      <select
                        value={row.field_key}
                        onChange={(e) => handleSelectField(row.id, e.target.value)}
                        className="w-full bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer truncate min-w-0"
                      >
                        {availableConfigs.map((cfg) => (
                          <option
                            key={cfg.id}
                            value={cfg.key}
                            className="bg-popover text-popover-foreground py-1"
                          >
                            {cfg.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* CHIZIQLI BOG'LANMA: 1-ustundan 2-ustunga (faqat katta ekranda) */}
                  <div className="hidden xl:block w-4 h-[1.5px] bg-border shrink-0 transition-colors group-hover:bg-primary/40" />

                  {/* 2-USTUN: VALUE (Xodim kiritadigan qiymat + Live Radar) */}
                  <div className="relative flex items-center h-9 px-2.5 rounded-lg border border-border/80 bg-card shadow-2xs hover:border-primary/50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all flex-1 min-w-0 gap-1.5 w-full">
                    <span className="text-[11px] font-mono text-muted-foreground/60 shrink-0 select-none">
                      #
                    </span>
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => handleValueChange(row.id, e.target.value)}
                      placeholder={currentCfg?.sample_value || 'Qiymat (@nik, +998..., havola)'}
                      className="w-full bg-transparent text-xs font-medium text-foreground placeholder:text-muted-foreground/45 focus:outline-none min-w-0"
                    />
                    {row.value && isFieldLinkable(row.field_key, currentCfg) ? (
                      <LiveRadarBadge
                        type={row.field_key}
                        value={row.value}
                        excludeAppId={excludeAppId}
                      />
                    ) : !isFieldLinkable(row.field_key, currentCfg) ? (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0"
                        title="Erkin matn: bog'liqlik sifatida avtomatik solishtirilmaydi"
                      >
                        Izoh
                      </span>
                    ) : null}
                  </div>

                  {/* CHIZIQLI BOG'LANMA: 2-ustundan 3-ustunga */}
                  <div className="hidden xl:block w-4 h-[1.5px] bg-border shrink-0 transition-colors group-hover:bg-primary/40" />

                  {/* 3-USTUN: NOTE / IZOH + TUGMALAR */}
                  <div className="flex items-center gap-2 xl:gap-0 flex-1 min-w-0 w-full">
                    <div className="relative flex items-center h-9 px-2.5 rounded-lg border border-border/80 bg-card shadow-2xs hover:border-primary/50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all flex-1 min-w-0">
                      <span className="text-[11px] font-mono text-muted-foreground/60 mr-2 shrink-0 select-none">
                        ✎
                      </span>
                      <input
                        type="text"
                        value={row.note || ''}
                        onChange={(e) => handleNoteChange(row.id, e.target.value)}
                        placeholder="Izoh (ixtiyoriy)"
                        className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/45 focus:outline-none min-w-0"
                      />
                    </div>

                    <div className="hidden xl:block w-3 h-[1.5px] bg-border shrink-0 transition-colors group-hover:bg-primary/40" />

                    {/* HARAKATLAR: Yonidagi [+] va [Trash] */}
                    <div className="flex items-center gap-1 shrink-0 xl:pl-1">
                      <button
                        type="button"
                        onClick={() => handleAddRow(index)}
                        className="h-8 w-8 xl:h-7 xl:w-7 rounded-md border border-dashed border-border hover:border-primary hover:bg-primary/10 text-muted-foreground hover:text-primary flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                        title="Shu qatordan so‘ng yangi parametr qo‘shish"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="h-8 w-8 xl:h-7 xl:w-7 rounded-md border border-transparent hover:border-rose-500/30 hover:bg-rose-500/10 text-muted-foreground/60 hover:text-rose-500 flex items-center justify-center transition-all cursor-pointer"
                        title="Qatorni o‘chirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pastki qatorda qo'shimcha tezkor qo'shish */}
            <div className="pt-1 xl:pl-6 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddRow()}
                className="h-7 px-3 text-[11px] border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary gap-1 font-normal cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Yangi qator qo‘shish
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tozalashni tasdiqlash modali */}
      <ConfirmDialog
        open={isClearConfirmOpen}
        onOpenChange={setIsClearConfirmOpen}
        title="Barcha maʼlumotlarni tozalash"
        description="Gumonlanuvchiga tegishli barcha kiritilgan parametrlar o‘chiriladi. Davom ettirasizmi?"
        confirmText="Ha, tozalash"
        cancelText="Bekor qilish"
        variant="destructive"
        onConfirm={handleClearAll}
      />
    </div>
  );
}
