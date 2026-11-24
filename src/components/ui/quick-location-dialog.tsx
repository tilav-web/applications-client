import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle2, Globe, Loader2, MapPin, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
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
import { districtsApi, neighborhoodsApi, regionsApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { queryKeys } from '@/lib/query-keys';
import type { District, Neighborhood, Region } from '@/types/models';

export interface QuickLocationCreatedPayload {
  region: Region;
  district: District;
  neighborhood: Neighborhood | null;
}

export interface QuickLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRegionId?: string | null;
  initialDistrictId?: string | null;
  initialDistrictQuery?: string;
  initialNeighborhoodQuery?: string;
  onCreated: (payload: QuickLocationCreatedPayload) => void;
}

interface QuickLocationBodyProps {
  initialRegionId?: string | null;
  initialDistrictId?: string | null;
  initialDistrictQuery?: string;
  initialNeighborhoodQuery?: string;
  onCreated: (payload: QuickLocationCreatedPayload) => void;
  onClose: () => void;
}

function QuickLocationBody({
  initialRegionId,
  initialDistrictId,
  initialDistrictQuery = '',
  initialNeighborhoodQuery = '',
  onCreated,
  onClose,
}: QuickLocationBodyProps) {
  const queryClient = useQueryClient();

  const { data: regionsData } = useQuery({
    queryKey: ['regions-quick-location'],
    queryFn: () => regionsApi.getAll({ limit: 100 }),
    staleTime: 60 * 1000,
  });

  const { data: districtsData } = useQuery({
    queryKey: ['districts-autocomplete'],
    queryFn: () => districtsApi.getAll({ limit: 500 }),
    staleTime: 60 * 1000,
  });

  const regions = useMemo(() => {
    const items = regionsData?.items || [];
    return [...items].sort((a, b) => {
      const aDef = a.code?.toUpperCase() === 'QASHQADARYO';
      const bDef = b.code?.toUpperCase() === 'QASHQADARYO';
      if (aDef && !bDef) return -1;
      if (!aDef && bDef) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [regionsData]);

  const allDistricts = useMemo(() => districtsData?.items || [], [districtsData]);

  const defaultRegionId = useMemo(() => {
    if (initialRegionId) return initialRegionId;
    if (initialDistrictId) {
      const matched = allDistricts.find((d) => d.id === initialDistrictId);
      if (matched?.region_id) return matched.region_id;
    }
    const qash = regions.find((r) => r.code?.toUpperCase() === 'QASHQADARYO');
    return qash?.id || regions[0]?.id || '';
  }, [initialRegionId, initialDistrictId, allDistricts, regions]);

  const [regionMode, setRegionMode] = useState<'existing' | 'new'>('existing');
  const [selectedRegionIdState, setSelectedRegionIdState] = useState<string>(initialRegionId || '');
  const [newRegionName, setNewRegionName] = useState('');

  const [districtMode, setDistrictMode] = useState<'existing' | 'new'>(
    initialDistrictId ? 'existing' : 'new',
  );
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(initialDistrictId || '');
  const [newDistrictName, setNewDistrictName] = useState(initialDistrictQuery);

  const [newNeighborhoodName, setNewNeighborhoodName] = useState(initialNeighborhoodQuery);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveRegionId = selectedRegionIdState || defaultRegionId;

  const regionDistricts = useMemo(() => {
    if (!effectiveRegionId) return [];
    return allDistricts
      .filter((d) => d.region_id === effectiveRegionId)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [allDistricts, effectiveRegionId]);

  const effectiveDistrictMode: 'existing' | 'new' =
    regionMode === 'new' || regionDistricts.length === 0 ? 'new' : districtMode;

  const matchedExistingRegion = useMemo(() => {
    const clean = newRegionName.trim().toLowerCase();
    if (!clean) return null;
    return regions.find((r) => (r.name || '').trim().toLowerCase() === clean) || null;
  }, [newRegionName, regions]);

  const matchedExistingDistrict = useMemo(() => {
    const clean = newDistrictName.trim().toLowerCase();
    if (!clean) return null;
    return allDistricts.find((d) => (d.name || '').trim().toLowerCase() === clean) || null;
  }, [newDistrictName, allDistricts]);

  const isAddingOnlyNeighborhood =
    regionMode === 'existing' && effectiveDistrictMode === 'existing';

  const selectedRegionObj = regions.find((r) => r.id === effectiveRegionId) || null;
  const selectedDistrictObj = regionDistricts.find((d) => d.id === selectedDistrictId) || null;

  const canSubmit = useMemo(() => {
    const hasRegion =
      regionMode === 'existing' ? Boolean(effectiveRegionId) : newRegionName.trim().length > 0;
    const hasDistrict =
      effectiveDistrictMode === 'existing'
        ? Boolean(selectedDistrictId)
        : newDistrictName.trim().length > 0;
    if (!hasRegion || !hasDistrict) return false;
    if (isAddingOnlyNeighborhood && !newNeighborhoodName.trim()) return false;
    return true;
  }, [
    regionMode,
    effectiveRegionId,
    newRegionName,
    effectiveDistrictMode,
    selectedDistrictId,
    newDistrictName,
    isAddingOnlyNeighborhood,
    newNeighborhoodName,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    try {
      setIsSubmitting(true);

      // 1. Viloyatni aniqlash yoki yaratish
      let finalRegion: Region | null = null;
      if (regionMode === 'new') {
        finalRegion = await regionsApi.create({ name: newRegionName.trim() });
      } else {
        finalRegion = selectedRegionObj;
        if (!finalRegion) {
          toast.error('Viloyatni tanlang yoki yangi viloyat nomini kiriting');
          return;
        }
      }

      // 2. Tumanni aniqlash yoki yaratish
      let finalDistrict: District | null = null;
      if (effectiveDistrictMode === 'new') {
        finalDistrict = await districtsApi.create({
          name: newDistrictName.trim(),
          region_id: finalRegion.id,
        });
      } else {
        finalDistrict = selectedDistrictObj;
        if (!finalDistrict) {
          toast.error('Tumanni tanlang yoki yangi tuman nomini kiriting');
          return;
        }
      }

      // 3. Mahalla kiritilgan bo'lsa — yaratish
      let finalNeighborhood: Neighborhood | null = null;
      const cleanNeighborhood = newNeighborhoodName.trim();
      if (cleanNeighborhood) {
        finalNeighborhood = await neighborhoodsApi.create({
          name: cleanNeighborhood,
          district_id: finalDistrict.id,
        });
      }

      // 4. Barcha tegishli keshlarni yangilash va auto-select uchun qayta yuklash
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['regions'] }),
        queryClient.invalidateQueries({ queryKey: ['regions-quick-location'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.references.regionsSelect }),
        queryClient.invalidateQueries({ queryKey: ['districts'] }),
        queryClient.invalidateQueries({ queryKey: ['districts-autocomplete'] }),
        queryClient.invalidateQueries({ queryKey: ['districts-all'] }),
        queryClient.invalidateQueries({ queryKey: ['districts-for-citizens'] }),
        queryClient.invalidateQueries({ queryKey: ['districts-all-for-workplaces'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.references.districtsSelect }),
        queryClient.invalidateQueries({ queryKey: ['neighborhoods'] }),
        queryClient.invalidateQueries({ queryKey: ['citizen-neighborhoods'] }),
        queryClient.invalidateQueries({ queryKey: ['custom-citizen-neighborhoods-select'] }),
      ]);

      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['districts-autocomplete'] }),
        queryClient.refetchQueries({ queryKey: ['citizen-neighborhoods', finalDistrict.id] }),
        queryClient.refetchQueries({
          queryKey: ['custom-citizen-neighborhoods-select', finalDistrict.id],
        }),
      ]);

      const parts = [finalRegion.name, finalDistrict.name];
      if (finalNeighborhood?.name) parts.push(finalNeighborhood.name);
      toast.success('Hudud muvaffaqiyatli qo‘shildi va tanlandi', {
        description: parts.join(' → '),
      });

      onCreated({
        region: finalRegion,
        district: finalDistrict,
        neighborhood: finalNeighborhood,
      });
      onClose();
    } catch (err) {
      toast.error('Hududni saqlashda xatolik', {
        description: getErrorMessage(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 1. VILOYAT */}
      <div className="space-y-1.5 rounded-xl border border-border/80 bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-primary" />
            1. Viloyat *
          </label>
          <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setRegionMode('existing')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                regionMode === 'existing'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Mavjud viloyat
            </button>
            <button
              type="button"
              onClick={() => {
                setRegionMode('new');
                setDistrictMode('new');
                setSelectedDistrictId('');
              }}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                regionMode === 'new'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Plus className="h-3 w-3" />
              Yangi viloyat
            </button>
          </div>
        </div>

        {regionMode === 'existing' ? (
          <select
            value={effectiveRegionId}
            onChange={(e) => {
              setSelectedRegionIdState(e.target.value);
              setSelectedDistrictId('');
            }}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {regions.length === 0 ? (
              <option value="">Viloyatlar topilmadi — yangi viloyat yarating</option>
            ) : (
              regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))
            )}
          </select>
        ) : (
          <div className="space-y-1">
            <Input
              value={newRegionName}
              onChange={(e) => setNewRegionName(e.target.value)}
              placeholder="Masalan: Samarqand viloyati, Buxoro viloyati, Toshkent shahri..."
              className="h-9 text-xs"
              autoFocus
            />
            {matchedExistingRegion && (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                <CheckCircle2 className="h-3 w-3" />
                Bazada mavjud — «{matchedExistingRegion.name}» biriktiriladi
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* 2. TUMAN / SHAHAR */}
      <div className="space-y-1.5 rounded-xl border border-border/80 bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            2. Tuman / Shahar *
          </label>
          {regionMode === 'existing' && regionDistricts.length > 0 && (
            <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setDistrictMode('existing')}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  effectiveDistrictMode === 'existing'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Mavjud tuman
              </button>
              <button
                type="button"
                onClick={() => setDistrictMode('new')}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  effectiveDistrictMode === 'new'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Plus className="h-3 w-3" />
                Yangi tuman
              </button>
            </div>
          )}
        </div>

        {effectiveDistrictMode === 'existing' ? (
          <select
            value={selectedDistrictId}
            onChange={(e) => setSelectedDistrictId(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">-- Tumanni tanlang --</option>
            {regionDistricts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="space-y-1">
            <Input
              value={newDistrictName}
              onChange={(e) => setNewDistrictName(e.target.value)}
              placeholder="Masalan: Urgut t., Buxoro sh., Chilonzor t...."
              className="h-9 text-xs"
            />
            {matchedExistingDistrict && (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                <CheckCircle2 className="h-3 w-3" />
                Bazada mavjud — «{matchedExistingDistrict.name}» biriktiriladi
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* 3. MAHALLA */}
      <div className="space-y-1.5 rounded-xl border border-border/80 bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            3. Mahalla (MFY / QFY) {isAddingOnlyNeighborhood ? '*' : ''}
          </label>
          <span className="text-[10px] text-muted-foreground">
            {isAddingOnlyNeighborhood
              ? 'Mavjud tumanga yangi mahalla qo‘shish'
              : 'Ixtiyoriy — bo‘sh qoldirish mumkin'}
          </span>
        </div>
        <Input
          value={newNeighborhoodName}
          onChange={(e) => setNewNeighborhoodName(e.target.value)}
          placeholder="Masalan: Navro‘z MFY, Do‘stlik MFY..."
          className="h-9 text-xs"
        />
      </div>

      {/* NATIJA KO'RINISHI */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-foreground flex flex-wrap items-center gap-1.5">
        <span className="font-semibold text-primary">Saqlanadi va tanlanadi:</span>
        <span>
          {regionMode === 'new'
            ? newRegionName.trim() || 'Yangi viloyat'
            : selectedRegionObj?.name || 'Viloyat'}
        </span>
        <span className="text-muted-foreground">→</span>
        <span>
          {effectiveDistrictMode === 'new'
            ? newDistrictName.trim() || 'Yangi tuman'
            : selectedDistrictObj?.name || 'Tuman'}
        </span>
        {newNeighborhoodName.trim() && (
          <>
            <span className="text-muted-foreground">→</span>
            <span className="font-semibold">{newNeighborhoodName.trim()}</span>
          </>
        )}
      </div>

      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isSubmitting}
          className="cursor-pointer"
        >
          Bekor qilish
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!canSubmit || isSubmitting}
          className="gap-1.5 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saqlanmoqda...
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Saqlash va tanlash
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function QuickLocationDialog({
  open,
  onOpenChange,
  initialRegionId,
  initialDistrictId,
  initialDistrictQuery,
  initialNeighborhoodQuery,
  onCreated,
}: QuickLocationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Yangi hudud qo‘shish (Viloyat / Tuman / Mahalla)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Mavjud viloyat yoki tumanni tanlab yangi yozuv qo‘shing yoki uchalasini bir vaqtda
            yarating. Saqlangach ariza formasida avtomatik tanlanadi.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <QuickLocationBody
            key={`${initialRegionId || ''}_${initialDistrictId || ''}_${initialDistrictQuery || ''}_${initialNeighborhoodQuery || ''}`}
            initialRegionId={initialRegionId}
            initialDistrictId={initialDistrictId}
            initialDistrictQuery={initialDistrictQuery}
            initialNeighborhoodQuery={initialNeighborhoodQuery}
            onCreated={onCreated}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
