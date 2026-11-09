import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  BookmarkCheck,
  Building2,
  CheckCircle2,
  CreditCard,
  Edit2,
  Layers,
  MapPin,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  applicationStatusesApi,
  banksApi,
  crimeMethodsApi,
  crimesApi,
  districtsApi,
  mahallasApi,
  paymentProvidersApi,
  suspectFieldConfigsApi,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type {
  ApplicationStatusItem,
  Bank,
  Crime,
  CrimeGravity,
  CrimeMethod,
  District,
  Mahalla,
  PaymentProvider,
  SuspectFieldConfig,
} from '@/types/models';

type ReferenceItem =
  | District
  | Mahalla
  | Crime
  | CrimeMethod
  | Bank
  | PaymentProvider
  | ApplicationStatusItem
  | SuspectFieldConfig;

interface ReferenceFormData {
  name?: string | null;
  title?: string | null;
  code?: string | null;
  color?: string | null;
  description?: string | null;
  is_default?: boolean | null;
  sort_order?: number | null;
  article?: string | null;
  mfo?: string | null;
  gravity?: CrimeGravity | null;
  district_id?: string | null;
  group_name?: string | null;
  key?: string | null;
  label?: string | null;
  category?: string | null;
  sample_value?: string | null;
  [key: string]: unknown;
}

