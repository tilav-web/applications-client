import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Download,
  Edit2,
  Eye,
  FileSpreadsheet,
  FileText,
  Hash,
  Link2,
  Loader2,
  Palette,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  formatRowColorTooltip,
  getRowColorMeta,
  ROW_COLOR_OPTIONS,
} from '@/components/applications/row-color-config';
import {
  RowColorFloatingMenu,
  RowColorSwatchRow,
} from '@/components/applications/row-color-picker';
import { SlaBadge } from '@/components/applications/sla-components';
import { CreateWordDialog } from '@/components/documents/create-word-dialog';
import { DocumentEditorModal } from '@/components/documents/document-editor-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DistrictSearchSelect } from '@/components/ui/district-search-select';
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
import { useApplicationsRealtime } from '@/hooks/use-applications-realtime';
import { useDebounce } from '@/hooks/use-debounce';
import { usePermissions } from '@/hooks/use-permissions';
import {
  applicationsApi,
  applicationStatusesApi,
  awarenessStatusesApi,
  crimesApi,
  districtsApi,
  documentsApi,
  externalSystemsApi,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store';
import type {
  Application,
  ApplicationRowColor,
  ApplicationStatus,
  ApplicationStatusItem,
  PaginatedResponse,
} from '@/types/models';

export function ApplicationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { canWrite } = usePermissions();
  const currentUser = useAuthStore((s) => s.user);
  const currentActorName =
    [currentUser?.profile?.last_name, currentUser?.profile?.first_name]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    currentUser?.username ||
    null;

  const [slaFilter, setSlaFilter] = useState<string>(() => searchParams.get('sla_filter') || '');

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
  const [repeatTypeFilter, setRepeatTypeFilter] = useState<string>('');
  const [appealTypeFilter, setAppealTypeFilter] = useState<string>('');
  const [awarenessStatusFilter, setAwarenessStatusFilter] = useState<string>('');
  const [externalSystemFilter, setExternalSystemFilter] = useState<string>('');
  const [externalSystemStatusFilter, setExternalSystemStatusFilter] = useState<
    'not_entered' | 'entered'
  >('not_entered');
  const [rowColorFilter, setRowColorFilter] = useState<string>('');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [minAmountFilter, setMinAmountFilter] = useState<string>('');
  const debouncedMinAmount = useDebounce(minAmountFilter, 350);
  const [maxAmountFilter, setMaxAmountFilter] = useState<string>('');
  const debouncedMaxAmount = useDebounce(maxAmountFilter, 350);

  const parseAmountParam = (val: string): number | undefined => {
    const clean = val.replace(/\D/g, '');
    if (!clean) return undefined;
    const num = Number(clean);
    return Number.isFinite(num) ? num : undefined;
  };

  const getApplicationTotalLoss = (
    app: Application,
  ): { total: number; currency: string; nonCardCount: number; nonCardTotal: number } => {
    const seen = new Set<string>();
    let total = 0;
    let currency = 'UZS';
    let nonCardCount = 0;
    let nonCardTotal = 0;
    if (app.transfer) {
      if (app.transfer.id) seen.add(app.transfer.id);
      total += Number(app.transfer.amount || 0);
      if (app.transfer.currency) currency = app.transfer.currency;
    }
    if (Array.isArray(app.custom_fields)) {
      for (const cf of app.custom_fields) {
        if (cf.transfer && (!cf.transfer.id || !seen.has(cf.transfer.id))) {
          if (cf.transfer.id) seen.add(cf.transfer.id);
          total += Number(cf.transfer.amount || 0);
          if (cf.transfer.currency) currency = cf.transfer.currency;
        }
      }
    }
    if (Array.isArray(app.damages)) {
      for (const dmg of app.damages) {
        const amt = Number(dmg.amount || 0);
        if (amt > 0) {
          nonCardCount++;
          nonCardTotal += amt;
          total += amt;
          if (dmg.currency && currency === 'UZS') currency = dmg.currency;
        }
      }
    }
    return { total, currency, nonCardCount, nonCardTotal };
  };

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const excelImportInputRef = useRef<HTMLInputElement | null>(null);

  const handleDownloadImportTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      const blob = await applicationsApi.downloadImportTemplate();
      const url = window.URL.createObjectURL(
        new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `Arizalar_Import_Shabloni_${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel import shabloni yuklab olindi');
    } catch (err) {
      toast.error('Shablonni yuklab olishda xatolik', {
        description: getErrorMessage(err),
      });
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleImportExcelFile = async (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Faqat .xlsx (Excel) formatidagi faylni yuklang');
      if (excelImportInputRef.current) excelImportInputRef.current.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fayl hajmi 10 MB dan oshmasligi kerak');
      if (excelImportInputRef.current) excelImportInputRef.current.value = '';
      return;
    }

    const toastId = toast.loading('Excel fayli tekshirilmoqda va bazaga yuklanmoqda...');
    try {
      setIsImportingExcel(true);
      const result = await applicationsApi.commitExcelImport(file, { skipErrors: true });

      if (result.errorReportBase64 && result.errorReportFileName) {
        const binary = window.atob(result.errorReportBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const errUrl = window.URL.createObjectURL(
          new Blob([bytes], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }),
        );
        const a = document.createElement('a');
        a.href = errUrl;
        a.download = result.errorReportFileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(errUrl);
      }

      if (result.createdCount > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['applications'], refetchType: 'all' }),
          queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'], refetchType: 'all' }),
          queryClient.invalidateQueries({ queryKey: ['citizens'], refetchType: 'all' }),
          queryClient.invalidateQueries({ queryKey: ['cards'], refetchType: 'all' }),
          queryClient.invalidateQueries({ queryKey: ['transfers'], refetchType: 'all' }),
        ]);
      }

      const parts: string[] = [];
      if (result.createdCount > 0) parts.push(`${result.createdCount} ta qo'shildi`);
      if (result.skippedDuplicateCount > 0)
        parts.push(`${result.skippedDuplicateCount} ta dublikat o'tkazildi`);
      if (result.failedCount > 0) parts.push(`${result.failedCount} ta xatoli`);

      if (result.failedCount > 0) {
        toast.warning(`Import yakunlandi: ${parts.join(', ')}`, {
          id: toastId,
          description:
            'Bazaga yozilmay qolgan xatoli qatorlar qizil fon bilan belgilangan Excel faylida yuklab olindi. Tuzatib qayta yuklashingiz mumkin.',
          duration: 8000,
        });
      } else if (result.createdCount > 0) {
        toast.success(`Import muvaffaqiyatli: ${parts.join(', ')}`, { id: toastId });
      } else {
        toast.info(
          result.totalRows === 0
            ? 'Excel faylida yuklash uchun yangi qatorlar topilmadi'
            : `Yangi ariza qo'shilmadi (${parts.join(', ')})`,
          { id: toastId },
        );
      }
    } catch (err) {
      toast.error('Excel import qilishda xatolik', {
        id: toastId,
        description: getErrorMessage(err),
      });
    } finally {
      setIsImportingExcel(false);
      if (excelImportInputRef.current) {
        excelImportInputRef.current.value = '';
      }
    }
  };

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
        repeat_type: repeatTypeFilter || undefined,
        appeal_type: appealTypeFilter || undefined,
        awareness_status_id: awarenessStatusFilter || undefined,
        external_system_id: externalSystemFilter || undefined,
        external_system_status: externalSystemFilter ? externalSystemStatusFilter : undefined,
        row_color: rowColorFilter || undefined,
        date_from: dateFromFilter || undefined,
        date_to: dateToFilter || undefined,
        min_amount: parseAmountParam(debouncedMinAmount),
        max_amount: parseAmountParam(debouncedMaxAmount),
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
  const [colorMenu, setColorMenu] = useState<{
    app: Application;
    x: number;
    y: number;
  } | null>(null);

  const { isConnected, onlineUsers, recentlyUpdatedIds } = useApplicationsRealtime({
    activeRowColorFilter: rowColorFilter,
  });

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
    queryFn: () => districtsApi.getAll({ limit: 500 }),
  });
  const allDistricts = districtsData?.items || [];

  // Crimes Query (Jinoyat turlari filtri uchun)
  const { data: crimesData } = useQuery({
    queryKey: ['crimes-all'],
    queryFn: () => crimesApi.getAll({ limit: 100 }),
  });
  const allCrimes = crimesData?.items || [];

  // Awareness Statuses Query (Targ'ibot holati filtri uchun)
  const { data: awarenessStatusesData } = useQuery({
    queryKey: ['awareness-statuses-active'],
    queryFn: () => awarenessStatusesApi.getAll(),
  });
  const allAwarenessStatuses = awarenessStatusesData || [];

  // External Systems Query (Tashqi tizimlar filtri uchun: CardBlock, E-Elektron, ...)
  const { data: externalSystemsData } = useQuery({
    queryKey: ['external-systems-active'],
    queryFn: () => externalSystemsApi.getAll(),
  });
  const allExternalSystems = externalSystemsData || [];

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
    Boolean(repeatTypeFilter),
    Boolean(appealTypeFilter),
    Boolean(awarenessStatusFilter),
    Boolean(externalSystemFilter),
    Boolean(rowColorFilter),
    Boolean(dateFromFilter),
    Boolean(dateToFilter),
    Boolean(minAmountFilter.trim()),
    Boolean(maxAmountFilter.trim()),
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
    setRepeatTypeFilter('');
    setAppealTypeFilter('');
    setAwarenessStatusFilter('');
    setExternalSystemFilter('');
    setExternalSystemStatusFilter('not_entered');
    setRowColorFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setMinAmountFilter('');
    setMaxAmountFilter('');
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
        date_from: dateFromFilter,
        date_to: dateToFilter,
        min_amount: debouncedMinAmount,
        max_amount: debouncedMaxAmount,
        relations_filter: relationsFilter,
        sla_filter: slaFilter,
        repeat_type: repeatTypeFilter,
        appeal_type: appealTypeFilter,
        awareness_status_id: awarenessStatusFilter,
        external_system_id: externalSystemFilter,
        external_system_status: externalSystemFilter ? externalSystemStatusFilter : '',
        row_color: rowColorFilter,
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
        date_from: dateFromFilter || undefined,
        date_to: dateToFilter || undefined,
        min_amount: parseAmountParam(debouncedMinAmount),
        max_amount: parseAmountParam(debouncedMaxAmount),
        relations_filter: relationsFilter || undefined,
        sla_filter: slaFilter || undefined,
        repeat_type: repeatTypeFilter || undefined,
        appeal_type: appealTypeFilter || undefined,
        awareness_status_id: awarenessStatusFilter || undefined,
        external_system_id: externalSystemFilter || undefined,
        external_system_status: externalSystemFilter ? externalSystemStatusFilter : undefined,
        row_color: rowColorFilter || undefined,
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
            date_from: dateFromFilter,
            date_to: dateToFilter,
            min_amount: debouncedMinAmount,
            max_amount: debouncedMaxAmount,
            relations_filter: relationsFilter,
            sla_filter: slaFilter,
            repeat_type: repeatTypeFilter,
            appeal_type: appealTypeFilter,
            awareness_status_id: awarenessStatusFilter,
            external_system_id: externalSystemFilter,
            external_system_status: externalSystemFilter ? externalSystemStatusFilter : '',
            row_color: rowColorFilter,
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
            date_from: dateFromFilter || undefined,
            date_to: dateToFilter || undefined,
            min_amount: parseAmountParam(debouncedMinAmount),
            max_amount: parseAmountParam(debouncedMaxAmount),
            relations_filter: relationsFilter || undefined,
            sla_filter: slaFilter || undefined,
            repeat_type: repeatTypeFilter || undefined,
            appeal_type: appealTypeFilter || undefined,
            awareness_status_id: awarenessStatusFilter || undefined,
            external_system_id: externalSystemFilter || undefined,
            external_system_status: externalSystemFilter ? externalSystemStatusFilter : undefined,
            row_color: rowColorFilter || undefined,
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
    dateFromFilter,
    dateToFilter,
    debouncedMinAmount,
    debouncedMaxAmount,
    relationsFilter,
    slaFilter,
    repeatTypeFilter,
    appealTypeFilter,
    awarenessStatusFilter,
    externalSystemFilter,
    externalSystemStatusFilter,
    rowColorFilter,
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

  // Qator fon rangini tezkor o'zgartirish (optimistik + SSE sinxronlash)
  const rowColorMutation = useMutation({
    mutationFn: ({ id, row_color }: { id: string; row_color: ApplicationRowColor | null }) =>
      applicationsApi.updateRowColor(id, row_color),
    onMutate: async ({ id, row_color }) => {
      await queryClient.cancelQueries({ queryKey: ['applications'] });
      const previous = queryClient.getQueriesData<PaginatedResponse<Application>>({
        queryKey: ['applications'],
      });
      const optimisticTime = row_color ? new Date().toISOString() : null;
      const optimisticBy = row_color ? currentActorName : null;
      queryClient.setQueriesData<PaginatedResponse<Application>>(
        { queryKey: ['applications'] },
        (old) => {
          if (!old || !Array.isArray(old.items)) return old;
          return {
            ...old,
            items: old.items.map((app) =>
              app.id === id
                ? {
                    ...app,
                    row_color,
                    row_color_by: optimisticBy,
                    row_color_updated_at: optimisticTime,
                  }
                : app,
            ),
          };
        },
      );
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        for (const [key, value] of context.previous) {
          queryClient.setQueryData(key, value);
        }
      }
      toast.error('Qator rangini saqlashda xatolik', {
        description: getErrorMessage(err),
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueriesData<PaginatedResponse<Application>>(
        { queryKey: ['applications'] },
        (old) => {
          if (!old || !Array.isArray(old.items)) return old;
          return {
            ...old,
            items: old.items.map((app) =>
              app.id === updated.id
                ? {
                    ...app,
                    row_color: updated.row_color,
                    row_color_by: updated.row_color_by,
                    row_color_updated_at: updated.row_color_updated_at,
                  }
                : app,
            ),
          };
        },
      );
      if (rowColorFilter) {
        void queryClient.invalidateQueries({ queryKey: ['applications'] });
      }
    },
  });

  // Bir nechta tanlangan arizalarning rangini birdan o'zgartirish
  const bulkRowColorMutation = useMutation({
    mutationFn: ({ ids, row_color }: { ids: string[]; row_color: ApplicationRowColor | null }) =>
      applicationsApi.bulkUpdateRowColor(ids, row_color),
    onMutate: async ({ ids, row_color }) => {
      await queryClient.cancelQueries({ queryKey: ['applications'] });
      const previous = queryClient.getQueriesData<PaginatedResponse<Application>>({
        queryKey: ['applications'],
      });
      const idSet = new Set(ids);
      const optimisticTime = row_color ? new Date().toISOString() : null;
      const optimisticBy = row_color ? currentActorName : null;
      queryClient.setQueriesData<PaginatedResponse<Application>>(
        { queryKey: ['applications'] },
        (old) => {
          if (!old || !Array.isArray(old.items)) return old;
          return {
            ...old,
            items: old.items.map((app) =>
              idSet.has(app.id)
                ? {
                    ...app,
                    row_color,
                    row_color_by: optimisticBy,
                    row_color_updated_at: optimisticTime,
                  }
                : app,
            ),
          };
        },
      );
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        for (const [key, value] of context.previous) {
          queryClient.setQueryData(key, value);
        }
      }
      toast.error('Tanlangan arizalar rangini saqlashda xatolik', {
        description: getErrorMessage(err),
      });
    },
    onSuccess: (res, vars) => {
      const map = new Map(res.items.map((i) => [i.id, i]));
      queryClient.setQueriesData<PaginatedResponse<Application>>(
        { queryKey: ['applications'] },
        (old) => {
          if (!old || !Array.isArray(old.items)) return old;
          return {
            ...old,
            items: old.items.map((app) => {
              const patch = map.get(app.id);
              return patch
                ? {
                    ...app,
                    row_color: patch.row_color,
                    row_color_by: patch.row_color_by,
                    row_color_updated_at: patch.row_color_updated_at,
                  }
                : app;
            }),
          };
        },
      );
      selection.clearSelection();
      if (rowColorFilter) {
        void queryClient.invalidateQueries({ queryKey: ['applications'] });
      }
      const meta = getRowColorMeta(vars.row_color);
      toast.success(
        meta
          ? `${res.updatedCount} ta ariza "${meta.label}" rangga belgilandi`
          : `${res.updatedCount} ta arizadan rang olib tashlandi`,
      );
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
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
              <FileText className="h-3.5 w-3.5" />
              <span>Murojaatlar Boshqaruvi</span>
              {isFetching && !isLoading && (
                <span className="flex items-center gap-1 text-[10px] text-primary animate-pulse ml-1.5 font-normal">
                  <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                  Yangilanmoqda...
                </span>
              )}
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                isConnected
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
              )}
              title={
                isConnected
                  ? 'Real-vaqt sinxronlash faol: qator ranglari barcha online hodimlarda bir zumda yangilanadi'
                  : 'Real-vaqt ulanish qayta tiklanmoqda...'
              }
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500',
                )}
              />
              <span>
                {isConnected ? `Jonli · ${Math.max(1, onlineUsers)} online` : 'Ulanmoqda...'}
              </span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Arizalar & Murojaatlar
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kelib tushgan fuqarolar arizalari, firibgarlik holatlari va biriktirilgan ma‘lumotlar
          </p>
        </div>

        {/* SHABLON, IMPORT VA ARIZA YARATISH TUGMALARI */}
        {canWrite && (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <input
              ref={excelImportInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => void handleImportExcelFile(e.target.files?.[0] || null)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isDownloadingTemplate}
              onClick={handleDownloadImportTemplate}
              className="gap-2 border-blue-500/40 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 cursor-pointer font-medium"
              title="Dropdownlar va enum yo'riqnomasi bilan tayyor Excel shablonini yuklab olish"
            >
              {isDownloadingTemplate ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Shablon</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isImportingExcel}
              onClick={() => excelImportInputRef.current?.click()}
              className="gap-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer font-medium"
              title="To'ldirilgan Excel (.xlsx) faylini bazaga yuklash"
            >
              {isImportingExcel ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>Import</span>
            </Button>
            <Button
              onClick={() => navigate('/applications/create')}
              className="gap-2 shadow-md shadow-primary/25 cursor-pointer font-medium min-w-[145px]"
            >
              <Plus className="h-4 w-4" />
              <span>Ariza Yaratish</span>
            </Button>
          </div>
        )}
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
                    Firibgar bog‘liqliklari
                    {(selection.singleSelected.relations_summary?.total || 0) +
                      (selection.singleSelected.relations_summary?.detected_crimes_count || 0) >
                    0
                      ? ` (${
                          (selection.singleSelected.relations_summary?.total || 0) +
                          (selection.singleSelected.relations_summary?.detected_crimes_count || 0)
                        })`
                      : ''}
                  </span>
                </DropdownMenuItem>

                {canWrite && (
                  <DropdownMenuItem
                    onClick={() => navigate(`/applications/edit/${selection.singleSelected!.id}`)}
                    className="gap-2 cursor-pointer text-xs py-2"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                    <span>Tahrirlash</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  disabled={isExportingCyberControl}
                  onClick={() => handleExportCyberControl([selection.singleSelected!.id])}
                  className="gap-2 cursor-pointer text-xs py-2 font-semibold text-emerald-600 dark:text-emerald-400"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>CyberControl shablonida yuklash (.xlsx)</span>
                </DropdownMenuItem>

                {(Boolean(selection.singleSelected.documents?.length) || canWrite) && (
                  <DropdownMenuSeparator />
                )}

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

                {canWrite && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setCreateWordForApp(selection.singleSelected)}
                      className="gap-2 cursor-pointer text-xs py-2 font-medium text-[#185abd] dark:text-blue-400"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Yangi Word hujjat yaratish...</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <div className="px-2 py-1.5 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <Palette className="h-3 w-3 text-primary" />
                        <span>Qator rangi</span>
                      </div>
                      <RowColorSwatchRow
                        size="sm"
                        activeColor={selection.singleSelected.row_color}
                        disabled={rowColorMutation.isPending}
                        onSelect={(color) => {
                          rowColorMutation.mutate({
                            id: selection.singleSelected!.id,
                            row_color: color,
                          });
                          selection.clearSelection();
                        }}
                      />
                    </div>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => setDeleteTargetId(selection.singleSelected!.id)}
                      className="gap-2 cursor-pointer text-xs py-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Arizani o‘chirish</span>
                    </DropdownMenuItem>
                  </>
                )}
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

                {canWrite && (
                  <>
                    <DropdownMenuSeparator />

                    <div className="px-2 py-1.5 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <Palette className="h-3 w-3 text-primary" />
                        <span>Rang berish ({selection.selectedIds.length} ta)</span>
                      </div>
                      <RowColorSwatchRow
                        size="sm"
                        showClearWhenUnset
                        disabled={bulkRowColorMutation.isPending}
                        onSelect={(color) =>
                          bulkRowColorMutation.mutate({
                            ids: selection.selectedIds,
                            row_color: color,
                          })
                        }
                      />
                    </div>

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

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground block">
            Hudud (Tuman)
          </label>
          <DistrictSearchSelect
            districts={allDistricts}
            value={districtFilter}
            onChange={(v) => {
              setDistrictFilter(v || '');
              setPage(1);
            }}
            onlyRegionCode="QASHQADARYO"
            placeholder="Barcha tumanlar"
            size="sm"
          />
        </div>

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
          label="Bog‘liqliklar (Firibgar)"
          value={relationsFilter}
          onChange={(v) => {
            setRelationsFilter(v);
            setPage(1);
          }}
        >
          <option value="">Barchasi</option>
          <option value="with_relations">Firibgar bog‘liqligi bor (1+)</option>
          <option value="fraud_card">Dropper / Firibgar kartasi takrorlangan</option>
          <option value="fraud_clue">Telefon / Telegram / Kripto izi takrorlangan</option>
          <option value="cross_role">Rol to‘qnashuvi (Jabrlanuvchi ↔ Firibgar)</option>
        </FilterSelect>

        <FilterSelect
          label="Takroriylik"
          value={repeatTypeFilter}
          onChange={(v) => {
            setRepeatTypeFilter(v);
            setPage(1);
          }}
        >
          <option value="">Barchasi</option>
          <option value="PRIMARY">Birlamchi</option>
          <option value="REPEAT">Takroriy</option>
          <option value="DUPLICATE">Dublikat</option>
          <option value="SUPPLEMENTAL">Qo‘shimcha</option>
        </FilterSelect>

        <FilterSelect
          label="Murojaat turi"
          value={appealTypeFilter}
          onChange={(v) => {
            setAppealTypeFilter(v);
            setPage(1);
          }}
        >
          <option value="">Barchasi</option>
          <option value="APPEAL">Ariza</option>
          <option value="COMPLAINT">Shikoyat</option>
          <option value="PROPOSAL">Taklif</option>
        </FilterSelect>

        <FilterSelect
          label="Targ‘ibot holati"
          value={awarenessStatusFilter}
          onChange={(v) => {
            setAwarenessStatusFilter(v);
            setPage(1);
          }}
        >
          <option value="">Barchasi</option>
          {allAwarenessStatuses.map((st) => (
            <option key={st.id} value={st.id}>
              {st.name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Tashqi tizim"
          value={externalSystemFilter}
          onChange={(v) => {
            setExternalSystemFilter(v);
            setPage(1);
          }}
        >
          <option value="">Barcha tizimlar</option>
          {allExternalSystems.map((sys) => (
            <option key={sys.id} value={sys.id}>
              {sys.name}
            </option>
          ))}
        </FilterSelect>

        {externalSystemFilter && (
          <FilterSelect
            label="Tizimga kiritilganligi"
            value={externalSystemStatusFilter}
            onChange={(v) => {
              setExternalSystemStatusFilter(v === 'entered' ? 'entered' : 'not_entered');
              setPage(1);
            }}
          >
            <option value="not_entered">Kiritilmagan</option>
            <option value="entered">Kiritilgan</option>
          </FilterSelect>
        )}

        <FilterSelect
          label="Qator rangi"
          value={rowColorFilter}
          onChange={(v) => {
            setRowColorFilter(v);
            setPage(1);
          }}
        >
          <option value="">Barchasi</option>
          <option value="any">Ranglanganlar (barcha ranglar)</option>
          <option value="none">Rangsizlar</option>
          {ROW_COLOR_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </FilterSelect>

        <FilterInput
          label="Sanadan"
          type="date"
          value={dateFromFilter}
          onChange={(v) => {
            setDateFromFilter(v);
            setPage(1);
          }}
          mono
        />

        <FilterInput
          label="Sanagacha"
          type="date"
          value={dateToFilter}
          onChange={(v) => {
            setDateToFilter(v);
            setPage(1);
          }}
          mono
        />

        <FilterInput
          label="Zarar (dan, UZS)"
          type="number"
          value={minAmountFilter}
          onChange={(v) => {
            setMinAmountFilter(v);
            setPage(1);
          }}
          placeholder="Masalan: 500000"
          mono
        />

        <FilterInput
          label="Zarar (gacha, UZS)"
          type="number"
          value={maxAmountFilter}
          onChange={(v) => {
            setMaxAmountFilter(v);
            setPage(1);
          }}
          placeholder="Masalan: 5000000"
          mono
        />
      </TableFilterPanel>

      {/* 1.5. PROTSESSUAL MUDDAT (SLA) TEZKOR FILTRLARI */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: '', label: 'Barchasi' },
            { key: 'overdue', label: 'Muddati o‘tganlar', cls: 'text-rose-600 border-rose-500/30' },
            {
              key: 'due_24h',
              label: '24 soat qolganlar',
              cls: 'text-orange-600 border-orange-500/30',
            },
            {
              key: 'due_72h',
              label: '3 kun qolganlar',
              cls: 'text-amber-700 border-amber-500/30',
            },
            { key: 'active', label: 'Tekshiruvda (10 kun)', cls: 'text-sky-600 border-sky-500/30' },
            {
              key: 'extended',
              label: 'Uzaytirilgan (1 oy)',
              cls: 'text-indigo-600 border-indigo-500/30',
            },
          ].map((f) => {
            const active = slaFilter === f.key;
            return (
              <Button
                key={f.key || 'all'}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                onClick={() => {
                  setSlaFilter(f.key);
                  setPage(1);
                  const next = new URLSearchParams(searchParams);
                  if (f.key) next.set('sla_filter', f.key);
                  else next.delete('sla_filter');
                  setSearchParams(next, { replace: true });
                }}
                className={cn('h-7 text-[11px] px-2.5 cursor-pointer', !active && f.cls)}
              >
                {f.label}
              </Button>
            );
          })}
        </div>

        {canWrite && (
          <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Palette className="h-3.5 w-3.5 text-primary/80" />
            <span>Qatorni ranglash: qatorga o‘ng tugma bosing yoki rang nuqtasini tanlang</span>
          </span>
        )}
      </div>

      {/* 2. ALOHIDA AJRATILGAN ARIZALAR JADVALI */}
      <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/40">
              <TableHead className="w-[68px] h-10 px-2.5 text-center sticky left-0 z-10 bg-muted/95 backdrop-blur-xs">
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
              <TableHead className="w-[155px] h-10 px-3 text-[11px] whitespace-nowrap">
                Zarar Summasi
              </TableHead>
              <TableHead className="w-[145px] h-10 px-3 text-[11px] whitespace-nowrap">
                Holati
              </TableHead>
              <TableHead className="min-w-[175px] h-10 px-3 text-[11px] whitespace-nowrap">
                Asosiy Arizachi
              </TableHead>
              <TableHead className="w-[135px] h-10 px-3 text-[11px] whitespace-nowrap">
                Bog‘liqliklar
              </TableHead>
              <TableHead className="w-[115px] h-10 px-3 text-[11px] whitespace-nowrap">
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
                const colorMeta = getRowColorMeta(app.row_color);
                const isRemoteUpdated = recentlyUpdatedIds.has(app.id);
                const colorTooltip = formatRowColorTooltip(app, canWrite);
                return (
                  <TableRow
                    key={app.id}
                    className={cn(
                      'group cursor-pointer transition-colors border-b border-border',
                      selected
                        ? 'bg-primary/[0.08] hover:bg-primary/[0.12]'
                        : colorMeta
                          ? colorMeta.rowClass
                          : 'hover:bg-muted/40',
                      isRemoteUpdated && 'ring-2 ring-inset ring-primary/50',
                    )}
                    onClick={() => navigate(`/applications/${app.id}`)}
                    onContextMenu={(e) => {
                      if (!canWrite) return;
                      e.preventDefault();
                      setColorMenu({ app, x: e.clientX, y: e.clientY });
                    }}
                  >
                    <TableCell
                      className={cn(
                        'w-[68px] px-2.5 text-center sticky left-0 z-10 backdrop-blur-xs transition-colors',
                        selected
                          ? 'bg-primary/[0.08]'
                          : colorMeta
                            ? colorMeta.stickyCellClass
                            : 'bg-card/95 group-hover:bg-muted/40',
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        selection.toggleOne(app.id);
                      }}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <TableCheckbox
                          checked={selected}
                          onChange={() => selection.toggleOne(app.id)}
                          ariaLabel={`Ariza ${app.application_number || ''} ni tanlash`}
                        />
                        {canWrite ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setColorMenu({
                                app,
                                x: rect.right + 8,
                                y: rect.top - 4,
                              });
                            }}
                            title={colorTooltip}
                            aria-label={colorTooltip}
                            className={cn(
                              'h-3.5 w-3.5 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0',
                              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                              colorMeta
                                ? cn(
                                    colorMeta.dotClass,
                                    'ring-2 ring-offset-1 ring-offset-background shadow-2xs hover:scale-125',
                                  )
                                : 'border border-dashed border-muted-foreground/45 bg-transparent opacity-35 group-hover:opacity-100 hover:border-primary hover:bg-primary/10 hover:scale-110',
                            )}
                          />
                        ) : colorMeta ? (
                          <span
                            title={colorTooltip}
                            className={cn(
                              'h-3 w-3 rounded-full ring-2 ring-offset-1 ring-offset-background shrink-0',
                              colorMeta.dotClass,
                            )}
                          />
                        ) : null}
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
                      <div className="space-y-1">
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
                        {(app.repeat_type && app.repeat_type !== 'PRIMARY') ||
                        (app.chain_count && app.chain_count > 1) ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {app.repeat_type === 'REPEAT' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                Takroriy #{app.repeat_sequence || 2}
                              </span>
                            )}
                            {app.repeat_type === 'DUPLICATE' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                                Dublikat
                              </span>
                            )}
                            {app.repeat_type === 'SUPPLEMENTAL' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                                Qo‘shimcha
                              </span>
                            )}
                            {(!app.repeat_type || app.repeat_type === 'PRIMARY') &&
                              app.chain_count &&
                              app.chain_count > 1 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                  Zanjir: {app.chain_count} ta
                                </span>
                              )}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {(() => {
                        const { total, currency, nonCardCount } = getApplicationTotalLoss(app);
                        if (total <= 0) {
                          return <span className="text-muted-foreground text-xs">—</span>;
                        }
                        return (
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-bold ${
                                total >= 50_000_000
                                  ? 'bg-red-500/12 text-red-600 dark:text-red-400 border border-red-500/25'
                                  : 'bg-rose-500/8 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {new Intl.NumberFormat('uz-UZ').format(Math.round(total))} {currency}
                            </span>
                            {nonCardCount > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/12 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                                Kredit/Nasiya: {nonCardCount} ta
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        {getStatusBadge(app.status, app.application_status)}
                        <SlaBadge app={app} />
                        {app.external_systems && app.external_systems.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5 max-w-[190px]">
                            {app.external_systems.map((es) => {
                              const sysName = es.external_system?.name;
                              if (!sysName) return null;
                              const dotColor = es.external_system?.color || '#2563EB';
                              return (
                                <span
                                  key={es.id || es.external_system_id}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted/70 text-foreground border border-border/70"
                                  title={`${sysName} tizimiga kiritilgan`}
                                >
                                  <span
                                    className="h-1.5 w-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: dotColor }}
                                  />
                                  {sysName}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {app.citizen ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <User className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="font-medium truncate max-w-[200px]">
                            {app.citizen.full_name?.trim() || '—'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const rs = app.relations_summary;
                        const appLinks = rs?.total || 0;
                        const crimeLinks = rs?.detected_crimes_count || 0;
                        const totalAlerts = appLinks + crimeLinks;
                        if (!rs || totalAlerts <= 0) {
                          return <span className="text-muted-foreground text-xs pl-2">—</span>;
                        }
                        const isCritical =
                          rs.has_fraud_card_link || rs.has_cross_role_collision || crimeLinks > 0;
                        const tooltipParts = [
                          rs.cards > 0 ? `${rs.cards} ta karta` : null,
                          (rs.suspects || 0) > 0 ? `${rs.suspects} ta raqamli/tel iz` : null,
                          rs.citizens > 0 ? `${rs.citizens} ta gumonlanuvchi shaxs` : null,
                          rs.has_cross_role_collision ? 'Rol to‘qnashuvi!' : null,
                          crimeLinks > 0 ? `${crimeLinks} ta aniqlangan jinoyat` : null,
                        ].filter(Boolean);
                        return (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/applications/${app.id}/relations`)}
                            className={`h-7 px-2.5 text-[11px] font-semibold gap-1.5 rounded-full cursor-pointer transition-all ${
                              isCritical
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/20 shadow-2xs animate-pulse'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 shadow-2xs'
                            }`}
                            title={`Firibgar bog‘liqliklari: ${tooltipParts.join(', ')}`}
                          >
                            <Link2 className="h-3 w-3 shrink-0" />
                            <span>
                              {rs.has_cross_role_collision
                                ? `Rol to‘qnashuvi (${totalAlerts})`
                                : crimeLinks > 0 && appLinks === 0
                                  ? `${crimeLinks} ta jinoyat`
                                  : `${totalAlerts} ta bog‘liqlik`}
                            </span>
                          </Button>
                        );
                      })()}
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

      {/* QATOR RANGINI TANLASH UCHUN SUZUVCHI PALITRA */}
      {colorMenu && (
        <RowColorFloatingMenu
          app={colorMenu.app}
          x={colorMenu.x}
          y={colorMenu.y}
          isUpdating={rowColorMutation.isPending}
          onSelect={(color) =>
            rowColorMutation.mutate({
              id: colorMenu.app.id,
              row_color: color,
            })
          }
          onClose={() => setColorMenu(null)}
        />
      )}

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
