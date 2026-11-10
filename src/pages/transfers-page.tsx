import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  ArrowRight,
  CreditCard,
  Edit2,
  FileSpreadsheet,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
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
import { cardsApi, paymentProvidersApi, transfersApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { Transfer, TransferStatus } from '@/types/models';

export function TransfersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      toast.info('To‘lov o‘tkazmalari hisoboti shakllantirilmoqda...');
      const blob = await transfersApi.exportExcel({
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
      a.download = `Toluv_Otkazmalari_${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('To‘lov o‘tkazmalari Excel faylga muvaffaqiyatli yuklab olindi');
    } catch (err) {
      toast.error(`Excel yuklab olishda xatolik: ${getErrorMessage(err)}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Dialog states
  const [modalType, setModalType] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [targetTransfer, setTargetTransfer] = useState<Transfer | null>(null);
  const [formData, setFormData] = useState<Partial<Transfer>>({});

  // 1. Fetch Transfers Query
  const { data, isLoading } = useQuery({
    queryKey: ['transfers', { page, limit, search }],
    queryFn: () => transfersApi.getAll({ page, limit, search }),
    placeholderData: (prev) => prev,
  });

  // Fetch cards and providers for selectors
  const { data: cardsData } = useQuery({
    queryKey: ['cards', { limit: 100 }],
    queryFn: () => cardsApi.getAll({ limit: 100 }),
  });

  const { data: providersData } = useQuery({
    queryKey: ['payment-providers', { limit: 100 }],
    queryFn: () => paymentProvidersApi.getAll({ limit: 100 }),
  });

  // 2. Prefetch Next Page
  useEffect(() => {
    if (data?.meta?.hasNextPage) {
      queryClient.prefetchQuery({
        queryKey: ['transfers', { page: page + 1, limit, search }],
        queryFn: () => transfersApi.getAll({ page: page + 1, limit, search }),
      });
    }
  }, [data, page, limit, search, queryClient]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => transfersApi.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      closeModal();
      toast.success('O‘tkazma muvaffaqiyatli saqlandi');
    },
    onError: (err: unknown) => {
      toast.error('O‘tkazmani saqlashda xatolik', { description: getErrorMessage(err) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => transfersApi.update(targetTransfer!.id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      closeModal();
      toast.success('O‘tkazma yangilandi');
    },
    onError: (err: unknown) => {
      toast.error('Yangilashda xatolik', { description: getErrorMessage(err) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => transfersApi.delete(targetTransfer!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      closeModal();
      toast.success('O‘tkazma o‘chirildi');
    },
    onError: (err: unknown) => {
      toast.error('O‘chirishda xatolik', { description: getErrorMessage(err) });
    },
  });

  const openCreateModal = () => {
    setFormData({ currency: 'UZS', status: 'KUTILMOQDA' });
    setTargetTransfer(null);
    setModalType('create');
  };

  const openEditModal = (transfer: Transfer) => {
    setTargetTransfer(transfer);
    setFormData({ ...transfer });
    setModalType('edit');
  };

  const openDeleteModal = (transfer: Transfer) => {
    setTargetTransfer(transfer);
    setModalType('delete');
  };

  const closeModal = () => {
    setModalType(null);
    setTargetTransfer(null);
    setFormData({});
  };

  const getStatusBadge = (status: TransferStatus | null) => {
    switch (status) {
      case 'MUVAFFAQIYATLI':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            Muvaffaqiyatli
          </Badge>
        );
      case 'BEKOR_QILINDI':
        return (
          <Badge className="bg-red-500/10 text-red-400 border-red-500/30">Bekor qilingan</Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">Kutilmoqda</Badge>
        );
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary mb-1">
            <CreditCard className="h-3.5 w-3.5" />
            <span>To&apos;lovlar & Tranzaksiyalar</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            To&apos;lov O&apos;tkazmalari
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Arizalarda da&apos;vo qilingan yoki aniqlangan barcha moliyaviy o&apos;tkazmalar hisobi
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
            title="To‘lov o‘tkazmalarini Excel (.xlsx) formatida yuklab olish"
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
            Yangi O&apos;tkazma Kiritish
          </Button>
        </div>
      </div>

      {/* Filter and Search */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="relative max-w-lg lg:max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tranzaksiya ID bo'yicha qidiruv..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs font-mono"
            />
          </div>
        </CardContent>
      </Card>

      {/* Transfers Table */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tranzaksiya ID</TableHead>
              <TableHead>Summa & Valyuta</TableHead>
              <TableHead>Holati</TableHead>
              <TableHead>Yuboruvchi Karta</TableHead>
              <TableHead>Qabul Qiluvchi Karta</TableHead>
              <TableHead>To&apos;lov Tizimi</TableHead>
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
              data.items.map((transfer: Transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell className="font-mono font-bold text-primary">
                    {transfer.transaction_id || '—'}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {transfer.amount != null
                      ? `${Number(transfer.amount).toLocaleString()} ${transfer.currency || 'UZS'}`
                      : '—'}
                  </TableCell>
                  <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {transfer.sender_card ? (
                      <span className="text-foreground">
                        {transfer.sender_card.masked_number || transfer.sender_card.card_number}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {transfer.receiver_card ? (
                      <span className="text-foreground flex items-center gap-1">
                        <ArrowRight className="h-3 w-3 text-red-400" />
                        {transfer.receiver_card.masked_number || transfer.receiver_card.card_number}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {transfer.payment_provider ? (
                      <Badge
                        variant="outline"
                        className="border-primary/30 text-primary text-[11px]"
                      >
                        {transfer.payment_provider.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(transfer)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteModal(transfer)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Hech qanday o&apos;tkazma topilmadi
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
      </Card>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={modalType === 'create' || modalType === 'edit'} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>
                  {modalType === 'create'
                    ? 'Yangi To‘lov O‘tkazmasi Qo‘shish'
                    : 'O‘tkazmani Tahrirlash'}
                </DialogTitle>
                <DialogDescription>
                  Tranzaksiya ma‘lumotlari, summa, kartalar va provayderni kiriting
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Tranzaksiya ID (Kodi)
                </label>
                <Input
                  placeholder="TRX-9981248"
                  value={formData.transaction_id || ''}
                  onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                  className="h-10 text-xs sm:text-sm font-mono uppercase font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Holati</label>
                <select
                  value={formData.status || 'KUTILMOQDA'}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as TransferStatus })
                  }
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-xs sm:text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="KUTILMOQDA">KUTILMOQDA</option>
                  <option value="MUVAFFAQIYATLI">MUVAFFAQIYATLI</option>
                  <option value="BEKOR_QILINDI">BEKOR_QILINDI</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  O‘tkazma Miqdori (Summa) *
                </label>
                <Input
                  type="number"
                  placeholder="5000000"
                  value={formData.amount ?? ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="h-10 text-xs sm:text-sm font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Valyuta</label>
                <Input
                  placeholder="UZS"
                  value={formData.currency || 'UZS'}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="h-10 text-xs sm:text-sm font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Yuboruvchi Karta (Pul yechilgan)
                </label>
                <select
                  value={formData.sender_card_id || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, sender_card_id: e.target.value || null })
                  }
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-xs sm:text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Kartani tanlang (ixtiyoriy)...</option>
                  {cardsData?.items?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.masked_number || c.card_number}{' '}
                      {c.citizen ? `(${c.citizen.last_name || ''})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Qabul Qiluvchi Karta (Pul tushgan)
                </label>
                <select
                  value={formData.receiver_card_id || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, receiver_card_id: e.target.value || null })
                  }
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-xs sm:text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Kartani tanlang (ixtiyoriy)...</option>
                  {cardsData?.items?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.masked_number || c.card_number}{' '}
                      {c.citizen ? `(${c.citizen.last_name || ''})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">To‘lov Provayderi</label>
              <select
                value={formData.payment_provider_id || ''}
                onChange={(e) =>
                  setFormData({ ...formData, payment_provider_id: e.target.value || null })
                }
                className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-xs sm:text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Provayderni tanlang (ixtiyoriy)...</option>
                {providersData?.items?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
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
                : 'O‘tkazmani Saqlash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={modalType === 'delete'} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>O‘tkazmani o‘chirish</DialogTitle>
            <DialogDescription>Ushbu pul o‘tkazmasini bazadan o‘chirmoqchimisiz?</DialogDescription>
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