export function ReferencesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    | 'districts'
    | 'mahallas'
    | 'crimes'
    | 'crime_methods'
    | 'banks'
    | 'providers'
    | 'statuses'
    | 'suspect_fields'
  >('districts');

  // Search and page state for each tab
  const [districtSearch, setDistrictSearch] = useState('');
  const [districtPage, setDistrictPage] = useState(1);

  const [mahallaSearch, setMahallaSearch] = useState('');
  const [mahallaPage, setMahallaPage] = useState(1);

  const [crimeSearch, setCrimeSearch] = useState('');
  const [crimePage, setCrimePage] = useState(1);

  const [crimeMethodSearch, setCrimeMethodSearch] = useState('');
  const [crimeMethodPage, setCrimeMethodPage] = useState(1);

  const [bankSearch, setBankSearch] = useState('');
  const [bankPage, setBankPage] = useState(1);

  const [providerSearch, setProviderSearch] = useState('');
  const [providerPage, setProviderPage] = useState(1);

  const [statusSearch, setStatusSearch] = useState('');
  const [statusPage, setStatusPage] = useState(1);

  const [suspectFieldSearch, setSuspectFieldSearch] = useState('');
  const [suspectFieldPage, setSuspectFieldPage] = useState(1);

  // Modal dialog states
  const [modalType, setModalType] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [targetItem, setTargetItem] = useState<ReferenceItem | null>(null);
  const [formData, setFormData] = useState<ReferenceFormData>({});

  // 1. Districts Query
  const { data: districtsData, isLoading: isDistrictsLoading } = useQuery({
    queryKey: ['districts', { page: districtPage, search: districtSearch }],
    queryFn: () => districtsApi.getAll({ page: districtPage, limit: 10, search: districtSearch }),
    enabled: activeTab === 'districts',
  });

  // 1.1. Mahallas Query
  const { data: mahallasData, isLoading: isMahallasLoading } = useQuery({
    queryKey: ['mahallas', { page: mahallaPage, search: mahallaSearch }],
    queryFn: () => mahallasApi.getAll({ page: mahallaPage, limit: 10, search: mahallaSearch }),
    enabled: activeTab === 'mahallas',
  });

  // Tumanlar lug'ati (Mahalla yaratish uchun)
  const { data: allDistrictsForMahalla } = useQuery({
    queryKey: ['all-districts-for-mahalla'],
    queryFn: () => districtsApi.getAll({ limit: 100 }),
    enabled: activeTab === 'mahallas' || modalType === 'create' || modalType === 'edit',
  });
  const allDistrictsList = allDistrictsForMahalla?.items || [];

  // 2. Crimes Query
  const { data: crimesData, isLoading: isCrimesLoading } = useQuery({
    queryKey: ['crimes', { page: crimePage, search: crimeSearch }],
    queryFn: () => crimesApi.getAll({ page: crimePage, limit: 10, search: crimeSearch }),
    enabled: activeTab === 'crimes',
  });

  // 2.1. Crime Methods Query
  const { data: crimeMethodsData, isLoading: isCrimeMethodsLoading } = useQuery({
    queryKey: ['crime-methods', { page: crimeMethodPage, search: crimeMethodSearch }],
    queryFn: () =>
      crimeMethodsApi.getAll({ page: crimeMethodPage, limit: 10, search: crimeMethodSearch }),
    enabled: activeTab === 'crime_methods',
  });

  // 3. Banks Query
  const { data: banksData, isLoading: isBanksLoading } = useQuery({
    queryKey: ['banks', { page: bankPage, search: bankSearch }],
    queryFn: () => banksApi.getAll({ page: bankPage, limit: 10, search: bankSearch }),
    enabled: activeTab === 'banks',
  });

  // 4. Payment Providers Query
  const { data: providersData, isLoading: isProvidersLoading } = useQuery({
    queryKey: ['payment-providers', { page: providerPage, search: providerSearch }],
    queryFn: () =>
      paymentProvidersApi.getAll({ page: providerPage, limit: 10, search: providerSearch }),
    enabled: activeTab === 'providers',
  });

  // 5. Application Statuses Query
  const { data: statusesData, isLoading: isStatusesLoading } = useQuery({
    queryKey: ['application-statuses', { page: statusPage, search: statusSearch }],
    queryFn: () =>
      applicationStatusesApi.getAll({ page: statusPage, limit: 10, search: statusSearch }),
    enabled: activeTab === 'statuses',
  });

  // 6. Suspect Field Configs Query
  const { data: suspectFieldsData, isLoading: isSuspectFieldsLoading } = useQuery({
    queryKey: ['suspect-field-configs', { page: suspectFieldPage, search: suspectFieldSearch }],
    queryFn: () =>
      suspectFieldConfigsApi.getAll({
        page: suspectFieldPage,
        limit: 10,
        search: suspectFieldSearch,
      }),
    enabled: activeTab === 'suspect_fields',
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      if (activeTab === 'districts') return districtsApi.create(formData);
      if (activeTab === 'mahallas')
        return mahallasApi.create({
          name: formData.name || '',
          district_id: formData.district_id || '',
        });
      if (activeTab === 'crimes')
        return crimesApi.create({
          article: formData.name || formData.title || formData.article || '',
          title: formData.name || formData.title || formData.article || '',
        });
      if (activeTab === 'crime_methods')
        return crimeMethodsApi.create({
          name: formData.name || '',
          group_name: (formData.group_name as string) || 'Бошқа',
          sort_order: formData.sort_order ? Number(formData.sort_order) : 0,
          description: (formData.description as string) || undefined,
        });
      if (activeTab === 'banks') return banksApi.create(formData);
      if (activeTab === 'providers') return paymentProvidersApi.create(formData);
      if (activeTab === 'statuses')
        return applicationStatusesApi.create({
          name: formData.name || '',
          code: formData.code || undefined,
          color: (formData.color as string) || 'blue',
          description: (formData.description as string) || undefined,
          is_default: Boolean(formData.is_default),
          sort_order: formData.sort_order ? Number(formData.sort_order) : 0,
        });
      if (activeTab === 'suspect_fields')
        return suspectFieldConfigsApi.create({
          key: (formData.key as string) || (formData.name as string) || '',
          label: (formData.label as string) || (formData.name as string) || '',
          category: (formData.category as string) || 'Umumiy',
          sample_value: (formData.sample_value as string) || undefined,
          description: (formData.description as string) || undefined,
          sort_order: formData.sort_order !== undefined ? Number(formData.sort_order) : 0,
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          activeTab === 'providers'
            ? 'payment-providers'
            : activeTab === 'statuses'
              ? 'application-statuses'
              : activeTab === 'suspect_fields'
                ? 'suspect-field-configs'
                : activeTab === 'crime_methods'
                  ? 'crime-methods'
                  : activeTab,
        ],
      });
      if (activeTab === 'crime_methods') {
        queryClient.invalidateQueries({ queryKey: ['crime-methods-active'] });
      }
      if (activeTab === 'statuses') {
        queryClient.invalidateQueries({ queryKey: ['application-statuses-all'] });
        queryClient.invalidateQueries({ queryKey: ['application-statuses-autocomplete'] });
      }
      if (activeTab === 'suspect_fields') {
        queryClient.invalidateQueries({ queryKey: ['suspect-field-configs-active'] });
      }
      closeModal();
      toast.success('Yangi yozuv muvaffaqiyatli qo‘shildi');
    },
    onError: (err: unknown) => {
      toast.error('Saqlashda xatolik', { description: getErrorMessage(err) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!targetItem) return;
      if (activeTab === 'districts') return districtsApi.update(targetItem.id, formData);
      if (activeTab === 'mahallas')
        return mahallasApi.update(targetItem.id, {
          name: formData.name || undefined,
          district_id: formData.district_id || undefined,
        });
      if (activeTab === 'crimes')
        return crimesApi.update(targetItem.id, {
          article: formData.name || formData.title || formData.article || undefined,
          title: formData.name || formData.title || formData.article || undefined,
        });
      if (activeTab === 'crime_methods')
        return crimeMethodsApi.update(targetItem.id, {
          name: formData.name || undefined,
          group_name: (formData.group_name as string) || undefined,
          sort_order: formData.sort_order !== undefined ? Number(formData.sort_order) : undefined,
          description: (formData.description as string) || undefined,
        });
      if (activeTab === 'banks') return banksApi.update(targetItem.id, formData);
      if (activeTab === 'providers') return paymentProvidersApi.update(targetItem.id, formData);
      if (activeTab === 'statuses')
        return applicationStatusesApi.update(targetItem.id, {
          name: formData.name || undefined,
          code: formData.code || undefined,
          color: (formData.color as string) || undefined,
          description: (formData.description as string) || undefined,
          is_default: formData.is_default !== undefined ? Boolean(formData.is_default) : undefined,
          sort_order: formData.sort_order !== undefined ? Number(formData.sort_order) : undefined,
        });
      if (activeTab === 'suspect_fields')
        return suspectFieldConfigsApi.update(targetItem.id, {
          key: formData.key !== undefined ? (formData.key as string) : undefined,
          label: formData.label !== undefined ? (formData.label as string) : undefined,
          category: formData.category !== undefined ? (formData.category as string) : undefined,
          sample_value:
            formData.sample_value !== undefined ? (formData.sample_value as string) : undefined,
          description:
            formData.description !== undefined ? (formData.description as string) : undefined,
          sort_order: formData.sort_order !== undefined ? Number(formData.sort_order) : undefined,
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          activeTab === 'providers'
            ? 'payment-providers'
            : activeTab === 'statuses'
              ? 'application-statuses'
              : activeTab === 'suspect_fields'
                ? 'suspect-field-configs'
                : activeTab === 'crime_methods'
                  ? 'crime-methods'
                  : activeTab,
        ],
      });
      if (activeTab === 'crime_methods') {
        queryClient.invalidateQueries({ queryKey: ['crime-methods-active'] });
      }
      if (activeTab === 'statuses') {
        queryClient.invalidateQueries({ queryKey: ['application-statuses-all'] });
        queryClient.invalidateQueries({ queryKey: ['application-statuses-autocomplete'] });
      }
      if (activeTab === 'suspect_fields') {
        queryClient.invalidateQueries({ queryKey: ['suspect-field-configs-active'] });
      }
      closeModal();
      toast.success('Yozuv muvaffaqiyatli yangilandi');
    },
    onError: (err: unknown) => {
      toast.error('Yangilashda xatolik', { description: getErrorMessage(err) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!targetItem) return;
      if (activeTab === 'districts') return districtsApi.delete(targetItem.id);
      if (activeTab === 'mahallas') return mahallasApi.delete(targetItem.id);
      if (activeTab === 'crimes') return crimesApi.delete(targetItem.id);
      if (activeTab === 'crime_methods') return crimeMethodsApi.delete(targetItem.id);
      if (activeTab === 'banks') return banksApi.delete(targetItem.id);
      if (activeTab === 'providers') return paymentProvidersApi.delete(targetItem.id);
      if (activeTab === 'statuses') return applicationStatusesApi.delete(targetItem.id);
      if (activeTab === 'suspect_fields') return suspectFieldConfigsApi.delete(targetItem.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          activeTab === 'providers'
            ? 'payment-providers'
            : activeTab === 'statuses'
              ? 'application-statuses'
              : activeTab === 'suspect_fields'
                ? 'suspect-field-configs'
                : activeTab === 'crime_methods'
                  ? 'crime-methods'
                  : activeTab,
        ],
      });
      if (activeTab === 'crime_methods') {
        queryClient.invalidateQueries({ queryKey: ['crime-methods-active'] });
      }
      if (activeTab === 'statuses') {
        queryClient.invalidateQueries({ queryKey: ['application-statuses-all'] });
        queryClient.invalidateQueries({ queryKey: ['application-statuses-autocomplete'] });
      }
      if (activeTab === 'suspect_fields') {
        queryClient.invalidateQueries({ queryKey: ['suspect-field-configs-active'] });
      }
      closeModal();
      toast.success('Yozuv o‘chirildi');
    },
    onError: (err: unknown) => {
      toast.error('O‘chirishda xatolik', { description: getErrorMessage(err) });
    },
  });

  const openCreateModal = () => {
    setFormData({});
    setTargetItem(null);
    setModalType('create');
  };

  const openEditModal = (item: ReferenceItem) => {
    setTargetItem(item);
    setFormData({ ...item });
    setModalType('edit');
  };

  const openDeleteModal = (item: ReferenceItem) => {
    setTargetItem(item);
    setModalType('delete');
  };

  const closeModal = () => {
    setModalType(null);
    setTargetItem(null);
    setFormData({});
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ma&apos;lumotnomalar & Sozlamalar
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Tumanlar, jinoyat moddalari, banklar va to&apos;lov tizimlari lug&apos;atlarini markaziy
            boshqarish
          </p>
        </div>

        <Button size="sm" onClick={openCreateModal} className="gap-2 shadow-md shadow-primary/25">
          <Plus className="h-4 w-4" />
          Yangi Qo&apos;shish
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(val) =>
          setActiveTab(
            val as
              | 'districts'
              | 'mahallas'
              | 'crimes'
              | 'crime_methods'
              | 'banks'
              | 'providers'
              | 'statuses'
              | 'suspect_fields',
          )
        }
        className="w-full space-y-4"
      >
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 w-full p-1 bg-muted/50 border border-border/60">
          <TabsTrigger value="districts" className="gap-2 text-xs">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            Tumanlar
          </TabsTrigger>
          <TabsTrigger value="mahallas" className="gap-2 text-xs">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            Mahallalar
          </TabsTrigger>
          <TabsTrigger value="crimes" className="gap-2 text-xs">
            <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
            Jinoyat Turlari
          </TabsTrigger>
          <TabsTrigger value="crime_methods" className="gap-2 text-xs">
            <Layers className="h-3.5 w-3.5 text-primary" />
            Jinoyat Usullari
          </TabsTrigger>
          <TabsTrigger value="banks" className="gap-2 text-xs">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            Banklar
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-2 text-xs">
            <CreditCard className="h-3.5 w-3.5 text-primary" />
            To&apos;lov Provayderlari
          </TabsTrigger>
          <TabsTrigger value="statuses" className="gap-2 text-xs">
            <Activity className="h-3.5 w-3.5 text-primary" />
            Ariza Statuslari
          </TabsTrigger>
          <TabsTrigger value="suspect_fields" className="gap-2 text-xs">
            <ShieldAlert className="h-3.5 w-3.5 text-primary" />
            Gumonlanuvchi Parametrlari
          </TabsTrigger>
        </TabsList>

        {/* 1. DISTRICTS TAB */}
        <TabsContent value="districts" className="space-y-4 mt-0">
          <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="relative max-w-md lg:max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tuman nomi yoki kodi bo'yicha qidiruv..."
                  value={districtSearch}
                  onChange={(e) => {
                    setDistrictSearch(e.target.value);
                    setDistrictPage(1);
                  }}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tuman / Bo&apos;lim Nomi</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isDistrictsLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                      Yuklanmoqda...
                    </TableCell>
                  </TableRow>
                ) : districtsData?.items?.length ? (
                  districtsData.items.map((district: District) => (
                    <TableRow key={district.id}>
                      <TableCell className="font-medium text-foreground">
                        {district.name || '—'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(district)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteModal(district)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Hech qanday tuman topilmadi
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {districtsData?.meta && (
              <PaginationBar
                page={districtsData.meta.page}
                totalPages={districtsData.meta.totalPages}
                total={districtsData.meta.total}
                limit={districtsData.meta.limit}
                hasNextPage={districtsData.meta.hasNextPage}
                hasPreviousPage={districtsData.meta.hasPreviousPage}
                onPageChange={(p) => setDistrictPage(p)}
                isLoading={isDistrictsLoading}
              />
            )}
          </Card>
        </TabsContent>

        {/* 1.1. MAHALLAS TAB */}
        <TabsContent value="mahallas" className="space-y-4 mt-0">
          <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="relative max-w-md lg:max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Mahalla nomi bo'yicha qidiruv..."
                  value={mahallaSearch}
                  onChange={(e) => {
                    setMahallaSearch(e.target.value);
                    setMahallaPage(1);
                  }}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mahalla Nomi</TableHead>
                  <TableHead>Tegishli Tuman</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isMahallasLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Yuklanmoqda...
                    </TableCell>
                  </TableRow>
                ) : mahallasData?.items?.length ? (
                  mahallasData.items.map((mahalla: Mahalla) => (
                    <TableRow key={mahalla.id}>
                      <TableCell className="font-medium text-foreground">
                        {mahalla.name || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {mahalla.district?.name || '—'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(mahalla)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteModal(mahalla)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Hech qanday mahalla topilmadi
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {mahallasData?.meta && (
              <PaginationBar
                page={mahallasData.meta.page}
                totalPages={mahallasData.meta.totalPages}
                total={mahallasData.meta.total}
                limit={mahallasData.meta.limit}
                hasNextPage={mahallasData.meta.hasNextPage}
                hasPreviousPage={mahallasData.meta.hasPreviousPage}
                onPageChange={(p) => setMahallaPage(p)}
                isLoading={isMahallasLoading}
              />
            )}
          </Card>
        </TabsContent>

        {/* 2. CRIMES TAB */}
        <TabsContent value="crimes" className="space-y-4 mt-0">
          <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="relative max-w-md lg:max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Jinoyat turi bo'yicha qidiruv..."
                  value={crimeSearch}
                  onChange={(e) => {
                    setCrimeSearch(e.target.value);
                    setCrimePage(1);
                  }}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jinoyat Turi</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isCrimesLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                      Yuklanmoqda...
                    </TableCell>
                  </TableRow>
                ) : crimesData?.items?.length ? (
                  crimesData.items.map((crime: Crime) => (
                    <TableRow key={crime.id}>
                      <TableCell className="font-semibold text-foreground">
                        {crime.article || crime.title || '—'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            openEditModal({ ...crime, name: crime.article || crime.title || '' })
                          }
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteModal(crime)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                      Hech qanday jinoyat turi topilmadi
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {crimesData?.meta && (
              <PaginationBar
                page={crimesData.meta.page}
                totalPages={crimesData.meta.totalPages}
                total={crimesData.meta.total}
                limit={crimesData.meta.limit}
                hasNextPage={crimesData.meta.hasNextPage}
                hasPreviousPage={crimesData.meta.hasPreviousPage}
                onPageChange={(p) => setCrimePage(p)}
                isLoading={isCrimesLoading}
              />
            )}
          </Card>
        </TabsContent>

        {/* 2.1. CRIME METHODS TAB */}
        <TabsContent value="crime_methods" className="space-y-4 mt-0">
          <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="relative max-w-md lg:max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Jinoyat usuli yoki guruhi bo'yicha qidiruv..."
                  value={crimeMethodSearch}
                  onChange={(e) => {
                    setCrimeMethodSearch(e.target.value);
                    setCrimeMethodPage(1);
                  }}
                  className="pl-9 bg-background/50"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead className="whitespace-nowrap">Usul nomi</TableHead>
                  <TableHead className="whitespace-nowrap">Guruhi</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Tartib</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {isCrimeMethodsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Yuklanmoqda...
                    </TableCell>
                  </TableRow>
                ) : crimeMethodsData?.items?.length ? (
                  crimeMethodsData.items.map((method: CrimeMethod) => (
                    <TableRow key={method.id} className="border-b border-border">
                      <TableCell className="font-semibold text-foreground max-w-lg">
                        {method.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-xs bg-primary/5 text-primary border-primary/20"
                        >
                          {method.group_name || 'Бошқа'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {method.sort_order ?? 0}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            openEditModal({
                              ...method,
                              name: method.name,
                              group_name: method.group_name,
                              sort_order: method.sort_order,
                              description: method.description,
                            })
                          }
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteModal(method)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Hech qanday jinoyat usuli topilmadi
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {crimeMethodsData?.meta && (
              <PaginationBar
                page={crimeMethodsData.meta.page}
                totalPages={crimeMethodsData.meta.totalPages}
                total={crimeMethodsData.meta.total}
                limit={crimeMethodsData.meta.limit}
                hasNextPage={crimeMethodsData.meta.hasNextPage}
                hasPreviousPage={crimeMethodsData.meta.hasPreviousPage}
                onPageChange={(p) => setCrimeMethodPage(p)}
                isLoading={isCrimeMethodsLoading}
              />
            )}
          </Card>
        </TabsContent>

        {/* 3. BANKS TAB */}
        <TabsContent value="banks" className="space-y-4 mt-0">
          <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="relative max-w-md lg:max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Bank nomi, kodi yoki MFO bo'yicha qidiruv..."
                  value={bankSearch}
                  onChange={(e) => {
                    setBankSearch(e.target.value);
                    setBankPage(1);
                  }}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank Nomi</TableHead>
                  <TableHead>Kodi</TableHead>
                  <TableHead>MFO</TableHead>
                  <TableHead>Holati</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isBanksLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Yuklanmoqda...
                    </TableCell>
                  </TableRow>
                ) : banksData?.items?.length ? (
                  banksData.items.map((bank: Bank) => (
                    <TableRow key={bank.id}>
                      <TableCell className="font-semibold text-foreground">
                        {bank.name || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {bank.code || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{bank.mfo || '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            bank.is_active
                              ? 'border-emerald-500/40 text-emerald-400'
                              : 'text-muted-foreground'
                          }
                        >
                          {bank.is_active ? 'Faol' : 'Nofaol'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(bank)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteModal(bank)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Hech qanday bank topilmadi
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {banksData?.meta && (
              <PaginationBar
                page={banksData.meta.page}
                totalPages={banksData.meta.totalPages}
                total={banksData.meta.total}
                limit={banksData.meta.limit}
                hasNextPage={banksData.meta.hasNextPage}
                hasPreviousPage={banksData.meta.hasPreviousPage}
                onPageChange={(p) => setBankPage(p)}
                isLoading={isBanksLoading}
              />
            )}
          </Card>
        </TabsContent>

        {/* 4. PAYMENT PROVIDERS TAB */}
        <TabsContent value="providers" className="space-y-4 mt-0">
          <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="relative max-w-md lg:max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Provayder nomi yoki kodi bo'yicha qidiruv..."
                  value={providerSearch}
                  onChange={(e) => {
                    setProviderSearch(e.target.value);
                    setProviderPage(1);
                  }}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provayder Nomi</TableHead>
                  <TableHead>Tizim Kodi</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isProvidersLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Yuklanmoqda...
                    </TableCell>
                  </TableRow>
                ) : providersData?.items?.length ? (
                  providersData.items.map((prov: PaymentProvider) => (
                    <TableRow key={prov.id}>
                      <TableCell className="font-semibold text-foreground">
                        {prov.name || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-primary font-bold">
                        {prov.code || '—'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(prov)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteModal(prov)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Hech qanday provayder topilmadi
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {providersData?.meta && (
              <PaginationBar
                page={providersData.meta.page}
                totalPages={providersData.meta.totalPages}
                total={providersData.meta.total}
                limit={providersData.meta.limit}
                hasNextPage={providersData.meta.hasNextPage}
                hasPreviousPage={providersData.meta.hasPreviousPage}
                onPageChange={(p) => setProviderPage(p)}
                isLoading={isProvidersLoading}
              />
            )}
          </Card>
        </TabsContent>

        {/* 5. APPLICATION STATUSES TAB */}
        <TabsContent value="statuses" className="space-y-4 mt-0">
          <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="relative max-w-md lg:max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Status nomi yoki kodi bo'yicha qidiruv..."
                  value={statusSearch}
                  onChange={(e) => {
                    setStatusSearch(e.target.value);
                    setStatusPage(1);
                  }}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status Nomi</TableHead>
                  <TableHead>Tizim Kodi</TableHead>
                  <TableHead>Rangi</TableHead>
                  <TableHead>Standart Holat</TableHead>
                  <TableHead>Tartib</TableHead>
                  <TableHead>Izoh</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isStatusesLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Yuklanmoqda...
                    </TableCell>
                  </TableRow>
                ) : statusesData?.items?.length ? (
                  statusesData.items.map((st: ApplicationStatusItem) => (
                    <TableRow key={st.id}>
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              st.color === 'emerald'
                                ? 'bg-emerald-500'
                                : st.color === 'amber'
                                  ? 'bg-amber-500'
                                  : st.color === 'rose' || st.color === 'red'
                                    ? 'bg-rose-500'
                                    : st.color === 'purple'
                                      ? 'bg-purple-500'
                                      : 'bg-blue-500'
                            }`}
                          />
                          <span>{st.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        {st.code || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] capitalize">
                          {st.color || 'blue'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {st.is_default ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[11px]">
                            <CheckCircle2 className="h-3 w-3" />
                            Birlamchi
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {st.sort_order ?? 0}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {st.description || '—'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(st)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          title="Tahrirlash"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteModal(st)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="O‘chirish"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Hech qanday ariza statusi topilmadi
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {statusesData?.meta && (
              <PaginationBar
                page={statusesData.meta.page}
                totalPages={statusesData.meta.totalPages}
                total={statusesData.meta.total}
                limit={statusesData.meta.limit}
                hasNextPage={statusesData.meta.hasNextPage}
                hasPreviousPage={statusesData.meta.hasPreviousPage}
                onPageChange={(p) => setStatusPage(p)}
                isLoading={isStatusesLoading}
              />
            )}
          </Card>
        </TabsContent>

        {/* 6. SUSPECT FIELD CONFIGS TAB */}
        <TabsContent value="suspect_fields" className="space-y-4 mt-0">
          <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="relative max-w-md lg:max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Parametr nomi yoki kaliti bo'yicha qidiruv..."
                  value={suspectFieldSearch}
                  onChange={(e) => {
                    setSuspectFieldSearch(e.target.value);
                    setSuspectFieldPage(1);
                  }}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parametr Nomi</TableHead>
                  <TableHead>Tizim Kaliti (Tag / Variable)</TableHead>
                  <TableHead>Toifasi</TableHead>
                  <TableHead>Namuna Qiymat</TableHead>
                  <TableHead>Tartib</TableHead>
                  <TableHead>Tavsif</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isSuspectFieldsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Yuklanmoqda...
                    </TableCell>
                  </TableRow>
                ) : suspectFieldsData?.items?.length ? (
                  suspectFieldsData.items.map((field: SuspectFieldConfig) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-primary" />
                          <span>{field.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-mono text-xs text-primary font-bold"
                        >
                          {`{{suspect.${field.key}}}`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[11px]">
                          {field.category || 'Umumiy'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {field.sample_value || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {field.sort_order ?? 0}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {field.description || '—'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(field)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          title="Tahrirlash"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteModal(field)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="O‘chirish"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Hech qanday parametr topilmadi
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {suspectFieldsData?.meta && (
              <PaginationBar
                page={suspectFieldsData.meta.page}
                totalPages={suspectFieldsData.meta.totalPages}
                total={suspectFieldsData.meta.total}
                limit={suspectFieldsData.meta.limit}
                hasNextPage={suspectFieldsData.meta.hasNextPage}
                hasPreviousPage={suspectFieldsData.meta.hasPreviousPage}
                onPageChange={(p) => setSuspectFieldPage(p)}
                isLoading={isSuspectFieldsLoading}
              />
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={modalType === 'create' || modalType === 'edit'} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {modalType === 'create' ? 'Yangi Yozuv Qo‘shish' : 'Tahrirlash'}
            </DialogTitle>
            <DialogDescription>
              {activeTab === 'districts' && 'Tuman yoki hududiy bo‘lim ma‘lumotlarini kiriting'}
              {activeTab === 'mahallas' && 'Mahalla nomi va tegishli tumanni tanlang'}
              {activeTab === 'crimes' && 'Jinoyat turini kiriting'}
              {activeTab === 'banks' && 'Tijorat banki nomi va MFO kodini kiriting'}
              {activeTab === 'providers' && 'To‘lov xizmati provayderi ma‘lumotlarini kiriting'}
              {activeTab === 'statuses' &&
                'Ariza holati/statusi nomi, kodi, rangi va parametrlarini kiriting'}
              {activeTab === 'suspect_fields' &&
                'Gumonlanuvchi parametri (Telegram, Instagram, telefon, karta va h.k.) va tizim kalitini kiriting'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Common Name field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {activeTab === 'crimes'
                  ? 'Jinoyat Turi Nomi *'
                  : activeTab === 'suspect_fields'
                    ? 'Parametr Nomi (Label) *'
                    : 'Nomi / Sarlavha *'}
              </label>
              <Input
                placeholder={
                  activeTab === 'crimes'
                    ? 'Masalan: Firibgarlik...'
                    : activeTab === 'suspect_fields'
                      ? 'Masalan: Telegram Username...'
                      : 'Nomi...'
                }
                value={
                  (formData.label as string) ||
                  formData.name ||
                  formData.title ||
                  formData.article ||
                  ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  const updates: Record<string, unknown> = {
                    name: val,
                    title: val,
                    article: val,
                    label: val,
                  };
                  if (activeTab === 'suspect_fields' && !targetItem && !formData.key) {
                    updates.key = val
                      .toLowerCase()
                      .replace(/[\s-]+/g, '_')
                      .replace(/[^a-z0-9_]/g, '');
                  }
                  setFormData({
                    ...formData,
                    ...updates,
                  });
                }}
                className="h-10 text-xs sm:text-sm font-medium"
              />
            </div>

            {/* Mahalla uchun tegishli Tuman tanlash */}
            {activeTab === 'mahallas' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Tegishli Tuman *</label>
                <select
                  value={formData.district_id || ''}
                  onChange={(e) => setFormData({ ...formData, district_id: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs sm:text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">Tumanni tanlang...</option>
                  {allDistrictsList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Jinoyat usuli qo'shimcha maydonlari */}
            {activeTab === 'crime_methods' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Guruhi / Kategoriyasi *
                  </label>
                  <Input
                    placeholder="Masalan: Фишинг ва қурилма/карта бошқаруви"
                    value={(formData.group_name as string) || ''}
                    onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                    className="h-10 text-xs sm:text-sm font-medium"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Tartib raqami (Sort order)
                    </label>
                    <Input
                      type="number"
                      value={formData.sort_order ?? 0}
                      onChange={(e) =>
                        setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                      }
                      className="h-10 text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Qo'shimcha izoh</label>
                    <Input
                      placeholder="Qisqacha izoh..."
                      value={(formData.description as string) || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'banks' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Bank Kodi</label>
                  <Input
                    placeholder="AGRO, KAPITAL"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="h-10 text-xs sm:text-sm font-mono uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">MFO Kodi</label>
                  <Input
                    placeholder="00394"
                    value={formData.mfo || ''}
                    onChange={(e) => setFormData({ ...formData, mfo: e.target.value })}
                    className="h-10 text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>
            )}

            {activeTab === 'providers' && (
              <div className="space-y-1">
                <label className="font-medium text-foreground">Tizim Kodi (Slug)</label>
                <Input
                  placeholder="PAYME, CLICK, UZUM"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>
            )}

            {activeTab === 'statuses' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Tizim Kodi (Slug)</label>
                    <Input
                      placeholder="YANGI, JARAYONDA, EKSPERTIZADA..."
                      value={formData.code || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="h-9 text-xs font-mono font-bold uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Status Rangi</label>
                    <select
                      value={(formData.color as string) || 'blue'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="blue">Ko‘k (Blue)</option>
                      <option value="amber">Sariq / Oltinrang (Amber)</option>
                      <option value="emerald">Yashil (Emerald)</option>
                      <option value="rose">Qizil (Rose)</option>
                      <option value="purple">Binafsha (Purple)</option>
                      <option value="gray">Kulrang (Gray)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Tartib raqami (Sort order)
                    </label>
                    <Input
                      type="number"
                      placeholder="1, 2, 3..."
                      value={formData.sort_order ?? 0}
                      onChange={(e) =>
                        setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                      }
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Standart (Birlamchi) holat
                    </label>
                    <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background">
                      <input
                        type="checkbox"
                        id="is_default_check"
                        checked={Boolean(formData.is_default)}
                        onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <label htmlFor="is_default_check" className="text-xs cursor-pointer">
                        Yangi arizalarga avtomatik biriksin
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Izoh (Tavsif)</label>
                  <Input
                    placeholder="Ariza statusi haqida qisqacha izoh..."
                    value={(formData.description as string) || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </>
            )}

            {/* Suspect Field Configs Form Fields */}
            {activeTab === 'suspect_fields' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Tizim Kaliti (Key) *</label>
                    <Input
                      placeholder="telegram_username, phone_number..."
                      value={(formData.key as string) || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                        })
                      }
                      className="h-9 text-xs font-mono"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Word shablonda {`{{suspect.${(formData.key as string) || 'kalit'}}}`} bo‘lib
                      chiqadi
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Toifasi (Category)</label>
                    <select
                      value={(formData.category as string) || 'Umumiy'}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Telegram">Telegram</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Aloqa">Aloqa / Telefon</option>
                      <option value="Moliya">Moliya / Bank / Kripto</option>
                      <option value="Tarmoq">Tarmoq / IP / Server</option>
                      <option value="Transport">Transport / Avto</option>
                      <option value="Umumiy">Umumiy / Boshqa</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Namuna qiymat (Sample value)
                    </label>
                    <Input
                      placeholder="Masalan: @tilav_web, 123456..."
                      value={(formData.sample_value as string) || ''}
                      onChange={(e) => setFormData({ ...formData, sample_value: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Tartib raqami (Sort order)
                    </label>
                    <Input
                      type="number"
                      placeholder="1, 2, 3..."
                      value={formData.sort_order ?? 0}
                      onChange={(e) =>
                        setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                      }
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Tavsif / Izoh</label>
                  <Input
                    placeholder="Ushbu parametr nima maqsadda ishlatilishi haqida izoh..."
                    value={(formData.description as string) || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </>
            )}
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
              {createMutation.isPending || updateMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={modalType === 'delete'} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>O‘chirishni tasdiqlang</DialogTitle>
            <DialogDescription>
              Ushbu yozuvni o‘chirishni xohlaysizmi? Bu amalni ortga qaytarib bo‘lmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="default"
              onClick={closeModal}
              className="text-xs sm:text-sm h-10 px-4 cursor-pointer font-medium"
            >
              Yo&apos;q, bekor qilish
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
