import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AtSign,
  Crown,
  Edit2,
  Loader2,
  Lock,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DistrictSearchSelect } from '@/components/ui/district-search-select';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
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
import { FilterInput, FilterSelect, TableFilterPanel } from '@/components/ui/table-filter-panel';
import {
  TableActionSelect,
  TableCheckbox,
  useTableSelection,
} from '@/components/ui/table-selection-bar';
import { useDebounce } from '@/hooks/use-debounce';
import { districtsApi, type UserItem, usersApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store';

export function UsersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  // Alohida aniq filtrlar (AND mantiqida birgalikda ishlaydi)
  const [fullNameFilter, setFullNameFilter] = useState('');
  const debouncedFullName = useDebounce(fullNameFilter, 300);
  const [usernameFilter, setUsernameFilter] = useState('');
  const debouncedUsername = useDebounce(usernameFilter, 300);
  const [phoneFilter, setPhoneFilter] = useState('');
  const debouncedPhone = useDebounce(phoneFilter, 300);
  const [roleFilter, setRoleFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const activeFiltersCount = [
    Boolean(fullNameFilter.trim()),
    Boolean(usernameFilter.trim()),
    Boolean(phoneFilter.trim()),
    Boolean(roleFilter),
    Boolean(districtFilter),
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    setFullNameFilter('');
    setUsernameFilter('');
    setPhoneFilter('');
    setRoleFilter('');
    setDistrictFilter('');
    setPage(1);
  };

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    username: string;
    password: string;
    role: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    assigned_district_ids: string[];
  }>({
    username: '',
    password: '',
    role: 'STAFF',
    first_name: '',
    last_name: '',
    phone_number: '',
    assigned_district_ids: [],
  });

  // Query: All Districts for District Officer assignment (faqat Qashqadaryo bo'limlari)
  const { data: districtsData } = useQuery({
    queryKey: ['districts-for-users'],
    queryFn: () => districtsApi.getAll({ limit: 500 }),
  });
  const rawDistricts = districtsData?.items || [];
  const qashqadaryoDistricts = rawDistricts.filter(
    (d) => !d.region || d.region.code === 'QASHQADARYO',
  );
  const allDistricts = qashqadaryoDistricts.length > 0 ? qashqadaryoDistricts : rawDistricts;

  // Query: Users list
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      'users',
      {
        page,
        limit,
        full_name: debouncedFullName,
        username: debouncedUsername,
        phone_number: debouncedPhone,
        role: roleFilter,
        district_id: districtFilter,
      },
    ],
    queryFn: () =>
      usersApi.getAll({
        page,
        limit,
        full_name: debouncedFullName.trim() || undefined,
        username: debouncedUsername.trim() || undefined,
        phone_number: debouncedPhone.trim() || undefined,
        role: roleFilter || undefined,
        district_id: districtFilter || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const selection = useTableSelection(data?.items || []);

  // Mutation: Create user
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Hodim muvaffaqiyatli yaratildi');
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
      toast.success('Hodim ma’lumotlari yangilandi');
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
      toast.success('Hodim tizimdan o‘chirildi');
      selection.clearSelection();
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
      role: 'STAFF',
      first_name: '',
      last_name: '',
      phone_number: '',
      assigned_district_ids: [],
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
      assigned_district_ids: user.assigned_districts?.map((d) => d.id) || [],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (createMutation.isPending || updateMutation.isPending) return;
    if (editingUser) {
      const updatePayload: Record<string, unknown> = {
        username: formData.username,
        role: formData.role,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
        assigned_district_ids:
          formData.role === 'DISTRICT_OFFICER' ? formData.assigned_district_ids : [],
      };
      if (formData.password.length > 0) {
        updatePayload.password = formData.password;
      }
      updateMutation.mutate({ id: editingUser.id, data: updatePayload });
    } else {
      createMutation.mutate({
        ...formData,
        assigned_district_ids:
          formData.role === 'DISTRICT_OFFICER' ? formData.assigned_district_ids : [],
      });
    }
  };

  const getRoleBadge = (
    role: string,
    assignedDistricts?: { id: string; name: string | null }[],
    isRoot?: boolean,
  ) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="bg-rose-500/10 text-rose-600 border border-rose-200 dark:border-rose-900/50 text-[10px] font-mono">
              SUPER ADMIN
            </Badge>
            {isRoot && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300/60 dark:border-amber-800 text-[10px] font-mono gap-1">
                <Crown className="h-2.5 w-2.5" />
                ROOT
              </Badge>
            )}
          </div>
        );
      case 'BOSS':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-900/50 text-[10px] font-mono">
            RAHBAR (READ-ONLY)
          </Badge>
        );
      case 'STAFF':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border border-blue-200 dark:border-blue-900/50 text-[10px] font-mono">
            NAVBATCHI HODIM
          </Badge>
        );
      case 'DISTRICT_OFFICER':
        return (
          <div className="space-y-1">
            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-900/50 text-[10px] font-mono">
              HUDUDIY HODIM
            </Badge>
            {assignedDistricts && assignedDistricts.length > 0 ? (
              <div className="flex flex-wrap gap-1 max-w-[200px]">
                {assignedDistricts.map((d) => (
                  <span
                    key={d.id}
                    className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium"
                  >
                    {d.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-amber-600 font-medium">Tuman biriktirilmagan</div>
            )}
          </div>
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
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Hodimlar</h1>

        <Button
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          className="gap-2 shadow-sm font-semibold shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Hodim qo‘shish</span>
        </Button>
      </div>

      {/* 1. ALOHIDA YUQORI FILTR VA AMALLAR PANELI */}
      <TableFilterPanel
        title="Hodimlarni aniq filtrlash"
        activeFiltersCount={activeFiltersCount}
        onClearAll={handleClearFilters}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        gridClassName="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
        rightExtraSlot={
          <span className="text-xs text-muted-foreground mr-1">
            Jami: <strong className="text-foreground">{data?.meta?.total ?? 0}</strong> nafar
          </span>
        }
        selectionSlot={
          <TableActionSelect
            selectedCount={selection.selectedIds.length}
            singleLabel={selection.singleSelected ? `@${selection.singleSelected.username}` : null}
            onClear={selection.clearSelection}
          >
            {selection.singleSelected ? (
              <>
                <DropdownMenuItem
                  onClick={() => handleOpenEdit(selection.singleSelected!)}
                  className="gap-2 cursor-pointer text-xs py-2"
                >
                  <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                  <span>Tahrirlash</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  disabled={
                    currentUser?.id === selection.singleSelected.id ||
                    Boolean(selection.singleSelected.is_root)
                  }
                  onClick={() => setDeleteTargetId(selection.singleSelected!.id)}
                  className="gap-2 cursor-pointer text-xs py-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>O‘chirish</span>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem
                onClick={async () => {
                  const protectedIds = new Set(
                    (data?.items || []).filter((u) => u.is_root).map((u) => u.id),
                  );
                  const deletable = selection.selectedIds.filter(
                    (id) => id !== currentUser?.id && !protectedIds.has(id),
                  );
                  if (deletable.length === 0) {
                    toast.error('Asosiy (Root) Super Admin yoki o‘z hisobingizni o‘chira olmaysiz');
                    return;
                  }
                  try {
                    await Promise.all(deletable.map((id) => usersApi.delete(id)));
                    await queryClient.invalidateQueries({ queryKey: ['users'] });
                    toast.success(`${deletable.length} ta hodim o‘chirildi`);
                    selection.clearSelection();
                  } catch (err) {
                    toast.error('Xatolik yuz berdi', { description: getErrorMessage(err) });
                  }
                }}
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
          label="Hodim F.I.SH"
          value={fullNameFilter}
          onChange={(v) => {
            setFullNameFilter(v);
            setPage(1);
          }}
          placeholder="Familiya yoki ism..."
          icon={<User className="h-3.5 w-3.5" />}
        />

        <FilterInput
          label="Login (@username)"
          value={usernameFilter}
          onChange={(v) => {
            setUsernameFilter(v);
            setPage(1);
          }}
          placeholder="username..."
          icon={<AtSign className="h-3.5 w-3.5" />}
          mono
        />

        <FilterInput
          label="Telefon raqami"
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
          label="Roli"
          value={roleFilter}
          onChange={(v) => {
            setRoleFilter(v);
            setPage(1);
          }}
        >
          <option value="">Barcha rollar</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="BOSS">Rahbar</option>
          <option value="STAFF">Navbatchi hodim</option>
          <option value="DISTRICT_OFFICER">Hududiy hodim</option>
        </FilterSelect>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground block">
            Biriktirilgan tuman
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
      </TableFilterPanel>

      {/* 2. ALOHIDA AJRATILGAN HODIMLAR JADVALI */}
      <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-11 text-center sticky left-0 z-10 bg-muted/95 backdrop-blur-xs">
                <div className="flex items-center justify-center">
                  <TableCheckbox
                    checked={selection.allSelected}
                    indeterminate={selection.someSelected}
                    onChange={selection.toggleAll}
                    ariaLabel="Barcha hodimlarni tanlash"
                  />
                </div>
              </TableHead>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>F.I.SH & Username</TableHead>
              <TableHead>Roli</TableHead>
              <TableHead>Telefon Raqami</TableHead>
              <TableHead>Ro‘yxatdan o‘tgan sana</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <div className="inline-flex items-center gap-2 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Hodimlar ro‘yxati yuklanmoqda...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : data?.items?.length ? (
              data.items.map((user: UserItem, index: number) => {
                const isCurrent = currentUser?.id === user.id;
                const selected = selection.isSelected(user.id);
                const fullName =
                  user.first_name || user.last_name
                    ? `${user.last_name || ''} ${user.first_name || ''}`.trim()
                    : '—';
                const rowNum = (page - 1) * limit + index + 1;

                return (
                  <TableRow
                    key={user.id}
                    onClick={() => selection.toggleOne(user.id)}
                    className={cn(
                      'cursor-pointer transition-colors',
                      selected
                        ? 'bg-primary/[0.08] hover:bg-primary/[0.12]'
                        : isCurrent
                          ? 'bg-primary/[0.03] hover:bg-muted/40'
                          : 'hover:bg-muted/40',
                    )}
                  >
                    <TableCell
                      className={cn(
                        'w-11 text-center sticky left-0 z-10 backdrop-blur-xs',
                        selected ? 'bg-primary/[0.08]' : 'bg-card/95',
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        selection.toggleOne(user.id);
                      }}
                    >
                      <div className="flex items-center justify-center">
                        <TableCheckbox
                          checked={selected}
                          onChange={() => selection.toggleOne(user.id)}
                          ariaLabel={`@${user.username} ni tanlash`}
                        />
                      </div>
                    </TableCell>

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

                    <TableCell>
                      {getRoleBadge(user.role, user.assigned_districts, user.is_root)}
                    </TableCell>

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
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <div className="space-y-1">
                    <UserCheck className="h-6 w-6 mx-auto text-muted-foreground/60 mb-2" />
                    <p className="text-xs font-semibold text-foreground">
                      Hech qanday hodim topilmadi
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Qidiruv so‘rovingizni o‘zgartirib ko‘ring yoki yangi hodim qo‘shing
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
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
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
        <DialogContent className="sm:max-w-xl md:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span>{editingUser ? 'Hodimni tahrirlash' : 'Yangi hodim qo‘shish'}</span>
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Hodim ma’lumotlarini yangilash uchun maydonlarni to‘ldiring'
                : 'Tizimga kirish huquqiga ega yangi hodim akkauntini yarating'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <fieldset
              disabled={createMutation.isPending || updateMutation.isPending}
              className="space-y-4 border-0 p-0 m-0"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Ism *</label>
                  <Input
                    placeholder="Ali"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="h-10 text-xs sm:text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Familiya *</label>
                  <Input
                    placeholder="Valiyev"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="h-10 text-xs sm:text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Login (Username) *
                  </label>
                  <Input
                    placeholder="ali_operator"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    className="h-10 text-xs sm:text-sm font-mono font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Telefon raqami</label>
                  <Input
                    placeholder="+998901234567"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="h-10 text-xs sm:text-sm font-mono font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Parol {editingUser ? '(O‘zgartirilmasa bo‘sh qoldiring)' : '*'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingUser}
                      minLength={8}
                      className="h-10 pl-9 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Tizimdagi Roli *</label>
                  <select
                    value={formData.role}
                    disabled={Boolean(editingUser?.is_root)}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs sm:text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="SUPER_ADMIN">
                      Super Admin (To‘liq boshqaruv, hodimlarni boshqarish faqat Root ga tegishli)
                    </option>
                    <option value="BOSS">Rahbar (Faqat statistika va hisobotlar, Read-Only)</option>
                    <option value="STAFF">
                      Navbatchi hodim (Barcha arizalar va ma’lumotnomalar boshqaruvi)
                    </option>
                    <option value="DISTRICT_OFFICER">
                      Hududiy hodim (Faqat biriktirilgan tumanlar)
                    </option>
                  </select>
                  {editingUser?.is_root && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      Asosiy (Root) Super Admin roli o‘zgartirilmaydi
                    </p>
                  )}
                </div>
              </div>

              {formData.role === 'DISTRICT_OFFICER' && (
                <div className="space-y-2 border border-border/70 rounded-xl p-3.5 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      Biriktirilgan Tumanlar ({formData.assigned_district_ids.length} ta tanlandi) *
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            assigned_district_ids: allDistricts.map((d) => d.id),
                          })
                        }
                        className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                      >
                        Barchasini tanlash
                      </button>
                      <span className="text-muted-foreground text-xs">|</span>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            assigned_district_ids: [],
                          })
                        }
                        className="text-[11px] text-muted-foreground hover:underline cursor-pointer"
                      >
                        Tozalash
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                    {allDistricts.map((district) => {
                      const isChecked = formData.assigned_district_ids.includes(district.id);
                      return (
                        <label
                          key={district.id}
                          className={`flex items-center gap-2 text-xs p-2 rounded-lg border cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-primary/10 border-primary/40 text-primary font-semibold'
                              : 'bg-background hover:bg-muted border-input text-foreground'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  assigned_district_ids: [
                                    ...formData.assigned_district_ids,
                                    district.id,
                                  ],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  assigned_district_ids: formData.assigned_district_ids.filter(
                                    (id) => id !== district.id,
                                  ),
                                });
                              }
                            }}
                            className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <span className="truncate">{district.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  {formData.assigned_district_ids.length === 0 && (
                    <p className="text-[11px] text-rose-500 font-medium">
                      Diqqat: Kamida bitta tuman biriktirilishi lozim, aks holda xodim arizalarni
                      ko‘ra olmaydi!
                    </p>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  className="text-xs sm:text-sm h-10 px-5 cursor-pointer font-medium"
                >
                  Bekor qilish
                </Button>
                <Button
                  type="submit"
                  size="default"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="text-xs sm:text-sm h-10 px-6 font-semibold shadow-md shadow-primary/25 cursor-pointer gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <span>{editingUser ? 'O‘zgarishlarni Saqlash' : 'Akkauntni Yaratish'}</span>
                </Button>
              </DialogFooter>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2 text-lg font-bold">
              <Trash2 className="h-5 w-5" />
              <span>Hodimni o‘chirish</span>
            </DialogTitle>
            <DialogDescription>
              Ushbu hodimni tizimdan o‘chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo‘lmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="default"
              onClick={() => setDeleteTargetId(null)}
              disabled={deleteMutation.isPending}
              className="text-xs sm:text-sm h-10 px-4 cursor-pointer font-medium"
            >
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              size="default"
              onClick={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
              disabled={deleteMutation.isPending}
              className="text-xs sm:text-sm h-10 px-5 font-semibold cursor-pointer shadow-md shadow-red-500/20 gap-2"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Ha, o‘chirish</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
