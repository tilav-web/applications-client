import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DistrictSearchSelect } from '@/components/ui/district-search-select';
import { Input } from '@/components/ui/input';
import type { Crime, District, OccupationCategory, Region } from '@/types/models';

import type { ReferenceFormData, ReferenceItem, ReferenceTabKey } from './reference-types';

interface ReferenceDialogsProps {
  modalType: 'create' | 'edit' | 'delete' | null;
  activeTab: ReferenceTabKey;
  occupationMode: 'categories' | 'occupations';
  selectedOccupCatFilter: string;
  targetItem: ReferenceItem | null;
  formData: ReferenceFormData;
  setFormData: (next: ReferenceFormData) => void;
  allRegionsList: Region[];
  allDistrictsList: District[];
  allCrimesList: Crime[];
  allCategoriesList: OccupationCategory[];
  isSaving: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
}

export function ReferenceDialogs({
  modalType,
  activeTab,
  occupationMode,
  selectedOccupCatFilter,
  targetItem,
  formData,
  setFormData,
  allRegionsList,
  allDistrictsList,
  allCrimesList,
  allCategoriesList,
  isSaving,
  isDeleting,
  onClose,
  onSave,
  onDelete,
}: ReferenceDialogsProps) {
  return (
    <>
      {/* CREATE / EDIT DIALOG */}
      <Dialog open={modalType === 'create' || modalType === 'edit'} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {modalType === 'create' ? 'Yangi Yozuv Qo‘shish' : 'Tahrirlash'}
            </DialogTitle>
            <DialogDescription>
              {activeTab === 'regions' &&
                'Viloyat nomi, kodi va geografik markaz koordinatalarini kiriting'}
              {activeTab === 'districts' &&
                'Tuman yoki hududiy bo‘lim, tegishli viloyat va koordinatalarini kiriting'}
              {activeTab === 'neighborhoods' &&
                'Mahalla nomi, tegishli tuman va geografik koordinatalarini kiriting'}
              {activeTab === 'crimes' && 'Jinoyat turini kiriting'}
              {activeTab === 'banks' && 'Tijorat banki nomi va MFO kodini kiriting'}
              {activeTab === 'providers' && 'To‘lov xizmati provayderi ma‘lumotlarini kiriting'}
              {activeTab === 'statuses' &&
                'Ariza holati/statusi nomi, kodi, rangi va parametrlarini kiriting'}
              {activeTab === 'suspect_fields' &&
                'Gumonlanuvchi parametri (Telegram, Instagram, telefon, karta va h.k.) va tizim kalitini kiriting'}
              {activeTab === 'occupations' &&
                (occupationMode === 'categories'
                  ? 'Yangi kasb toifasi (guruhi) ma’lumotlarini kiriting'
                  : 'Yangi kasb yoki mutaxassislik ma’lumotlarini kiriting')}
              {activeTab === 'sources' &&
                'Murojaat manbasi (102, 112, Ishonch telefoni va h.k.) ma’lumotlarini kiriting'}
              {activeTab === 'department_services' &&
                'Sohaviy xizmat nomi va qisqartmasini kiriting'}
              {activeTab === 'decision_types' &&
                'Ariza yuzasidan qabul qilinadigan qaror turini kiriting'}
              {activeTab === 'rejection_reasons' && 'Arizani rad etish sababini kiriting'}
            </DialogDescription>
          </DialogHeader>

          <fieldset disabled={isSaving} className="space-y-4 py-2 border-0 p-0 m-0">
            {/* Common Name field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {activeTab === 'crimes'
                  ? 'Jinoyat Turi Nomi *'
                  : activeTab === 'suspect_fields'
                    ? 'Parametr Nomi (Label) *'
                    : 'Nomi / Sarlavha *'}
              </label>
              <Input
                placeholder={
                  activeTab === 'crimes'
                    ? 'Masalan: Firibgarlik...'
                    : activeTab === 'suspect_fields'
                      ? 'Masalan: Telegram Username...'
                      : 'Nomi...'
                }
                value={
                  (formData.label as string) ||
                  formData.name ||
                  formData.title ||
                  formData.article ||
                  ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  const updates: Record<string, unknown> = {
                    name: val,
                    title: val,
                    article: val,
                    label: val,
                  };
                  if (activeTab === 'suspect_fields' && !targetItem && !formData.key) {
                    updates.key = val
                      .toLowerCase()
                      .replace(/[\s-]+/g, '_')
                      .replace(/[^a-z0-9_]/g, '');
                  }
                  setFormData({
                    ...formData,
                    ...updates,
                  });
                }}
                className="h-10 text-xs sm:text-sm font-medium"
              />
            </div>

            {/* Viloyat (regions) qo'shimcha maydonlari */}
            {activeTab === 'regions' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Tizim Kodi (Slug)</label>
                  <Input
                    placeholder="QASHQADARYO, TOSHKENT..."
                    value={formData.code || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    className="h-10 text-xs sm:text-sm font-mono uppercase"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Kenglik (Latitude)
                    </label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="38.7888"
                      value={formData.latitude ?? ''}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="h-10 text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Uzunlik (Longitude)
                    </label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="66.0314"
                      value={formData.longitude ?? ''}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="h-10 text-xs sm:text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tuman (districts) uchun Viloyat va koordinatalar */}
            {activeTab === 'districts' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Tegishli Viloyat</label>
                  <select
                    value={formData.region_id || ''}
                    onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs sm:text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Viloyatni tanlang...</option>
                    {allRegionsList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Kenglik (Latitude)
                    </label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="38.8445"
                      value={formData.latitude ?? ''}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="h-10 text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Uzunlik (Longitude)
                    </label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="65.7961"
                      value={formData.longitude ?? ''}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="h-10 text-xs sm:text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Mahalla (neighborhoods) uchun tegishli Tuman va koordinatalar */}
            {activeTab === 'neighborhoods' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Tegishli Tuman *</label>
                  <DistrictSearchSelect
                    districts={allDistrictsList}
                    value={formData.district_id || null}
                    onChange={(dId) => setFormData({ ...formData, district_id: dId || '' })}
                    groupedByRegion
                    placeholder="Tumanni tanlang..."
                    searchPlaceholder="Tuman yoki viloyat nomini qidiring..."
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Kenglik (Latitude)
                    </label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="38.8606"
                      value={formData.latitude ?? ''}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="h-10 text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Uzunlik (Longitude)
                    </label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="65.7947"
                      value={formData.longitude ?? ''}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="h-10 text-xs sm:text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Jinoyat usuli qo'shimcha maydonlari */}
            {activeTab === 'crime_methods' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Guruhi / Kategoriyasi *
                  </label>
                  <Input
                    placeholder="Masalan: Фишинг ва қурилма/карта бошқаруви"
                    value={(formData.group_name as string) || ''}
                    onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                    className="h-10 text-xs sm:text-sm font-medium"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Tartib raqami (Sort order)
                    </label>
                    <Input
                      type="number"
                      value={formData.sort_order ?? 0}
                      onChange={(e) =>
                        setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                      }
                      className="h-10 text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Qo'shimcha izoh</label>
                    <Input
                      placeholder="Qisqacha izoh..."
                      value={(formData.description as string) || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                {/* 1. Bog'langan jinoyat turlari (Bo'sh = Umumiy) */}
                <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Qaysi jinoyat turlariga tegishli?
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      Tanlanmasa — barcha turlar uchun umumiy
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {allCrimesList.map((crime) => {
                      const selectedIds: string[] = Array.isArray(formData.crime_ids)
                        ? (formData.crime_ids as string[])
                        : [];
                      const isChecked = selectedIds.includes(crime.id);
                      return (
                        <button
                          key={crime.id}
                          type="button"
                          onClick={() => {
                            const next = isChecked
                              ? selectedIds.filter((cid) => cid !== crime.id)
                              : [...selectedIds, crime.id];
                            setFormData({ ...formData, crime_ids: next });
                          }}
                          className={`px-2.5 py-1 rounded-md text-xs border transition-colors cursor-pointer ${
                            isChecked
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-foreground border-border hover:bg-muted'
                          }`}
                        >
                          {crime.article || crime.title}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Dinamik maydonlar konstruktori (APK, Telegram va h.k.) */}
                <div className="space-y-2.5 p-3 rounded-lg border border-primary/20 bg-primary/[0.02]">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold text-foreground block">
                        Usul bo‘yicha dinamik maydonlar (Excel da ham chiqadi)
                      </label>
                      <span className="text-[11px] text-muted-foreground">
                        Masalan: APK nomi, Telegram @username, Fishing havolasi...
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        const prevFields = Array.isArray(formData.fields)
                          ? [...(formData.fields as Array<Record<string, unknown>>)]
                          : [];
                        prevFields.push({
                          label: '',
                          field_type: 'STRING',
                          placeholder: '',
                          is_required: false,
                          show_in_excel: true,
                          sort_order: prevFields.length,
                        });
                        setFormData({ ...formData, fields: prevFields });
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Maydon qo‘shish
                    </Button>
                  </div>

                  {Array.isArray(formData.fields) &&
                    (formData.fields as Array<Record<string, unknown>>).length > 0 && (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {(formData.fields as Array<Record<string, unknown>>).map((fld, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-md border bg-background space-y-2"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                              <Input
                                placeholder="Maydon nomi (masalan: APK nomi)"
                                value={(fld.label as string) || ''}
                                onChange={(e) => {
                                  const next = [
                                    ...(formData.fields as Array<Record<string, unknown>>),
                                  ];
                                  next[idx] = { ...next[idx], label: e.target.value };
                                  setFormData({ ...formData, fields: next });
                                }}
                                className="h-8 text-xs sm:col-span-5"
                              />
                              <select
                                value={(fld.field_type as string) || 'STRING'}
                                onChange={(e) => {
                                  const next = [
                                    ...(formData.fields as Array<Record<string, unknown>>),
                                  ];
                                  next[idx] = { ...next[idx], field_type: e.target.value };
                                  setFormData({ ...formData, fields: next });
                                }}
                                className="h-8 rounded-md border border-input bg-background px-2 text-xs sm:col-span-3"
                              >
                                <option value="STRING">Matn</option>
                                <option value="NUMBER">Raqam</option>
                                <option value="URL">Havola (URL)</option>
                                <option value="PHONE">Telefon</option>
                                <option value="DATE">Sana</option>
                                <option value="TEXT">Ko‘p qatorli</option>
                                <option value="SELECT">Ro‘yxat</option>
                              </select>
                              <Input
                                placeholder="Placeholder"
                                value={(fld.placeholder as string) || ''}
                                onChange={(e) => {
                                  const next = [
                                    ...(formData.fields as Array<Record<string, unknown>>),
                                  ];
                                  next[idx] = { ...next[idx], placeholder: e.target.value };
                                  setFormData({ ...formData, fields: next });
                                }}
                                className="h-8 text-xs sm:col-span-3"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-rose-500 sm:col-span-1"
                                onClick={() => {
                                  const next = (
                                    formData.fields as Array<Record<string, unknown>>
                                  ).filter((_, i) => i !== idx);
                                  setFormData({ ...formData, fields: next });
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-[11px]">
                              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(fld.is_required)}
                                  onChange={(e) => {
                                    const next = [
                                      ...(formData.fields as Array<Record<string, unknown>>),
                                    ];
                                    next[idx] = { ...next[idx], is_required: e.target.checked };
                                    setFormData({ ...formData, fields: next });
                                  }}
                                />
                                <span>Majburiy</span>
                              </label>
                              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={fld.show_in_excel !== false}
                                  onChange={(e) => {
                                    const next = [
                                      ...(formData.fields as Array<Record<string, unknown>>),
                                    ];
                                    next[idx] = { ...next[idx], show_in_excel: e.target.checked };
                                    setFormData({ ...formData, fields: next });
                                  }}
                                />
                                <span>Excelda ko‘rinsin</span>
                              </label>
                              {fld.field_type === 'SELECT' && (
                                <Input
                                  placeholder="Variantlar (vergul bilan: Telegram, Instagram, SMS)"
                                  value={
                                    Array.isArray(fld.options)
                                      ? (fld.options as string[]).join(', ')
                                      : ''
                                  }
                                  onChange={(e) => {
                                    const next = [
                                      ...(formData.fields as Array<Record<string, unknown>>),
                                    ];
                                    next[idx] = {
                                      ...next[idx],
                                      options: e.target.value
                                        .split(',')
                                        .map((s) => s.trim())
                                        .filter(Boolean),
                                    };
                                    setFormData({ ...formData, fields: next });
                                  }}
                                  className="h-7 text-xs flex-1 min-w-[200px]"
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            )}

            {activeTab === 'banks' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Bank Kodi</label>
                  <Input
                    placeholder="AGRO, KAPITAL"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="h-10 text-xs sm:text-sm font-mono uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">MFO Kodi</label>
                  <Input
                    placeholder="00394"
                    value={formData.mfo || ''}
                    onChange={(e) => setFormData({ ...formData, mfo: e.target.value })}
                    className="h-10 text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>
            )}

            {activeTab === 'providers' && (
              <div className="space-y-1">
                <label className="font-medium text-foreground">Tizim Kodi (Slug)</label>
                <Input
                  placeholder="PAYME, CLICK, UZUM"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>
            )}

            {activeTab === 'transfer_channels' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Kategoriya (Graf turi)</label>
                    <select
                      value={(formData.category as string) || 'PLATFORM'}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                    >
                      <option value="CARD">Plastik karta (CARD)</option>
                      <option value="CRYPTO">Kripto / Birja (CRYPTO)</option>
                      <option value="CASH">Naqdlashtirish / ATM (CASH)</option>
                      <option value="PLATFORM">Onlayn Servis / Profil (PLATFORM)</option>
                      <option value="BANK_ACCOUNT">Bank hisob raqami (BANK_ACCOUNT)</option>
                      <option value="OTHER">Boshqa (OTHER)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Tizim Kodi (Slug)</label>
                    <Input
                      placeholder="CRYPTO, BETTING, TIKTOK..."
                      value={formData.code || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="h-9 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Ikonka (Emoji)</label>
                    <Input
                      placeholder="🪙 / 🏧 / 🌐 / 🎰"
                      value={(formData.icon as string) || ''}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="h-9 text-sm text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Rang (Hex)</label>
                    <Input
                      type="color"
                      value={(formData.color as string) || '#0891b2'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="h-9 p-1 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Tartib raqami</label>
                    <Input
                      type="number"
                      value={formData.sort_order ?? 10}
                      onChange={(e) =>
                        setFormData({ ...formData, sort_order: Number(e.target.value) })
                      }
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">
                    Tezkor tanlash tugmalari (vergul bilan ajratilgan)
                  </label>
                  <Input
                    placeholder="Binance, Bybit, OKX, USDT TRC-20, TON"
                    value={(formData.presets_text as string) || ''}
                    onChange={(e) => setFormData({ ...formData, presets_text: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Platforma maydoni nomi</label>
                    <Input
                      placeholder="Birja / Platforma nomi"
                      value={(formData.platform_label as string) || ''}
                      onChange={(e) => setFormData({ ...formData, platform_label: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Qiymat maydoni nomi</label>
                    <Input
                      placeholder="UID / Hamyon / Profil ID *"
                      value={(formData.value_label as string) || ''}
                      onChange={(e) => setFormData({ ...formData, value_label: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'statuses' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Tizim Kodi (Slug)</label>
                    <Input
                      placeholder="YANGI, JARAYONDA, EKSPERTIZADA..."
                      value={formData.code || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="h-9 text-xs font-mono font-bold uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Status Rangi</label>
                    <select
                      value={(formData.color as string) || 'blue'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="blue">Ko‘k (Blue)</option>
                      <option value="amber">Sariq / Oltinrang (Amber)</option>
                      <option value="orange">To‘q sariq (Orange)</option>
                      <option value="emerald">Yashil (Emerald)</option>
                      <option value="teal">Moviy-yashil (Teal)</option>
                      <option value="cyan">Havorang (Cyan)</option>
                      <option value="indigo">Indigo (Indigo)</option>
                      <option value="purple">Binafsha (Purple)</option>
                      <option value="rose">Qizil (Rose)</option>
                      <option value="slate">To‘q kulrang (Slate)</option>
                      <option value="gray">Kulrang (Gray)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Bosqich kategoriyasi (JPK)
                    </label>
                    <select
                      value={(formData.category as string) || 'OPEN'}
                      onChange={(e) => {
                        const cat = e.target.value;
                        const isClosedOrPaused = cat === 'CLOSED' || cat === 'PAUSED';
                        setFormData({
                          ...formData,
                          category: cat,
                          tracks_sla: !isClosedOrPaused,
                        });
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="OPEN">Boshlang‘ich / Qabul (OPEN)</option>
                      <option value="IN_PROGRESS">Tekshiruv / Jarayonda (IN_PROGRESS)</option>
                      <option value="EXTENDED">Muddati uzaytirilgan (EXTENDED)</option>
                      <option value="PAUSED">Vaqtincha to‘xtatilgan (PAUSED)</option>
                      <option value="CLOSED">Yakuniy / Yopilgan (CLOSED)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Standart SLA muddati (kun)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      placeholder="3, 10, 30..."
                      value={
                        formData.default_sla_days !== undefined &&
                        formData.default_sla_days !== null
                          ? String(formData.default_sla_days)
                          : ''
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          default_sla_days: e.target.value ? parseInt(e.target.value, 10) : '',
                        })
                      }
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Huquqiy asos (Modda)</label>
                  <Input
                    placeholder="Masalan: JPK 329-modda, JPK 333-m. (83/84-m.)..."
                    value={(formData.legal_article as string) || ''}
                    onChange={(e) => setFormData({ ...formData, legal_article: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 h-9 px-2.5 rounded-md border border-input bg-background text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.tracks_sla !== false}
                      onChange={(e) => setFormData({ ...formData, tracks_sla: e.target.checked })}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    SLA taymeri yursin
                  </label>
                  <label className="flex items-center gap-2 h-9 px-2.5 rounded-md border border-input bg-background text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.requires_decision)}
                      onChange={(e) =>
                        setFormData({ ...formData, requires_decision: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    Qaror turi majburiy
                  </label>
                  <label className="flex items-center gap-2 h-9 px-2.5 rounded-md border border-input bg-background text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.requires_rejection_reason)}
                      onChange={(e) =>
                        setFormData({ ...formData, requires_rejection_reason: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    Rad sababi majburiy
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Tartib raqami (Sort order)
                    </label>
                    <Input
                      type="number"
                      placeholder="1, 2, 3..."
                      value={formData.sort_order ?? 0}
                      onChange={(e) =>
                        setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                      }
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Standart (Birlamchi) holat
                    </label>
                    <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background">
                      <input
                        type="checkbox"
                        id="is_default_check"
                        checked={Boolean(formData.is_default)}
                        onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <label htmlFor="is_default_check" className="text-xs cursor-pointer">
                        Yangi arizalarga avtomatik biriksin
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Izoh (Tavsif)</label>
                  <Input
                    placeholder="Ariza statusi haqida qisqacha izoh..."
                    value={(formData.description as string) || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </>
            )}

            {/* Suspect Field Configs Form Fields */}
            {activeTab === 'suspect_fields' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Tizim Kaliti (Key) *</label>
                    <Input
                      placeholder="telegram_username, phone_number..."
                      value={(formData.key as string) || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                        })
                      }
                      className="h-9 text-xs font-mono"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Word shablonda {`{{suspect.${(formData.key as string) || 'kalit'}}}`} bo‘lib
                      chiqadi
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Toifasi (Category)</label>
                    <select
                      value={(formData.category as string) || 'Umumiy'}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Telegram">Telegram</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Aloqa">Aloqa / Telefon</option>
                      <option value="Moliya">Moliya / Bank / Kripto</option>
                      <option value="Tarmoq">Tarmoq / IP / Server</option>
                      <option value="Transport">Transport / Avto</option>
                      <option value="Umumiy">Umumiy / Boshqa</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Namuna qiymat (Sample value)
                    </label>
                    <Input
                      placeholder="Masalan: @tilav_web, 123456..."
                      value={(formData.sample_value as string) || ''}
                      onChange={(e) => setFormData({ ...formData, sample_value: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Tartib raqami (Sort order)
                    </label>
                    <Input
                      type="number"
                      placeholder="1, 2, 3..."
                      value={formData.sort_order ?? 0}
                      onChange={(e) =>
                        setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                      }
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Tavsif / Izoh</label>
                  <Input
                    placeholder="Ushbu parametr nima maqsadda ishlatilishi haqida izoh..."
                    value={(formData.description as string) || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </>
            )}

            {/* Occupations form fields */}
            {activeTab === 'occupations' && (
              <div className="space-y-4">
                {occupationMode === 'occupations' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Tegishli Kasb Toifasi *
                    </label>
                    <select
                      value={(formData.category_id as string) || selectedOccupCatFilter || ''}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs sm:text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    >
                      <option value="">Toifani tanlang...</option>
                      {allCategoriesList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Kodi (Ixtiyoriy)
                    </label>
                    <Input
                      placeholder="Savdo, O'qituvchi..."
                      value={formData.code || ''}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="h-10 text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Tartib raqami</label>
                    <Input
                      type="number"
                      value={formData.sort_order ?? 0}
                      onChange={(e) =>
                        setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                      }
                      className="h-10 text-xs sm:text-sm font-mono"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.is_active !== false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-input text-primary"
                  />
                  <span>Faol holatda</span>
                </label>
              </div>
            )}

            {/* Sources form fields */}
            {activeTab === 'sources' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Kodi / Qisqa raqami
                  </label>
                  <Input
                    placeholder="102, 112..."
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="h-10 text-xs sm:text-sm font-mono"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.is_active !== false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-input text-primary"
                  />
                  <span>Faol holatda</span>
                </label>
              </div>
            )}

            {/* Department Services form fields */}
            {activeTab === 'department_services' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Qisqartmasi (Abbreviatura) *
                  </label>
                  <Input
                    placeholder="UYOKK, JQK, TQK, HQPX..."
                    value={formData.short_name || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, short_name: e.target.value.toUpperCase() })
                    }
                    className="h-10 text-xs sm:text-sm font-mono uppercase font-bold"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.is_active !== false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-input text-primary"
                  />
                  <span>Faol holatda</span>
                </label>
              </div>
            )}

            {/* Decision Types form fields */}
            {activeTab === 'decision_types' && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.is_active !== false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-input text-primary"
                  />
                  <span>Faol holatda</span>
                </label>
              </div>
            )}

            {/* Rejection Reasons form fields */}
            {activeTab === 'rejection_reasons' && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.is_active !== false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-input text-primary"
                  />
                  <span>Faol holatda</span>
                </label>
              </div>
            )}
          </fieldset>

          <DialogFooter>
            <Button
              variant="outline"
              size="default"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs sm:text-sm h-10 px-5 cursor-pointer font-medium"
            >
              Bekor qilish
            </Button>
            <Button
              size="default"
              onClick={onSave}
              loading={isSaving}
              className="text-xs sm:text-sm h-10 px-6 font-semibold shadow-md shadow-primary/25 cursor-pointer"
            >
              {isSaving ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={modalType === 'delete'} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>O‘chirishni tasdiqlang</DialogTitle>
            <DialogDescription>
              Ushbu yozuvni o‘chirishni xohlaysizmi? Bu amalni ortga qaytarib bo‘lmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="default"
              onClick={onClose}
              disabled={isDeleting}
              className="text-xs sm:text-sm h-10 px-4 cursor-pointer font-medium"
            >
              Yo&apos;q, bekor qilish
            </Button>
            <Button
              variant="destructive"
              size="default"
              onClick={onDelete}
              loading={isDeleting}
              className="text-xs sm:text-sm h-10 px-5 font-semibold cursor-pointer shadow-md shadow-red-500/20"
            >
              {isDeleting ? 'O‘chirilmoqda...' : 'Ha, o‘chirish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
