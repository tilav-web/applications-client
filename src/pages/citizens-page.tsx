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
  const createMutation = useMutation({
    mutationFn: () => citizensApi.create(formData),
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
    mutationFn: () => citizensApi.update(targetCitizen!.id, formData),
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
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
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
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {modalType === 'create'
                ? 'Yangi Fuqaro Qo‘shish'
                : 'Fuqaro Ma‘lumotlarini Tahrirlash'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Fuqaroning shaxsiy va aloqa ma‘lumotlarini kiriting
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-medium text-foreground">Ism</label>
              <Input
                placeholder="Valijon"
                value={formData.first_name || ''}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Familiya</label>
              <Input
                placeholder="Aliyev"
                value={formData.last_name || ''}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Otasining ismi (Sharifi)</label>
              <Input
                placeholder="Karimovich"
                value={formData.middle_name || ''}
                onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Telefon Raqam</label>
              <Input
                placeholder="998901234567"
                maxLength={12}
                value={formData.phone_number || ''}
                onChange={(e) =>
                  setFormData({ ...formData, phone_number: e.target.value.replace(/\D/g, '') })
                }
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Pasport Seriya va Raqam</label>
              <Input
                placeholder="AC1234567"
                maxLength={9}
                value={formData.passport || ''}
                onChange={(e) =>
                  setFormData({ ...formData, passport: e.target.value.toUpperCase() })
                }
                className="h-9 text-xs font-mono uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">JShShIR (PINFL)</label>
              <Input
                placeholder="31204951230045"
                maxLength={14}
                value={formData.pinfl || ''}
                onChange={(e) =>
                  setFormData({ ...formData, pinfl: e.target.value.replace(/\D/g, '') })
                }
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="font-medium text-foreground">Doimiy Yashash Manzili</label>
              <Input
                placeholder="Toshkent sh., Yunusobod t., 4-mavze 12-uy"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closeModal} className="text-xs">
              Bekor qilish
            </Button>
            <Button
              size="sm"
              onClick={() =>
                modalType === 'create' ? createMutation.mutate() : updateMutation.mutate()
              }
              disabled={createMutation.isPending || updateMutation.isPending}
              className="text-xs shadow-md shadow-primary/25"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <Dialog open={modalType === 'delete'} onOpenChange={closeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fuqaroni o‘chirish</DialogTitle>
            <DialogDescription className="text-xs">
              Ushbu fuqaroni bazadan o‘chirmoqchimisiz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closeModal} className="text-xs">
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="text-xs"
            >
              {deleteMutation.isPending ? 'O‘chirilmoqda...' : 'Ha, o‘chirish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
