import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Edit2,
  Loader2,
  Lock,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
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
import { useDebounce } from '@/hooks/use-debounce';
import { type UserItem, usersApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { useAuthStore } from '@/store';

export function UsersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'OPERATOR',
    first_name: '',
    last_name: '',
    phone_number: '',
  });

  // Query: Users list
  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, limit, search: debouncedSearch }],
    queryFn: () =>
      usersApi.getAll({
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  // Mutation: Create user
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Foydalanuvchi muvaffaqiyatli yaratildi');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err) => {
      toast.error('Xatolik yuz berdi', {
        description: getErrorMessage(err),
      });
    },
  });

  // Mutation: Update user
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Foydalanuvchi ma’lumotlari yangilandi');
      setEditingUser(null);
      resetForm();
    },
    onError: (err) => {
      toast.error('Xatolik yuz berdi', {
        description: getErrorMessage(err),
      });
    },
  });

  // Mutation: Delete user
  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Foydalanuvchi tizimdan o‘chirildi');
      setDeleteTargetId(null);
    },
    onError: (err) => {
      toast.error('Xatolik yuz berdi', {
        description: getErrorMessage(err),
      });
    },
  });

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      role: 'OPERATOR',
      first_name: '',
      last_name: '',
      phone_number: '',
    });
  };

  const handleOpenEdit = (user: UserItem) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone_number: user.phone_number || '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const updatePayload: Record<string, string> = {
        username: formData.username,
        role: formData.role,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
      };
      if (formData.password.trim()) {
        updatePayload.password = formData.password.trim();
      }
      updateMutation.mutate({ id: editingUser.id, data: updatePayload });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <Badge className="bg-rose-500/10 text-rose-600 border border-rose-200 dark:border-rose-900/50 text-[10px] font-mono">
            SUPER ADMIN
          </Badge>
        );
      case 'ADMIN':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-900/50 text-[10px] font-mono">
            ADMIN
          </Badge>
        );
      case 'INSPECTOR':
        return (
          <Badge className="bg-purple-500/10 text-purple-600 border border-purple-200 dark:border-purple-900/50 text-[10px] font-mono">
            INSPEKTOR
          </Badge>
        );
      case 'OPERATOR':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border border-blue-200 dark:border-blue-900/50 text-[10px] font-mono">
            OPERATOR
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] font-mono">
            {role}
          </Badge>
        );
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('uz-UZ', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary mb-1">
            <Activity className="h-3.5 w-3.5" />
            <span>Foydalanuvchilar & Boshqaruv</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Foydalanuvchilar</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Arizalar bazasi tizimiga kirish huquqiga ega bo‘lgan barcha foydalanuvchilar va ularning
            rollari
          </p>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          className="gap-2 shadow-sm font-semibold shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Foydalanuvchi qo‘shish</span>
        </Button>
      </div>

      {/* Search & Actions Bar */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Username, F.I.SH yoki telefon bo‘yicha qidiruv..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="text-xs text-muted-foreground">
            Jami: <strong className="text-foreground">{data?.meta?.total ?? 0}</strong> nafar
            foydalanuvchi
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>F.I.SH & Username</TableHead>
              <TableHead>Roli</TableHead>
              <TableHead>Telefon Raqami</TableHead>
              <TableHead>Ro‘yxatdan o‘tgan sana</TableHead>
              <TableHead className="text-right">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <div className="inline-flex items-center gap-2 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Foydalanuvchilar ro‘yxati yuklanmoqda...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : data?.items?.length ? (
              data.items.map((user: UserItem, index: number) => {
                const isCurrent = currentUser?.id === user.id;
                const fullName =
                  user.first_name || user.last_name
                    ? `${user.last_name || ''} ${user.first_name || ''}`.trim()
                    : '—';
                const rowNum = (page - 1) * limit + index + 1;

                return (
                  <TableRow
                    key={user.id}
                    className={`hover:bg-muted/40 transition-colors ${
                      isCurrent ? 'bg-primary/[0.03]' : ''
                    }`}
                  >
                    <TableCell className="text-center font-mono text-muted-foreground text-xs">
                      {rowNum}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground text-xs">
                              {fullName}
                            </span>
                            {isCurrent && (
                              <Badge
                                variant="outline"
                                className="text-[9px] bg-primary/10 text-primary border-primary/30 py-0 px-1"
                              >
                                Siz
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>{getRoleBadge(user.role)}</TableCell>

                    <TableCell>
                      {user.phone_number ? (
                        <div className="flex items-center gap-1.5 text-xs text-foreground font-mono">
                          <Phone className="h-3 w-3 text-primary shrink-0" />
                          <span>{user.phone_number}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {formatDate(user.created_at)}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          title="Tahrirlash"
                          onClick={() => handleOpenEdit(user)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          title={isCurrent ? 'O‘zingizni o‘chira olmaysiz' : 'O‘chirish'}
                          disabled={isCurrent}
                          onClick={() => setDeleteTargetId(user.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <div className="space-y-1">
                    <UserCheck className="h-6 w-6 mx-auto text-muted-foreground/60 mb-2" />
                    <p className="text-xs font-semibold text-foreground">
                      Hech qanday foydalanuvchi topilmadi
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Qidiruv so‘rovingizni o‘zgartirib ko‘ring yoki yangi foydalanuvchi qo‘shing
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {data?.meta && (
          <PaginationBar
            page={page}
            totalPages={data.meta.totalPages}
            total={data.meta.total}
            limit={limit}
            hasNextPage={data.meta.hasNextPage}
            hasPreviousPage={data.meta.hasPreviousPage}
            onPageChange={(p) => setPage(p)}
            isLoading={isLoading}
          />
        )}
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog
        open={isCreateOpen || !!editingUser}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingUser(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>
                {editingUser ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi qo‘shish'}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingUser
                ? 'Foydalanuvchi ma’lumotlarini yangilash uchun maydonlarni to‘ldiring'
                : 'Tizimga kirish huquqiga ega yangi xodim akkauntini yarating'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Ism</label>
                <Input
                  placeholder="Ali"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Familiya</label>
                <Input
                  placeholder="Valiyev"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Login (Username) *</label>
                <Input
                  placeholder="ali_operator"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Telefon raqami</label>
                <Input
                  placeholder="+998901234567"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Parol {editingUser ? '(O‘zgartirilmasa bo‘sh qoldiring)' : '*'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    minLength={6}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Tizimdagi Roli *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="OPERATOR">Operator</option>
                  <option value="INSPECTOR">Inspektor</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="USER">Oddiy foydalanuvchi</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingUser(null);
                  resetForm();
                }}
              >
                Bekor qilish
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="gap-1.5"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                <span>{editingUser ? 'Saqlash' : 'Yaratish'}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2 text-base">
              <Trash2 className="h-4 w-4" />
              <span>Foydalanuvchini o‘chirish</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ushbu foydalanuvchini tizimdan o‘chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib
              bo‘lmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTargetId(null)}
              disabled={deleteMutation.isPending}
            >
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
              disabled={deleteMutation.isPending}
              className="gap-1.5"
            >
              {deleteMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>O‘chirish</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
