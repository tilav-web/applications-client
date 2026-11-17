import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Search, UserCheck } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
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
import { useDebounce } from '@/hooks/use-debounce';
import { citizensApi, intelligenceApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { Citizen } from '@/types/models';

interface BindToCitizenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'card' | 'phone' | 'identifier';
  entityId: string;
  entityLabel: string;
  invalidateKeys: unknown[][];
}

export function BindToCitizenDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityLabel,
  invalidateKeys,
}: BindToCitizenDialogProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCitizenId, setSelectedCitizenId] = useState<string>('');
  const debouncedSearch = useDebounce(search, 250);

  const { data, isLoading } = useQuery({
    queryKey: ['citizens-picker', debouncedSearch],
    queryFn: () => citizensApi.getAll({ page: 1, limit: 20, search: debouncedSearch || undefined }),
    enabled: open,
  });

  const bindMutation = useMutation({
    mutationFn: () =>
      intelligenceApi.bindEntityToCitizen({
        entity_type: entityType,
        entity_id: entityId,
        citizen_id: selectedCitizenId,
      }),
    onSuccess: async (res) => {
      for (const key of invalidateKeys) {
        await queryClient.invalidateQueries({ queryKey: key });
      }
      toast.success(res.message || 'Muvaffaqiyatli biriktirildi');
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error('Biriktirishda xatolik', { description: getErrorMessage(err) });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <span>Fuqaro Profiliga Biriktirish</span>
          </DialogTitle>
          <DialogDescription>
            <strong>{entityLabel}</strong> rekvizitini bazadagi fuqaroga bogʻlang. Shundan soʻng
            barcha bogʻliq arizalar avtomatik zanjirlanadi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Fuqaro F.I.O, pasport, JSHSHIR yoki telefon..."
              className="pl-9"
            />
          </div>

          <div className="max-h-64 overflow-y-auto rounded-xl border border-border divide-y divide-border/60">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Yuklanmoqda...</div>
            ) : !data?.items?.length ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Fuqaro topilmadi</div>
            ) : (
              data.items.map((c: Citizen) => {
                const name =
                  [c.last_name, c.first_name, c.middle_name].filter(Boolean).join(' ') || 'Ismsiz';
                const active = selectedCitizenId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCitizenId(c.id)}
                    className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                      active ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-foreground">{name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {c.passport || 'Pasportsiz'} · {c.pinfl || 'JSHSHIR yoʻq'}{' '}
                        {c.phone_number ? `· +${c.phone_number}` : ''}
                      </p>
                    </div>
                    {active && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            onClick={() => bindMutation.mutate()}
            disabled={!selectedCitizenId || bindMutation.isPending}
            className="gap-2"
          >
            {bindMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Fuqaroga biriktirish</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
