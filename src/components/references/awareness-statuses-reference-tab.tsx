import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Edit2, Megaphone, Plus, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePermissions } from '@/hooks/use-permissions';
import { awarenessStatusesApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { AwarenessStatus } from '@/types/models';

export function AwarenessStatusesReferenceTab() {
  const queryClient = useQueryClient();
  const { canWrite } = usePermissions();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AwarenessStatus | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AwarenessStatus | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isInformed, setIsInformed] = useState(true);
  const [sourceChannel, setSourceChannel] = useState('IIB');
  const [sortOrder, setSortOrder] = useState(10);
  const [isActive, setIsActive] = useState(true);

  const { data: items, isLoading } = useQuery({
    queryKey: ['awareness-statuses-all'],
    queryFn: () => awarenessStatusesApi.getAll(true),
  });

  const openCreate = () => {
    setEditing(null);
    setName('');
    setCode('');
    setIsInformed(true);
    setSourceChannel('IIB');
    setSortOrder((items?.length || 0) + 1);
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (item: AwarenessStatus) => {
    setEditing(item);
    setName(item.name);
    setCode(item.code || '');
    setIsInformed(Boolean(item.is_informed));
    setSourceChannel(item.source_channel || '');
    setSortOrder(item.sort_order ?? 0);
    setIsActive(item.is_active !== false);
    setModalOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const payload: Partial<AwarenessStatus> = {
        name: name.trim(),
        code: code.trim() || null,
        is_informed: isInformed,
        source_channel: isInformed ? sourceChannel.trim() || null : null,
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      };
      return editing
        ? awarenessStatusesApi.update(editing.id, payload)
        : awarenessStatusesApi.create(payload);
    },
    onSuccess: () => {
      setModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['awareness-statuses-all'] });
      void queryClient.invalidateQueries({ queryKey: ['awareness-statuses-active'] });
      toast.success(editing ? 'Targ‘ibot holati yangilandi' : 'Yangi targ‘ibot holati qo‘shildi');
    },
    onError: (err) => toast.error('Xatolik', { description: getErrorMessage(err) }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => awarenessStatusesApi.delete(id),
    onSuccess: () => {
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['awareness-statuses-all'] });
      void queryClient.invalidateQueries({ queryKey: ['awareness-statuses-active'] });
      toast.success('Targ‘ibot holati o‘chirildi');
    },
    onError: (err) => toast.error('O‘chirib bo‘lmadi', { description: getErrorMessage(err) }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Ariza kiritishda fuqaro kiberxavfsizlik bo‘yicha targ‘ibot qilinganligi va qanday holatda
          jabrlanganini qayd etish uchun ishlatiladi.
        </p>
        {canWrite && (
          <Button size="sm" onClick={openCreate} className="h-9 gap-1.5 text-xs cursor-pointer">
            <Plus className="h-4 w-4" />
            Yangi targ‘ibot holati
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card/60">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-[11px] w-12 text-center">#</TableHead>
              <TableHead className="text-[11px]">Targ‘ibot holati nomi</TableHead>
              <TableHead className="text-[11px]">Turi</TableHead>
              <TableHead className="text-[11px]">Manba kanali</TableHead>
              <TableHead className="text-[11px]">Holat</TableHead>
              {canWrite && <TableHead className="text-[11px] text-right w-24">Amallar</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                  Yuklanmoqda...
                </TableCell>
              </TableRow>
            ) : (items || []).length ? (
              (items || []).map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">
                    {item.sort_order ?? idx + 1}
                  </TableCell>
                  <TableCell className="text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.is_informed ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Targ‘ibot qilingan
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1">
                        <XCircle className="h-3 w-3" />
                        Qilinmagan
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.source_channel ? (
                      <Badge variant="outline" className="text-[10px] font-medium">
                        {item.source_channel}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.is_active !== false ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      >
                        Faol
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                        Nofaol
                      </Badge>
                    )}
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 cursor-pointer"
                          onClick={() => openEdit(item)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive cursor-pointer"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                  Ma’lumot topilmadi
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editing ? 'Targ‘ibot holatini tahrirlash' : 'Yangi targ‘ibot holati'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Masalan: «IIB targ‘ibot qilgan, bilmasdan bosgan yoki tashlab bergan»
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Nomi *</label>
              <Input
                placeholder="Masalan: IIB targ'ibot qilgan, APK faylni bosgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Targ‘ibot holati turi *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsInformed(true)}
                  className={`h-9 rounded-md border text-xs font-semibold transition-colors cursor-pointer ${
                    isInformed
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-background text-foreground border-input hover:bg-muted'
                  }`}
                >
                  Ha — targ‘ibot qilingan
                </button>
                <button
                  type="button"
                  onClick={() => setIsInformed(false)}
                  className={`h-9 rounded-md border text-xs font-semibold transition-colors cursor-pointer ${
                    !isInformed
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-background text-foreground border-input hover:bg-muted'
                  }`}
                >
                  Yo‘q — qilinmagan
                </button>
              </div>
            </div>

            {isInformed && (
              <div className="space-y-1">
                <label className="text-xs font-semibold">Manba kanali</label>
                <select
                  value={sourceChannel}
                  onChange={(e) => setSourceChannel(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="IIB">IIB (Ichki ishlar organlari)</option>
                  <option value="Onlayn">Onlayn (OAV / Telegram / Ijtimoiy tarmoqlar)</option>
                  <option value="Mahalla">Mahalla / Jamoat tashkilotlari</option>
                  <option value="Bank">Bank / To‘lov tizimi ogohlantirishi</option>
                  <option value="Boshqa">Boshqa</option>
                  <option value="">Ko‘rsatilmagan</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Kod (ixtiyoriy)</label>
                <Input
                  placeholder="IIB_CLICKED_OR_SHARED"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Tartib</label>
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-input"
              />
              <span>Faol (ariza yaratishda ko‘rinadi)</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              size="sm"
              disabled={!name.trim() || saveMut.isPending}
              loading={saveMut.isPending}
              onClick={() => saveMut.mutate()}
            >
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Targ‘ibot holatini o‘chirish"
        description={`«${deleteTarget?.name || ''}» targ‘ibot holatini o‘chirishni tasdiqlaysizmi?`}
        variant="destructive"
        isLoading={deleteMut.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
