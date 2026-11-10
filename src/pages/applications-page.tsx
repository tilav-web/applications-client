import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  Edit2,
  Eye,
  FileText,
  Filter,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { CreateWordDialog } from '@/components/documents/create-word-dialog';
import { DocumentEditorModal } from '@/components/documents/document-editor-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

  // Umumiy qidiruv (Search input)
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Ustunlar bo'yicha filterlar (Column Filters)
  const [districtFilter, setDistrictFilter] = useState<string>('');
  const [crimeFilter, setCrimeFilter] = useState<string>('');
  const [appNumberFilter, setAppNumberFilter] = useState<string>('');
  const debouncedAppNumber = useDebounce(appNumberFilter, 300);
  const [descFilter, setDescFilter] = useState<string>('');
  const debouncedDesc = useDebounce(descFilter, 300);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [citizenNameFilter, setCitizenNameFilter] = useState<string>('');
  const debouncedCitizenName = useDebounce(citizenNameFilter, 300);
  const [relationsFilter, setRelationsFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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
    Boolean(appNumberFilter),
    Boolean(descFilter),
    Boolean(statusFilter),
    Boolean(citizenNameFilter),
    Boolean(relationsFilter),
    Boolean(dateFilter),
  ].filter(Boolean).length;

  const hasActiveFilters = Boolean(
    search ||
    districtFilter ||
    crimeFilter ||
    appNumberFilter ||
    descFilter ||
    statusFilter ||
    citizenNameFilter ||
    relationsFilter ||
    dateFilter,
  );

  const handleClearAllFilters = () => {
    setSearch('');
    setDistrictFilter('');
    setCrimeFilter('');
    setAppNumberFilter('');
    setDescFilter('');
    setStatusFilter('');
    setCitizenNameFilter('');
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
        search: debouncedSearch,
        status: statusFilter,
        district_id: districtFilter,
        crime_id: crimeFilter,
        application_number: debouncedAppNumber,
        citizen_name: debouncedCitizenName,
        description: debouncedDesc,
        date: dateFilter,
        relations_filter: relationsFilter,
      },
    ],
    queryFn: () =>
      applicationsApi.getAll({
        page,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        district_id: districtFilter || undefined,
        crime_id: crimeFilter || undefined,
        application_number: debouncedAppNumber || undefined,
        citizen_name: debouncedCitizenName || undefined,
        description: debouncedDesc || undefined,
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
            search: debouncedSearch,
            status: statusFilter,
            district_id: districtFilter,
            crime_id: crimeFilter,
            application_number: debouncedAppNumber,
            citizen_name: debouncedCitizenName,
            description: debouncedDesc,
            date: dateFilter,
            relations_filter: relationsFilter,
          },
        ],
        queryFn: () =>
          applicationsApi.getAll({
            page: nextPage,
            limit,
            search: debouncedSearch || undefined,
            status: statusFilter || undefined,
            district_id: districtFilter || undefined,
            crime_id: crimeFilter || undefined,
            application_number: debouncedAppNumber || undefined,
            citizen_name: debouncedCitizenName || undefined,
            description: debouncedDesc || undefined,
            date: dateFilter || undefined,
            relations_filter: relationsFilter || undefined,
          }),
      });
    }
  }, [
    data,
    page,
    limit,
    debouncedSearch,
    statusFilter,
    districtFilter,
    crimeFilter,
    debouncedAppNumber,
    debouncedCitizenName,
    debouncedDesc,
    dateFilter,
    relationsFilter,
    queryClient,
  ]);

  // 3. Ariza Yaratish UX Mantiqi:
  // Tugma bosilganda darhol backendda yangi qoralama ariza (draft) ochiladi va /applications/create/:id ga yo'naltiriladi
  const createDraftMutation = useMutation({
    mutationFn: async () => {
      return applicationsApi.create({
        status: 'YANGI',
      });
    },
    onSuccess: async (newApp) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['applications'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'], refetchType: 'all' }),
      ]);
      toast.success('Yangi ariza loyihasi yaratildi', {
        description: 'Tahrirlash formasiga yo‘naltirilmoqda...',
      });
      navigate(`/applications/create/${newApp.id}`);
    },
    onError: (err: unknown) => {
      toast.error('Arizani yaratishda xatolik yuz berdi', {
        description: getErrorMessage(err, 'Serverda xatolik yuz berdi'),
      });
    },
  });

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
          onClick={() => createDraftMutation.mutate()}
          disabled={createDraftMutation.isPending}
          className="gap-2 shadow-md shadow-primary/25 self-start sm:self-auto cursor-pointer font-medium min-w-[145px]"
        >
          {createDraftMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Yaratilmoqda...</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              <span>Ariza Yaratish</span>
            </>
          )}
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full sm:max-w-lg lg:max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ariza raqami, arizachi F.I.SH yoki tafsilot bo'yicha umumiy qidiruv..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-8 h-9 text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm leading-none cursor-pointer p-0.5"
                  title="Qidiruvni tozalash"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-auto">
              <Button
                type="button"
                variant={isFilterPanelOpen ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className="h-9 text-xs gap-1.5 font-medium border-border/80 shrink-0 cursor-pointer"
                title="Batafsil filtrlarni ko'rsatish / yashirish"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Batafsil filtrlar</span>
                {activeFiltersCount > 0 && (
                  <Badge variant="default" className="h-4.5 px-1.5 text-[10px] ml-0.5">
                    {activeFiltersCount}
                  </Badge>
                )}
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform duration-200',
                    isFilterPanelOpen && 'rotate-180',
                  )}
                />
              </Button>

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearAllFilters}
                  className="h-9 text-xs gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30 shrink-0 cursor-pointer font-medium"
                  title="Barcha filtrlarni tozalash"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Tozalash</span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-9 text-xs gap-1.5 font-medium border-border/80 hover:bg-muted/80 shrink-0 cursor-pointer"
                title="Arizalar ro‘yxatini serverdan yangilash"
              >
                <RefreshCw
                  className={cn('h-3.5 w-3.5', isFetching && 'animate-spin text-primary')}
                />
                <span className="hidden sm:inline">Yangilash</span>
              </Button>
            </div>
          </div>

          {/* 2. Kengaytirilgan Filtrlar Paneli (Clean Responsive Grid) */}
          {isFilterPanelOpen && (
            <div className="pt-3 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* 1. Tuman (Hudud) */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Hudud / Tuman
                </label>
                <select
                  value={districtFilter}
                  onChange={(e) => {
                    setDistrictFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                >
                  <option value="">Barcha tumanlar</option>
                  {allDistricts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Jinoyat turi */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Jinoyat turi / Modda
                </label>
                <select
                  value={crimeFilter}
                  onChange={(e) => {
                    setCrimeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer text-primary"
                >
                  <option value="">Barcha moddalar</option>
                  {allCrimes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.article || c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Ariza raqami */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Ariza raqami
                </label>
                <div className="relative">
                  <Input
                    placeholder="№ 2026-..."
                    value={appNumberFilter}
                    onChange={(e) => {
                      setAppNumberFilter(e.target.value);
                      setPage(1);
                    }}
                    className="h-8 text-xs font-mono pr-6"
                  />
                  {appNumberFilter && (
                    <button
                      type="button"
                      onClick={() => {
                        setAppNumberFilter('');
                        setPage(1);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs leading-none cursor-pointer"
                      title="Tozalash"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* 4. Asosiy arizachi */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Arizachi (F.I.SH / Pasport)
                </label>
                <div className="relative">
                  <Input
                    placeholder="Fuqaro F.I.SH / Telefon..."
                    value={citizenNameFilter}
                    onChange={(e) => {
                      setCitizenNameFilter(e.target.value);
                      setPage(1);
                    }}
                    className="h-8 text-xs pr-6"
                  />
                  {citizenNameFilter && (
                    <button
                      type="button"
                      onClick={() => {
                        setCitizenNameFilter('');
                        setPage(1);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs leading-none cursor-pointer"
                      title="Tozalash"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* 5. Holati */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Ariza holati
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
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
                </select>
              </div>

              {/* 6. Sana */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Ariza sanasi
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value);
                      setPage(1);
                    }}
                    className="h-8 text-xs [color-scheme:dark] pr-6"
                  />
                  {dateFilter && (
                    <button
                      type="button"
                      onClick={() => {
                        setDateFilter('');
                        setPage(1);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs leading-none cursor-pointer"
                      title="Sanani tozalash"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* 7. Bog‘liqliklar */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Bog‘liqliklar
                </label>
                <select
                  value={relationsFilter}
                  onChange={(e) => {
                    setRelationsFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                >
                  <option value="">Barchasi</option>
                  <option value="with_relations">Bog‘liqligi bor (1+)</option>
                  <option value="fraud_card">Firibgar kartasi aniqlangan</option>
                </select>
              </div>

              {/* 8. Tafsilot / Qaydlar */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Tafsilot & Qaydlar
                </label>
                <div className="relative">
                  <Input
                    placeholder="Fabula yoki izoh bo'yicha..."
                    value={descFilter}
                    onChange={(e) => {
                      setDescFilter(e.target.value);
                      setPage(1);
                    }}
                    className="h-8 text-xs pr-6"
                  />
                  {descFilter && (
                    <button
                      type="button"
                      onClick={() => {
                        setDescFilter('');
                        setPage(1);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs leading-none cursor-pointer"
                      title="Tozalash"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Faol filtrlar chiplari (Badges) */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50 text-xs">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mr-1">
                <Filter className="h-3 w-3" /> Faol filtrlar:
              </span>
              {search && (
                <Badge
                  variant="outline"
                  className="gap-1 bg-primary/5 text-primary border-primary/20 text-[11px] py-0.5"
                >
                  <span>Qidiruv: "{search}"</span>
                  <button
                    onClick={() => {
                      setSearch('');
                      setPage(1);
                    }}
                    className="hover:text-destructive cursor-pointer ml-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {districtFilter && (
                <Badge
                  variant="outline"
                  className="gap-1 bg-primary/5 text-primary border-primary/20 text-[11px] py-0.5"
                >
                  <span>
                    Tuman:{' '}
                    {allDistricts.find((d) => d.id === districtFilter)?.name || districtFilter}
                  </span>
                  <button
                    onClick={() => {
                      setDistrictFilter('');
                      setPage(1);
                    }}
                    className="hover:text-destructive cursor-pointer ml-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {crimeFilter && (
                <Badge
                  variant="outline"
                  className="gap-1 bg-primary/5 text-primary border-primary/20 text-[11px] py-0.5"
                >
                  <span>
                    Modda:{' '}
                    {allCrimes.find((c) => c.id === crimeFilter)?.article ||
                      allCrimes.find((c) => c.id === crimeFilter)?.title ||
                      crimeFilter}
                  </span>
                  <button
                    onClick={() => {
                      setCrimeFilter('');
                      setPage(1);
                    }}
                    className="hover:text-destructive cursor-pointer ml-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {appNumberFilter && (
                <Badge
                  variant="outline"
                  className="gap-1 bg-primary/5 text-primary border-primary/20 text-[11px] py-0.5 font-mono"
                >
                  <span>№: {appNumberFilter}</span>
                  <button
                    onClick={() => {
                      setAppNumberFilter('');
                      setPage(1);
                    }}
                    className="hover:text-destructive cursor-pointer ml-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {descFilter && (
                <Badge
                  variant="outline"
                  className="gap-1 bg-primary/5 text-primary border-primary/20 text-[11px] py-0.5"
                >
                  <span>Tafsilot: "{descFilter}"</span>
                  <button
                    onClick={() => {
                      setDescFilter('');
                      setPage(1);
                    }}
                    className="hover:text-destructive cursor-pointer ml-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {statusFilter && (
                <Badge
                  variant="outline"
                  className="gap-1 bg-primary/5 text-primary border-primary/20 text-[11px] py-0.5"
                >
                  <span>
                    Holat:{' '}
                    {allApplicationStatuses.find((s) => s.id === statusFilter)?.name ||
                      statusFilter}
                  </span>
                  <button
                    onClick={() => {
                      setStatusFilter('');
                      setPage(1);
                    }}
                    className="hover:text-destructive cursor-pointer ml-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {citizenNameFilter && (
                <Badge
                  variant="outline"
                  className="gap-1 bg-primary/5 text-primary border-primary/20 text-[11px] py-0.5"
                >
                  <span>Arizachi: "{citizenNameFilter}"</span>
                  <button
                    onClick={() => {
                      setCitizenNameFilter('');
                      setPage(1);
                    }}
                    className="hover:text-destructive cursor-pointer ml-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {relationsFilter && (
                <Badge
                  variant="outline"
                  className="gap-1 bg-primary/5 text-primary border-primary/20 text-[11px] py-0.5"
                >
                  <span>
                    Bog'liqlik:{' '}
                    {relationsFilter === 'fraud_card' ? 'Firibgar kartasi' : 'Bog‘liqligi bor'}
                  </span>
                  <button
                    onClick={() => {
                      setRelationsFilter('');
                      setPage(1);
                    }}
                    className="hover:text-destructive cursor-pointer ml-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {dateFilter && (
                <Badge
                  variant="outline"
                  className="gap-1 bg-primary/5 text-primary border-primary/20 text-[11px] py-0.5"
                >
                  <span>Sana: {dateFilter}</span>
                  <button
                    onClick={() => {
                      setDateFilter('');
                      setPage(1);
                    }}
                    className="hover:text-destructive cursor-pointer ml-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearAllFilters}
                className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10 gap-1 ml-auto cursor-pointer"
                title="Barcha filtrlarni tozalash"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Barchasini tozalash</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            {/* 1-Qator: Ustun nomlari */}
            <TableRow className="border-b border-border bg-muted/40">
              <TableHead className="whitespace-nowrap">Hudud & Jinoyat Turi</TableHead>
              <TableHead className="whitespace-nowrap">Ariza Raqami</TableHead>
              <TableHead className="whitespace-nowrap">Tafsilot & Xodim Qaydlari</TableHead>
              <TableHead className="whitespace-nowrap">Holati</TableHead>
              <TableHead className="whitespace-nowrap">Asosiy Arizachi</TableHead>
              <TableHead className="whitespace-nowrap">Bog‘liqliklar</TableHead>
              <TableHead className="whitespace-nowrap">Sana</TableHead>
              <TableHead className="text-right whitespace-nowrap">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  Yuklanmoqda...
                </TableCell>
              </TableRow>
            ) : data?.items?.length ? (
              data.items.map((app: Application) => (
                <TableRow
                  key={app.id}
                  className="cursor-pointer hover:bg-muted/40 transition-colors border-b border-border"
                  onClick={() => navigate(`/applications/${app.id}`)}
                >
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
                  <TableCell className="font-mono font-bold text-primary">
                    {app.application_number || '—'}
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
                  <TableCell
                    className="text-right space-x-1 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* WORD BELGISI / TUGMASI (ONLYOFFICE DA TEZDA OCHISH YOKI YANGI BIRIKTIRISH) */}
                    {app.documents && app.documents.length > 0 ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-[#185abd] hover:text-[#185abd] hover:bg-blue-50/80 dark:hover:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 gap-1.5 rounded-md shadow-2xs transition-all cursor-pointer"
                            title="Arizaga biriktirilgan Word hujjatlari"
                          >
                            <div className="flex h-4 w-4 items-center justify-center rounded bg-[#185abd] text-white text-[10px] font-bold font-serif leading-none shadow-2xs">
                              W
                            </div>
                            <span className="text-[11px] font-semibold">
                              Word ({app.documents.length})
                            </span>
                            <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground">
                            Hujjatlar ro‘yxati:
                          </DropdownMenuLabel>
                          {app.documents.map((doc) => (
                            <DropdownMenuItem
                              key={doc.id}
                              onClick={() => {
                                setSelectedAppForWord(app);
                                setActiveDocId(doc.id);
                              }}
                              className="gap-2 cursor-pointer text-xs"
                            >
                              <FileText className="h-3.5 w-3.5 text-[#185abd] shrink-0" />
                              <span className="truncate">{doc.title || doc.file_name}</span>
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setCreateWordForApp(app)}
                            className="gap-2 cursor-pointer text-xs font-semibold text-blue-600 focus:text-blue-600"
                          >
                            <Plus className="h-3.5 w-3.5 shrink-0" />
                            <span>Yangi Word yaratish...</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCreateWordForApp(app)}
                        className="h-8 px-2 text-[#185abd] hover:text-[#185abd] hover:bg-blue-50/80 dark:hover:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 gap-1.5 rounded-md shadow-2xs transition-all cursor-pointer"
                        title="Yangi Word hujjati biriktirish"
                      >
                        <div className="flex h-4 w-4 items-center justify-center rounded bg-[#185abd] text-white text-[10px] font-bold font-serif leading-none shadow-2xs">
                          W
                        </div>
                        <span className="text-[11px] font-semibold">Word</span>
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/applications/${app.id}`)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Ko‘rish (Hujjat ko‘rinishi)"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/applications/edit/${app.id}`)}
                      className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                      title="Tahrirlash"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTargetId(app.id)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer"
                      title="O‘chirish"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
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
            limit={data.meta.limit}
            hasNextPage={data.meta.hasNextPage}
            hasPreviousPage={data.meta.hasPreviousPage}
            onPageChange={(p) => setPage(p)}
            isLoading={isLoading}
          />
        )}
      </Card>

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
