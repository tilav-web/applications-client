import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Edit2,
  Eye,
  FileText,
  Filter,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
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
import { applicationsApi, applicationStatusesApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { cn } from '@/lib/utils';
import type { Application, ApplicationStatus, ApplicationStatusItem } from '@/types/models';

export function ApplicationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Statuses Query
  const { data: statusesData } = useQuery({
    queryKey: ['application-statuses-all'],
    queryFn: () => applicationStatusesApi.getAll({ limit: 100 }),
  });
  const allApplicationStatuses = statusesData?.items || [];

  // 1. Fetch Applications Query
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['applications', { page, limit, search, status: statusFilter }],
    queryFn: () =>
      applicationsApi.getAll({
        page,
        limit,
        search,
        status: statusFilter || undefined,
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
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full sm:max-w-lg lg:max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ariza raqami yoki tafsilot bo'yicha qidiruv..."
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

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9 text-xs gap-1.5 font-medium border-border/80 hover:bg-muted/80 shrink-0 cursor-pointer"
              title="Arizalar ro‘yxatini serverdan yangilash"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin text-primary')} />
              <span className="hidden sm:inline">Yangilash</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ariza Raqami</TableHead>
              <TableHead>Tafsilot & Xodim Qaydlari</TableHead>
              <TableHead>Holati</TableHead>
              <TableHead>Asosiy Arizachi</TableHead>
              <TableHead>Hudud & Jinoyat Turi</TableHead>
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
                  onClick={() => navigate(`/applications/${app.id}`)}
                >
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
                  <TableCell>
                    <div className="space-y-0.5 text-xs">
                      {app.district && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3 text-primary" />
                          <span>{app.district.name}</span>
                        </div>
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
                      onClick={() => navigate(`/applications/${app.id}`)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      title="Ko‘rish (Hujjat ko‘rinishi)"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/applications/create/${app.id}`)}
                      className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                      title="Tahrirlash"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTargetId(app.id)}
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
