import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookmarkCheck,
  Building2,
  CreditCard,
  Edit2,
  MapPin,
  Plus,
  Search,
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
import { banksApi, crimesApi, districtsApi, paymentProvidersApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { Bank, Crime, CrimeGravity, District, PaymentProvider } from '@/types/models';

type ReferenceItem = District | Crime | Bank | PaymentProvider;

interface ReferenceFormData {
  name?: string | null;
  title?: string | null;
  code?: string | null;
  article?: string | null;
  part?: string | null;
  mfo?: string | null;
  gravity?: CrimeGravity | null;
  [key: string]: unknown;
}

export function ReferencesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'districts' | 'crimes' | 'banks' | 'providers'>(
    'districts',
  );

  // Search and page state for each tab
  const [districtSearch, setDistrictSearch] = useState('');
  const [districtPage, setDistrictPage] = useState(1);

  const [crimeSearch, setCrimeSearch] = useState('');
  const [crimePage, setCrimePage] = useState(1);

  const [bankSearch, setBankSearch] = useState('');
  const [bankPage, setBankPage] = useState(1);

  const [providerSearch, setProviderSearch] = useState('');
  const [providerPage, setProviderPage] = useState(1);

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

  // 2. Crimes Query
  const { data: crimesData, isLoading: isCrimesLoading } = useQuery({
    queryKey: ['crimes', { page: crimePage, search: crimeSearch }],
    queryFn: () => crimesApi.getAll({ page: crimePage, limit: 10, search: crimeSearch }),
    enabled: activeTab === 'crimes',
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

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      if (activeTab === 'districts') return districtsApi.create(formData);
      if (activeTab === 'crimes') return crimesApi.create(formData);
      if (activeTab === 'banks') return banksApi.create(formData);
      if (activeTab === 'providers') return paymentProvidersApi.create(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [activeTab === 'providers' ? 'payment-providers' : activeTab],
      });
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
      if (activeTab === 'crimes') return crimesApi.update(targetItem.id, formData);
      if (activeTab === 'banks') return banksApi.update(targetItem.id, formData);
      if (activeTab === 'providers') return paymentProvidersApi.update(targetItem.id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [activeTab === 'providers' ? 'payment-providers' : activeTab],
      });
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
      if (activeTab === 'crimes') return crimesApi.delete(targetItem.id);
      if (activeTab === 'banks') return banksApi.delete(targetItem.id);
      if (activeTab === 'providers') return paymentProvidersApi.delete(targetItem.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [activeTab === 'providers' ? 'payment-providers' : activeTab],
      });
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

  const getGravityBadge = (gravity: CrimeGravity | null) => {
    switch (gravity) {
      case 'JUDA_OGIR':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/30">Juda Og‘ir</Badge>;
      case 'OGIR':
        return (
          <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/30">Og‘ir</Badge>
        );
      case 'ORTA_OGIR':
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">O‘rta Og‘ir</Badge>
        );
      default:
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            Uncha Og‘ir Bo‘lmagan
          </Badge>
        );
    }
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
        onValueChange={(val) => setActiveTab(val as 'districts' | 'crimes' | 'banks' | 'providers')}
        className="w-full space-y-4"
      >
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto p-1 bg-muted/50 border border-border/60">
          <TabsTrigger value="districts" className="gap-2 text-xs">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            Tumanlar
          </TabsTrigger>
          <TabsTrigger value="crimes" className="gap-2 text-xs">
            <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
            Jinoyat Moddalari
          </TabsTrigger>
          <TabsTrigger value="banks" className="gap-2 text-xs">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            Banklar
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-2 text-xs">
            <CreditCard className="h-3.5 w-3.5 text-primary" />
            To&apos;lov Provayderlari
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
                  <TableHead>Kodi</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isDistrictsLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Yuklanmoqda...
                    </TableCell>
                  </TableRow>
                ) : districtsData?.items?.length ? (
                  districtsData.items.map((district: District) => (
                    <TableRow key={district.id}>
                      <TableCell className="font-medium text-foreground">
                        {district.name || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {district.code || '—'}
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

        {/* 2. CRIMES TAB */}
        <TabsContent value="crimes" className="space-y-4 mt-0">
          <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="relative max-w-md lg:max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Modda yoki jinoyat nomi bo'yicha qidiruv..."
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
                  <TableHead>JK Moddasi</TableHead>
                  <TableHead>Jinoyat Nomi</TableHead>
                  <TableHead>Qismi</TableHead>
                  <TableHead>Og&apos;irlik Darajasi</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isCrimesLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Yuklanmoqda...
                    </TableCell>
                  </TableRow>
                ) : crimesData?.items?.length ? (
                  crimesData.items.map((crime: Crime) => (
                    <TableRow key={crime.id}>
                      <TableCell className="font-mono font-bold text-primary">
                        {crime.article || '—'}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {crime.title || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{crime.part || '—'}</TableCell>
                      <TableCell>{getGravityBadge(crime.gravity)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(crime)}
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
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Hech qanday jinoyat moddasi topilmadi
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
      </Tabs>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={modalType === 'create' || modalType === 'edit'} onOpenChange={closeModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {modalType === 'create' ? 'Yangi Yozuv Qo‘shish' : 'Tahrirlash'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {activeTab === 'districts' && 'Tuman yoki hududiy bo‘lim ma‘lumotlarini kiriting'}
              {activeTab === 'crimes' && 'Jinoyat kodeksi moddasi va tasnifini kiriting'}
              {activeTab === 'banks' && 'Tijorat banki nomi va MFO kodini kiriting'}
              {activeTab === 'providers' && 'To‘lov xizmati provayderi ma‘lumotlarini kiriting'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {/* Common Name field */}
            <div className="space-y-1">
              <label className="font-medium text-foreground">Nomi / Sarlavha</label>
              <Input
                placeholder="Nomi..."
                value={formData.name || formData.title || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ...(activeTab === 'crimes'
                      ? { title: e.target.value }
                      : { name: e.target.value }),
                  })
                }
                className="h-9 text-xs"
              />
            </div>

            {/* Code / Article */}
            {activeTab === 'districts' && (
              <div className="space-y-1">
                <label className="font-medium text-foreground">Bo‘lim Kodi</label>
                <Input
                  placeholder="YUNUSOBOD_IIB"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>
            )}

            {activeTab === 'crimes' && (
              <>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">JK Moddasi</label>
                  <Input
                    placeholder="168-modda"
                    value={formData.article || ''}
                    onChange={(e) => setFormData({ ...formData, article: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Qismi / Bandi</label>
                  <Input
                    placeholder="2-qismi 'a' bandi"
                    value={formData.part || ''}
                    onChange={(e) => setFormData({ ...formData, part: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </>
            )}

            {activeTab === 'banks' && (
              <>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Bank Kodi</label>
                  <Input
                    placeholder="AGRO, KAPITAL"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">MFO Kodi</label>
                  <Input
                    placeholder="00401"
                    value={formData.mfo || ''}
                    onChange={(e) => setFormData({ ...formData, mfo: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </>
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

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={modalType === 'delete'} onOpenChange={closeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>O‘chirishni tasdiqlang</DialogTitle>
            <DialogDescription className="text-xs">
              Ushbu yozuvni o‘chirishni xohlaysizmi? Bu amalni ortga qaytarib bo‘lmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closeModal} className="text-xs">
              Yo&apos;q, bekor qilish
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
