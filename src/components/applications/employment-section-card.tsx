import { useQuery } from '@tanstack/react-query';
import { Briefcase, Building2, CheckCircle2, MapPin, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { workplacesApi } from '@/lib/api';
import { matchesLatinSearch } from '@/lib/transliterate';
import type { Occupation, OccupationCategory, Workplace } from '@/types/models';

interface EmploymentSectionCardProps {
  occupationCategoryId: string | null;
  onOccupationCategoryChange: (id: string | null) => void;
  occupationId: string | null;
  onOccupationChange: (id: string | null) => void;
  allOccupationCategories: OccupationCategory[];
  availableOccupations: Occupation[];
  selectedWorkplace: Workplace | null;
  onSelectWorkplace: (wp: Workplace | null) => void;
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
  selectedWorkplace,
  onSelectWorkplace,
  workPosition,
  onWorkPositionChange,
}: EmploymentSectionCardProps) {
  const [workplaceFilter, setWorkplaceFilter] = useState('');

  const { data: workplacesRes, isFetching: isWorkplacesLoading } = useQuery({
    queryKey: ['workplaces-by-occupation', occupationId],
    queryFn: () =>
      workplacesApi.getAll({
        page: 1,
        limit: 300,
        occupation_id: occupationId || undefined,
      }),
    enabled: Boolean(occupationId),
  });

  const occupationWorkplaces = useMemo(() => {
    const base = workplacesRes?.items || [];
    if (selectedWorkplace && !base.some((w) => w.id === selectedWorkplace.id)) {
      return [selectedWorkplace, ...base];
    }
    return base;
  }, [workplacesRes?.items, selectedWorkplace]);

  const filteredWorkplaces = useMemo(() => {
    if (!workplaceFilter.trim()) return occupationWorkplaces;
    return occupationWorkplaces.filter(
      (wp) =>
        matchesLatinSearch(wp.name, workplaceFilter) ||
        matchesLatinSearch(wp.district?.name, workplaceFilter),
    );
  }, [occupationWorkplaces, workplaceFilter]);

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
        {/* 1-qator: Kasb toifasi -> Kasb turi */}
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
                onSelectWorkplace(null);
                setWorkplaceFilter('');
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
              onChange={(e) => {
                onOccupationChange(e.target.value || null);
                onSelectWorkplace(null);
                setWorkplaceFilter('');
              }}
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

        {/* 2-qator: Ish joyi / Tashkilot (Kasb turi tanlangandan keyin ochiladi) + Lavozimi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                Ish joyi / Tashkilot
              </label>
              {selectedWorkplace ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1 text-[10px]">
                  <CheckCircle2 className="h-3 w-3" />
                  Tanlandi
                </Badge>
              ) : occupationId && !isWorkplacesLoading ? (
                <span className="text-[10px] text-muted-foreground">
                  {occupationWorkplaces.length} ta tashkilot
                </span>
              ) : null}
            </div>

            {occupationId && occupationWorkplaces.length > 10 && (
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={workplaceFilter}
                  onChange={(e) => setWorkplaceFilter(e.target.value)}
                  placeholder="Tashkilot yoki tuman bo‘yicha tezkor qidiruv..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
            )}

            <select
              value={selectedWorkplace?.id || ''}
              disabled={!occupationId || isWorkplacesLoading}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) {
                  onSelectWorkplace(null);
                  return;
                }
                const found = occupationWorkplaces.find((w) => w.id === id) || null;
                onSelectWorkplace(found);
              }}
              className={`h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold uppercase shadow-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer ${
                !occupationId || isWorkplacesLoading
                  ? 'bg-muted/50 cursor-not-allowed opacity-60 text-muted-foreground'
                  : ''
              }`}
            >
              <option value="">
                {!occupationId
                  ? 'AVVAL KASB TURINI TANLANG...'
                  : isWorkplacesLoading
                    ? 'YUKLANMOQDA...'
                    : filteredWorkplaces.length === 0
                      ? 'USHBU KASB TURI UCHUN TASHKILOT TOPILMADI'
                      : '-- ISH JOYINI / TASHKILOTNI TANLANG --'}
              </option>
              {filteredWorkplaces.map((wp) => (
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
                  {selectedWorkplace.district?.name || 'Tuman belgilanmagan'}
                  {selectedWorkplace.neighborhood?.name
                    ? `, ${selectedWorkplace.neighborhood.name}`
                    : ''}
                  {selectedWorkplace.address ? ` — ${selectedWorkplace.address}` : ''}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Lavozimi / darajasi (ixtiyoriy)
            </label>
            <Input
              value={workPosition}
              onChange={(e) => onWorkPositionChange(e.target.value)}
              placeholder="Masalan: Matematika o‘qituvchisi, Bosh hisobchi, 3-kurs talabasi..."
              className="h-10 text-xs font-medium"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
