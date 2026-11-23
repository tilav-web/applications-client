import { useQuery } from '@tanstack/react-query';
import { Briefcase, Building2, CheckCircle2, MapPin, Plus, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Bazadagi barcha faol ish joylari / tashkilotlar (select uchun)
  const { data: workplacesRes } = useQuery({
    queryKey: ['workplaces-select-all'],
    queryFn: () => workplacesApi.getAll({ page: 1, limit: 200 }),
  });

  const { data: workplaceMahallasRes } = useQuery({
    queryKey: ['mahallas-workplace-draft', workplaceDraft.district_id],
    queryFn: () =>
      mahallasApi.getAll({ page: 1, limit: 300, district_id: workplaceDraft.district_id }),
    enabled: isCreatingNew && Boolean(workplaceDraft.district_id),
  });

  const allWorkplaces = workplacesRes?.items || [];
  const workplaceMahallas = workplaceMahallasRes?.items || [];

  // Agar kasb toifasi tanlangan bo'lsa, shu sohaga tegishli tashkilotlarni yuqoriga chiqaramiz
  const sortedWorkplaces = [...allWorkplaces].sort((a, b) => {
    if (occupationCategoryId) {
      const aMatch = a.occupation_category_id === occupationCategoryId ? 0 : 1;
      const bMatch = b.occupation_category_id === occupationCategoryId ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
    }
    return (a.name || '').localeCompare(b.name || '');
  });

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
          {selectedWorkplace && !isCreatingNew && (
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

        {/* 2-qator: Ish joyi / Tashkilot (SELECT + yangi qo'shish) + Lavozimi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                Ish joyi / Tashkilot
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (isCreatingNew) {
                    setIsCreatingNew(false);
                    onWorkplaceDraftChange({
                      name: '',
                      district_id: '',
                      mahalla_id: '',
                      address: '',
                      inn: '',
                    });
                  } else {
                    onSelectWorkplace(null);
                    setIsCreatingNew(true);
                  }
                }}
                className="h-6 px-2 text-[11px] gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-500/10 cursor-pointer"
              >
                {isCreatingNew ? (
                  <>
                    <X className="h-3 w-3" />
                    Ro‘yxatdan tanlash
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3" />
                    Yangi qo‘shish
                  </>
                )}
              </Button>
            </div>

            {!isCreatingNew ? (
              <>
                <select
                  value={selectedWorkplace?.id || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) {
                      onSelectWorkplace(null);
                      return;
                    }
                    const found = allWorkplaces.find((w) => w.id === id) || null;
                    onSelectWorkplace(found);
                  }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">-- ISH JOYINI / TASHKILOTNI TANLANG --</option>
                  {sortedWorkplaces.map((wp) => (
                    <option key={wp.id} value={wp.id}>
                      {wp.name}
                      {wp.district?.name ? ` (${wp.district.name})` : ''}
                    </option>
                  ))}
                </select>

                {selectedWorkplace && (
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-1">
                    <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span className="truncate">
                      {selectedWorkplace.district?.name || 'Hudud ko‘rsatilmagan'}
                      {selectedWorkplace.mahalla?.name ? `, ${selectedWorkplace.mahalla.name}` : ''}
                      {selectedWorkplace.address ? ` • ${selectedWorkplace.address}` : ''}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <Input
                placeholder="Yangi tashkilot nomi (Masalan: 3-sonli umumta’lim maktabi)..."
                value={workplaceDraft.name}
                onChange={(e) =>
                  onWorkplaceDraftChange({ ...workplaceDraft, name: e.target.value })
                }
                className="h-10 text-xs"
              />
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

        {/* Yangi tashkilot qo'shish rejimi yoqilganda qo'shimcha maydonlar */}
        {isCreatingNew && (
          <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-3 space-y-3">
            <div className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Yangi tashkilot bazadagi «Ish joylari» ro‘yxatiga saqlanadi:
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
