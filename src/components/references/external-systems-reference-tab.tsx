import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Server, Trash2 } from 'lucide-react';
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
import { externalSystemsApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { ExternalSystem } from '@/types/models';

const COLOR_PRESETS = [
  '#2563EB', // Ko'k
  '#7C3AED', // Binafsha
  '#0891B2', // Moviy
  '#059669', // Yashil
  '#D97706', // Sariq-oltin
  '#DC2626', // Qizil
  '#4F46E5', // Indigo
  '#0F766E', // Zumrad
];

export function ExternalSystemsReferenceTab() {
  const queryClient = useQueryClient();
  const { canWrite } = usePermissions();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExternalSystem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExternalSystem | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#2563EB');
  const [sortOrder, setSortOrder] = useState(10);
  const [isActive, setIsActive] = useState(true);

  const { data: items, isLoading } = useQuery({
    queryKey: ['external-systems-all'],
    queryFn: () => externalSystemsApi.getAll(true),
  });

  const openCreate = () => {
    setEditing(null);
    setName('');
    setCode('');
    setDescription('');
    setColor(COLOR_PRESETS[(items?.length || 0) % COLOR_PRESETS.length]);
    setSortOrder((items?.length || 0) + 1);
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (item: ExternalSystem) => {
    setEditing(item);
    setName(item.name);
    setCode(item.code || '');
    setDescription(item.description || '');
    setColor(item.color || '#2563EB');
    setSortOrder(item.sort_order ?? 0);
    setIsActive(item.is_active !== false);
    setModalOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const payload: Partial<ExternalSystem> = {
        name: name.trim(),
        code: code.trim() || null,
        description: description.trim() || null,
        color: color.trim() || '#2563EB',
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      };
      return editing
        ? externalSystemsApi.update(editing.id, payload)
        : externalSystemsApi.create(payload);
    },
    onSuccess: () => {
      setModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['external-systems-all'] });
      void queryClient.invalidateQueries({ queryKey: ['external-systems-active'] });
      toast.success(editing ? 'Tashqi tizim yangilandi' : 'Yangi tashqi tizim qo‘shildi');
    },
    onError: (err) => toast.error('Xatolik', { description: getErrorMessage(err) }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => externalSystemsApi.delete(id),
    onSuccess: () => {
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['external-systems-all'] });
      void queryClient.invalidateQueries({ queryKey: ['external-systems-active'] });
      toast.success('Tashqi tizim o‘chirildi');
    },
    onError: (err) => toast.error('O‘chirib bo‘lmadi', { description: getErrorMessage(err) }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Arizalar qo‘shimcha kiritilishi kerak bo‘lgan tashqi tizimlar (CardBlock, E-Elektron,
          E-Material, CyberControl va b.). Ariza kiritishda qaysi tizimlarga kiritilganini belgilash
          va arizalar sahifasida kiritilmaganlarni filtrlash uchun ishlatiladi.
        </p>
        {canWrite && (
          <Button size="sm" onClick={openCreate} className="h-9 gap-1.5 text-xs cursor-pointer">
            <Plus className="h-4 w-4" />
            Yangi tashqi tizim
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card/60">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-[11px] w-12 text-center">#</TableHead>
              <TableHead className="text-[11px]">Tizim nomi</TableHead>
              <TableHead className="text-[11px]">Kodi</TableHead>
              <TableHead className="text-[11px]">Izoh</TableHead>
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
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color || '#2563EB' }}
                      />
                      <Server className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.code ? (
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {item.code}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[320px] truncate">
                    {item.description || '—'}
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
                  Tashqi tizimlar topilmadi
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
              {editing ? 'Tashqi tizimni tahrirlash' : 'Yangi tashqi tizim qo‘shish'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Masalan: CardBlock, E-Elektron, E-Material, CyberControl
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Tizim nomi *</label>
              <Input
                placeholder="Masalan: CardBlock"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Kod (ixtiyoriy)</label>
                <Input
                  placeholder="CARDBLOCK"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Tartib raqami</label>
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Izoh (ixtiyoriy)</label>
              <Input
                placeholder="Masalan: Bank kartalarini bloklash tizimi"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Belgi rangi</label>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setColor(preset)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform cursor-pointer ${
                      color === preset ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: preset }}
                    title={preset}
                  />
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1 cursor-pointer select-none text-xs">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span>Faol (ariza yaratish va filtrda ko‘rinsin)</span>
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              className="cursor-pointer"
            >
              Bekor qilish
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!name.trim() || saveMut.isPending}
              onClick={() => saveMut.mutate()}
              className="cursor-pointer"
            >
              {saveMut.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Tashqi tizimni o‘chirish"
        description={`«${deleteTarget?.name || ''}» tashqi tizimini o‘chirishni tasdiqlaysizmi? Agar unga faol arizalar bog‘langan bo‘lsa, tizim o‘chirishga ruxsat bermaydi (nofaol qilib qo‘yishingiz mumkin).`}
        variant="destructive"
        isLoading={deleteMut.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
