import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  Edit2,
  Eye,
  FileSpreadsheet,
  FileText,
  Link2,
  Loader2,
  MapPin,
  Paperclip,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingUp,
  UploadCloud,
  User,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { SuspectTreeBuilder } from '@/components/applications/suspect-tree-builder';
import { CreateWordDialog } from '@/components/documents/create-word-dialog';
import { DocumentEditorModal } from '@/components/documents/document-editor-modal';
import { TemplateGeneratorModal } from '@/components/documents/template-generator-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FemaleIcon, MaleIcon } from '@/components/ui/gender-icons';
import { toast } from '@/components/ui/sonner';
import {
  applicationsApi,
  applicationStatusesApi,
  documentsApi,
  getFileDownloadUrl,
  getFileViewUrl,
  type UploadedFile,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { cn } from '@/lib/utils';
import type { ApplicationStatus, ApplicationStatusItem } from '@/types/models';

const formatCurrency = (amount?: number | string | null, currency = 'UZS') => {
  if (amount === undefined || amount === null || amount === '') return '0 UZS';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return `0 ${currency}`;
  return `${new Intl.NumberFormat('uz-UZ').format(Math.round(num))} ${currency}`;
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatCardNumber = (num?: string | null) => {
  if (!num) return '—';
  const clean = num.replace(/\D/g, '');
  if (clean.length === 16) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)} ${clean.slice(12, 16)}`;
  }
  return num;
};

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExportingCyberControl, setIsExportingCyberControl] = useState(false);

  const handleExportCyberControl = async () => {
    if (!id || isExportingCyberControl) return;
    const toastId = toast.loading('CyberControl shabloni tayyorlanmoqda...');
    try {
      setIsExportingCyberControl(true);
      const blob = await applicationsApi.exportCyberControlExcel([id]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `murojaat_shablon_${dateStr}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Murojaat CyberControl shablonida (.xlsx) yuklab olindi', { id: toastId });
    } catch (err) {
      toast.error('CyberControl shablonini yuklab olishda xatolik', {
        id: toastId,
        description: getErrorMessage(err),
      });
    } finally {
      setIsExportingCyberControl(false);
    }
  };
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [activeEditingDocId, setActiveEditingDocId] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<{ id: string; title: string } | null>(null);
  const wordFileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Application Detail Query
  const {
    data: app,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['application-detail', id],
    queryFn: () => applicationsApi.getOne(id as string),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // 2. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      return applicationsApi.delete(id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['applications'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'], refetchType: 'all' }),
      ]);
      toast.success('Ariza muvaffaqiyatli o‘chirildi');
      navigate('/applications');
    },
    onError: (err: unknown) => {
      toast.error('Arizani o‘chirishda xatolik yuz berdi', {
        description: getErrorMessage(err),
      });
    },
  });

  // 2.1. Dynamic Statuses Query
  const { data: statusesData } = useQuery({
    queryKey: ['application-statuses-all'],
    queryFn: () => applicationStatusesApi.getAll({ limit: 100 }),
  });
  const allApplicationStatuses = statusesData?.items || [];

  // 3. Quick Status Update Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, status_id }: { status: string; status_id?: string }) => {
      if (!id) return;
      return applicationsApi.update(id, { status, status_id });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['application-detail', id],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({ queryKey: ['applications'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'], refetchType: 'all' }),
      ]);
      toast.success('Ariza holati muvaffaqiyatli o‘zgartirildi');
    },
    onError: (err: unknown) => {
      toast.error('Holatni o‘zgartirishda xatolik', {
        description: getErrorMessage(err),
      });
    },
  });

  // 4. Hujjatlar (Word .docx) so'rovi va amallari
  const { data: appDocuments = [], refetch: refetchDocuments } = useQuery({
    queryKey: ['application-documents', id],
    queryFn: () => (id ? documentsApi.getByApplication(id) : []),
    enabled: !!id,
  });

  const [wordDialogState, setWordDialogState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'upload';
    file: File | null;
  }>({
    isOpen: false,
    mode: 'create',
    file: null,
  });

  const [templateModalState, setTemplateModalState] = useState<{
    isOpen: boolean;
    initialTemplateId?: string;
  }>({
    isOpen: false,
    initialTemplateId: 'tushuntirish-telegram',
  });

  const createBlankDocMutation = useMutation({
    mutationFn: (title?: string) => documentsApi.createBlank(id as string, title),
    onSuccess: (newDoc) => {
      toast.success('Yangi Word rasmiy hujjati yaratildi');
      queryClient.invalidateQueries({ queryKey: ['application-documents', id] });
      queryClient.invalidateQueries({ queryKey: ['application-detail', id] });
      setActiveEditingDocId(newDoc.id);
    },
    onError: (err) => {
      toast.error(`Hujjat yaratishda xatolik: ${getErrorMessage(err)}`);
    },
  });

  const uploadWordMutation = useMutation({
    mutationFn: async ({ file, title }: { file: File; title?: string }) => {
      if (!id) return;
      return documentsApi.upload(id, file, title);
    },
    onSuccess: (newDoc) => {
      toast.success('Word hujjati muvaffaqiyatli yuklandi');
      queryClient.invalidateQueries({ queryKey: ['application-documents', id] });
      queryClient.invalidateQueries({ queryKey: ['application-detail', id] });
      if (newDoc?.id) {
        setActiveEditingDocId(newDoc.id);
      }
    },
    onError: (err) => {
      toast.error(`Word faylini yuklashda xatolik: ${getErrorMessage(err)}`);
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => documentsApi.delete(docId),
    onSuccess: () => {
      toast.success('Hujjat o‘chirildi');
      queryClient.invalidateQueries({ queryKey: ['application-documents', id] });
      queryClient.invalidateQueries({ queryKey: ['application-detail', id] });
    },
    onError: (err) => {
      toast.error(`Hujjatni o‘chirishda xatolik: ${getErrorMessage(err)}`);
    },
  });

  const getStatusBadge = (
    status: ApplicationStatus | null | undefined,
    statusItem?: ApplicationStatusItem | null,
  ) => {
    const item =
      statusItem || allApplicationStatuses.find((s) => s.code === status || s.name === status);
    const label = item?.name || status || 'Noma‘lum';
    const color = (item?.color || '').toLowerCase();

    if (color.includes('amber') || color.includes('yellow') || status === 'JARAYONDA') {
      return (
        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1 text-xs py-1 px-3 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
          {label}
        </Badge>
      );
    }
    if (color.includes('emerald') || color.includes('green') || status === 'HAL_QILINDI') {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1 text-xs py-1 px-3 font-semibold">
          <CheckCircle2 className="h-3 w-3" />
          {label}
        </Badge>
      );
    }
    if (color.includes('red') || color.includes('rose') || status === 'RAD_ETILDI') {
      return (
        <Badge className="bg-red-500/10 text-red-500 border-red-500/30 gap-1 text-xs py-1 px-3 font-semibold">
          <X className="h-3 w-3" />
          {label}
        </Badge>
      );
    }
    if (color.includes('purple')) {
      return (
        <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/30 gap-1 text-xs py-1 px-3 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500 inline-block" />
          {label}
        </Badge>
      );
    }

    return (
      <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30 gap-1 text-xs py-1 px-3 font-semibold">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
        {label}
      </Badge>
    );
  };

  // Dalillar va fayllarni ajratib olish
  const evidenceFiles: UploadedFile[] = useMemo(() => {
    const list: UploadedFile[] = [];
    if (app?.custom_fields) {
      app.custom_fields.forEach((cf) => {
        if (
          cf.key === 'evidence_attachments' ||
          cf.label?.toLowerCase().includes('isbot') ||
          cf.label?.toLowerCase().includes('dalil') ||
          cf.label?.toLowerCase().includes('hujjat')
        ) {
          if (Array.isArray(cf.value)) {
            cf.value.forEach((v) => {
              if (typeof v === 'string') {
                const fname = v.split('/').pop() || 'fayl';
                list.push({
                  url: v,
                  proxy_url: v,
                  key: fname,
                  filename: fname,
                  original_name: fname,
                  size: 0,
                  mimetype: 'application/octet-stream',
                });
              } else if (v && typeof v === 'object' && 'url' in v) {
                list.push(v as UploadedFile);
              }
            });
          }
        }
      });
    }
    return list;
  }, [app]);

  // Qo'shimcha dinamik maydonlar
  const otherCustomFields = useMemo(() => {
    if (!app?.custom_fields) return [];
    return app.custom_fields.filter(
      (cf) =>
        cf.key !== 'evidence_attachments' &&
        !cf.label?.toLowerCase().includes('isbot') &&
        !cf.label?.toLowerCase().includes('dalil') &&
        !cf.label?.toLowerCase().includes('hujjat') &&
        cf.type !== 'TRANSFER' &&
        !cf.transfer,
    );
  }, [app]);

  // Barcha kartalar va pul o'tkazmalari
  const allTransfersList = useMemo(() => {
    const list: Array<{
      title: string;
      amount: number | null;
      currency: string;
      transferDate: string | null;
      transferTime: string | null;
      providerName: string | null;
      senderCardNumber: string | null;
      senderFullName: string | null;
      senderBankName: string | null;
      receiverCardNumber: string | null;
      receiverFullName: string | null;
      receiverBankName: string | null;
    }> = [];

    if (app?.transfer || app?.card) {
      list.push({
        title: 'Asosiy O‘tkazma',
        amount: app.transfer?.amount ?? null,
        currency: app.transfer?.currency || 'UZS',
        transferDate: app.transfer?.transfer_date || null,
        transferTime: app.transfer?.transfer_time || null,
        providerName: app.transfer?.payment_provider?.name || null,
        senderCardNumber: app.transfer?.sender_card?.card_number || app.card?.card_number || null,
        senderFullName: app.transfer?.sender_card?.full_name || app.card?.full_name || null,
        senderBankName: app.transfer?.sender_card?.bank?.name || app.card?.bank?.name || null,
        receiverCardNumber: app.transfer?.receiver_card?.card_number || null,
        receiverFullName: app.transfer?.receiver_card?.full_name || null,
        receiverBankName: app.transfer?.receiver_card?.bank?.name || null,
      });
    }

    if (app?.custom_fields) {
      let customIdx = 2;
      app.custom_fields.forEach((cf) => {
        if (cf.type === 'TRANSFER' || cf.transfer) {
          const t = cf.transfer;
          const sc = cf.card || t?.sender_card;
          const rc = t?.receiver_card;
          list.push({
            title: cf.label || `${customIdx}-O‘tkazma shakli`,
            amount: t?.amount ?? null,
            currency: t?.currency || 'UZS',
            transferDate: t?.transfer_date || null,
            transferTime: t?.transfer_time || null,
            providerName: t?.payment_provider?.name || null,
            senderCardNumber: sc?.card_number || null,
            senderFullName: sc?.full_name || null,
            senderBankName: sc?.bank?.name || null,
            receiverCardNumber: rc?.card_number || null,
            receiverFullName: rc?.full_name || null,
            receiverBankName: rc?.bank?.name || null,
          });
          customIdx++;
        }
      });
    }

    return list;
  }, [app]);

  // Jami zarar summasi
  const totalCalculatedLoss = useMemo(() => {
    let sum = 0;
    allTransfersList.forEach((t) => {
      if (t.amount) sum += Number(t.amount);
    });
    return sum;
  }, [allTransfersList]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Ariza ma‘lumotlari yuklanmoqda...
        </p>
      </div>
    );
  }

  if (isError || !app) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Ariza ma‘lumotlari topilmadi</h2>
          <p className="text-xs text-muted-foreground max-w-sm">
            {getErrorMessage(error, 'Ariza o‘chirilgan yoki tizimda mavjud emas')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/applications')}
          className="gap-2 text-xs cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Arizalar ro‘yxatiga qaytish
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ===================================================================== */}
      {/* 1. TOP NAVIGATSIYA VA AMALLAR PANELI */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate('/applications')}
          className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer -ml-2 self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Arizalar ro‘yxatiga qaytish</span>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Holatni tezkor o'zgartirish dropdown */}
          <select
            value={app.status_id || app.status || 'YANGI'}
            onChange={(e) => {
              const val = e.target.value;
              const found = allApplicationStatuses.find((s) => s.id === val || s.code === val);
              if (found) {
                updateStatusMutation.mutate({
                  status: found.code || found.name,
                  status_id: found.id,
                });
              } else {
                updateStatusMutation.mutate({ status: val });
              }
            }}
            disabled={updateStatusMutation.isPending}
            className="h-9 rounded-lg border border-input bg-card px-3 py-1 text-xs shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary font-medium cursor-pointer"
          >
            {allApplicationStatuses.length > 0 ? (
              allApplicationStatuses.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))
            ) : (
              <>
                <option value="YANGI">Yangi (Qabul qilindi)</option>
                <option value="JARAYONDA">Jarayonda (Tergovda)</option>
                <option value="HAL_QILINDI">Hal qilindi</option>
                <option value="RAD_ETILDI">Rad etildi</option>
              </>
            )}
          </select>

          {/* Bog'liqliklar tugmasi */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(`/applications/${app.id}/relations`)}
            className="h-9 px-3 text-xs gap-1.5 border-border/80 hover:bg-muted font-medium cursor-pointer"
            title="Mazkur arizaning boshqa arizalar bilan bog'liqliklarini ko'rish"
          >
            <Link2 className="h-3.5 w-3.5 text-primary" />
            <span>Bog‘liqliklar</span>
          </Button>

          {/* CyberControl shablonida (.xlsx) yuklash */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isExportingCyberControl}
            onClick={handleExportCyberControl}
            className="h-9 px-3 text-xs gap-1.5 border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold cursor-pointer"
            title="Mazkur murojaatni CyberControl import shablonida (.xlsx) yuklab olish"
          >
            {isExportingCyberControl ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5" />
            )}
            <span>CyberControl (.xlsx)</span>
          </Button>

          {/* Yangilash */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 px-3 text-xs gap-1.5 border-border/80 hover:bg-muted cursor-pointer"
            title="Qayta yuklash"
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

          {/* Tahrirlash */}
          <Button
            type="button"
            size="sm"
            onClick={() => navigate(`/applications/edit/${app.id}`)}
            className="h-9 px-3.5 text-xs gap-1.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs cursor-pointer"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Tahrirlash</span>
          </Button>

          {/* O'chirish */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
            title="Arizani o‘chirish"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. SARLAVHA BANNERI */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary mb-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span>Murojaat Tafsilotlari & Tergov Dosyesi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <span>Ariza</span>
            <span className="font-mono text-primary text-xl sm:text-2xl font-bold bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
              № {app.application_number || 'Raqamsiz'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Ro‘yxatga olingan sana:{' '}
            <span className="font-semibold text-foreground">{formatDate(app.date)}</span>
            {app.district && (
              <>
                {' '}
                &bull; Hudud:{' '}
                <span className="font-semibold text-foreground">{app.district.name}</span>
              </>
            )}
            {app.officer_notes && (
              <>
                {' '}
                &bull; Mas‘ul xodim qaydi:{' '}
                <span className="italic text-foreground">{app.officer_notes}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {getStatusBadge(app.status, app.application_status)}
          {app.crime && (
            <Badge
              variant="outline"
              className="border-primary/30 text-primary font-semibold text-xs py-1 px-3"
            >
              {app.crime.article || app.crime.title}
            </Badge>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. 4 TA KPI KO'RSATKICHLAR BLOKI */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Umumiy Zarar */}
        <Card className="py-0 gap-0 border-border/80 shadow-2xs overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-xs text-muted-foreground block">Aniqlangan Zarar</span>
              <span className="text-sm sm:text-base font-bold text-red-600 dark:text-red-400 font-mono truncate block">
                {formatCurrency(totalCalculatedLoss)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Kartalar / O'tkazmalar */}
        <Card className="py-0 gap-0 border-border/80 shadow-2xs overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-xs text-muted-foreground block">Pul O‘tkazmalari</span>
              <span className="text-sm sm:text-base font-bold text-foreground font-mono block">
                {allTransfersList.length > 0
                  ? `${allTransfersList.length} ta shakl`
                  : 'Mavjud emas'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Word hujjatlari */}
        <Card className="py-0 gap-0 border-border/80 shadow-2xs overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-xs text-muted-foreground block">Rasmiy Word Hujjatlari</span>
              <span className="text-sm sm:text-base font-bold text-foreground font-mono block">
                {appDocuments.length} ta .docx
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tergov Dalillari */}
        <Card className="py-0 gap-0 border-border/80 shadow-2xs overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-xs text-muted-foreground block">Tergov Dalillari</span>
              <span className="text-sm sm:text-base font-bold text-foreground font-mono block">
                {evidenceFiles.length} ta fayl
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===================================================================== */}
      {/* 4. ASOSIY MAZMUN: TARTIBLI KARTALAR LAYOUTI */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ================================================================= */}
        {/* KARTA 1: ARIZACHI (JABRLANUVCHI FUQARO) MA'LUMOTLARI */}
        {/* ================================================================= */}
        <Card className="py-0 gap-0 border-border/80 shadow-2xs flex flex-col min-w-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/60">
            <div className="flex items-center gap-2.5 text-primary">
              <User className="h-5 w-5 shrink-0" />
              <CardTitle className="text-base font-bold text-foreground">
                Arizachi (Fuqaro) Shaxsiy Ma‘lumotlari
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Murojaat qilgan fuqaroning rasmiy identifikatsion rekvizitlari
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 flex-1 min-w-0">
            {app.citizen ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs min-w-0">
                <div
                  onClick={() => navigate(`/citizens/${app.citizen!.id}`)}
                  className="p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/50 hover:bg-primary/5 sm:col-span-2 flex flex-wrap items-center justify-between gap-2 cursor-pointer transition-all group min-w-0"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                      To‘liq F.I.SH:
                    </span>
                    <p className="font-bold text-base text-foreground group-hover:text-primary group-hover:underline break-words">
                      {app.citizen.last_name} {app.citizen.first_name}{' '}
                      {app.citizen.middle_name || ''}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[11px] gap-1 text-primary border-primary/30 shrink-0"
                  >
                    360° Dosye <ArrowRight className="h-3 w-3" />
                  </Badge>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                    Tug‘ilgan Sana:
                  </span>
                  <p className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-primary" />
                    <span>
                      {app.citizen.birth_date
                        ? new Date(app.citizen.birth_date).toLocaleDateString('uz-UZ')
                        : '—'}
                    </span>
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                    Jinsi:
                  </span>
                  <p className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    {app.citizen.gender === 'male' ? (
                      <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-[11px] py-0 px-2 font-semibold gap-1">
                        <MaleIcon className="h-3 w-3" /> Erkak
                      </Badge>
                    ) : app.citizen.gender === 'female' ? (
                      <Badge className="bg-pink-500/10 text-pink-500 border-pink-500/30 text-[11px] py-0 px-2 font-semibold gap-1">
                        <FemaleIcon className="h-3 w-3" /> Ayol
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                    Pasport Seriya & Raqam:
                  </span>
                  <p className="font-mono font-bold text-foreground text-sm">
                    {app.citizen.passport || '—'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                    JSHSHIR (PINFL - 14 ta raqam):
                  </span>
                  <p className="font-mono font-bold text-foreground text-sm">
                    {app.citizen.pinfl || '—'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                    Telefon Raqami:
                  </span>
                  <p className="font-mono font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-primary" />
                    <span>{app.citizen.phone_number || '—'}</span>
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                    Yashash Tumani & Mahallasi:
                  </span>
                  <p className="font-semibold text-foreground text-xs flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-primary" />
                    <span>
                      {app.citizen.district?.name || '—'}
                      {app.citizen.mahalla?.name ? `, ${app.citizen.mahalla.name} m.` : ''}
                    </span>
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/50 sm:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                    Doimiy Yashash Aniq Manzili:
                  </span>
                  <p className="text-foreground text-xs font-medium">
                    {app.citizen.address || '—'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-muted/20 border border-border/50 text-center text-xs text-muted-foreground italic space-y-1">
                <User className="h-8 w-8 mx-auto text-muted-foreground/60" />
                <p>Ushbu arizaga alohida fuqaro anketasi biriktirilmagan</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ================================================================= */}
        {/* KARTA 2: HODISA TAFSILOTLARI VA JINOYAT MALAKALANISHI */}
        {/* ================================================================= */}
        <Card className="py-0 gap-0 border-border/80 shadow-2xs flex flex-col min-w-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/60">
            <div className="flex items-center gap-2.5 text-primary">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <CardTitle className="text-base font-bold text-foreground">
                Hodisa Tafsilotlari va Jinoyat Malakalanishi
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Murojaat mazmuni, hodisa joyi va jinoyat kodeksi moddasi
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 flex-1 space-y-3.5 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs min-w-0">
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 min-w-0">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                  Jinoyat Kodeksi Moddasi:
                </span>
                <p className="font-bold text-sm text-primary break-words">
                  {app.crime ? `${app.crime.article || ''} - ${app.crime.title || ''}` : '—'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 min-w-0">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                  Hodisa Yuz Bergan Hudud:
                </span>
                <p className="font-bold text-foreground text-sm flex items-center gap-1.5 break-words">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{app.district?.name || '—'}</span>
                </p>
              </div>

              {app.crime_method && (
                <div className="p-3 rounded-xl bg-muted/30 border border-border/50 sm:col-span-2 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                    Jinoyat Sodir Etish Usuli ({app.crime_method.group_name || 'Modus operandi'}):
                  </span>
                  <p className="font-semibold text-xs text-foreground break-words">
                    {app.crime_method.name}
                  </p>
                </div>
              )}
            </div>

            {/* Murojaat mazmuni va bayoni */}
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 space-y-1.5 min-w-0">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Fuqaroning Murojaat Bayoni (Tavsifi):
              </span>
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap break-words font-normal">
                {app.description || 'Tafsilotlar kiritilmagan'}
              </p>
            </div>

            {/* Xodim qaydlari */}
            {app.officer_notes && (
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs space-y-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">
                  Xodim / Tergovchi Qaydlari:
                </span>
                <p className="text-foreground text-xs italic break-words">{app.officer_notes}</p>
              </div>
            )}

            {/* Firibgar / Gumonlanuvchi Daraxti */}
            {app.suspect_tree && app.suspect_tree.length > 0 && (
              <div className="pt-2 border-t border-border/40">
                <SuspectTreeBuilder value={app.suspect_tree} readOnly excludeAppId={app.id} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===================================================================== */}
      {/* KARTA 3: PLASTIK KARTALAR VA PUL O'TKAZMALARI SXEMASI */}
      {/* ===================================================================== */}
      <Card className="py-0 gap-0 border-border/80 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60">
          <div className="flex items-center gap-2.5 text-primary">
            <CreditCard className="h-5 w-5" />
            <CardTitle className="text-base font-bold text-foreground">
              Aniqlangan Plastik Kartalar va Pul O‘tkazmalari
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Jabrlanuvchi, vositachi va firibgar hisob raqamlari bo‘yicha tranzaksiyalar zanjiri
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {allTransfersList.length > 0 ? (
            <div className="space-y-4">
              {allTransfersList.map((tf, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-border/80 bg-muted/10 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                        {idx + 1}
                      </span>
                      {tf.title}
                    </span>
                    {tf.providerName && (
                      <Badge variant="outline" className="text-xs font-medium">
                        {tf.providerName}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch text-xs min-w-0">
                    {/* Jo'natuvchi karta */}
                    <div className="p-3 rounded-lg bg-card border border-border/60 space-y-1 min-w-0 overflow-hidden">
                      <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block break-words">
                        Jo‘natuvchi Karta (Jabrlanuvchi):
                      </span>
                      <p className="font-mono font-bold text-sm text-foreground break-all">
                        {formatCardNumber(tf.senderCardNumber)}
                      </p>
                      <p className="text-[11px] text-muted-foreground break-words">
                        {tf.senderBankName || 'Bank ko‘rsatilmagan'}{' '}
                        {tf.senderFullName ? `• ${tf.senderFullName}` : ''}
                      </p>
                    </div>

                    {/* O'tkazma yo'nalishi va summasi */}
                    <div className="flex flex-col items-center justify-center text-center p-2.5 rounded-lg bg-muted/40 border border-border/40 min-w-0 overflow-hidden">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">
                        O‘tkazilgan Summa:
                      </span>
                      <span className="font-mono font-black text-sm sm:text-base text-red-600 dark:text-red-400 my-0.5 break-words">
                        {formatCurrency(tf.amount, tf.currency)}
                      </span>
                      <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                        <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                        <span>
                          {formatDate(tf.transferDate)} {tf.transferTime || ''}
                        </span>
                      </div>
                    </div>

                    {/* Qabul qiluvchi karta */}
                    <div className="p-3 rounded-lg bg-card border border-red-500/30 space-y-1 min-w-0 overflow-hidden">
                      <span className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 flex flex-wrap items-center justify-between gap-1">
                        <span>Qabul Qiluvchi Karta (Firibgar):</span>
                        <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] py-0 px-1.5 shrink-0">
                          Dropper
                        </Badge>
                      </span>
                      <p className="font-mono font-bold text-sm text-foreground break-all">
                        {formatCardNumber(tf.receiverCardNumber)}
                      </p>
                      <p className="text-[11px] text-muted-foreground break-words">
                        {tf.receiverBankName || 'Bank ko‘rsatilmagan'}{' '}
                        {tf.receiverFullName ? `• ${tf.receiverFullName}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-muted/20 border border-border/50 text-center text-xs text-muted-foreground italic space-y-1">
              <CreditCard className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p>Mazkur arizaga plastik karta va pul o‘tkazmasi shakli biriktirilmagan</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===================================================================== */}
      {/* KARTA 4: RASMIY WORD HUJJATLARI (.DOCX / ONLYOFFICE) */}
      {/* ===================================================================== */}
      <Card className="py-0 gap-0 border-border/80 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span>Rasmiy Word Hujjatlari (.docx)</span>
                <Badge variant="outline" className="text-xs font-mono font-normal">
                  {appDocuments.length} ta hujjat
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Arizaga biriktirilgan rasmiy Word hujjatlari. Kompyuterdan yuklash yoki tizimda
                ONLYOFFICE orqali tahrirlash mumkin.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Yashirin fayl tanlash inputi (kompyuterdan .docx yuklash uchun) */}
            <input
              ref={wordFileInputRef}
              type="file"
              accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setWordDialogState({
                    isOpen: true,
                    mode: 'upload',
                    file,
                  });
                  e.target.value = '';
                }
              }}
            />

            <Button
              type="button"
              size="sm"
              onClick={() =>
                setTemplateModalState({
                  isOpen: true,
                  initialTemplateId: 'tushuntirish-telegram',
                })
              }
              className="h-8 text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
              title="Rasmiy tergov shablonlari (Tushuntirish xati, Bayonnoma, Sanksiya) asosida avtomatik to‘ldirib yaratish"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Shablondan yaratish</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => wordFileInputRef.current?.click()}
              disabled={uploadWordMutation.isPending}
              className="h-8 text-xs gap-1.5 border-border font-medium cursor-pointer"
              title="Kompyuterdan Word (.docx / .doc) faylini yuklash"
            >
              {uploadWordMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UploadCloud className="h-3.5 w-3.5 text-blue-600" />
              )}
              <span>Kompyuterdan yuklash</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() =>
                setTemplateModalState({
                  isOpen: true,
                  initialTemplateId: 'blank',
                })
              }
              className="h-8 text-xs gap-1.5 font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
              title="Yangi Word blank yaratish va ONLYOFFICE da tahrirlash"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Yangi Word</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {appDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {appDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card hover:border-blue-400/80 dark:hover:border-blue-700 transition-all shadow-2xs group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#185abd] text-white font-serif font-black text-sm shadow-2xs">
                      W
                    </div>
                    <div className="overflow-hidden space-y-0.5">
                      <p
                        className="text-xs sm:text-sm font-bold text-foreground truncate"
                        title={doc.title || doc.file_name}
                      >
                        {doc.title || doc.file_name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                        <span>{(doc.size / 1024).toFixed(1)} KB</span>
                        <span>&bull;</span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 font-normal">
                          v{doc.version || 1}
                        </Badge>
                        <span>&bull;</span>
                        <span>{formatDate(doc.updated_at || doc.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
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

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        window.open(documentsApi.getFileUrl(doc.id), '_blank');
                      }}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Faylni yuklab olish"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>

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
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-xl text-center space-y-2 bg-muted/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <FileText className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Hozircha Word hujjati biriktirilmagan
              </p>
              <p className="text-xs text-muted-foreground max-w-md">
                Ushbu arizaga yangi rasmiy Word blank yaratishingiz yoki kompyuteringizdagi mavjud
                .docx faylni yuklab, tizim ichida tahrirlashingiz mumkin.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => wordFileInputRef.current?.click()}
                  className="text-xs gap-1.5 cursor-pointer"
                >
                  <UploadCloud className="h-3.5 w-3.5 text-blue-600" />
                  <span>Kompyuterdan yuklash</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    setWordDialogState({
                      isOpen: true,
                      mode: 'create',
                      file: null,
                    })
                  }
                  className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Yangi Word yaratish</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===================================================================== */}
      {/* KARTA 5: TERGOV DALILLARI VA BIRIKTIRILGAN FAYLLAR (ATTACHMENTS) */}
      {/* ===================================================================== */}
      <Card className="py-0 gap-0 border-border/80 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60">
          <div className="flex items-center gap-2.5 text-primary">
            <Paperclip className="h-5 w-5" />
            <CardTitle className="text-base font-bold text-foreground">
              Tergov Dalillari va Biriktirilgan Fayllar
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Skrinshotlar, chek kvitansiyalari, audio/video yozuvlar va ekspertiza dalillari
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {evidenceFiles.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {evidenceFiles.map((file, idx) => {
                const previewUrl = getFileViewUrl(file);
                const downloadUrl = getFileDownloadUrl(file);
                const isImg =
                  file.mimetype?.startsWith('image/') ||
                  file.url?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
                  file.original_name?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
                  file.key?.match(/\.(jpg|jpeg|png|webp|gif)$/i);

                return (
                  <div
                    key={idx}
                    className="group relative rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs hover:border-primary/50 transition-all flex flex-col"
                  >
                    <div
                      onClick={() =>
                        isImg ? setPreviewImage(previewUrl) : window.open(previewUrl, '_blank')
                      }
                      className="aspect-square w-full bg-muted/40 flex items-center justify-center overflow-hidden cursor-pointer relative"
                    >
                      {isImg ? (
                        <img
                          src={previewUrl}
                          alt={file.original_name || 'Dalil'}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <FileText className="h-10 w-10 text-muted-foreground/80 group-hover:text-primary transition-colors" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white">
                        <Eye className="h-4 w-4" />
                        <span className="text-[10px] font-semibold">Ko‘rish</span>
                      </div>
                    </div>

                    <div className="p-2 bg-card border-t border-border/50 flex items-center justify-between gap-1">
                      <span
                        className="text-[11px] font-medium text-foreground truncate block flex-1"
                        title={file.original_name || file.filename}
                      >
                        {file.original_name || file.filename}
                      </span>
                      <a
                        href={downloadUrl}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                        title="Yuklab olish"
                      >
                        <Download className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-muted/20 border border-border/50 text-center text-xs text-muted-foreground italic space-y-1">
              <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p>Mazkur arizaga biriktirilgan dalillar yoki ilovalar mavjud emas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===================================================================== */}
      {/* KARTA 6: QO'SHIMCHA MAYDONLAR (AGAR MAVJUD BO'LSA) */}
      {/* ===================================================================== */}
      {otherCustomFields.length > 0 && (
        <Card className="py-0 gap-0 border-border/80 shadow-2xs overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/60">
            <CardTitle className="text-base font-bold text-foreground">
              Qo‘shimcha Qaydlar va Maydonlar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {otherCustomFields.map((cf) => (
                <div
                  key={cf.id}
                  className="p-3 rounded-xl bg-muted/30 border border-border/50 text-xs"
                >
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                    {cf.label}:
                  </span>
                  <p className="font-semibold text-foreground">
                    {Array.isArray(cf.value) ? cf.value.join(', ') : String(cf.value || '—')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* MODALLAR */}
      {/* ===================================================================== */}

      {/* Hujjatni o'chirish dialogi */}
      <ConfirmDialog
        open={!!docToDelete}
        onOpenChange={(open) => !open && setDocToDelete(null)}
        title="Word hujjatini o‘chirish"
        description={
          docToDelete ? (
            <span>
              Haqiqatan ham{' '}
              <strong className="text-foreground font-semibold">"{docToDelete.title}"</strong> nomli
              rasmiy Word hujjatini tizimdan o‘chirmoqchimisiz? Ushbu amal qaytarilmaydi.
            </span>
          ) : (
            ''
          )
        }
        confirmText="Ha, o‘chirilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        isLoading={deleteDocMutation.isPending}
        onConfirm={() => {
          if (docToDelete) {
            deleteDocMutation.mutate(docToDelete.id, {
              onSettled: () => setDocToDelete(null),
            });
          }
        }}
      />

      {/* Arizani tizimdan butunlay o'chirish dialogi */}
      <ConfirmDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Arizani tizimdan butunlay o‘chirish"
        description="Ushbu arizani va unga biriktirilgan barcha ma‘lumotlarni o‘chirmoqchimisiz? Ushbu amal qaytarilmaydi."
        confirmText="Ha, butunlay o‘chirish"
        cancelText="Bekor qilish"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />

      {/* Rasm Preview (Lightbox) modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="sm:max-w-4xl md:max-w-5xl p-3 bg-black/95 border-0">
          {previewImage && (
            <div className="relative flex flex-col items-center justify-center max-h-[85vh]">
              <img
                src={previewImage}
                alt="Dalil kattalashtirilgan ko‘rinishi"
                className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl"
              />
              <div className="mt-2 flex items-center justify-between w-full px-4 text-xs text-white/80">
                <span>Dalil hujjati / Skrinshot</span>
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Download className="h-3.5 w-3.5" />
                  To‘liq hajmda yuklab olish
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Word Hujjatini Yaratish yoki Yuklashda Nomini So'rash Dialogi */}
      <CreateWordDialog
        isOpen={wordDialogState.isOpen}
        fileToUpload={wordDialogState.file}
        applicationNumber={app?.application_number}
        isLoading={createBlankDocMutation.isPending || uploadWordMutation.isPending}
        onClose={() => setWordDialogState((prev) => ({ ...prev, isOpen: false, file: null }))}
        onSubmit={async (title, file) => {
          if (wordDialogState.mode === 'upload' && file) {
            await uploadWordMutation.mutateAsync({ file, title });
            setWordDialogState((prev) => ({ ...prev, isOpen: false, file: null }));
          } else {
            await createBlankDocMutation.mutateAsync(title);
            setWordDialogState((prev) => ({ ...prev, isOpen: false, file: null }));
          }
        }}
      />

      {/* Rasmiy Shablon yoki Bo'sh Word Asosida Hujjat Yaratish Modali */}
      <TemplateGeneratorModal
        isOpen={templateModalState.isOpen}
        onClose={() => setTemplateModalState((prev) => ({ ...prev, isOpen: false }))}
        applicationId={id as string}
        applicationNumber={app?.application_number}
        initialTemplateId={templateModalState.initialTemplateId}
        onSuccess={(newDocId) => {
          queryClient.invalidateQueries({ queryKey: ['application-documents', id] });
          queryClient.invalidateQueries({ queryKey: ['application-detail', id] });
          setActiveEditingDocId(newDocId);
        }}
      />

      {/* ONLYOFFICE Word Muharriri va Tezkor Amallar Modali */}
      <DocumentEditorModal
        documentId={activeEditingDocId}
        application={app}
        isOpen={!!activeEditingDocId}
        onClose={() => setActiveEditingDocId(null)}
        onSaved={() => refetchDocuments()}
      />
    </div>
  );
}
