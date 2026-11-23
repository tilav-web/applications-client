import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Clock,
  Edit2,
  ExternalLink,
  HardDrive,
  Radar,
  Trash2,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { SlaBadge } from '@/components/applications/sla-components';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { usePermissions } from '@/hooks/use-permissions';
import { detectedCrimesApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';

export function DetectedCrimeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canWrite } = usePermissions();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendDays, setExtendDays] = useState(30);
  const [extendReason, setExtendReason] = useState('');
  const [approvalNum, setApprovalNum] = useState('');

  const { data: item, isLoading } = useQuery({
    queryKey: ['detected-crime', id],
    queryFn: () => detectedCrimesApi.getOne(id as string),
    enabled: Boolean(id),
  });

  const deleteMut = useMutation({
    mutationFn: () => detectedCrimesApi.delete(id as string),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['detected-crimes'] });
      toast.success('Aniqlangan jinoyat o‘chirildi');
      navigate('/detected-crimes');
    },
    onError: (err) => toast.error('Xatolik', { description: getErrorMessage(err) }),
  });

  const extendMut = useMutation({
    mutationFn: () =>
      detectedCrimesApi.extendDeadline(id as string, {
        extend_days: extendDays,
        reason: extendReason,
        prosecutor_approval_number: approvalNum || undefined,
      }),
    onSuccess: () => {
      setExtendOpen(false);
      setExtendReason('');
      setApprovalNum('');
      void queryClient.invalidateQueries({ queryKey: ['detected-crime', id] });
      toast.success('Tekshiruv muddati JPK 329-modda bo‘yicha uzaytirildi');
    },
    onError: (err) => toast.error('Xatolik', { description: getErrorMessage(err) }),
  });

  if (isLoading || !item) {
    return (
      <div className="py-16 text-center text-xs text-muted-foreground">Ma’lumot yuklanmoqda...</div>
    );
  }

  const qualLabel =
    item.qualification_type === 'CRIMINAL'
      ? 'Jinoyat (JK)'
      : item.qualification_type === 'ADMINISTRATIVE'
        ? 'Ma’muriy (MJTK)'
        : 'Tergovga qadar tekshiruvda';

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/detected-crimes')}
            className="h-9 w-9 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-primary">
                {item.case_number || 'Kodsiz'}
              </span>
              <Badge variant="outline" className="text-[11px]">
                {qualLabel}
              </Badge>
              <Badge variant="outline" className="text-[11px]">
                {item.application_status?.name || 'Yangi'}
              </Badge>
              <SlaBadge app={item} />
            </div>
            <h1 className="text-lg font-bold mt-0.5">{item.title}</h1>
          </div>
        </div>

        {canWrite && (
          <div className="flex items-center gap-2">
            {item.application_status?.category !== 'CLOSED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExtendOpen(true)}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Clock className="h-3.5 w-3.5 text-indigo-600" />
                Muddatni uzaytirish
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/detected-crimes/${item.id}/edit`)}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Tahrirlash
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="h-8 text-xs gap-1.5 text-destructive border-destructive/30 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              O‘chirish
            </Button>
          </div>
        )}
      </div>

      {/* Asosiy ma'lumotlar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/80 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Radar className="h-4 w-4 text-rose-600" />
              Aniqlash va Bildirgi Rekvizitlari
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Aniqlangan sana</span>
              <span className="font-semibold">
                {new Date(item.detected_at).toLocaleDateString('uz-UZ')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Hudud</span>
              <span className="font-semibold">{item.district?.name || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Aniqlash usuli</span>
              <span className="font-semibold">{item.detection_source?.name || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Sohaviy xizmat</span>
              <span className="font-semibold">{item.department_service?.name || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Bildirgi (Raport) №</span>
              <span className="font-mono font-semibold">{item.report_number || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">KUSP / E-material №</span>
              <span className="font-mono font-semibold">{item.kusp_number || '—'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              Huquqiy Malaka, Platforma va Muddat
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">JK / MJTK moddasi</span>
              <span className="font-semibold text-primary">
                {item.crime?.article || item.mjtk_article || '—'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Protsessual muddat</span>
              <span className="font-semibold">
                {item.deadline_at ? new Date(item.deadline_at).toLocaleDateString('uz-UZ') : '—'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground block text-[11px]">Platforma / Manzil</span>
              <span className="font-mono font-semibold break-all">
                {[item.platform, item.channel_or_source_url].filter(Boolean).join(' — ') || '—'}
              </span>
            </div>
            {item.decision_type && (
              <div className="col-span-2 rounded-lg bg-muted/40 p-2">
                <span className="text-muted-foreground block text-[10px]">Yakuniy qaror</span>
                <span className="font-semibold">
                  {item.decision_type.name}
                  {item.decision_number ? ` (№ ${item.decision_number})` : ''}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fabula */}
      {item.description && (
        <Card className="border-border/80 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Fabula (Batafsil tavsif)</CardTitle>
          </CardHeader>
          <CardContent className="text-xs whitespace-pre-wrap leading-relaxed">
            {item.description}
          </CardContent>
        </Card>
      )}

      {/* Gumonlanuvchilar */}
      <Card className="border-border/80 bg-card/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Gumonlanuvchilar / Huquqbuzarlar ({item.suspects?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {item.suspects?.length ? (
            item.suspects.map((s) => (
              <div
                key={s.id || s.citizen_id}
                onClick={() => navigate(`/citizens/${s.citizen_id}`)}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 p-3 hover:bg-muted/40 cursor-pointer transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span>
                      {s.citizen
                        ? `${s.citizen.last_name || ''} ${s.citizen.first_name || ''} ${s.citizen.middle_name || ''}`.trim()
                        : 'Fuqaro'}
                    </span>
                    <ExternalLink className="h-3 w-3 text-primary" />
                    {s.is_repeat_offender && (
                      <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px] gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Takroriy
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {s.citizen?.passport || 'Pasport yo‘q'} •{' '}
                    {s.citizen?.phone_number || 'Tel yo‘q'}
                    {s.citizen?.workplace?.name ? ` • ${s.citizen.workplace.name}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    {s.role_in_crime}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {s.detention_status}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground italic">
              Gumonlanuvchilar hali biriktirilmagan
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ashyoviy dalillar */}
      <Card className="border-border/80 bg-card/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            Olib Qo‘yilgan Ashyoviy va Raqamli Dalillar ({item.evidences?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {item.evidences?.length ? (
            item.evidences.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 text-xs"
              >
                <div>
                  <span className="font-semibold">{ev.title}</span>
                  {ev.identifier_value && (
                    <span className="ml-2 font-mono text-[11px] text-primary">
                      {ev.identifier_value}
                    </span>
                  )}
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {ev.evidence_type}
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground italic">Dalillar kiritilmagan</div>
          )}
        </CardContent>
      </Card>

      {/* Uzaytirish modali */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Muddatni uzaytirish (JPK 329-modda)</DialogTitle>
            <DialogDescription className="text-xs">
              Prokuror roziligi bilan tekshiruv muddatini 30 kungacha uzaytiring.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Umumiy muddat (kun)</label>
              <Input
                type="number"
                value={extendDays}
                onChange={(e) => setExtendDays(Number(e.target.value) || 30)}
                className="h-9 font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Prokuror roziligi raqami</label>
              <Input
                placeholder="PR-2026/..."
                value={approvalNum}
                onChange={(e) => setApprovalNum(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Sabab *</label>
              <Input
                placeholder="Ekspertiza / qo‘shimcha tekshiruv..."
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setExtendOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              size="sm"
              disabled={!extendReason.trim() || extendMut.isPending}
              loading={extendMut.isPending}
              onClick={() => extendMut.mutate()}
            >
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Aniqlangan jinoyatni o‘chirish"
        description={`«${item.title}» yozuvini o‘chirishni tasdiqlaysizmi?`}
        variant="destructive"
        isLoading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  );
}
