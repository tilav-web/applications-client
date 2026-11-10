import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CreditCard,
  Edit2,
  FileSpreadsheet,
  Loader2,
  Plus,
  Search,
  Trash2,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card as UICard, CardContent } from '@/components/ui/card';
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
import { banksApi, cardsApi, citizensApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { Card } from '@/types/models';

export function CardsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      toast.info('Plastik kartalar hisoboti shakllantirilmoqda...');
      const blob = await cardsApi.exportExcel({
        search: search.trim() || undefined,
      });
      const url = window.URL.createObjectURL(
        new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `Plastik_Kartalar_${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Plastik kartalar Excel faylga muvaffaqiyatli yuklab olindi');
    } catch (err) {
      toast.error(`Excel yuklab olishda xatolik: ${getErrorMessage(err)}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Dialog states
  const [modalType, setModalType] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [targetCard, setTargetCard] = useState<Card | null>(null);
  const [formData, setFormData] = useState<Partial<Card>>({});

  // 1. Fetch Cards Query
  const { data, isLoading } = useQuery({
    queryKey: ['cards', { page, limit, search }],
    queryFn: () => cardsApi.getAll({ page, limit, search }),
    placeholderData: (prev) => prev,
  });

  // Fetch Banks and Citizens for select dropdowns
  const { data: banksData } = useQuery({
    queryKey: ['banks', { limit: 100 }],
    queryFn: () => banksApi.getAll({ limit: 100 }),
  });

  const { data: citizensData } = useQuery({
    queryKey: ['citizens', { limit: 100 }],
    queryFn: () => citizensApi.getAll({ limit: 100 }),
  });

  // 2. Prefetch Next Page
  useEffect(() => {
    if (data?.meta?.hasNextPage) {
      queryClient.prefetchQuery({
        queryKey: ['cards', { page: page + 1, limit, search }],
        queryFn: () => cardsApi.getAll({ page: page + 1, limit, search }),
      });
    }
  }, [data, page, limit, search, queryClient]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => cardsApi.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      closeModal();
      toast.success('Karta muvaffaqiyatli saqlandi');
    },
    onError: (err: unknown) => {
      toast.error('Kartani saqlashda xatolik', { description: getErrorMessage(err) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => cardsApi.update(targetCard!.id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      closeModal();
      toast.success('Karta ma‘lumotlari yangilandi');
    },
    onError: (err: unknown) => {
      toast.error('Yangilashda xatolik', { description: getErrorMessage(err) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => cardsApi.delete(targetCard!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      closeModal();
      toast.success('Karta o‘chirildi');
    },
    onError: (err: unknown) => {
      toast.error('O‘chirishda xatolik', { description: getErrorMessage(err) });
    },
  });

  const openCreateModal = () => {
    setFormData({});
    setTargetCard(null);
    setModalType('create');
  };

  const openEditModal = (card: Card) => {
    setTargetCard(card);
    setFormData({ ...card });
    setModalType('edit');
  };

  const openDeleteModal = (card: Card) => {
    setTargetCard(card);
    setModalType('delete');
  };

  const closeModal = () => {
    setModalType(null);
    setTargetCard(null);
    setFormData({});
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary mb-1">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Bank Kartalari</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Plastik Kartalar Bazasi
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Arizalarda qayd etilgan jabrlanuvchi va gumonlanuvchilarning bank kartalari hisobi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="h-9 text-xs gap-1.5 font-medium border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 shrink-0 cursor-pointer shadow-2xs"
            title="Plastik kartalar ro'yxatini Excel (.xlsx) formatida yuklab olish"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="hidden sm:inline">Excel yuklab olish</span>
          </Button>

          <Button size="sm" onClick={openCreateModal} className="gap-2 shadow-md shadow-primary/25">
            <Plus className="h-4 w-4" />
            Yangi Karta Qo&apos;shish
          </Button>
        </div>
      </div>

      {/* Filter and Search */}
      <UICard className="border-border/80 bg-card/60 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="relative max-w-lg lg:max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Karta raqami bo'yicha qidiruv..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs font-mono"
            />
          </div>
        </CardContent>
      </UICard>

      {/* Cards Table */}
      <UICard className="border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Karta Raqami</TableHead>
              <TableHead>Niqoblangan Raqam</TableHead>
              <TableHead>Muddati</TableHead>
              <TableHead>Karta Egasi (Fuqaro)</TableHead>
              <TableHead>Emitent Bank</TableHead>
              <TableHead className="text-right">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Yuklanmoqda...
                </TableCell>
              </TableRow>
            ) : data?.items?.length ? (
              data.items.map((card: Card) => {
                const ownerName = card.citizen
                  ? [card.citizen.last_name, card.citizen.first_name].filter(Boolean).join(' ')
                  : 'Biriktirilmagan';

                return (
                  <TableRow key={card.id}>
                    <TableCell className="font-mono font-bold text-foreground">
                      {card.card_number || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-primary font-semibold">
                      {card.masked_number || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {card.expire_date || '—'}
                    </TableCell>
                    <TableCell>
                      {card.citizen ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <User className="h-3.5 w-3.5 text-primary" />
                          <span>{ownerName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {card.bank ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-primary/30 text-primary text-[11px]"
                        >
                          <Building2 className="h-3 w-3" />
                          {card.bank.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(card)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(card)}
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
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Hech qanday karta topilmadi
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
            limit={limit}
            hasNextPage={data.meta.hasNextPage}
            hasPreviousPage={data.meta.hasPreviousPage}
            onPageChange={(p) => setPage(p)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
            isLoading={isLoading}
          />
        )}
      </UICard>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={modalType === 'create' || modalType === 'edit'} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>
                  {modalType === 'create' ? 'Yangi Plastik Karta Qo‘shish' : 'Kartani Tahrirlash'}
                </DialogTitle>
                <DialogDescription>
                  Karta raqami, amal qilish muddati, bank va karta egasi fuqaroni belgilang
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Karta Raqami (16 talik) *
                </label>
                <Input
                  placeholder="8600 1234 5678 9012"
                  maxLength={19}
                  value={formData.card_number || ''}
                  onChange={(e) => setFormData({ ...formData, card_number: e.target.value })}
                  className="h-10 text-xs sm:text-sm font-mono font-bold tracking-wider"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Amal Qilish Muddati (MM/YY)
                </label>
                <Input
                  placeholder="12/28"
                  maxLength={5}
                  value={formData.expire_date || ''}
                  onChange={(e) => setFormData({ ...formData, expire_date: e.target.value })}
                  className="h-10 text-xs sm:text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Karta Egasi (Fuqaro)
                </label>
                <select
                  value={formData.citizen_id || ''}
                  onChange={(e) => setFormData({ ...formData, citizen_id: e.target.value || null })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-xs sm:text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Fuqaroni tanlang (ixtiyoriy)...</option>
                  {citizensData?.items?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {[c.last_name, c.first_name].filter(Boolean).join(' ')} (
                      {c.passport || 'Pasportsiz'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Emitent Bank</label>
                <select
                  value={formData.bank_id || ''}
                  onChange={(e) => setFormData({ ...formData, bank_id: e.target.value || null })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-xs sm:text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Bankni tanlang (ixtiyoriy)...</option>
                  {banksData?.items?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
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
                : 'Kartani Saqlash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={modalType === 'delete'} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kartani o‘chirish</DialogTitle>
            <DialogDescription>Ushbu kartani bazadan o‘chirmoqchimisiz?</DialogDescription>
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
