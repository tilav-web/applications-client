import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Edit2,
  Eye,
  FileSpreadsheet,
  FileText,
  Hash,
  Link2,
  Loader2,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { CreateWordDialog } from '@/components/documents/create-word-dialog';
import { DocumentEditorModal } from '@/components/documents/document-editor-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
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
import {
  applicationsApi,
  applicationStatusesApi,
  crimesApi,
  districtsApi,
  documentsApi,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { cn } from '@/lib/utils';
import type { Application, ApplicationStatus, ApplicationStatusItem } from '@/types/models';

export function ApplicationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Alohida aniq maydonlar bo'yicha filtrlar (AND mantiqida birgalikda ishlaydi)
  const [districtFilter, setDistrictFilter] = useState<string>('');
  const [crimeFilter, setCrimeFilter] = useState<string>('');
  const [appNumberFilter, setAppNumberFilter] = useState<string>('');
  const debouncedAppNumber = useDebounce(appNumberFilter, 300);
  const [citizenNameFilter, setCitizenNameFilter] = useState<string>('');
  const debouncedCitizenName = useDebounce(citizenNameFilter, 300);
  const [cardNumberFilter, setCardNumberFilter] = useState<string>('');
  const debouncedCardNumber = useDebounce(cardNumberFilter, 300);
  const [phoneNumberFilter, setPhoneNumberFilter] = useState<string>('');
  const debouncedPhoneNumber = useDebounce(phoneNumberFilter, 300);
  const [descFilter, setDescFilter] = useState<string>('');
  const debouncedDesc = useDebounce(descFilter, 300);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [relationsFilter, setRelationsFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      toast.info('Excel hisoboti shakllantirilmoqda, iltimos kuting...');
      const blob = await applicationsApi.exportExcel({
        district_id: districtFilter || undefined,
        crime_id: crimeFilter || undefined,
        application_number: debouncedAppNumber.trim() || undefined,
        citizen_name: debouncedCitizenName.trim() || undefined,
        card_number: debouncedCardNumber.trim() || undefined,
        phone_number: debouncedPhoneNumber.trim() || undefined,
        description: debouncedDesc.trim() || undefined,
        status_id: statusFilter || undefined,
        relations_filter: relationsFilter || undefined,
        date: dateFilter || undefined,
      });

      const url = window.URL.createObjectURL(
        new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `Arizalar_Hisoboti_${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Excel hisoboti muvaffaqiyatli yuklab olindi');
    } catch (err) {
      toast.error(`Excel faylini yuklab olishda xatolik: ${getErrorMessage(err)}`);
    } finally {
      setIsExporting(false);
    }
  };

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // ONLYOFFICE modal boshqaruvi
  const [selectedAppForWord, setSelectedAppForWord] = useState<Application | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  // Word hujjatini yangi yaratishda nomini so'rash modal holati
  const [createWordForApp, setCreateWordForApp] = useState<Application | null>(null);
  const [isCreatingWord, setIsCreatingWord] = useState(false);

  const handleConfirmCreateWord = async (title: string) => {
    if (!createWordForApp) return;
    try {
      setIsCreatingWord(true);
      const newDoc = await documentsApi.createBlank(createWordForApp.id, title);
      toast.success('Yangi Word hujjati biriktirildi');
      await queryClient.invalidateQueries({ queryKey: ['applications'] });
      const targetApp = createWordForApp;
      setCreateWordForApp(null);
      setSelectedAppForWord(targetApp);
      setActiveDocId(newDoc.id);
    } catch (err) {
      toast.error(`Word hujjatini yaratishda xatolik: ${getErrorMessage(err)}`);
    } finally {
      setIsCreatingWord(false);
    }
  };

  // Statuses Query
  const { data: statusesData } = useQuery({
    queryKey: ['application-statuses-all'],
    queryFn: () => applicationStatusesApi.getAll({ limit: 100 }),
  });
  const allApplicationStatuses = statusesData?.items || [];

  // Districts Query (Tumanlar filtri uchun)
  const { data: districtsData } = useQuery({
    queryKey: ['districts-all'],
    queryFn: () => districtsApi.getAll({ limit: 100 }),
  });
  const allDistricts = districtsData?.items || [];

  // Crimes Query (Jinoyat turlari filtri uchun)
  const { data: crimesData } = useQuery({
    queryKey: ['crimes-all'],
    queryFn: () => crimesApi.getAll({ limit: 100 }),
  });
  const allCrimes = crimesData?.items || [];

  // Faol filtrlar soni va mavjudligi
  const activeFiltersCount = [
    Boolean(districtFilter),
    Boolean(crimeFilter),
    Boolean(appNumberFilter.trim()),
    Boolean(citizenNameFilter.trim()),
    Boolean(cardNumberFilter.trim()),
    Boolean(phoneNumberFilter.trim()),
    Boolean(descFilter.trim()),
    Boolean(statusFilter),
    Boolean(relationsFilter),
    Boolean(dateFilter),
  ].filter(Boolean).length;

  const handleClearAllFilters = () => {
    setDistrictFilter('');
    setCrimeFilter('');
    setAppNumberFilter('');
    setCitizenNameFilter('');
    setCardNumberFilter('');
    setPhoneNumberFilter('');
    setDescFilter('');
    setStatusFilter('');
    setRelationsFilter('');
    setDateFilter('');
    setPage(1);
  };

  // 1. Fetch Applications Query
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      'applications',
      {
        page,
        limit,
        status: statusFilter,
        district_id: districtFilter,
        crime_id: crimeFilter,
        application_number: debouncedAppNumber,
        citizen_name: debouncedCitizenName,
        card_number: debouncedCardNumber,
        phone_number: debouncedPhoneNumber,
        description: debouncedDesc,
        date: dateFilter,
        relations_filter: relationsFilter,
      },
    ],
    queryFn: () =>
      applicationsApi.getAll({
        page,
        limit,
        status: statusFilter || undefined,
        district_id: districtFilter || undefined,
        crime_id: crimeFilter || undefined,
        application_number: debouncedAppNumber.trim() || undefined,
        citizen_name: debouncedCitizenName.trim() || undefined,
        card_number: debouncedCardNumber.trim() || undefined,
        phone_number: debouncedPhoneNumber.trim() || undefined,
        description: debouncedDesc.trim() || undefined,
        date: dateFilter || undefined,
        relations_filter: relationsFilter || undefined,
      }),
    placeholderData: (prev) => prev,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // 2. React Query Prefetching: Keyingi sahifani oldindan yuklash (Prefetch)
  useEffect(() => {
    if (data?.meta?.hasNextPage) {
      const nextPage = page + 1;
      queryClient.prefetchQuery({
        queryKey: [
          'applications',
          {
            page: nextPage,
            limit,
            status: statusFilter,
            district_id: districtFilter,
            crime_id: crimeFilter,
            application_number: debouncedAppNumber,
            citizen_name: debouncedCitizenName,
            card_number: debouncedCardNumber,
            phone_number: debouncedPhoneNumber,
            description: debouncedDesc,
            date: dateFilter,
            relations_filter: relationsFilter,
          },
        ],
        queryFn: () =>
          applicationsApi.getAll({
            page: nextPage,
            limit,
            status: statusFilter || undefined,
            district_id: districtFilter || undefined,
            crime_id: crimeFilter || undefined,
            application_number: debouncedAppNumber.trim() || undefined,
            citizen_name: debouncedCitizenName.trim() || undefined,
            card_number: debouncedCardNumber.trim() || undefined,
            phone_number: debouncedPhoneNumber.trim() || undefined,
            description: debouncedDesc.trim() || undefined,
            date: dateFilter || undefined,
            relations_filter: relationsFilter || undefined,
          }),
      });
    }
  }, [
    data,
    page,
    limit,
    statusFilter,
    districtFilter,
    crimeFilter,
    debouncedAppNumber,
    debouncedCitizenName,
    debouncedCardNumber,
    debouncedPhoneNumber,
    debouncedDesc,
    dateFilter,
    relationsFilter,
    queryClient,
  ]);

  // 3. Ariza Yaratish UX Mantiqi:
  const selection = useTableSelection(data?.items || []);
  const [isExportingCyberControl, setIsExportingCyberControl] = useState(false);

  const handleExportCyberControl = async (ids: string[]) => {
    if (isExportingCyberControl) return;
    if (!ids.length) {
      toast.info('Avval jadvaldan kerakli arizalarni belgilang (checkbox)', {
        description: 'Faqat belgilangan arizalar CyberControl shablonida (.xlsx) yuklab olinadi.',
      });
      return;
    }
    const toastId = toast.loading(
      `CyberControl shabloni tayyorlanmoqda (${ids.length} ta murojaat)...`,
    );
    try {
      setIsExportingCyberControl(true);
      const blob = await applicationsApi.exportCyberControlExcel(ids);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `murojaat_shablon_${dateStr}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${ids.length} ta murojaat CyberControl shablonida (.xlsx) yuklab olindi`, {
        id: toastId,
      });
    } catch (err) {
      toast.error('CyberControl shablonini yuklab olishda xatolik', {
        id: toastId,
        description: getErrorMessage(err),
      });
    } finally {
      setIsExportingCyberControl(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selection.selectedIds.length === 0) return;
    try {
      setIsBulkDeleting(true);
      await Promise.all(selection.selectedIds.map((id) => applicationsApi.delete(id)));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['applications'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'], refetchType: 'all' }),
      ]);
      toast.success(`${selection.selectedIds.length} ta ariza o‘chirildi`);
      selection.clearSelection();
      setIsBulkDeleteOpen(false);
    } catch (err) {
      toast.error('O‘chirishda xatolik', { description: getErrorMessage(err) });
    } finally {
      setIsBulkDeleting(false);
    }
  };
  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return applicationsApi.delete(id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['applications'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'], refetchType: 'all' }),
      ]);
      setDeleteTargetId(null);
      selection.clearSelection();
      toast.success('Ariza muvaffaqiyatli o‘chirildi');
    },
    onError: (err: unknown) => {
      toast.error('Arizani o‘chirishda xatolik yuz berdi', {
        description: getErrorMessage(err),
      });
    },
  });

  const getStatusBadge = (
    status: ApplicationStatus | null,
    statusItem?: ApplicationStatusItem | null,
  ) => {
    const item =
      statusItem || allApplicationStatuses.find((s) => s.code === status || s.name === status);
    const label = item?.name || status || '—';
    const color = (item?.color || '').toLowerCase();

    if (color.includes('amber') || color.includes('yellow') || status === 'JARAYONDA') {
      return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">{label}</Badge>;
    }
    if (color.includes('emerald') || color.includes('green') || status === 'HAL_QILINDI') {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">{label}</Badge>
      );
    }
    if (color.includes('red') || color.includes('rose') || status === 'RAD_ETILDI') {
      return <Badge className="bg-red-500/10 text-red-400 border-red-500/30">{label}</Badge>;
    }
    if (color.includes('purple')) {
      return (
        <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30">{label}</Badge>
      );
    }

    return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">{label}</Badge>;
  };

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary mb-1">
            <FileText className="h-3.5 w-3.5" />
            <span>Murojaatlar Boshqaruvi</span>
            {isFetching && !isLoading && (
              <span className="flex items-center gap-1 text-[10px] text-primary animate-pulse ml-1.5 font-normal">
                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                Yangilanmoqda...
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Arizalar & Murojaatlar
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kelib tushgan fuqarolar arizalari, firibgarlik holatlari va biriktirilgan ma‘lumotlar
          </p>
        </div>

        {/* ARIZA YARATISH TUGMASI */}
        <Button
          onClick={() => navigate('/applications/create')}
          className="gap-2 shadow-md shadow-primary/25 self-start sm:self-auto cursor-pointer font-medium min-w-[145px]"
        >
          <Plus className="h-4 w-4" />
          <span>Ariza Yaratish</span>
        </Button>
      </div>

      {/* 1. ALOHIDA YUQORI FILTR VA AMALLAR PANELI */}
      <TableFilterPanel
        title="Arizalarni aniq filtrlash"
        activeFiltersCount={activeFiltersCount}
        onClearAll={handleClearAllFilters}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        onExportExcel={handleExportExcel}
        isExporting={isExporting}
        gridClassName="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
        rightExtraSlot={
          <Button
            type="button"
            variant={selection.selectedIds.length > 0 ? 'default' : 'outline'}
            size="sm"
            disabled={isExportingCyberControl}
            onClick={() => handleExportCyberControl(selection.selectedIds)}
            className={cn(
              'h-8 text-xs gap-1.5 font-semibold cursor-pointer transition-all',
              selection.selectedIds.length > 0
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/25'
                : 'border-indigo-500/35 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10',
            )}
            title={
              selection.selectedIds.length > 0
                ? `Tanlangan ${selection.selectedIds.length} ta arizani CyberControl shablonida (.xlsx) yuklab olish`
                : 'Jadvaldan arizalarni belgilab, CyberControl shablonida (.xlsx) yuklab oling'
            }
          >
            {isExportingCyberControl ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5" />
            )}
            <span>
              CyberControl shablon
              {selection.selectedIds.length > 0 ? ` (${selection.selectedIds.length} ta)` : ''}
            </span>
          </Button>
        }
        selectionSlot={
          <TableActionSelect
            selectedCount={selection.selectedIds.length}
            singleLabel={
              selection.singleSelected
                ? `№ ${selection.singleSelected.application_number || 'Raqamsiz'}`
                : null
            }
            onClear={selection.clearSelection}
          >
            {selection.singleSelected ? (
              <>
                <DropdownMenuItem
                  onClick={() => navigate(`/applications/${selection.singleSelected!.id}`)}
                  className="gap-2 cursor-pointer text-xs py-2"
                >
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span>Arizani ko‘rish</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() =>
                    navigate(`/applications/${selection.singleSelected!.id}/relations`)
                  }
                  className="gap-2 cursor-pointer text-xs py-2"
                >
                  <Link2 className="h-3.5 w-3.5 text-amber-500" />
                  <span>
                    Bog‘liqliklar
                    {selection.singleSelected.relations_summary?.total
                      ? ` (${selection.singleSelected.relations_summary.total})`
                      : ''}
                  </span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => navigate(`/applications/edit/${selection.singleSelected!.id}`)}
                  className="gap-2 cursor-pointer text-xs py-2"
                >
                  <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                  <span>Tahrirlash</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  disabled={isExportingCyberControl}
                  onClick={() => handleExportCyberControl([selection.singleSelected!.id])}
                  className="gap-2 cursor-pointer text-xs py-2 font-semibold text-emerald-600 dark:text-emerald-400"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>CyberControl shablonida yuklash (.xlsx)</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {selection.singleSelected.documents?.map((doc) => (
                  <DropdownMenuItem
                    key={doc.id}
                    onClick={() => {
                      setSelectedAppForWord(selection.singleSelected);
                      setActiveDocId(doc.id);
                    }}
                    className="gap-2 cursor-pointer text-xs py-1.5"
                  >
                    <FileText className="h-3.5 w-3.5 text-[#185abd] shrink-0" />
                    <span className="truncate">Word: {doc.title || doc.file_name}</span>
                  </DropdownMenuItem>
                ))}

                <DropdownMenuItem
                  onClick={() => setCreateWordForApp(selection.singleSelected)}
                  className="gap-2 cursor-pointer text-xs py-2 font-medium text-[#185abd] dark:text-blue-400"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Yangi Word hujjat yaratish...</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => setDeleteTargetId(selection.singleSelected!.id)}
                  className="gap-2 cursor-pointer text-xs py-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Arizani o‘chirish</span>
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem
                  disabled={isExportingCyberControl}
                  onClick={() => handleExportCyberControl(selection.selectedIds)}
                  className="gap-2 cursor-pointer text-xs py-2 font-semibold text-emerald-600 dark:text-emerald-400"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>CyberControl shablonida yuklash ({selection.selectedIds.length} ta)</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => setIsBulkDeleteOpen(true)}
                  className="gap-2 cursor-pointer text-xs py-2 text-destructive focus:text-destructive font-semibold"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Tanlanganlarni o‘chirish ({selection.selectedIds.length} ta)</span>
                </DropdownMenuItem>
              </>
            )}
          </TableActionSelect>
        }
      >
        <FilterInput
          label="Ariza raqami (№)"
          value={appNumberFilter}
          onChange={(v) => {
            setAppNumberFilter(v);
            setPage(1);
          }}
          placeholder="Masalan: M0110224..."
          icon={<Hash className="h-3.5 w-3.5" />}
          mono
        />

        <FilterInput
          label="Arizachi F.I.SH"
          value={citizenNameFilter}
          onChange={(v) => {
            setCitizenNameFilter(v);
            setPage(1);
          }}
          placeholder="Familiya yoki ism..."
          icon={<User className="h-3.5 w-3.5" />}
        />

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
          label="Telefon raqami (aniq raqam)"
          value={phoneNumberFilter}
          onChange={(v) => {
            setPhoneNumberFilter(v);
            setPage(1);
          }}
          placeholder="90 123 45 67..."
          icon={<Phone className="h-3.5 w-3.5" />}
          mono
        />

        <FilterInput
          label="Tafsilot / Xodim qaydi"
          value={descFilter}
          onChange={(v) => {
            setDescFilter(v);
            setPage(1);
          }}
          placeholder="Murojaat matni bo'yicha..."
          icon={<FileText className="h-3.5 w-3.5" />}
        />

        <FilterSelect
          label="Hudud (Tuman)"
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
          label="Jinoyat turi"
          value={crimeFilter}
          onChange={(v) => {
            setCrimeFilter(v);
            setPage(1);
          }}
        >
          <option value="">Barcha jinoyat turlari</option>
          {allCrimes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.article || c.title}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Holati (Status)"
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <option value="">Barcha holatlar</option>
          {allApplicationStatuses.length > 0 ? (
            allApplicationStatuses.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))
          ) : (
            <>
              <option value="YANGI">Yangi</option>
              <option value="JARAYONDA">Jarayonda</option>
              <option value="HAL_QILINDI">Hal qilindi</option>
              <option value="RAD_ETILDI">Rad etildi</option>
            </>
          )}
        </FilterSelect>

        <FilterSelect
          label="Bog‘liqliklar"
          value={relationsFilter}
          onChange={(v) => {
            setRelationsFilter(v);
            setPage(1);
          }}
        >
          <option value="">Barchasi</option>
          <option value="with_relations">Bog‘liqligi bor (1+)</option>
          <option value="fraud_card">Firibgar kartasi takrorlangan</option>
        </FilterSelect>

        <FilterInput
          label="Sana"
          type="date"
          value={dateFilter}
          onChange={(v) => {
            setDateFilter(v);
            setPage(1);
          }}
          mono
        />
      </TableFilterPanel>

      {/* 2. ALOHIDA AJRATILGAN ARIZALAR JADVALI */}
      <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/40">
              <TableHead className="w-11 h-10 px-3 text-center sticky left-0 z-10 bg-muted/95 backdrop-blur-xs">
                <div className="flex items-center justify-center">
                  <TableCheckbox
                    checked={selection.allSelected}
                    indeterminate={selection.someSelected}
                    onChange={selection.toggleAll}
                    ariaLabel="Barcha arizalarni tanlash"
                  />
                </div>
              </TableHead>
              <TableHead className="w-[145px] h-10 px-3 text-[11px] whitespace-nowrap">
                Hudud & Jinoyat Turi
              </TableHead>
              <TableHead className="w-[145px] h-10 px-3 text-[11px] whitespace-nowrap">
                Ariza Raqami
              </TableHead>
              <TableHead className="min-w-[200px] h-10 px-3 text-[11px] whitespace-nowrap">
                Tafsilot & Xodim Qaydlari
              </TableHead>
              <TableHead className="w-[135px] h-10 px-3 text-[11px] whitespace-nowrap">
                Holati
              </TableHead>
              <TableHead className="w-[155px] h-10 px-3 text-[11px] whitespace-nowrap">
                Asosiy Arizachi
              </TableHead>
              <TableHead className="w-[125px] h-10 px-3 text-[11px] whitespace-nowrap">
                Bog‘liqliklar
              </TableHead>
              <TableHead className="w-[125px] h-10 px-3 text-[11px] whitespace-nowrap">
                Sana
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {isLoading ? (
              <TableRowsSkeleton rows={8} columns={8} />
            ) : data?.items?.length ? (
              data.items.map((app: Application) => {
                const selected = selection.isSelected(app.id);
                return (
                  <TableRow
                    key={app.id}
                    className={cn(
                      'cursor-pointer transition-colors border-b border-border',
                      selected ? 'bg-primary/[0.08] hover:bg-primary/[0.12]' : 'hover:bg-muted/40',
                    )}
                    onClick={() => navigate(`/applications/${app.id}`)}
                  >
                    <TableCell
                      className={cn(
                        'w-11 text-center sticky left-0 z-10 backdrop-blur-xs',
                        selected ? 'bg-primary/[0.08]' : 'bg-card/95',
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        selection.toggleOne(app.id);
                      }}
                    >
                      <div className="flex items-center justify-center">
                        <TableCheckbox
                          checked={selected}
                          onChange={() => selection.toggleOne(app.id)}
                          ariaLabel={`Ariza ${app.application_number || ''} ni tanlash`}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        {app.district && (
                          <div className="font-medium text-foreground">{app.district.name}</div>
                        )}
                        {app.crime && (
                          <span className="text-[11px] font-semibold text-primary block truncate max-w-[160px]">
                            {app.crime.article || app.crime.title}
                          </span>
                        )}
                        {!app.district && !app.crime && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-primary">
                          {app.application_number || '—'}
                        </span>
                        {app.documents && app.documents.length > 0 && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#185abd]/10 text-[#185abd] dark:text-blue-400 text-[10px] font-bold"
                            title={`${app.documents.length} ta Word hujjati biriktirilgan`}
                          >
                            W·{app.documents.length}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="font-semibold text-foreground truncate">
                        {app.description || 'Tafsilot kiritilmagan'}
                      </p>
                      {app.officer_notes && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          Xodim: {app.officer_notes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(app.status, app.application_status)}</TableCell>
                    <TableCell>
                      {app.citizen ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <User className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="font-medium truncate max-w-[150px]">
                            {app.citizen.last_name} {app.citizen.first_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {app.relations_summary && app.relations_summary.total > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/applications/${app.id}/relations`)}
                          className={`h-7 px-2.5 text-[11px] font-semibold gap-1.5 rounded-full cursor-pointer transition-all ${
                            app.relations_summary.has_fraud_card_link
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/20 shadow-2xs animate-pulse'
                              : app.relations_summary.cards > 0
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 shadow-2xs'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 shadow-2xs'
                          }`}
                          title={`Bog'liqliklarni ko'rish: ${app.relations_summary.cards} ta karta, ${app.relations_summary.citizens} ta fuqaro`}
                        >
                          <Link2 className="h-3 w-3 shrink-0" />
                          <span>{app.relations_summary.total} ta bog‘liqlik</span>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs pl-2">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {app.date ? new Date(app.date).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  Hech qanday ariza topilmadi
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

      {/* BULK DELETE CONFIRMATION */}
      <ConfirmDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title={`${selection.selectedIds.length} ta arizani o‘chirish`}
        description="Tanlangan barcha arizalarni o‘chirishni tasdiqlaysizmi?"
        confirmText="Ha, barchasini o‘chirish"
        cancelText="Bekor qilish"
        variant="destructive"
        isLoading={isBulkDeleting}
        onConfirm={handleBulkDelete}
      />

      {/* DELETE CONFIRMATION DIALOG (SHADCN ALERT DIALOG) */}
      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Arizani o‘chirish"
        description="Ushbu arizani butunlay o‘chirib tashlamoqchimisiz? Ushbu amal qaytarilmaydi."
        confirmText="Ha, o‘chirilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMutation.mutate(deleteTargetId, {
              onSettled: () => setDeleteTargetId(null),
            });
          }
        }}
      />

      {/* WORD HUJJATI NOMINI SO'RASH DIALOGI */}
      <CreateWordDialog
        isOpen={!!createWordForApp}
        applicationNumber={createWordForApp?.application_number}
        isLoading={isCreatingWord}
        onClose={() => setCreateWordForApp(null)}
        onSubmit={(title) => handleConfirmCreateWord(title)}
      />

      {/* ONLYOFFICE DOCUMENT EDITOR MODAL */}
      {selectedAppForWord && activeDocId && (
        <DocumentEditorModal
          documentId={activeDocId}
          application={selectedAppForWord}
          isOpen={!!activeDocId}
          onClose={() => {
            setActiveDocId(null);
            setSelectedAppForWord(null);
            queryClient.invalidateQueries({ queryKey: ['applications'] });
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
          }}
        />
      )}
    </div>
  );
}
