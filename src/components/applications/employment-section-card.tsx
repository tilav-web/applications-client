import { useQuery } from '@tanstack/react-query';
import { Briefcase, Building2, CheckCircle2, MapPin, Sparkles, Unlink } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { mahallasApi, workplacesApi } from '@/lib/api';
import type { District, Occupation, OccupationCategory, Workplace } from '@/types/models';

export interface WorkplaceDraft {
  name: string;
  district_id: string;
  mahalla_id: string;
  address: string;
  inn: string;
}

interface EmploymentSectionCardProps {
  occupationCategoryId: string | null;
  onOccupationCategoryChange: (id: string | null) => void;
  occupationId: string | null;
  onOccupationChange: (id: string | null) => void;
  allOccupationCategories: OccupationCategory[];
  availableOccupations: Occupation[];
  allDistricts: District[];
  selectedWorkplace: Workplace | null;
  onSelectWorkplace: (wp: Workplace | null) => void;
  workplaceDraft: WorkplaceDraft;
  onWorkplaceDraftChange: (draft: WorkplaceDraft) => void;
  workPosition: string;
  onWorkPositionChange: (val: string) => void;
}

export function EmploymentSectionCard({
  occupationCategoryId,
  onOccupationCategoryChange,
  occupationId,
  onOccupationChange,
  allOccupationCategories,
  availableOccupations,
  allDistricts,
  selectedWorkplace,
  onSelectWorkplace,
  workplaceDraft,
  onWorkplaceDraftChange,
  workPosition,
  onWorkPositionChange,
}: EmploymentSectionCardProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedQuery = useDebounce(workplaceDraft.name, 250);

  const { data: searchRes } = useQuery({
    queryKey: [
      'workplaces-autocomplete',
      debouncedQuery,
      workplaceDraft.district_id,
      occupationCategoryId,
    ],
    queryFn: () =>
      workplacesApi.getAll({
        page: 1,
        limit: 8,
        search: debouncedQuery.trim() || undefined,
        district_id: workplaceDraft.district_id || undefined,
      }),
    enabled: !selectedWorkplace && showSuggestions,
  });

  const { data: workplaceMahallasRes } = useQuery({
    queryKey: ['mahallas-workplace-draft', workplaceDraft.district_id],
    queryFn: () =>
      mahallasApi.getAll({ page: 1, limit: 300, district_id: workplaceDraft.district_id }),
    enabled: !selectedWorkplace && Boolean(workplaceDraft.district_id),
  });

  const matches = searchRes?.items || [];
  const workplaceMahallas = workplaceMahallasRes?.items || [];

  return (
    <Card className="border-border/80 bg-card/70 shadow-sm">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-600">
              <Briefcase className="h-3.5 w-3.5" />
            </span>
            Kasb va Ish Joyi Ma’lumotlari
          </CardTitle>
          {selectedWorkplace && (
            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1 text-[10px]">
              <CheckCircle2 className="h-3 w-3" />
              Bazadagi tashkilot biriktirildi
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* 1-qator: Kasb toifasi va Kasb turi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
                Kasbi — toifasi
              </label>
              {occupationCategoryId && (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1 text-[10px]">
                  <CheckCircle2 className="h-3 w-3" />
                  Tanlandi
                </Badge>
              )}
            </div>
            <select
              value={occupationCategoryId || ''}
              onChange={(e) => {
                onOccupationCategoryChange(e.target.value || null);
                onOccupationChange(null);
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold uppercase shadow-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="">-- KASB TOIFASINI TANLANG --</option>
              {allOccupationCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Kasbi — turi / mutaxassisligi
              </label>
              {occupationId && (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1 text-[10px]">
                  <CheckCircle2 className="h-3 w-3" />
                  Tanlandi
                </Badge>
              )}
            </div>
            <select
              value={occupationId || ''}
              disabled={!occupationCategoryId}
              onChange={(e) => onOccupationChange(e.target.value || null)}
              className={`h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold uppercase shadow-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer ${
                !occupationCategoryId
                  ? 'bg-muted/50 cursor-not-allowed opacity-60 text-muted-foreground'
                  : ''
              }`}
            >
              <option value="">
                {occupationCategoryId
                  ? '-- KASB / MUTAXASSISLIKNI TANLANG --'
                  : 'AVVAL TOIFANI TANLANG...'}
              </option>
              {availableOccupations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2-qator: Ish joyi / Tashkilot (Autocomplete yoki tanlangan karta) + Lavozimi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 relative">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-indigo-500" />
              Ish joyi / Tashkilot (Masalan: 3-maktab, Shifoxona, Bank)
            </label>

            {selectedWorkplace ? (
              <div className="rounded-lg border border-emerald-500/35 bg-emerald-500/5 px-3 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground truncate">
                    {selectedWorkplace.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span>
                      {selectedWorkplace.district?.name || 'Tuman ko‘rsatilmagan'}
                      {selectedWorkplace.mahalla?.name ? `, ${selectedWorkplace.mahalla.name}` : ''}
                      {selectedWorkplace.address ? ` • ${selectedWorkplace.address}` : ''}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onSelectWorkplace(null);
                    onWorkplaceDraftChange({
                      name: '',
                      district_id: '',
                      mahalla_id: '',
                      address: '',
                      inn: '',
                    });
                  }}
                  className="h-7 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 shrink-0 cursor-pointer gap-1"
                >
                  <Unlink className="h-3 w-3" />
                  Uzish
                </Button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Tashkilot nomini yozing (bazadan qidiradi yoki yangi yaratadi)..."
                  value={workplaceDraft.name}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                  onChange={(e) => {
                    onWorkplaceDraftChange({ ...workplaceDraft, name: e.target.value });
                    setShowSuggestions(true);
                  }}
                  className="h-10 text-xs"
                />

                {showSuggestions && matches.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover text-popover-foreground border border-border shadow-xl rounded-xl p-1.5 max-h-56 overflow-y-auto">
                    <div className="text-[10px] font-semibold text-muted-foreground px-2 py-1 flex items-center gap-1 border-b border-border/50 mb-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      Bazada mavjud tashkilotlar ({matches.length} ta):
                    </div>
                    {matches.map((wp) => (
                      <div
                        key={wp.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onSelectWorkplace(wp);
                          setShowSuggestions(false);
                        }}
                        className="px-2.5 py-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      >
                        <div className="text-xs font-semibold text-foreground">{wp.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {wp.district?.name || 'Hududsiz'}
                          {wp.mahalla?.name ? `, ${wp.mahalla.name}` : ''}
                          {wp.address ? ` • ${wp.address}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Lavozimi / darajasi (ixtiyoriy)
            </label>
            <Input
              placeholder="Masalan: Matematika o‘qituvchisi, Bosh hisobchi, 3-kurs talabasi..."
              value={workPosition}
              onChange={(e) => onWorkPositionChange(e.target.value)}
              className="h-10 text-xs"
            />
          </div>
        </div>

        {/* Yangi tashkilot kiritilayotgan bo'lsa (bazadan tanlanmagan va nomi yozilgan), manzil/tumanini so'raymiz */}
        {!selectedWorkplace && workplaceDraft.name.trim().length > 0 && (
          <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-3 space-y-3">
            <div className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Yangi tashkilot sifatida bazaga saqlanadi (joylashgan hududini ko‘rsating):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">Ish joyi tumani</label>
                <select
                  value={workplaceDraft.district_id}
                  onChange={(e) =>
                    onWorkplaceDraftChange({
                      ...workplaceDraft,
                      district_id: e.target.value,
                      mahalla_id: '',
                    })
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="">-- Tumanni tanlang --</option>
                  {allDistricts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">
                  Mahallasi (ixtiyoriy)
                </label>
                <select
                  value={workplaceDraft.mahalla_id}
                  disabled={!workplaceDraft.district_id}
                  onChange={(e) =>
                    onWorkplaceDraftChange({ ...workplaceDraft, mahalla_id: e.target.value })
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs disabled:opacity-50"
                >
                  <option value="">-- Mahalla --</option>
                  {workplaceMahallas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">
                  Aniq manzili (ixtiyoriy)
                </label>
                <Input
                  placeholder="Ko‘cha, bino..."
                  value={workplaceDraft.address}
                  onChange={(e) =>
                    onWorkplaceDraftChange({ ...workplaceDraft, address: e.target.value })
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">
                  STIR / INN (ixtiyoriy)
                </label>
                <Input
                  placeholder="9 ta raqam..."
                  value={workplaceDraft.inn}
                  onChange={(e) =>
                    onWorkplaceDraftChange({
                      ...workplaceDraft,
                      inn: e.target.value.replace(/\D/g, '').slice(0, 14),
                    })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
