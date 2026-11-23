import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Radar, Trash2 } from 'lucide-react';
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
import { detectionSourcesApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { DetectionSource } from '@/types/models';

export function DetectionSourcesReferenceTab() {
  const queryClient = useQueryClient();
  const { canWrite } = usePermissions();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DetectionSource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DetectionSource | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState(10);

  const { data: items, isLoading } = useQuery({
    queryKey: ['detection-sources-all'],
    queryFn: () => detectionSourcesApi.getAll(true),
  });

  const openCreate = () => {
    setEditing(null);
    setName('');
    setCode('');
    setDescription('');
    setSortOrder(10);
    setModalOpen(true);
  };

  const openEdit = (item: DetectionSource) => {
    setEditing(item);
    setName(item.name);
    setCode(item.code || '');
    setDescription(item.description || '');
    setSortOrder(item.sort_order ?? 0);
    setModalOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        sort_order: Number(sortOrder) || 0,
      };
      return editing
        ? detectionSourcesApi.update(editing.id, payload)
        : detectionSourcesApi.create(payload);
    },
    onSuccess: () => {
      setModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['detection-sources-all'] });
      void queryClient.invalidateQueries({ queryKey: ['detection-sources-active'] });
      toast.success(editing ? 'Aniqlash usuli yangilandi' : 'Yangi aniqlash usuli qo‘shildi');
    },
    onError: (err) => toast.error('Xatolik', { description: getErrorMessage(err) }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => detectionSourcesApi.delete(id),
    onSuccess: () => {
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['detection-sources-all'] });
      void queryClient.invalidateQueries({ queryKey: ['detection-sources-active'] });
      toast.success('Aniqlash usuli o‘chirildi');
    },
    onError: (err) => toast.error('O‘chirib bo‘lmadi', { description: getErrorMessage(err) }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canWrite && (
          <Button size="sm" onClick={openCreate} className="h-9 gap-1.5 text-xs cursor-pointer">
            <Plus className="h-4 w-4" />
            Yangi aniqlash usuli
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card/60">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-[11px]">Nomi</TableHead>
              <TableHead className="text-[11px]">Kod</TableHead>
              <TableHead className="text-[11px]">Izoh</TableHead>
              {canWrite && <TableHead className="text-[11px] text-right w-24">Amallar</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">
                  Yuklanmoqda...
                </TableCell>
              </TableRow>
            ) : (items || []).length ? (
              (items || []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs font-semibold flex items-center gap-2">
                    <Radar className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    {item.name}
                  </TableCell>
                  <TableCell>
                    {item.code ? (
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {item.code}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.description || '—'}
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
                <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">
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
              {editing ? 'Aniqlash usulini tahrirlash' : 'Yangi aniqlash usuli'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Jinoyat qanday manba/usul orqali aniqlanganini belgilash uchun ishlatiladi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Nomi *</label>
              <Input
                placeholder="Masalan: Kiber-monitoring..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Kod</label>
                <Input
                  placeholder="CYBER_MONITORING"
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
            <div className="space-y-1">
              <label className="text-xs font-semibold">Izoh</label>
              <Input
                placeholder="Huquqiy asos yoki tavsif..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
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
        title="Aniqlash usulini o‘chirish"
        description={`«${deleteTarget?.name || ''}» aniqlash usulini o‘chirishni tasdiqlaysizmi?`}
        variant="destructive"
        isLoading={deleteMut.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
