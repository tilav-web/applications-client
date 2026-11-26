import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Edit2,
  FileText,
  Globe,
  HardDrive,
  Loader2,
  Paperclip,
  Plus,
  Printer,
  Radar,
  RefreshCw,
  Scale,
  ShieldAlert,
  Trash2,
  TrendingUp,
  UploadCloud,
  Users,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { SuspectTreeBuilder } from '@/components/applications/suspect-tree-builder';
import { CreateWordDialog } from '@/components/documents/create-word-dialog';
import { DocumentEditorModal } from '@/components/documents/document-editor-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/sonner';
import { usePermissions } from '@/hooks/use-permissions';
import { detectedCrimesApi, detectedCrimeStatusesApi, documentsApi, filesApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { cn } from '@/lib/utils';
import type { DetectedCrimeStatusItem } from '@/types/models';

const formatCurrency = (amount?: number | string | null) => {
  if (amount === undefined || amount === null || amount === '') return '0 UZS';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0 UZS';
  return `${new Intl.NumberFormat('uz-UZ').format(Math.round(num))} UZS`;
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export function DetectedCrimeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canWrite } = usePermissions();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeEditingDocId, setActiveEditingDocId] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<{ id: string; title: string } | null>(null);
  const [wordDialogState, setWordDialogState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'upload';
    file: File | null;
  }>({ isOpen: false, mode: 'create', file: null });
  const wordFileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: item,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['detected-crime', id],
    queryFn: () => detectedCrimesApi.getOne(id as string),
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: crimeDocuments = [], refetch: refetchDocuments } = useQuery({
    queryKey: ['detected-crime-documents', id],
    queryFn: () => (id ? documentsApi.getByDetectedCrime(id) : []),
    enabled: Boolean(id),
  });

  const createBlankDocMut = useMutation({
    mutationFn: (title?: string) => documentsApi.createBlankForDetectedCrime(id as string, title),
    onSuccess: (newDoc) => {
      toast.success('Yangi Word rasmiy hujjati yaratildi');
      void queryClient.invalidateQueries({ queryKey: ['detected-crime-documents', id] });
      setActiveEditingDocId(newDoc.id);
    },
    onError: (err) => toast.error(`Hujjat yaratishda xatolik: ${getErrorMessage(err)}`),
  });

  const uploadWordMut = useMutation({
    mutationFn: ({ file, title }: { file: File; title?: string }) =>
      documentsApi.uploadForDetectedCrime(id as string, file, title),
    onSuccess: (newDoc) => {
      toast.success('Word hujjati muvaffaqiyatli yuklandi');
      void queryClient.invalidateQueries({ queryKey: ['detected-crime-documents', id] });
      if (newDoc?.id) setActiveEditingDocId(newDoc.id);
    },
    onError: (err) => toast.error(`Word faylini yuklashda xatolik: ${getErrorMessage(err)}`),
  });

  const deleteDocMut = useMutation({
    mutationFn: (docId: string) => documentsApi.delete(docId),
    onSuccess: () => {
      toast.success('Hujjat o‘chirildi');
      setDocToDelete(null);
      void queryClient.invalidateQueries({ queryKey: ['detected-crime-documents', id] });
    },
    onError: (err) => toast.error(`Hujjatni o‘chirishda xatolik: ${getErrorMessage(err)}`),
  });

  const { data: allStatuses = [] } = useQuery({
    queryKey: ['detected-crime-statuses-active'],
    queryFn: () => detectedCrimeStatusesApi.getAll(),
  });

  const updateStatusMut = useMutation({
    mutationFn: (crime_status_id: string) =>
      detectedCrimesApi.update(id as string, { crime_status_id }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['detected-crime', id], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['detected-crimes'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['detected-crimes-stats'], refetchType: 'all' }),
      ]);
      toast.success('Holat muvaffaqiyatli o‘zgartirildi');
    },
    onError: (err) =>
      toast.error('Holatni o‘zgartirishda xatolik', { description: getErrorMessage(err) }),
  });

  const deleteMut = useMutation({
    mutationFn: () => detectedCrimesApi.delete(id as string),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['detected-crimes'] });
      void queryClient.invalidateQueries({ queryKey: ['detected-crimes-stats'] });
      toast.success('Aniqlangan jinoyat o‘chirildi');
      navigate('/detected-crimes');
    },
    onError: (err) => toast.error('Xatolik', { description: getErrorMessage(err) }),
  });

  const getStatusBadge = (statusItem?: DetectedCrimeStatusItem | null) => {
    const label = statusItem?.name || 'Fosh etildi';
    const color = (statusItem?.color || 'rose').toLowerCase();

    if (color.includes('amber') || color.includes('yellow')) {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1 text-xs py-1 px-3 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
          {label}
        </Badge>
      );
    }
    if (color.includes('emerald') || color.includes('green')) {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-xs py-1 px-3 font-semibold">
          <CheckCircle2 className="h-3 w-3" />
          {label}
        </Badge>
      );
    }
    if (color.includes('red') || color.includes('rose')) {
      return (
        <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 gap-1 text-xs py-1 px-3 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 inline-block" />
          {label}
        </Badge>
      );
    }
    if (color.includes('purple') || color.includes('indigo')) {
      return (
        <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 gap-1 text-xs py-1 px-3 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 inline-block" />
          {label}
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 gap-1 text-xs py-1 px-3 font-semibold">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
        {label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Aniqlangan jinoyat ma‘lumotlari yuklanmoqda...
        </p>
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Ma‘lumot topilmadi</h2>
          <p className="text-xs text-muted-foreground max-w-sm">
            {getErrorMessage(error, 'Yozuv o‘chirilgan yoki tizimda mavjud emas')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/detected-crimes')}
          className="gap-2 text-xs cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Aniqlangan jinoyatlar ro‘yxatiga qaytish
        </Button>
      </div>
    );
  }

  const qualLabel =
    item.qualification_type === 'CRIMINAL'
      ? 'Jinoyat (JK)'
      : item.qualification_type === 'ADMINISTRATIVE'
        ? 'Ma’muriy (MJTK)'
        : 'Tergovga qadar tekshiruvda';

  const suspectCount = item.suspects?.length || 0;
  const repeatCount = (item.suspects || []).filter((s) => s.is_repeat_offender).length;
  const evidenceCount = item.evidences?.length || 0;
  const cluesCount = Array.isArray(item.suspect_tree) ? item.suspect_tree.length : 0;
  const measuresList = Array.isArray(item.measures) ? item.measures : [];

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ===================================================================== */}
      {/* 1. TOP NAVIGATSIYA VA AMALLAR PANELI (ARIZA SAHIFASI KABI)            */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate('/detected-crimes')}
          className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer -ml-2 self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Aniqlangan jinoyatlar ro‘yxatiga qaytish</span>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tezkor status o'zgartirish */}
          {canWrite && allStatuses.length > 0 && (
            <select
              value={item.crime_status_id || ''}
              onChange={(e) => {
                if (e.target.value) updateStatusMut.mutate(e.target.value);
              }}
              disabled={updateStatusMut.isPending}
              className="h-9 rounded-lg border border-input bg-card px-3 py-1 text-xs shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary font-medium cursor-pointer"
            >
              {allStatuses.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          )}

          {/* Yangilash */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="h-9 px-3 text-xs gap-1.5 border-border/80 hover:bg-muted cursor-pointer"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin text-primary')} />
            <span className="hidden sm:inline">Yangilash</span>
          </Button>

          {/* Chop etish */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-9 px-3 text-xs gap-1.5 border-border/80 hover:bg-muted font-medium cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-primary" />
            <span>Chop etish</span>
          </Button>

          {canWrite && (
            <>
              <Button
                type="button"
                size="sm"
                onClick={() => navigate(`/detected-crimes/${item.id}/edit`)}
                className="h-9 px-3.5 text-xs gap-1.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Tahrirlash</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
                title="O‘chirish"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. SARLAVHA BANNERI                                                   */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              {item.title}
            </h1>
            <span className="font-mono text-primary text-base sm:text-lg font-bold bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
              {item.case_number || 'Kodsiz'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Aniqlangan sana:{' '}
            <span className="font-semibold text-foreground">{formatDate(item.detected_at)}</span>
            {item.district && (
              <>
                {' '}
                &bull; Hudud:{' '}
                <span className="font-semibold text-foreground">{item.district.name}</span>
              </>
            )}
            {item.detection_source && (
              <>
                {' '}
                &bull; Manba:{' '}
                <span className="font-semibold text-foreground">{item.detection_source.name}</span>
              </>
            )}
            {item.officer_notes && (
              <>
                {' '}
                &bull; Qayd: <span className="italic text-foreground">{item.officer_notes}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          {getStatusBadge(item.crime_status)}
          <Badge variant="outline" className="font-semibold text-xs py-1 px-3">
            {qualLabel}
          </Badge>
          {(item.crime?.article || item.mjtk_article) && (
            <Badge
              variant="outline"
              className="border-primary/30 text-primary font-semibold text-xs py-1 px-3"
            >
              {item.crime?.article || item.mjtk_article}
            </Badge>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2.5. KO'RILGAN CHORALAR VA PROTSESSUAL HARAKATLAR                     */}
      {/* ===================================================================== */}
      {measuresList.length > 0 && (
        <Card className="py-0 gap-0 border-sky-500/30 bg-sky-500/5 shadow-2xs overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-sky-500/20">
            <div className="flex items-center gap-2.5 text-sky-700 dark:text-sky-400">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <CardTitle className="text-base font-bold text-foreground">
                Ko‘rilgan Choralar va Operativ Amallar ({measuresList.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {measuresList.map((m, idx) => (
              <div
                key={m.id || idx}
                className="flex items-start justify-between gap-2 rounded-xl border border-border/70 bg-background p-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{m.title}</span>
                  </div>
                  {(m.reference_number || m.notes) && (
                    <div className="text-[11px] text-muted-foreground pl-5">
                      {m.reference_number && (
                        <span className="font-mono font-semibold text-primary mr-2">
                          № {m.reference_number}
                        </span>
                      )}
                      {m.notes}
                    </div>
                  )}
                </div>
                {m.date && (
                  <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                    {formatDate(m.date)}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 3. 4 TA KPI KO'RSATKICHLAR BLOKI                                      */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="py-0 gap-0 border-border/80 shadow-2xs overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-xs text-muted-foreground block">Aylanma / Zarar</span>
              <span className="text-sm sm:text-base font-bold text-red-600 dark:text-red-400 font-mono truncate block">
                {formatCurrency(item.estimated_damage)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="py-0 gap-0 border-border/80 shadow-2xs overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-xs text-muted-foreground block">Gumonlanuvchilar</span>
              <span className="text-sm sm:text-base font-bold text-foreground font-mono block">
                {suspectCount} nafar{repeatCount > 0 ? ` (${repeatCount} takroriy)` : ''}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="py-0 gap-0 border-border/80 shadow-2xs overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-xs text-muted-foreground block">Rasmiy Word Hujjatlari</span>
              <span className="text-sm sm:text-base font-bold text-foreground font-mono block">
                {crimeDocuments.length} ta .docx
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="py-0 gap-0 border-border/80 shadow-2xs overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
              <HardDrive className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-xs text-muted-foreground block">Dalillar & Izlar</span>
              <span className="text-sm sm:text-base font-bold text-foreground font-mono block">
                {evidenceCount} dalil • {cluesCount} iz
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===================================================================== */}
      {/* 4. ASOSIY MAZMUN: 2 USTUNLI TARTIBLI KARTALAR                         */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Karta 1: Aniqlash va Bildirgi */}
        <Card className="py-0 gap-0 border-border/80 shadow-2xs flex flex-col min-w-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/60">
            <div className="flex items-center gap-2.5 text-rose-600">
              <Radar className="h-5 w-5 shrink-0" />
              <CardTitle className="text-base font-bold text-foreground">
                Aniqlash va Bildirgi Rekvizitlari
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              JPK 322-modda bo‘yicha qayd etilgan rasmiy raport va hududiy ma‘lumotlar
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                Aniqlangan Sana:
              </span>
              <p className="font-semibold text-foreground">{formatDate(item.detected_at)}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                Hudud (Tuman / Shahar):
              </span>
              <p className="font-semibold text-foreground">{item.district?.name || '—'}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 sm:col-span-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                Aniqlash Usuli / Manbasi:
              </span>
              <p className="font-semibold text-foreground">{item.detection_source?.name || '—'}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                Bildirgi (Raport) № & Sana:
              </span>
              <p className="font-mono font-bold text-foreground">
                {item.report_number || '—'}
                {item.report_date ? ` (${formatDate(item.report_date)})` : ''}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                KUSP / E-material №:
              </span>
              <p className="font-mono font-bold text-foreground">{item.kusp_number || '—'}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 sm:col-span-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                Biriktirilgan Sohaviy Xizmat:
              </span>
              <p className="font-semibold text-foreground">
                {item.department_service?.name || '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Karta 2: Huquqiy malaka, Platforma va Qaror */}
        <Card className="py-0 gap-0 border-border/80 shadow-2xs flex flex-col min-w-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/60">
            <div className="flex items-center gap-2.5 text-primary">
              <Scale className="h-5 w-5 shrink-0" />
              <CardTitle className="text-base font-bold text-foreground">
                Huquqiy Malaka, Platforma va Qaror
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              JK / MJTK moddalari, kiber-muhit manzili va qabul qilingan yakuniy qaror
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                Huquqiy Malaka:
              </span>
              <p className="font-semibold text-foreground">{qualLabel}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                JK / MJTK Moddasi:
              </span>
              <p className="font-bold text-primary">
                {item.crime?.article || item.mjtk_article || '—'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 sm:col-span-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                Platforma & Kanal / URL Manzili:
              </span>
              <p className="font-mono font-semibold text-foreground break-all flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  {[item.platform, item.channel_or_source_url].filter(Boolean).join(' — ') || '—'}
                </span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 sm:col-span-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                Yakuniy Qaror & Raqami:
              </span>
              <p className="font-semibold text-foreground">
                {item.decision_type?.name || 'Qaror qabul qilinmagan'}
                {item.decision_number ? ` — № ${item.decision_number}` : ''}
                {item.decision_date ? ` (${formatDate(item.decision_date)})` : ''}
              </p>
              {item.decision_note && (
                <p className="text-[11px] text-muted-foreground mt-1">{item.decision_note}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===================================================================== */}
      {/* 5. FABULA (BATAFSIL TAVSIF)                                           */}
      {/* ===================================================================== */}
      {item.description && (
        <Card className="py-0 gap-0 border-border/80 shadow-2xs overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/60">
            <div className="flex items-center gap-2.5 text-primary">
              <FileText className="h-5 w-5 shrink-0" />
              <CardTitle className="text-base font-bold text-foreground">
                Holat Fabulasi (Batafsil Tavsif)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed text-foreground">
            {item.description}
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 6. GUMONLANUVCHILAR / HUQUQBUZARLAR                                   */}
      {/* ===================================================================== */}
      <Card className="py-0 gap-0 border-border/80 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60">
          <div className="flex items-center gap-2.5 text-primary">
            <Users className="h-5 w-5 shrink-0" />
            <CardTitle className="text-base font-bold text-foreground">
              Gumonlanuvchilar / Huquqbuzarlar ({suspectCount})
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Fuqarolar bazasiga bog‘langan shaxslar — ustiga bosib 360° dosyesini ochishingiz mumkin
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-2.5">
          {item.suspects?.length ? (
            item.suspects.map((s) => (
              <div
                key={s.id || s.citizen_id}
                onClick={() => navigate(`/citizens/${s.citizen_id}`)}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all group"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
                    <span className="group-hover:text-primary group-hover:underline">
                      {s.citizen?.full_name?.trim() || 'Fuqaro'}
                    </span>
                    {s.is_repeat_offender && (
                      <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px] gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Takroriy shaxs
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.citizen?.passport || 'Pasport yo‘q'} &bull;{' '}
                    {s.citizen?.phone_number || 'Tel yo‘q'}
                    {s.citizen?.workplace?.name ? ` • ${s.citizen.workplace.name}` : ''}
                    {s.notes ? ` • Izoh: ${s.notes}` : ''}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[11px]">
                    {s.role_in_crime}
                  </Badge>
                  <Badge variant="secondary" className="text-[11px]">
                    {s.detention_status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[11px] gap-1 text-primary border-primary/30"
                  >
                    360° Dosye <ArrowRight className="h-3 w-3" />
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

      {/* ===================================================================== */}
      {/* 7. RAQAMLI IZLAR (SUSPECT TREE)                                       */}
      {/* ===================================================================== */}
      {cluesCount > 0 && (
        <Card className="py-0 gap-0 border-border/80 shadow-2xs overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/60">
            <div className="flex items-center gap-2.5 text-primary">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <CardTitle className="text-base font-bold text-foreground">
                Raqamli Izlar va Identifikatorlar ({cluesCount})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <SuspectTreeBuilder value={item.suspect_tree} readOnly />
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 7.5. RASMIY WORD HUJJATLARI (.DOCX / ONLYOFFICE)                      */}
      {/* ===================================================================== */}
      <Card className="py-0 gap-0 border-border/80 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 text-blue-600">
              <FileText className="h-5 w-5 shrink-0" />
              <CardTitle className="text-base font-bold text-foreground">
                Rasmiy Word Hujjatlari ({crimeDocuments.length})
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Bildirgi, bayonnoma, qaror va boshqa .docx hujjatlarini yaratish, yuklash va
              ONLYOFFICE da tahrirlash
            </CardDescription>
          </div>

          {canWrite && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={wordFileInputRef}
                type="file"
                accept=".docx,.doc"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setWordDialogState({ isOpen: true, mode: 'upload', file });
                  }
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => wordFileInputRef.current?.click()}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <UploadCloud className="h-3.5 w-3.5 text-blue-600" />
                <span>.docx yuklash</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setWordDialogState({ isOpen: true, mode: 'create', file: null })}
                className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Yangi Word yaratish</span>
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {crimeDocuments.length > 0 ? (
            <div className="space-y-2.5">
              {crimeDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                        {doc.title || doc.file_name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 font-normal">
                          v{doc.version || 1}
                        </Badge>
                        <span>&bull;</span>
                        <span>{formatDate(doc.updated_at || doc.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {canWrite && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setActiveEditingDocId(doc.id)}
                        className="h-7 px-2.5 text-xs font-semibold bg-[#185abd] hover:bg-[#12448f] text-white gap-1 cursor-pointer shadow-2xs"
                        title="ONLYOFFICE da ochish, tahrirlash va saqlash"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Tahrirlash</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        window.open(
                          documentsApi.getFileUrl(doc.id),
                          '_blank',
                          'noopener,noreferrer',
                        )
                      }
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Yuklab olish"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    {canWrite && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDocToDelete({ id: doc.id, title: doc.title || doc.file_name })
                        }
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
                        title="O‘chirish"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-7 border border-dashed rounded-xl text-center space-y-2 bg-muted/10">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Hozircha Word hujjati biriktirilmagan
              </p>
              <p className="text-xs text-muted-foreground max-w-md">
                Yangi rasmiy Word (.docx) hujjat yaratishingiz yoki kompyuteringizdan mavjud faylni
                yuklab ONLYOFFICE ichida tahrirlashingiz mumkin.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===================================================================== */}
      {/* 8. ASHYOVIY VA RAQAMLI DALILLAR                                       */}
      {/* ===================================================================== */}
      <Card className="py-0 gap-0 border-border/80 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60">
          <div className="flex items-center gap-2.5 text-primary">
            <HardDrive className="h-5 w-5 shrink-0" />
            <CardTitle className="text-base font-bold text-foreground">
              Olib Qo‘yilgan Ashyoviy va Raqamli Dalillar ({evidenceCount})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-2.5">
          {item.evidences?.length ? (
            item.evidences.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 text-xs"
              >
                <div className="space-y-0.5">
                  <div>
                    <span className="font-semibold text-foreground">{ev.title}</span>
                    {ev.identifier_value && (
                      <span className="ml-2 font-mono text-[11px] font-bold text-primary">
                        {ev.identifier_value}
                      </span>
                    )}
                  </div>
                  {ev.notes && <div className="text-[11px] text-muted-foreground">{ev.notes}</div>}
                </div>
                <div className="flex items-center gap-2">
                  {ev.file_key && (
                    <a
                      href={filesApi.getViewUrl({ key: ev.file_key })}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline bg-primary/10 px-2.5 py-1 rounded-md"
                    >
                      <Paperclip className="h-3 w-3" />
                      {ev.file_name || 'Faylni ko‘rish'}
                    </a>
                  )}
                  <Badge variant="outline" className="text-[10px]">
                    {ev.evidence_type}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground italic">Dalillar kiritilmagan</div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Aniqlangan jinoyatni o‘chirish"
        description={`«${item.title}» yozuvini o‘chirishni tasdiqlaysizmi?`}
        variant="destructive"
        isLoading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />

      <ConfirmDialog
        open={!!docToDelete}
        onOpenChange={(open) => !open && setDocToDelete(null)}
        title="Word hujjatini o‘chirish"
        description={`«${docToDelete?.title || ''}» hujjatini o‘chirishni tasdiqlaysizmi?`}
        variant="destructive"
        isLoading={deleteDocMut.isPending}
        onConfirm={() => {
          if (docToDelete) deleteDocMut.mutate(docToDelete.id);
        }}
      />

      <CreateWordDialog
        isOpen={wordDialogState.isOpen}
        fileToUpload={wordDialogState.file}
        applicationNumber={item.case_number}
        isLoading={createBlankDocMut.isPending || uploadWordMut.isPending}
        onClose={() => setWordDialogState((prev) => ({ ...prev, isOpen: false, file: null }))}
        onSubmit={async (title, file) => {
          if (wordDialogState.mode === 'upload' && file) {
            await uploadWordMut.mutateAsync({ file, title });
          } else {
            await createBlankDocMut.mutateAsync(title);
          }
          setWordDialogState((prev) => ({ ...prev, isOpen: false, file: null }));
        }}
      />

      <DocumentEditorModal
        documentId={activeEditingDocId}
        isOpen={!!activeEditingDocId}
        onClose={() => setActiveEditingDocId(null)}
        onSaved={() => void refetchDocuments()}
      />
    </div>
  );
}
