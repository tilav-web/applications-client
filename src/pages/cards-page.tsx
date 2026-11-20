import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Calendar,
  Copy,
  CreditCard,
  Edit2,
  ExternalLink,
  Eye,
  Phone,
  Plus,
  Trash2,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DossierQuickDrawer } from '@/components/intelligence/dossier-quick-drawer';
import { LiveRadarBadge } from '@/components/intelligence/live-radar-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card as UICard } from '@/components/ui/card';
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
import { banksApi, cardsApi, citizensApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { cn } from '@/lib/utils';
import type { Card } from '@/types/models';

export function CardsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Alohida aniq filtrlar (AND mantiqida ishlaydi)
  const [cardNumberFilter, setCardNumberFilter] = useState('');
  const debouncedCardNumber = useDebounce(cardNumberFilter, 300);
  const [ownerNameFilter, setOwnerNameFilter] = useState('');
  const debouncedOwnerName = useDebounce(ownerNameFilter, 300);
  const [phoneFilter, setPhoneFilter] = useState('');
  const debouncedPhone = useDebounce(phoneFilter, 300);
  const [expireFilter, setExpireFilter] = useState('');
  const debouncedExpire = useDebounce(expireFilter, 300);
  const [bankFilter, setBankFilter] = useState('');
  const [ownerStateFilter, setOwnerStateFilter] = useState('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [isExporting, setIsExporting] = useState(false);
  const [quickPreviewId, setQuickPreviewId] = useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const activeFiltersCount = [
    Boolean(cardNumberFilter.trim()),
    Boolean(ownerNameFilter.trim()),
    Boolean(phoneFilter.trim()),
    Boolean(expireFilter.trim()),
    Boolean(bankFilter),
    Boolean(ownerStateFilter),
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    setCardNumberFilter('');
    setOwnerNameFilter('');
    setPhoneFilter('');
    setExpireFilter('');
    setBankFilter('');
    setOwnerStateFilter('');
    setPage(1);
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      toast.info('Plastik kartalar hisoboti shakllantirilmoqda...');
      const blob = await cardsApi.exportExcel({
        card_number: debouncedCardNumber.trim() || undefined,
        owner_name: debouncedOwnerName.trim() || undefined,
        phone_number: debouncedPhone.trim() || undefined,
        expire_date: debouncedExpire.trim() || undefined,
        bank_id: bankFilter || undefined,
        owner_state: ownerStateFilter || undefined,
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
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      'cards',
      {
        page,
        limit,
        card_number: debouncedCardNumber,
        owner_name: debouncedOwnerName,
        phone_number: debouncedPhone,
        expire_date: debouncedExpire,
        bank_id: bankFilter,
        owner_state: ownerStateFilter,
      },
    ],
    queryFn: () =>
      cardsApi.getAll({
        page,
        limit,
        card_number: debouncedCardNumber.trim() || undefined,
        owner_name: debouncedOwnerName.trim() || undefined,
        phone_number: debouncedPhone.trim() || undefined,
        expire_date: debouncedExpire.trim() || undefined,
        bank_id: bankFilter || undefined,
        owner_state: ownerStateFilter || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const selection = useTableSelection(data?.items || []);

  const handleBulkDelete = async () => {
    if (selection.selectedIds.length === 0) return;
    try {
      setIsBulkDeleting(true);
      await Promise.all(selection.selectedIds.map((id) => cardsApi.delete(id)));
      await queryClient.invalidateQueries({ queryKey: ['cards'] });
      toast.success(`${selection.selectedIds.length} ta karta o‘chirildi`);
      selection.clearSelection();
      setIsBulkDeleteOpen(false);
    } catch (err) {
      toast.error('O‘chirishda xatolik', { description: getErrorMessage(err) });
    } finally {
      setIsBulkDeleting(false);
    }
  };

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
        queryKey: [
          'cards',
          {
            page: page + 1,
            limit,
            card_number: debouncedCardNumber,
            owner_name: debouncedOwnerName,
            phone_number: debouncedPhone,
            expire_date: debouncedExpire,
            bank_id: bankFilter,
            owner_state: ownerStateFilter,
          },
        ],
        queryFn: () =>
          cardsApi.getAll({
            page: page + 1,
            limit,
            card_number: debouncedCardNumber.trim() || undefined,
            owner_name: debouncedOwnerName.trim() || undefined,
            phone_number: debouncedPhone.trim() || undefined,
            expire_date: debouncedExpire.trim() || undefined,
            bank_id: bankFilter || undefined,
            owner_state: ownerStateFilter || undefined,
          }),
      });
    }
  }, [
    data,
    page,
    limit,
    debouncedCardNumber,
    debouncedOwnerName,
    debouncedPhone,
    debouncedExpire,
    bankFilter,
    ownerStateFilter,
    queryClient,
  ]);

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
      selection.clearSelection();
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

        <Button
          size="sm"
          onClick={openCreateModal}
          className="gap-2 shadow-md shadow-primary/25 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Yangi Karta Qo&apos;shish
        </Button>
      </div>

      {/* 1. ALOHIDA YUQORI FILTR VA AMALLAR PANELI */}
      <TableFilterPanel
        title="Kartalarni aniq filtrlash"
        activeFiltersCount={activeFiltersCount}
        onClearAll={handleClearFilters}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        onExportExcel={handleExportExcel}
        isExporting={isExporting}
        gridClassName="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
        selectionSlot={
          <TableActionSelect
            selectedCount={selection.selectedIds.length}
            singleLabel={
              selection.singleSelected
                ? selection.singleSelected.card_number ||
                  selection.singleSelected.masked_number ||
                  'Karta'
                : null
            }
            onClear={selection.clearSelection}
          >
            {selection.singleSelected ? (
              <>
                <DropdownMenuItem
                  onClick={() => navigate(`/cards/${selection.singleSelected!.id}`)}
                  className="gap-2 cursor-pointer text-xs py-2"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-primary" />
                  <span>360° Dosyeni ochish</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setQuickPreviewId(selection.singleSelected!.id)}
                  className="gap-2 cursor-pointer text-xs py-2"
                >
                  <Eye className="h-3.5 w-3.5 text-amber-500" />
                  <span>Tezkor ko‘rish</span>
                </DropdownMenuItem>

                {selection.singleSelected.card_number && (
                  <DropdownMenuItem
                    onClick={() => {
                      navigator.clipboard.writeText(selection.singleSelected!.card_number!);
                      toast.success('Karta raqami nusxalandi');
                    }}
                    className="gap-2 cursor-pointer text-xs py-2"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Raqamdan nusxa olish</span>
                  </DropdownMenuItem>
                )}

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
            ) : (
              <DropdownMenuItem
                onClick={() => setIsBulkDeleteOpen(true)}
                className="gap-2 cursor-pointer text-xs py-2 text-destructive focus:text-destructive font-semibold"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Tanlanganlarni o‘chirish ({selection.selectedIds.length} ta)</span>
              </DropdownMenuItem>
            )}
          </TableActionSelect>
        }
      >
        <FilterInput
          label="Karta raqami (aniq karta)"
          value={cardNumberFilter}
          onChange={(v) => {
            setCardNumberFilter(v);
            setPage(1);
          }}
          placeholder="8600 / 9860 / oxirgi 4..."
          icon={<CreditCard className="h-3.5 w-3.5" />}
          mono
        />

        <FilterInput
          label="Karta egasi F.I.SH"
          value={ownerNameFilter}
          onChange={(v) => {
            setOwnerNameFilter(v);
            setPage(1);
          }}
          placeholder="Familiya yoki ism..."
          icon={<User className="h-3.5 w-3.5" />}
        />

        <FilterInput
          label="Egasi telefon raqami"
          value={phoneFilter}
          onChange={(v) => {
            setPhoneFilter(v);
            setPage(1);
          }}
          placeholder="90 123 45 67..."
          icon={<Phone className="h-3.5 w-3.5" />}
          mono
        />

        <FilterSelect
          label="Emitent Bank"
          value={bankFilter}
          onChange={(v) => {
            setBankFilter(v);
            setPage(1);
          }}
        >
          <option value="">Barcha banklar</option>
          {(banksData?.items || []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </FilterSelect>

        <FilterInput
          label="Muddati (MM/YY)"
          value={expireFilter}
          onChange={(v) => {
            setExpireFilter(v);
            setPage(1);
          }}
          placeholder="Masalan: 08/28"
          icon={<Calendar className="h-3.5 w-3.5" />}
          mono
        />

        <FilterSelect
          label="Shaxsga biriktirilganlik"
          value={ownerStateFilter}
          onChange={(v) => {
            setOwnerStateFilter(v);
            setPage(1);
          }}
        >
          <option value="">Barchasi</option>
          <option value="attached">Fuqaroga biriktirilgan</option>
          <option value="unattached">Biriktirilmagan</option>
        </FilterSelect>
      </TableFilterPanel>

      {/* 2. ALOHIDA AJRATILGAN KARTALAR JADVALI */}
      <UICard className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-11 text-center sticky left-0 z-10 bg-muted/95 backdrop-blur-xs">
                <div className="flex items-center justify-center">
                  <TableCheckbox
                    checked={selection.allSelected}
                    indeterminate={selection.someSelected}
                    onChange={selection.toggleAll}
                    ariaLabel="Barcha kartalarni tanlash"
                  />
                </div>
              </TableHead>
              <TableHead>Karta Raqami</TableHead>
              <TableHead>Niqoblangan Raqam</TableHead>
              <TableHead>Muddati</TableHead>
              <TableHead>Karta Egasi (Fuqaro)</TableHead>
              <TableHead>Emitent Bank</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRowsSkeleton rows={8} columns={6} />
            ) : data?.items?.length ? (
              data.items.map((card: Card) => {
                const ownerName = card.citizen
                  ? [card.citizen.last_name, card.citizen.first_name].filter(Boolean).join(' ')
                  : 'Biriktirilmagan';
                const selected = selection.isSelected(card.id);

                return (
                  <TableRow
                    key={card.id}
                    onClick={() => navigate(`/cards/${card.id}`)}
                    className={cn(
                      'cursor-pointer transition-colors group',
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
                        selection.toggleOne(card.id);
                      }}
                    >
                      <div className="flex items-center justify-center">
                        <TableCheckbox
                          checked={selected}
                          onChange={() => selection.toggleOne(card.id)}
                          ariaLabel={`Karta ${card.card_number || ''} ni tanlash`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-foreground group-hover:text-primary group-hover:underline">
                      {card.card_number || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-primary font-semibold">
                      {card.masked_number || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {card.expire_date || '—'}
                    </TableCell>
                    <TableCell onClick={(e) => card.citizen && e.stopPropagation()}>
                      {card.citizen ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/citizens/${card.citizen!.id}`)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
                        >
                          <User className="h-3.5 w-3.5" />
                          <span>{ownerName}</span>
                        </button>
                      ) : card.full_name ? (
                        <span className="text-xs text-foreground">{card.full_name}</span>
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Karta Raqami (16 talik) *
                  </label>
                  {formData.card_number && (
                    <LiveRadarBadge type="card_number" value={formData.card_number} />
                  )}
                </div>
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
              loading={createMutation.isPending || updateMutation.isPending}
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
              disabled={deleteMutation.isPending}
              className="text-xs sm:text-sm h-10 px-4 cursor-pointer font-medium"
            >
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              size="default"
              onClick={() => deleteMutation.mutate()}
              loading={deleteMutation.isPending}
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
        title={`${selection.selectedIds.length} ta kartani o‘chirish`}
        description="Tanlangan barcha plastik kartalarni o‘chirishni tasdiqlaysizmi?"
        confirmText="Ha, o‘chirilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        isLoading={isBulkDeleting}
        onConfirm={handleBulkDelete}
      />

      <DossierQuickDrawer
        target={quickPreviewId ? { type: 'card', id: quickPreviewId } : null}
        onClose={() => setQuickPreviewId(null)}
      />
    </div>
  );
}
