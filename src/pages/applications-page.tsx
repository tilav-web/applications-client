import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Eye,
  FileText,
  Filter,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
import { applicationsApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { Application, ApplicationStatus } from '@/types/models';

export function ApplicationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Selected application for details view
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // 1. Fetch Applications Query
  const { data, isLoading } = useQuery({
    queryKey: ['applications', { page, limit, search, status: statusFilter }],
    queryFn: () =>
      applicationsApi.getAll({
        page,
        limit,
        search,
        status: statusFilter || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  // 2. React Query Prefetching: Keyingi sahifani oldindan yuklash (Prefetch)
  useEffect(() => {
    if (data?.meta?.hasNextPage) {
      const nextPage = page + 1;
      queryClient.prefetchQuery({
        queryKey: ['applications', { page: nextPage, limit, search, status: statusFilter }],
        queryFn: () =>
          applicationsApi.getAll({
            page: nextPage,
            limit,
            search,
            status: statusFilter || undefined,
          }),
      });
    }
  }, [data, page, limit, search, statusFilter, queryClient]);

  // 3. Ariza Yaratish UX Mantiqi:
  // Tugma bosilganda darhol backendda yangi qoralama ariza (draft) ochiladi va /applications/create/:id ga yo'naltiriladi
  const createDraftMutation = useMutation({
    mutationFn: async () => {
      return applicationsApi.create({
        title: 'Yangi Ariza',
        status: 'YANGI',
      });
    },
    onSuccess: (newApp) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setDeleteTargetId(null);
      toast.success('Ariza muvaffaqiyatli o‘chirildi');
    },
    onError: (err: unknown) => {
      toast.error('Arizani o‘chirishda xatolik yuz berdi', {
        description: getErrorMessage(err),
      });
    },
  });

  const getStatusBadge = (status: ApplicationStatus | null) => {
    switch (status) {
      case 'YANGI':
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">Yangi</Badge>;
      case 'JARAYONDA':
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">Jarayonda</Badge>
        );
      case 'HAL_QILINDI':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            Hal qilindi
          </Badge>
        );
      case 'RAD_ETILDI':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/30">Rad etildi</Badge>;
      default:
        return <Badge variant="outline">—</Badge>;
    }
  };

  const openDetails = (app: Application) => {
    setSelectedApp(app);
    setIsDetailOpen(true);
  };

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary mb-1">
            <FileText className="h-3.5 w-3.5" />
            <span>Murojaatlar Boshqaruvi</span>
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
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full sm:max-w-lg lg:max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ariza raqami yoki sarlavha bo'yicha qidiruv..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Barcha holatlar</option>
              <option value="YANGI">Yangi</option>
              <option value="JARAYONDA">Jarayonda</option>
              <option value="HAL_QILINDI">Hal qilindi</option>
              <option value="RAD_ETILDI">Rad etildi</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ariza Raqami</TableHead>
              <TableHead>Mavzusi & Tafsiloti</TableHead>
              <TableHead>Holati</TableHead>
              <TableHead>Asosiy Arizachi</TableHead>
              <TableHead>Hudud & Modda</TableHead>
              <TableHead>Qo‘shimcha Maydonlar</TableHead>
              <TableHead>Sana</TableHead>
              <TableHead className="text-right">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => openDetails(app)}
                >
                  <TableCell className="font-mono font-bold text-primary">
                    {app.application_number || '—'}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="font-semibold text-foreground truncate">
                      {app.title || 'Sarlavhasiz'}
                    </p>
                    {app.description && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {app.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
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
                  <TableCell>
                    <div className="space-y-0.5 text-xs">
                      {app.district && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3 text-primary" />
                          <span>{app.district.name}</span>
                        </div>
                      )}
                      {app.crime && (
                        <span className="font-mono text-[11px] text-primary">
                          {app.crime.article}
                        </span>
                      )}
                      {!app.district && !app.crime && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {app.custom_fields?.length ? (
                      <Badge
                        variant="outline"
                        className="text-[11px] border-primary/30 text-primary"
                      >
                        {app.custom_fields.length} ta maydon
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {app.date ? new Date(app.date).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDetails(app)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTargetId(app.id)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
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

      {/* VIEW APPLICATION DETAILS MODAL */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                {selectedApp?.application_number}
              </span>
              {getStatusBadge(selectedApp?.status ?? null)}
            </div>
            <DialogTitle className="text-lg font-bold pt-1">
              {selectedApp?.title || 'Sarlavhasiz Ariza'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ariza bo‘yicha to‘liq hisobot va unga biriktirilgan sub-modellar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Description */}
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
              <span className="font-semibold text-muted-foreground block mb-1">
                Ariza Mazmuni & Tafsilotlari:
              </span>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {selectedApp?.description || 'Tafsilot yozilmagan'}
              </p>
            </div>

            {/* Asosiy Birlamchi Modellar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Asosiy Fuqaro */}
              <div className="p-3 rounded-lg border border-border/60 bg-card/60 space-y-1">
                <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Asosiy Arizachi Fuqaro:
                </span>
                {selectedApp?.citizen ? (
                  <div>
                    <div className="font-bold text-foreground">
                      {selectedApp.citizen.last_name} {selectedApp.citizen.first_name}{' '}
                      {selectedApp.citizen.middle_name}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      Pasport: {selectedApp.citizen.passport || '—'} | Tel:{' '}
                      {selectedApp.citizen.phone_number || '—'}
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>

              {/* Tuman va Modda */}
              <div className="p-3 rounded-lg border border-border/60 bg-card/60 space-y-1">
                <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  Tuman va Jinoyat Moddasi:
                </span>
                <div className="text-foreground">
                  <div>Tuman: {selectedApp?.district?.name || '—'}</div>
                  <div className="font-mono text-primary mt-0.5">
                    Modda:{' '}
                    {selectedApp?.crime?.article
                      ? `${selectedApp.crime.article} - ${selectedApp.crime.title}`
                      : '—'}
                  </div>
                </div>
              </div>

              {/* Asosiy Karta */}
              {selectedApp?.card && (
                <div className="p-3 rounded-lg border border-border/60 bg-card/60 space-y-1 sm:col-span-2">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                    Asosiy Plastik Karta:
                  </span>
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-foreground">
                      {selectedApp.card.masked_number || selectedApp.card.card_number}
                    </span>
                    <span className="text-muted-foreground">
                      Bank: {selectedApp.card.bank?.name || '—'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Fields (Rasmlar, Fayllar, Qo'shimcha parametrlar) */}
            {selectedApp?.custom_fields && selectedApp.custom_fields.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/60">
                <span className="font-semibold text-foreground block">
                  Qo‘shimcha Maydonlar (Universal Custom Fields):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedApp.custom_fields.map((field, idx) => {
                    const isImages = field.type === 'IMAGES';
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-border/60 bg-card/60 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{field.label}</span>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {field.type}
                          </Badge>
                        </div>

                        {field.citizen && (
                          <div className="text-xs">
                            <span className="font-semibold text-primary">Fuqaro: </span>
                            {field.citizen.first_name} {field.citizen.last_name} (
                            {field.citizen.passport})
                          </div>
                        )}

                        {field.card && (
                          <div className="text-xs font-mono">
                            <span className="font-semibold text-primary">Karta: </span>
                            {field.card.masked_number || field.card.card_number} (
                            {field.card.bank?.name})
                          </div>
                        )}

                        {isImages && Array.isArray(field.value) ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {field.value.map((url: string, imgIdx: number) => (
                              <a
                                key={imgIdx}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="block rounded-lg overflow-hidden border border-border/80 hover:opacity-80 transition-opacity"
                              >
                                <img
                                  src={url}
                                  alt={`Dalil ${imgIdx + 1}`}
                                  className="h-16 w-16 object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        ) : field.value ? (
                          <p className="text-muted-foreground text-xs whitespace-pre-wrap">
                            {typeof field.value === 'object'
                              ? JSON.stringify(field.value, null, 2)
                              : String(field.value)}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDetailOpen(false)}
              className="text-xs"
            >
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deleteTargetId !== null} onOpenChange={() => setDeleteTargetId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Arizani o‘chirish</DialogTitle>
            <DialogDescription className="text-xs">
              Ushbu arizani butunlay o‘chirib tashlamoqchimisiz? Bu amal qaytarilmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTargetId(null)}
              className="text-xs"
            >
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
              disabled={deleteMutation.isPending}
              className="text-xs"
            >
              {deleteMutation.isPending ? 'O‘chirilmoqda...' : 'O‘chirish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
