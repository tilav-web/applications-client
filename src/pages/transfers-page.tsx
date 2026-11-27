import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  ArrowRight,
  CreditCard,
  Edit2,
  ExternalLink,
  FileText,
  Hash,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { TableRowsSkeleton } from '@/components/ui/page-skeletons';
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
import { FilterInput, FilterSelect, TableFilterPanel } from '@/components/ui/table-filter-panel';
import {
  TableActionSelect,
  TableCheckbox,
  useTableSelection,
} from '@/components/ui/table-selection-bar';
import { useDebounce } from '@/hooks/use-debounce';
import { usePermissions } from '@/hooks/use-permissions';
import { cardsApi, paymentProvidersApi, transfersApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { cn } from '@/lib/utils';
import type { Transfer, TransferDestinationType, TransferStatus } from '@/types/models';

export function TransfersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canWrite } = usePermissions();

  // Alohida aniq filtrlar (AND mantiqida birgalikda ishlaydi)
  const [txIdFilter, setTxIdFilter] = useState('');
  const debouncedTxId = useDebounce(txIdFilter, 300);
  const [senderCardFilter, setSenderCardFilter] = useState('');
  const debouncedSenderCard = useDebounce(senderCardFilter, 300);
  const [receiverCardFilter, setReceiverCardFilter] = useState('');
  const debouncedReceiverCard = useDebounce(receiverCardFilter, 300);
  const [providerFilter, setProviderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [isExporting, setIsExporting] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const activeFiltersCount = [
    Boolean(txIdFilter.trim()),
    Boolean(senderCardFilter.trim()),
    Boolean(receiverCardFilter.trim()),
    Boolean(providerFilter),
    Boolean(statusFilter),
    Boolean(dateFilter),
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    setTxIdFilter('');
    setSenderCardFilter('');
    setReceiverCardFilter('');
    setProviderFilter('');
    setStatusFilter('');
    setDateFilter('');
    setPage(1);
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      toast.info('To‘lov o‘tkazmalari hisoboti shakllantirilmoqda...');
      const blob = await transfersApi.exportExcel({
        transaction_id: debouncedTxId.trim() || undefined,
        sender_card_number: debouncedSenderCard.trim() || undefined,
        receiver_card_number: debouncedReceiverCard.trim() || undefined,
        payment_provider_id: providerFilter || undefined,
        status: statusFilter || undefined,
        transfer_date: dateFilter || undefined,
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
  const [formData, setFormData] = useState<
    Partial<Transfer> & { destination_platform?: string; destination_value?: string }
  >({});

  // 1. Fetch Transfers Query
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      'transfers',
      {
        page,
        limit,
        transaction_id: debouncedTxId,
        sender_card_number: debouncedSenderCard,
        receiver_card_number: debouncedReceiverCard,
        payment_provider_id: providerFilter,
        status: statusFilter,
        transfer_date: dateFilter,
      },
    ],
    queryFn: () =>
      transfersApi.getAll({
        page,
        limit,
        transaction_id: debouncedTxId.trim() || undefined,
        sender_card_number: debouncedSenderCard.trim() || undefined,
        receiver_card_number: debouncedReceiverCard.trim() || undefined,
        payment_provider_id: providerFilter || undefined,
        status: statusFilter || undefined,
        transfer_date: dateFilter || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const selection = useTableSelection(data?.items || []);

  const handleBulkDelete = async () => {
    if (selection.selectedIds.length === 0) return;
    try {
      setIsBulkDeleting(true);
      await Promise.all(selection.selectedIds.map((id) => transfersApi.delete(id)));
      await queryClient.invalidateQueries({ queryKey: ['transfers'] });
      toast.success(`${selection.selectedIds.length} ta o‘tkazma o‘chirildi`);
      selection.clearSelection();
      setIsBulkDeleteOpen(false);
    } catch (err) {
      toast.error('O‘chirishda xatolik', { description: getErrorMessage(err) });
    } finally {
      setIsBulkDeleting(false);
    }
  };

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
        queryKey: [
          'transfers',
          {
            page: page + 1,
            limit,
            transaction_id: debouncedTxId,
            sender_card_number: debouncedSenderCard,
            receiver_card_number: debouncedReceiverCard,
            payment_provider_id: providerFilter,
            status: statusFilter,
            transfer_date: dateFilter,
          },
        ],
        queryFn: () =>
          transfersApi.getAll({
            page: page + 1,
            limit,
            transaction_id: debouncedTxId.trim() || undefined,
            sender_card_number: debouncedSenderCard.trim() || undefined,
            receiver_card_number: debouncedReceiverCard.trim() || undefined,
            payment_provider_id: providerFilter || undefined,
            status: statusFilter || undefined,
            transfer_date: dateFilter || undefined,
          }),
      });
    }
  }, [
    data,
    page,
    limit,
    debouncedTxId,
    debouncedSenderCard,
    debouncedReceiverCard,
    providerFilter,
    statusFilter,
    dateFilter,
    queryClient,
  ]);

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
      selection.clearSelection();
      closeModal();
      toast.success('O‘tkazma o‘chirildi');
    },
    onError: (err: unknown) => {
      toast.error('O‘chirishda xatolik', { description: getErrorMessage(err) });
    },
  });

  const openCreateModal = () => {
    setFormData({ currency: 'UZS', status: 'KUTILMOQDA', destination_type: 'CARD' });
    setTargetTransfer(null);
    setModalType('create');
  };

  const openEditModal = (transfer: Transfer) => {
    setTargetTransfer(transfer);
    const details = (transfer.destination_details || {}) as Record<string, string | undefined>;
    setFormData({
      ...transfer,
      destination_type: transfer.destination_type || 'CARD',
      destination_platform: details.platform || transfer.receiver_identifier?.type_label || '',
      destination_value:
        details.value ||
        transfer.receiver_identifier?.raw_value ||
        transfer.destination_label ||
        '',
    });
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
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
          To&apos;lov O&apos;tkazmalari
        </h1>

        {canWrite && (
          <Button
            size="sm"
            onClick={openCreateModal}
            className="gap-2 shadow-md shadow-primary/25 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Yangi O&apos;tkazma Kiritish
          </Button>
        )}
      </div>

      {/* 1. ALOHIDA YUQORI FILTR VA AMALLAR PANELI */}
      <TableFilterPanel
        title="O‘tkazmalarni aniq filtrlash"
        activeFiltersCount={activeFiltersCount}
        onClearAll={handleClearFilters}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        onExportExcel={handleExportExcel}
        isExporting={isExporting}
        gridClassName="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
        selectionSlot={
          <TableActionSelect
            selectedCount={
              canWrite ? selection.selectedIds.length : selection.singleSelected ? 1 : 0
            }
            singleLabel={
              selection.singleSelected
                ? selection.singleSelected.transaction_id ||
                  `${Number(selection.singleSelected.amount || 0).toLocaleString()} ${selection.singleSelected.currency || 'UZS'}`
                : null
            }
            onClear={selection.clearSelection}
          >
            {selection.singleSelected ? (
              <>
                {selection.singleSelected.receiver_card_id && (
                  <DropdownMenuItem
                    onClick={() => navigate(`/cards/${selection.singleSelected!.receiver_card_id}`)}
                    className="gap-2 cursor-pointer text-xs py-2"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-rose-500" />
                    <span>Qabul qiluvchi karta 360°</span>
                  </DropdownMenuItem>
                )}

                {selection.singleSelected.sender_card_id && (
                  <DropdownMenuItem
                    onClick={() => navigate(`/cards/${selection.singleSelected!.sender_card_id}`)}
                    className="gap-2 cursor-pointer text-xs py-2"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                    <span>Jo‘natuvchi karta 360°</span>
                  </DropdownMenuItem>
                )}

                {selection.singleSelected.application_id && (
                  <DropdownMenuItem
                    onClick={() =>
                      navigate(`/applications/${selection.singleSelected!.application_id}`)
                    }
                    className="gap-2 cursor-pointer text-xs py-2"
                  >
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span>Arizani ochish</span>
                  </DropdownMenuItem>
                )}

                {canWrite && (
                  <>
                    <DropdownMenuItem
                      onClick={() => openEditModal(selection.singleSelected!)}
                      className="gap-2 cursor-pointer text-xs py-2"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                      <span>Tahrirlash</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => openDeleteModal(selection.singleSelected!)}
                      className="gap-2 cursor-pointer text-xs py-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>O‘chirish</span>
                    </DropdownMenuItem>
                  </>
                )}
              </>
            ) : canWrite ? (
              <DropdownMenuItem
                onClick={() => setIsBulkDeleteOpen(true)}
                className="gap-2 cursor-pointer text-xs py-2 text-destructive focus:text-destructive font-semibold"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Tanlanganlarni o‘chirish ({selection.selectedIds.length} ta)</span>
              </DropdownMenuItem>
            ) : null}
          </TableActionSelect>
        }
      >
        <FilterInput
          label="Tranzaksiya ID"
          value={txIdFilter}
          onChange={(v) => {
            setTxIdFilter(v);
            setPage(1);
          }}
          placeholder="Chek / Tranzaksiya ID..."
          icon={<Hash className="h-3.5 w-3.5" />}
          mono
        />

        <FilterInput
          label="Jo‘natuvchi karta (aniq karta)"
          value={senderCardFilter}
          onChange={(v) => {
            setSenderCardFilter(v);
            setPage(1);
          }}
          placeholder="8600 / 9860..."
          icon={<CreditCard className="h-3.5 w-3.5" />}
          mono
        />

        <FilterInput
          label="Qabul qiluvchi karta (aniq karta)"
          value={receiverCardFilter}
          onChange={(v) => {
            setReceiverCardFilter(v);
            setPage(1);
          }}
          placeholder="Dropper / Firibgar kartasi..."
          icon={<CreditCard className="h-3.5 w-3.5" />}
          mono
        />

        <FilterSelect
          label="To‘lov tizimi (Provayder)"
          value={providerFilter}
          onChange={(v) => {
            setProviderFilter(v);
            setPage(1);
          }}
        >
          <option value="">Barcha provayderlar</option>
          {(providersData?.items || []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="O‘tkazma holati"
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <option value="">Barcha holatlar</option>
          <option value="MUVAFFAQIYATLI">Muvaffaqiyatli</option>
          <option value="KUTILMOQDA">Kutilmoqda</option>
          <option value="BEKOR_QILINDI">Bekor qilingan</option>
        </FilterSelect>

        <FilterInput
          label="O‘tkazma sanasi"
          type="date"
          value={dateFilter}
          onChange={(v) => {
            setDateFilter(v);
            setPage(1);
          }}
          mono
        />
      </TableFilterPanel>

      {/* 2. ALOHIDA AJRATILGAN O'TKAZMALAR JADVALI */}
      <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-11 text-center sticky left-0 z-10 bg-muted/95 backdrop-blur-xs">
                <div className="flex items-center justify-center">
                  <TableCheckbox
                    checked={selection.allSelected}
                    indeterminate={selection.someSelected}
                    onChange={selection.toggleAll}
                    ariaLabel="Barcha o'tkazmalarni tanlash"
                  />
                </div>
              </TableHead>
              <TableHead>Tranzaksiya ID</TableHead>
              <TableHead>Summa & Valyuta</TableHead>
              <TableHead>Holati</TableHead>
              <TableHead>Yuboruvchi Karta</TableHead>
              <TableHead>Qabul Qiluvchi / Chiqish Kanali</TableHead>
              <TableHead>To&apos;lov Tizimi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRowsSkeleton rows={8} columns={7} />
            ) : data?.items?.length ? (
              data.items.map((transfer: Transfer) => {
                const selected = selection.isSelected(transfer.id);
                return (
                  <TableRow
                    key={transfer.id}
                    onClick={() => selection.toggleOne(transfer.id)}
                    className={cn(
                      'cursor-pointer transition-colors',
                      selected
                        ? 'bg-primary/[0.08] hover:bg-primary/[0.12]'
                        : 'hover:bg-primary/[0.04]',
                    )}
                  >
                    <TableCell
                      className={cn(
                        'w-11 text-center sticky left-0 z-10 backdrop-blur-xs',
                        selected ? 'bg-primary/[0.08]' : 'bg-card/95',
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        selection.toggleOne(transfer.id);
                      }}
                    >
                      <div className="flex items-center justify-center">
                        <TableCheckbox
                          checked={selected}
                          onChange={() => selection.toggleOne(transfer.id)}
                          ariaLabel="O'tkazmani tanlash"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-primary">
                      {transfer.transaction_id || '—'}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {transfer.amount != null
                        ? `${Number(transfer.amount).toLocaleString()} ${transfer.currency || 'UZS'}`
                        : '—'}
                    </TableCell>
                    <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                    <TableCell
                      className="font-mono text-xs"
                      onClick={(e) => transfer.sender_card_id && e.stopPropagation()}
                    >
                      {transfer.sender_card ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/cards/${transfer.sender_card_id}`)}
                          className="text-foreground hover:text-primary hover:underline cursor-pointer"
                        >
                          {transfer.sender_card.masked_number || transfer.sender_card.card_number}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell
                      className="font-mono text-xs"
                      onClick={(e) =>
                        (transfer.receiver_card_id || transfer.receiver_identifier_id) &&
                        e.stopPropagation()
                      }
                    >
                      {transfer.destination_type && transfer.destination_type !== 'CARD' ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-sans font-semibold',
                              transfer.destination_type === 'CRYPTO'
                                ? 'bg-violet-500/10 text-violet-600 border-violet-500/30'
                                : transfer.destination_type === 'CASH'
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                  : transfer.destination_type === 'PLATFORM'
                                    ? 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30'
                                    : 'bg-slate-500/10 text-slate-600 border-slate-500/30',
                            )}
                          >
                            {transfer.destination_type === 'CRYPTO'
                              ? 'Kripto'
                              : transfer.destination_type === 'CASH'
                                ? 'Naqd / ATM'
                                : transfer.destination_type === 'PLATFORM'
                                  ? 'Servis'
                                  : transfer.destination_type === 'BANK_ACCOUNT'
                                    ? 'Hisob raqam'
                                    : 'Boshqa'}
                          </Badge>
                          {transfer.receiver_identifier_id ? (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/dossier/identifier/${transfer.receiver_identifier_id}`)
                              }
                              className="text-foreground hover:text-primary hover:underline cursor-pointer truncate max-w-[200px]"
                              title={transfer.destination_label || ''}
                            >
                              {transfer.destination_label ||
                                transfer.receiver_identifier?.raw_value}
                            </button>
                          ) : (
                            <span
                              className="text-foreground truncate max-w-[200px]"
                              title={transfer.destination_label || ''}
                            >
                              {transfer.destination_label || '—'}
                            </span>
                          )}
                        </div>
                      ) : transfer.receiver_card ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/cards/${transfer.receiver_card_id}`)}
                          className="text-foreground hover:text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowRight className="h-3 w-3 text-red-400" />
                          {transfer.receiver_card.masked_number ||
                            transfer.receiver_card.card_number}
                        </button>
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
                  </TableRow>
                );
              })
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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Chiqish kanali (Qabul qiluvchi turi)
              </label>
              <select
                value={formData.destination_type || 'CARD'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    destination_type: e.target.value as TransferDestinationType,
                  })
                }
                className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-xs sm:text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="CARD">Plastik karta (Karta → Karta)</option>
                <option value="CRYPTO">Kripto-birja / Hamyon (Binance, Bybit, TRC-20...)</option>
                <option value="CASH">Naqdlashtirish (Bankomat / ATM / Kassa)</option>
                <option value="PLATFORM">
                  Onlayn servis / Akkaunt (TikTok, Telegram, 1xBet...)
                </option>
                <option value="BANK_ACCOUNT">Bank hisob raqami (20 talik)</option>
                <option value="OTHER">Boshqa chiqish yo‘li</option>
              </select>
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
                      {c.citizen?.full_name ? `(${c.citizen.full_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {(formData.destination_type || 'CARD') === 'CARD' ? (
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
                        {c.citizen?.full_name ? `(${c.citizen.full_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Birja / Platforma / Bankomat nomi
                  </label>
                  <Input
                    placeholder="Binance, TikTok, ATM #402..."
                    value={formData.destination_platform || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, destination_platform: e.target.value })
                    }
                    className="h-10 text-xs sm:text-sm"
                  />
                </div>
              )}
            </div>

            {(formData.destination_type || 'CARD') !== 'CARD' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  UID / Hamyon / Profil ID yoki ATM manzili *
                </label>
                <Input
                  placeholder="Masalan: UID 48291034, TX9aK..., @tiktok_user yoki ATM manzili"
                  value={formData.destination_value || ''}
                  onChange={(e) => setFormData({ ...formData, destination_value: e.target.value })}
                  className="h-10 text-xs sm:text-sm font-mono"
                />
              </div>
            )}

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
              loading={createMutation.isPending || updateMutation.isPending}
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

      <ConfirmDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title={`${selection.selectedIds.length} ta o‘tkazmani o‘chirish`}
        description="Tanlangan pul o‘tkazmalarini o‘chirishni tasdiqlaysizmi?"
        confirmText="Ha, o‘chirilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        isLoading={isBulkDeleting}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
