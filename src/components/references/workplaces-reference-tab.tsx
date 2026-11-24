import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Edit2, MapPin, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { toast } from '@/components/ui/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebounce } from '@/hooks/use-debounce';
import { usePermissions } from '@/hooks/use-permissions';
import { districtsApi, mahallasApi, occupationCategoriesApi, workplacesApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { Workplace } from '@/types/models';

export function WorkplacesReferenceTab() {
  const queryClient = useQueryClient();
  const { canWrite } = usePermissions();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [districtFilter, setDistrictFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Workplace | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workplace | null>(null);

  const [name, setName] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [mahallaId, setMahallaId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedOccupationIds, setSelectedOccupationIds] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [inn, setInn] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['workplaces', { page, limit, search: debouncedSearch, district_id: districtFilter }],
    queryFn: () =>
      workplacesApi.getAll({
        page,
        limit,
        search: debouncedSearch || undefined,
        district_id: districtFilter || undefined,
      }),
  });

  const { data: districtsData } = useQuery({
    queryKey: ['districts-all-for-workplaces'],
    queryFn: () => districtsApi.getAll({ page: 1, limit: 200 }),
  });

  const { data: mahallasData } = useQuery({
    queryKey: ['mahallas-for-workplace', districtId],
    queryFn: () => mahallasApi.getAll({ page: 1, limit: 300, district_id: districtId }),
    enabled: Boolean(districtId),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['occupation-categories-for-workplaces'],
    queryFn: () => occupationCategoriesApi.getAll(),
  });

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDistrictId(districtFilter || '');
    setMahallaId('');
    setCategoryId('');
    setSelectedOccupationIds([]);
    setAddress('');
    setInn('');
    setModalOpen(true);
  };

  const openEdit = (wp: Workplace) => {
    setEditing(wp);
    setName(wp.name || '');
    setDistrictId(wp.district_id || '');
    setMahallaId(wp.mahalla_id || '');
    setCategoryId(wp.occupation_category_id || '');
    setSelectedOccupationIds((wp.occupations || []).map((o) => o.id));
    setAddress(wp.address || '');
    setInn(wp.inn || '');
    setModalOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        district_id: districtId || null,
        mahalla_id: mahallaId || null,
        occupation_category_id: categoryId || null,
        occupation_ids: selectedOccupationIds,
        address: address.trim() || null,
        inn: inn.trim() || null,
      };
      return editing ? workplacesApi.update(editing.id, payload) : workplacesApi.create(payload);
    },
    onSuccess: () => {
      setModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['workplaces'] });
      toast.success(editing ? 'Ish joyi yangilandi' : 'Yangi ish joyi / tashkilot qo‘shildi');
    },
    onError: (err) => {
      toast.error('Saqlashda xatolik', { description: getErrorMessage(err) });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => workplacesApi.delete(id),
    onSuccess: () => {
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['workplaces'] });
      toast.success('Ish joyi / tashkilot o‘chirildi');
    },
    onError: (err) => {
      toast.error('O‘chirib bo‘lmadi', { description: getErrorMessage(err) });
    },
  });

  const districts = districtsData?.items || [];
  const mahallas = mahallasData?.items || [];
  const categories = categoriesData || [];
  const categoryOccupations = categories.find((c) => c.id === categoryId)?.occupations || [];

  const toggleOccupationId = (occId: string) => {
    setSelectedOccupationIds((prev) =>
      prev.includes(occId) ? prev.filter((id) => id !== occId) : [...prev, occId],
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Tashkilot nomi, manzil yoki STIR..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <select
            value={districtFilter}
            onChange={(e) => {
              setDistrictFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs"
          >
            <option value="">Barcha tumanlar</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {canWrite && (
          <Button size="sm" onClick={openCreate} className="h-9 gap-1.5 text-xs cursor-pointer">
            <Plus className="h-4 w-4" />
            Yangi ish joyi / tashkilot
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card/60">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-[11px]">Tashkilot / Muassasa nomi</TableHead>
              <TableHead className="text-[11px]">Sohasi</TableHead>
              <TableHead className="text-[11px]">Joylashgan hududi</TableHead>
              <TableHead className="text-[11px]">STIR (INN)</TableHead>
              {canWrite && <TableHead className="text-[11px] text-right w-24">Amallar</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                  Yuklanmoqda...
                </TableCell>
              </TableRow>
            ) : data?.items?.length ? (
              data.items.map((wp) => (
                <TableRow key={wp.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{wp.name}</span>
                    </div>
                    {wp.address && (
                      <div className="text-[11px] text-muted-foreground pl-5">{wp.address}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {wp.occupation_category ? (
                        <Badge variant="outline" className="text-[10px] w-fit">
                          {wp.occupation_category.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                      {wp.occupations && wp.occupations.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {wp.occupations.slice(0, 3).map((occ) => (
                            <span
                              key={occ.id}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                            >
                              {occ.name}
                            </span>
                          ))}
                          {wp.occupations.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{wp.occupations.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {wp.district?.name ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span>
                          {wp.district.name}
                          {wp.mahalla?.name ? `, ${wp.mahalla.name}` : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{wp.inn || '—'}</TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 cursor-pointer"
                          onClick={() => openEdit(wp)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive cursor-pointer"
                          onClick={() => setDeleteTarget(wp)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                  Ish joylari / tashkilotlar topilmadi
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data?.meta && data.meta.totalPages > 1 && (
        <PaginationBar
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          total={data.meta.total}
          limit={data.meta.limit}
          hasNextPage={data.meta.hasNextPage}
          hasPreviousPage={data.meta.hasPreviousPage}
          onPageChange={setPage}
        />
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editing ? 'Ish joyini tahrirlash' : 'Yangi ish joyi / tashkilot qo‘shish'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tashkilot nomi va joylashgan tumani bo‘yicha bazada yagona yozuv sifatida saqlanadi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Tashkilot / Muassasa nomi *</label>
              <Input
                placeholder="Masalan: 3-sonli umumta’lim maktabi, Agrobank Qarshi filiali..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Joylashgan tumani</label>
                <select
                  value={districtId}
                  onChange={(e) => {
                    setDistrictId(e.target.value);
                    setMahallaId('');
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="">-- Tumanni tanlang --</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Mahallasi (ixtiyoriy)</label>
                <select
                  value={mahallaId}
                  disabled={!districtId}
                  onChange={(e) => setMahallaId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs disabled:opacity-50"
                >
                  <option value="">-- Mahallani tanlang --</option>
                  {mahallas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Sohasi (Kasb toifasi)</label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setSelectedOccupationIds([]);
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="">-- Sohani tanlang --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">STIR / INN (ixtiyoriy)</label>
                <Input
                  placeholder="9 ta raqam..."
                  value={inn}
                  onChange={(e) => setInn(e.target.value.replace(/\D/g, '').slice(0, 14))}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {categoryId && categoryOccupations.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">
                  Tegishli kasb turlari (bir nechta tanlash mumkin)
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-md border border-input bg-muted/20 max-h-32 overflow-y-auto">
                  {categoryOccupations.map((occ) => {
                    const checked = selectedOccupationIds.includes(occ.id);
                    return (
                      <button
                        key={occ.id}
                        type="button"
                        onClick={() => toggleOccupationId(occ.id)}
                        className={`text-[11px] px-2 py-1 rounded-md border transition-colors cursor-pointer ${
                          checked
                            ? 'bg-primary text-primary-foreground border-primary font-semibold'
                            : 'bg-background text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {occ.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold">Aniq manzili (ixtiyoriy)</label>
              <Input
                placeholder="Ko‘cha, bino raqami, mo‘ljal..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              size="sm"
              disabled={!name.trim() || saveMut.isPending}
              loading={saveMut.isPending}
              onClick={() => saveMut.mutate()}
            >
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Ish joyini o‘chirish"
        description={`«${deleteTarget?.name || ''}» tashkilotini o‘chirishni tasdiqlaysizmi? Agar unga fuqaro yoki ariza bog‘langan bo‘lsa, o‘chirish bloklanadi.`}
        variant="destructive"
        isLoading={deleteMut.isPending}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
