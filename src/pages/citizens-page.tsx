import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  Fingerprint,
  Hash,
  Phone,
  Plus,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DossierQuickDrawer } from '@/components/intelligence/dossier-quick-drawer';
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
import { FemaleIcon, MaleIcon } from '@/components/ui/gender-icons';
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
import { citizensApi, districtsApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { formatUzbekName } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Citizen } from '@/types/models';

export function CitizensPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Alohida aniq filtrlar (AND mantiqida ishlaydi)
  const [fullNameFilter, setFullNameFilter] = useState('');
  const debouncedFullName = useDebounce(fullNameFilter, 300);
  const [passportFilter, setPassportFilter] = useState('');
  const debouncedPassport = useDebounce(passportFilter, 300);
  const [pinflFilter, setPinflFilter] = useState('');
  const debouncedPinfl = useDebounce(pinflFilter, 300);
  const [phoneFilter, setPhoneFilter] = useState('');
  const debouncedPhone = useDebounce(phoneFilter, 300);
  const [cardFilter, setCardFilter] = useState('');
  const debouncedCard = useDebounce(cardFilter, 300);
  const [districtFilter, setDistrictFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [isExporting, setIsExporting] = useState(false);
  const [quickPreviewId, setQuickPreviewId] = useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const activeFiltersCount = [
    Boolean(fullNameFilter.trim()),
    Boolean(passportFilter.trim()),
    Boolean(pinflFilter.trim()),
    Boolean(phoneFilter.trim()),
    Boolean(cardFilter.trim()),
    Boolean(districtFilter),
    Boolean(genderFilter),
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    setFullNameFilter('');
    setPassportFilter('');
    setPinflFilter('');
    setPhoneFilter('');
    setCardFilter('');
    setDistrictFilter('');
    setGenderFilter('');
    setPage(1);
  };

  const { data: districtsData } = useQuery({
    queryKey: ['districts-all-citizens'],
    queryFn: () => districtsApi.getAll({ limit: 100 }),
  });
  const allDistricts = districtsData?.items || [];

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      toast.info('Fuqarolar hisoboti shakllantirilmoqda...');
      const blob = await citizensApi.exportExcel({
        full_name: debouncedFullName.trim() || undefined,
        passport: debouncedPassport.trim() || undefined,
        pinfl: debouncedPinfl.trim() || undefined,
        phone_number: debouncedPhone.trim() || undefined,
        card_number: debouncedCard.trim() || undefined,
        district_id: districtFilter || undefined,
        gender: genderFilter || undefined,
      });
      const url = window.URL.createObjectURL(
        new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `Fuqarolar_Bazasi_${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Fuqarolar ro‘yxati Excel faylga muvaffaqiyatli yuklab olindi');
    } catch (err) {
      toast.error(`Excel yuklab olishda xatolik: ${getErrorMessage(err)}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Dialog states
  const [modalType, setModalType] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [targetCitizen, setTargetCitizen] = useState<Citizen | null>(null);
  const [formData, setFormData] = useState<Partial<Citizen>>({});

  // 1. Fetch Citizens Query
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      'citizens',
      {
        page,
        limit,
        full_name: debouncedFullName,
        passport: debouncedPassport,
        pinfl: debouncedPinfl,
        phone_number: debouncedPhone,
        card_number: debouncedCard,
        district_id: districtFilter,
        gender: genderFilter,
      },
    ],
    queryFn: () =>
      citizensApi.getAll({
        page,
        limit,
        full_name: debouncedFullName.trim() || undefined,
        passport: debouncedPassport.trim() || undefined,
        pinfl: debouncedPinfl.trim() || undefined,
        phone_number: debouncedPhone.trim() || undefined,
        card_number: debouncedCard.trim() || undefined,
        district_id: districtFilter || undefined,
        gender: genderFilter || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const selection = useTableSelection(data?.items || []);

  const handleBulkDelete = async () => {
    if (selection.selectedIds.length === 0) return;
    try {
      setIsBulkDeleting(true);
      await Promise.all(selection.selectedIds.map((id) => citizensApi.delete(id)));
      await queryClient.invalidateQueries({ queryKey: ['citizens'] });
      toast.success(`${selection.selectedIds.length} ta fuqaro o‘chirildi`);
      selection.clearSelection();
      setIsBulkDeleteOpen(false);
    } catch (err) {
      toast.error('O‘chirishda xatolik', { description: getErrorMessage(err) });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // 2. Prefetch Next Page with React Query for instant transitions
  useEffect(() => {
    if (data?.meta?.hasNextPage) {
      queryClient.prefetchQuery({
        queryKey: [
          'citizens',
          {
            page: page + 1,
            limit,
            full_name: debouncedFullName,
            passport: debouncedPassport,
            pinfl: debouncedPinfl,
            phone_number: debouncedPhone,
            card_number: debouncedCard,
            district_id: districtFilter,
            gender: genderFilter,
          },
        ],
        queryFn: () =>
          citizensApi.getAll({
            page: page + 1,
            limit,
            full_name: debouncedFullName.trim() || undefined,
            passport: debouncedPassport.trim() || undefined,
            pinfl: debouncedPinfl.trim() || undefined,
            phone_number: debouncedPhone.trim() || undefined,
            card_number: debouncedCard.trim() || undefined,
            district_id: districtFilter || undefined,
            gender: genderFilter || undefined,
          }),
      });
    }
  }, [
    data,
    page,
    limit,
    debouncedFullName,
    debouncedPassport,
    debouncedPinfl,
    debouncedPhone,
    debouncedCard,
    districtFilter,
    genderFilter,
    queryClient,
  ]);

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
      selection.clearSelection();
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

        <Button
          size="sm"
          onClick={openCreateModal}
          className="gap-2 shadow-md shadow-primary/25 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Yangi Fuqaro Qo&apos;shish
        </Button>
      </div>

      {/* 1. ALOHIDA YUQORI FILTR VA AMALLAR PANELI */}
      <TableFilterPanel
        title="Fuqarolarni aniq filtrlash"
        activeFiltersCount={activeFiltersCount}
        onClearAll={handleClearFilters}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        onExportExcel={handleExportExcel}
        isExporting={isExporting}
        gridClassName="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
        selectionSlot={
          <TableActionSelect
            selectedCount={selection.selectedIds.length}
            singleLabel={
              selection.singleSelected
                ? [selection.singleSelected.last_name, selection.singleSelected.first_name]
                    .filter(Boolean)
                    .join(' ') || 'Fuqaro'
                : null
            }
            onClear={selection.clearSelection}
          >
            {selection.singleSelected ? (
              <>
                <DropdownMenuItem
                  onClick={() => navigate(`/citizens/${selection.singleSelected!.id}`)}
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
          label="Fuqaro F.I.SH"
          value={fullNameFilter}
          onChange={(v) => {
            setFullNameFilter(v);
            setPage(1);
          }}
          placeholder="Familiya yoki ism..."
          icon={<User className="h-3.5 w-3.5" />}
        />

        <FilterInput
          label="Pasport seriya & raqami"
          value={passportFilter}
          onChange={(v) => {
            setPassportFilter(v);
            setPage(1);
          }}
          placeholder="AA1234567..."
          icon={<Hash className="h-3.5 w-3.5" />}
          mono
        />

        <FilterInput
          label="JSHSHIR (PINFL)"
          value={pinflFilter}
          onChange={(v) => {
            setPinflFilter(v);
            setPage(1);
          }}
          placeholder="14 xonali raqam..."
          icon={<Fingerprint className="h-3.5 w-3.5" />}
          mono
        />

        <FilterInput
          label="Telefon raqami (aniq raqam)"
          value={phoneFilter}
          onChange={(v) => {
            setPhoneFilter(v);
            setPage(1);
          }}
          placeholder="90 123 45 67..."
          icon={<Phone className="h-3.5 w-3.5" />}
          mono
        />

        <FilterInput
          label="Karta raqami (aniq karta)"
          value={cardFilter}
          onChange={(v) => {
            setCardFilter(v);
            setPage(1);
          }}
          placeholder="8600 / 9860..."
          icon={<CreditCard className="h-3.5 w-3.5" />}
          mono
        />

        <FilterSelect
          label="Yashash tumani"
          value={districtFilter}
          onChange={(v) => {
            setDistrictFilter(v);
            setPage(1);
          }}
        >
          <option value="">Barcha tumanlar</option>
          {allDistricts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Jinsi"
          value={genderFilter}
          onChange={(v) => {
            setGenderFilter(v);
            setPage(1);
          }}
        >
          <option value="">Barchasi</option>
          <option value="male">Erkak</option>
          <option value="female">Ayol</option>
        </FilterSelect>
      </TableFilterPanel>

      {/* 2. ALOHIDA AJRATILGAN FUQAROLAR JADVALI */}
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
                    ariaLabel="Barcha fuqarolarni tanlash"
                  />
                </div>
              </TableHead>
              <TableHead>Fuqaro (F.I.O)</TableHead>
              <TableHead>Jinsi / T.Sana</TableHead>
              <TableHead>Pasport Seriya</TableHead>
              <TableHead>JShShIR (PINFL)</TableHead>
              <TableHead>Telefon Raqam</TableHead>
              <TableHead>Yashash Manzili</TableHead>
              <TableHead>Bogʻliqliklar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRowsSkeleton rows={8} columns={8} />
            ) : data?.items?.length ? (
              data.items.map((citizen: Citizen) => {
                const fullName =
                  [citizen.last_name, citizen.first_name, citizen.middle_name]
                    .filter(Boolean)
                    .join(' ') || '—';
                const selected = selection.isSelected(citizen.id);

                return (
                  <TableRow
                    key={citizen.id}
                    onClick={() => navigate(`/citizens/${citizen.id}`)}
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
                        selection.toggleOne(citizen.id);
                      }}
                    >
                      <div className="flex items-center justify-center">
                        <TableCheckbox
                          checked={selected}
                          onChange={() => selection.toggleOne(citizen.id)}
                          ariaLabel={`${fullName} ni tanlash`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs shrink-0">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <span className="group-hover:text-primary group-hover:underline">
                          {fullName}
                        </span>
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
                            {citizen.gender === 'male' ? (
                              <span className="flex items-center gap-1">
                                <MaleIcon className="h-3 w-3" /> Erkak
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <FemaleIcon className="h-3 w-3" /> Ayol
                              </span>
                            )}
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-foreground">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {citizen.phone_number}
                          </span>
                          {(citizen.phones?.length || 0) > 1 && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">
                              +{(citizen.phones?.length || 1) - 1}
                            </Badge>
                          )}
                        </div>
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
                      <div className="flex flex-wrap items-center gap-1">
                        {citizen.cards?.length ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-primary/30 text-primary text-[11px]"
                          >
                            <CreditCard className="h-3 w-3" />
                            {citizen.cards.length} karta
                          </Badge>
                        ) : null}
                        {citizen.applications?.length ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px]"
                          >
                            <FileText className="h-3 w-3" />
                            {citizen.applications.length} ariza
                          </Badge>
                        ) : null}
                        {!citizen.cards?.length && !citizen.applications?.length && (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </div>
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
                      <MaleIcon className="h-3.5 w-3.5" /> Erkak
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
                      <FemaleIcon className="h-3.5 w-3.5" /> Ayol
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
              loading={createMutation.isPending || updateMutation.isPending}
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
        title={`${selection.selectedIds.length} ta fuqaroni o‘chirish`}
        description="Tanlangan barcha fuqarolar yozuvini o‘chirishni tasdiqlaysizmi?"
        confirmText="Ha, o‘chirilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        isLoading={isBulkDeleting}
        onConfirm={handleBulkDelete}
      />

      <DossierQuickDrawer
        target={quickPreviewId ? { type: 'citizen', id: quickPreviewId } : null}
        onClose={() => setQuickPreviewId(null)}
      />
    </div>
  );
}
