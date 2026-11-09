import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Edit2, Phone, Plus, Search, Trash2, User, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { citizensApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { formatUzbekName } from '@/lib/formatters';
import type { Citizen } from '@/types/models';

export function CitizensPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Dialog states
  const [modalType, setModalType] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [targetCitizen, setTargetCitizen] = useState<Citizen | null>(null);
  const [formData, setFormData] = useState<Partial<Citizen>>({});

  // 1. Fetch Citizens Query
  const { data, isLoading } = useQuery({
    queryKey: ['citizens', { page, limit, search }],
    queryFn: () => citizensApi.getAll({ page, limit, search }),
    placeholderData: (prev) => prev,
  });

  // 2. Prefetch Next Page with React Query for instant transitions
  useEffect(() => {
    if (data?.meta?.hasNextPage) {
      queryClient.prefetchQuery({
        queryKey: ['citizens', { page: page + 1, limit, search }],
        queryFn: () => citizensApi.getAll({ page: page + 1, limit, search }),
      });
    }
  }, [data, page, limit, search, queryClient]);

  // Mutations
  const preparePayload = (data: Partial<Citizen>) => ({
    ...data,
    first_name: data.first_name ? formatUzbekName(data.first_name) : undefined,
    last_name: data.last_name ? formatUzbekName(data.last_name) : undefined,
    middle_name: data.middle_name ? formatUzbekName(data.middle_name) : undefined,
    passport: data.passport ? data.passport.trim().toUpperCase() : undefined,
  });

  const createMutation = useMutation({
    mutationFn: () => citizensApi.create(preparePayload(formData)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citizens'] });
      closeModal();
      toast.success('Fuqaro muvaffaqiyatli qo‘shildi');
    },
    onError: (err: unknown) => {
      toast.error('Fuqaroni saqlashda xatolik', { description: getErrorMessage(err) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => citizensApi.update(targetCitizen!.id, preparePayload(formData)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citizens'] });
      closeModal();
      toast.success('Fuqaro ma‘lumotlari yangilandi');
    },
    onError: (err: unknown) => {
      toast.error('Yangilashda xatolik', { description: getErrorMessage(err) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => citizensApi.delete(targetCitizen!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citizens'] });
      closeModal();
      toast.success('Fuqaro o‘chirildi');
    },
    onError: (err: unknown) => {
      toast.error('O‘chirishda xatolik', { description: getErrorMessage(err) });
    },
  });

  const openCreateModal = () => {
    setFormData({});
    setTargetCitizen(null);
    setModalType('create');
  };

  const openEditModal = (citizen: Citizen) => {
    setTargetCitizen(citizen);
    setFormData({ ...citizen });
    setModalType('edit');
  };

  const openDeleteModal = (citizen: Citizen) => {
    setTargetCitizen(citizen);
    setModalType('delete');
  };

  const closeModal = () => {
    setModalType(null);
    setTargetCitizen(null);
    setFormData({});
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary mb-1">
            <Users className="h-3.5 w-3.5" />
            <span>Fuqarolar Ro&apos;yxati</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Fuqarolar Bazasi</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Arizachilar, jabrlanuvchilar va barcha aloqador shaxslar hisobi
          </p>
        </div>

        <Button size="sm" onClick={openCreateModal} className="gap-2 shadow-md shadow-primary/25">
          <Plus className="h-4 w-4" />
          Yangi Fuqaro Qo&apos;shish
        </Button>
      </div>

      {/* Filter and Search */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="relative max-w-lg lg:max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ism, familiya, pasport yoki telefon bo'yicha qidiruv..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Citizens Table */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fuqaro (F.I.O)</TableHead>
              <TableHead>Jinsi / T.Sana</TableHead>
              <TableHead>Pasport Seriya</TableHead>
              <TableHead>JShShIR (PINFL)</TableHead>
              <TableHead>Telefon Raqam</TableHead>
              <TableHead>Yashash Manzili</TableHead>
              <TableHead>Kartalar</TableHead>
              <TableHead className="text-right">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  Yuklanmoqda...
                </TableCell>
              </TableRow>
            ) : data?.items?.length ? (
              data.items.map((citizen: Citizen) => {
                const fullName =
                  [citizen.last_name, citizen.first_name, citizen.middle_name]
                    .filter(Boolean)
                    .join(' ') || '—';

                return (
                  <TableRow key={citizen.id}>
                    <TableCell className="font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs shrink-0">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <span>{fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="space-y-0.5">
                        {citizen.gender ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] py-0 px-1.5 font-semibold ${
                              citizen.gender === 'male'
                                ? 'border-blue-500/40 text-blue-500 bg-blue-500/5'
                                : 'border-pink-500/40 text-pink-500 bg-pink-500/5'
                            }`}
                          >
                            {citizen.gender === 'male' ? 'Erkak' : 'Ayol'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                        {citizen.birth_date && (
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {new Date(citizen.birth_date).toLocaleDateString('uz-UZ')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-primary">
                      {citizen.passport || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {citizen.pinfl || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {citizen.phone_number ? (
                        <span className="flex items-center gap-1 text-foreground">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {citizen.phone_number}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {citizen.district?.name ? `${citizen.district.name}, ` : ''}
                      {citizen.mahalla?.name ? `${citizen.mahalla.name}, ` : ''}
                      {citizen.address || '—'}
                    </TableCell>
                    <TableCell>
                      {citizen.cards?.length ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-primary/30 text-primary text-[11px]"
                        >
                          <CreditCard className="h-3 w-3" />
                          {citizen.cards.length} ta karta
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(citizen)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(citizen)}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  Hech qanday fuqaro topilmadi
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {data?.meta && (
          <PaginationBar
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            total={data.meta.total}
            limit={data.meta.limit}
            hasNextPage={data.meta.hasNextPage}
            hasPreviousPage={data.meta.hasPreviousPage}
            onPageChange={(p) => setPage(p)}
            isLoading={isLoading}
          />
        )}
      </Card>

      {/* CREATE / EDIT CITIZEN DIALOG */}
      <Dialog open={modalType === 'create' || modalType === 'edit'} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <User className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>
                  {modalType === 'create'
                    ? 'Yangi Fuqaro Qo‘shish'
                    : 'Fuqaro Ma‘lumotlarini Tahrirlash'}
                </DialogTitle>
                <DialogDescription>
                  Fuqaroning shaxsiy, pasport, aloqa va yashash ma‘lumotlarini kiriting
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* 1-Qator: Ism, Familiya, Sharif */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                1. Shaxsiy Rekvizitlar (F.I.SH)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Ism *</label>
                  <Input
                    placeholder="ISM"
                    value={formData.first_name || ''}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="h-10 text-xs sm:text-sm uppercase font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Familiya *</label>
                  <Input
                    placeholder="FAMILIYA"
                    value={formData.last_name || ''}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="h-10 text-xs sm:text-sm uppercase font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Sharif (Otasining ismi)
                  </label>
                  <Input
                    placeholder="SHARIF"
                    value={formData.middle_name || ''}
                    onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                    className="h-10 text-xs sm:text-sm uppercase font-medium"
                  />
                </div>
              </div>
            </div>

            {/* 2-Qator: Tug‘ilgan Sana, Jinsi, Telefon */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                2. Tug‘ilgan Sana, Jinsi & Aloqa
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Tug‘ilgan Sana</label>
                  <Input
                    type="date"
                    value={formData.birth_date ? String(formData.birth_date).substring(0, 10) : ''}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="h-10 text-xs sm:text-sm font-medium cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Jinsi</label>
                  <div className="grid grid-cols-2 gap-2 h-10">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          gender: formData.gender === 'male' ? undefined : 'male',
                        })
                      }
                      className={`h-full flex items-center justify-center gap-1.5 rounded-lg border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                        formData.gender === 'male'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-background hover:bg-muted text-foreground border-input'
                      }`}
                    >
                      <span>👨</span> Erkak
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          gender: formData.gender === 'female' ? undefined : 'female',
                        })
                      }
                      className={`h-full flex items-center justify-center gap-1.5 rounded-lg border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                        formData.gender === 'female'
                          ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                          : 'bg-background hover:bg-muted text-foreground border-input'
                      }`}
                    >
                      <span>👩</span> Ayol
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Telefon Raqam</label>
                  <Input
                    placeholder="998901234567"
                    maxLength={12}
                    value={formData.phone_number || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phone_number: e.target.value.replace(/\D/g, ''),
                      })
                    }
                    className="h-10 text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 3-Qator: Pasport va JSHSHIR */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                3. Identifikatsiya Hujjatlari
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Pasport Seriya va Raqam
                  </label>
                  <Input
                    placeholder="AC1234567"
                    maxLength={9}
                    value={formData.passport || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, passport: e.target.value.toUpperCase() })
                    }
                    className="h-10 text-xs sm:text-sm font-mono uppercase font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    JShShIR (PINFL - 14 ta raqam)
                  </label>
                  <Input
                    placeholder="31204951230045"
                    maxLength={14}
                    value={formData.pinfl || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, pinfl: e.target.value.replace(/\D/g, '') })
                    }
                    className="h-10 text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 4-Qator: Doimiy Yashash Manzili */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                4. Doimiy Yashash Manzili
              </span>
              <Input
                placeholder="Toshkent sh., Yunusobod t., 4-mavze 12-uy..."
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="h-10 text-xs sm:text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="default"
              onClick={closeModal}
              className="text-xs sm:text-sm h-10 px-5 cursor-pointer font-medium"
            >
              Bekor qilish
            </Button>
            <Button
              size="default"
              onClick={() =>
                modalType === 'create' ? createMutation.mutate() : updateMutation.mutate()
              }
              disabled={createMutation.isPending || updateMutation.isPending}
              className="text-xs sm:text-sm h-10 px-6 font-semibold shadow-md shadow-primary/25 cursor-pointer"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saqlanmoqda...'
                : 'Ma‘lumotlarni Saqlash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <Dialog open={modalType === 'delete'} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fuqaroni o‘chirish</DialogTitle>
            <DialogDescription>Ushbu fuqaroni bazadan o‘chirmoqchimisiz?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="default"
              onClick={closeModal}
              className="text-xs sm:text-sm h-10 px-4 cursor-pointer font-medium"
            >
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              size="default"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="text-xs sm:text-sm h-10 px-5 font-semibold cursor-pointer shadow-md shadow-red-500/20"
            >
              {deleteMutation.isPending ? 'O‘chirilmoqda...' : 'Ha, o‘chirish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
