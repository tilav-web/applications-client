import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Edit2, Plus, Tag, Trash2 } from 'lucide-react';
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
import { detectedCrimeStatusesApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { DetectedCrimeStatusItem } from '@/types/models';

const COLOR_OPTIONS = [
  { value: 'rose', label: 'Qizil (Fosh etildi)' },
  { value: 'amber', label: 'Sariq (Hujjatlashtirilmoqda)' },
  { value: 'blue', label: 'Ko‘k (Tergovda)' },
  { value: 'purple', label: 'Binafsha (Sudga yuborildi)' },
  { value: 'indigo', label: 'To‘q ko‘k (Boshqa organga)' },
  { value: 'emerald', label: 'Yashil (Yakunlandi)' },
];

export function DetectedCrimeStatusesReferenceTab() {
  const queryClient = useQueryClient();
  const { canWrite } = usePermissions();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DetectedCrimeStatusItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DetectedCrimeStatusItem | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState('rose');
  const [isDefault, setIsDefault] = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const [sortOrder, setSortOrder] = useState(10);

  const { data: items, isLoading } = useQuery({
    queryKey: ['detected-crime-statuses-all'],
    queryFn: () => detectedCrimeStatusesApi.getAll(true),
  });

  const openCreate = () => {
    setEditing(null);
    setName('');
    setCode('');
    setColor('blue');
    setIsDefault(false);
    setIsFinal(false);
    setSortOrder(10);
    setModalOpen(true);
  };

  const openEdit = (item: DetectedCrimeStatusItem) => {
    setEditing(item);
    setName(item.name);
    setCode(item.code || '');
    setColor(item.color || 'blue');
    setIsDefault(Boolean(item.is_default));
    setIsFinal(Boolean(item.is_final));
    setSortOrder(item.sort_order ?? 0);
    setModalOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        code: code.trim() || undefined,
        color,
        is_default: isDefault,
        is_final: isFinal,
        sort_order: Number(sortOrder) || 0,
      };
      return editing
        ? detectedCrimeStatusesApi.update(editing.id, payload)
        : detectedCrimeStatusesApi.create(payload);
    },
    onSuccess: () => {
      setModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['detected-crime-statuses-all'] });
      void queryClient.invalidateQueries({ queryKey: ['detected-crime-statuses-active'] });
      toast.success(editing ? 'Status yangilandi' : 'Yangi status qo‘shildi');
    },
    onError: (err) => toast.error('Xatolik', { description: getErrorMessage(err) }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => detectedCrimeStatusesApi.delete(id),
    onSuccess: () => {
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['detected-crime-statuses-all'] });
      void queryClient.invalidateQueries({ queryKey: ['detected-crime-statuses-active'] });
      toast.success('Status o‘chirildi');
    },
    onError: (err) => toast.error('O‘chirib bo‘lmadi', { description: getErrorMessage(err) }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canWrite && (
          <Button size="sm" onClick={openCreate} className="h-9 gap-1.5 text-xs cursor-pointer">
            <Plus className="h-4 w-4" />
            Yangi status qo‘shish
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card/60">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-[11px]">Status nomi</TableHead>
              <TableHead className="text-[11px]">Kod</TableHead>
              <TableHead className="text-[11px]">Turi</TableHead>
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
                    <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{item.name}</span>
                    {item.is_default && (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-primary border-primary/40"
                      >
                        Standart
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {item.code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.is_final ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Yakuniy holat
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Jarayondagi holat
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
              {editing ? 'Statusni tahrirlash' : 'Yangi aniqlangan jinoyat statusi'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Aniqlangan jinoyatlar bo‘limida qo‘llaniladigan alohida holat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Status nomi *</label>
              <Input
                placeholder="Masalan: Sudga yuborildi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Kod</label>
                <Input
                  placeholder="SUDGA_YUBORILDI"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Rangi</label>
                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                >
                  {COLOR_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                <span>Standart boshlang‘ich status</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFinal}
                  onChange={(e) => setIsFinal(e.target.checked)}
                />
                <span>Yakuniy (yopilgan) holat</span>
              </label>
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
        title="Statusni o‘chirish"
        description={`«${deleteTarget?.name || ''}» statusini o‘chirishni tasdiqlaysizmi?`}
        variant="destructive"
        isLoading={deleteMut.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
