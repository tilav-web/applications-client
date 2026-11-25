import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  ShieldCheck,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import {
  type ApplicationImportCommitResponse,
  type ApplicationImportPreviewResponse,
  applicationsApi,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { cn } from '@/lib/utils';

interface ApplicationsExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportCompleted?: (result: ApplicationImportCommitResponse) => void;
  onCloseAfterCommit?: (result: ApplicationImportCommitResponse) => void;
}

type ImportStep = 'upload' | 'preview' | 'result';
type PreviewFilter = 'ALL' | 'READY' | 'DUPLICATE' | 'ERROR';

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function downloadBase64Xlsx(base64: string, fileName: string): void {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerBlobDownload(blob, fileName);
}

function formatMoney(amount: number, currency: string): string {
  if (!amount || amount <= 0) return '—';
  return `${new Intl.NumberFormat('uz-UZ').format(Math.round(amount))} ${currency || 'UZS'}`;
}

export function ApplicationsExcelImportDialog({
  open,
  onOpenChange,
  onImportCompleted,
  onCloseAfterCommit,
}: ApplicationsExcelImportDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isDownloadingErrorReport, setIsDownloadingErrorReport] = useState(false);

  const [previewData, setPreviewData] = useState<ApplicationImportPreviewResponse | null>(null);
  const [commitResult, setCommitResult] = useState<ApplicationImportCommitResponse | null>(null);
  const [filter, setFilter] = useState<PreviewFilter>('ALL');

  const resetAll = () => {
    setStep('upload');
    setSelectedFile(null);
    setPreviewData(null);
    setCommitResult(null);
    setFilter('ALL');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (isPreviewing || isCommitting)) {
      return;
    }
    const lastCommit = commitResult;
    if (!nextOpen) {
      resetAll();
    }
    onOpenChange(nextOpen);
    if (!nextOpen && lastCommit) {
      onCloseAfterCommit?.(lastCommit);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      const blob = await applicationsApi.downloadImportTemplate();
      const today = new Date().toISOString().slice(0, 10);
      triggerBlobDownload(
        new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `Arizalar_Import_Shabloni_${today}.xlsx`,
      );
      toast.success('Dinamik Excel shabloni muvaffaqiyatli yuklab olindi');
    } catch (err) {
      toast.error('Shablonni yuklab olishda xatolik', {
        description: getErrorMessage(err),
      });
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const validateAndSetFile = (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Faqat .xlsx (Excel) formatidagi faylni yuklang');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fayl hajmi 10 MB dan oshmasligi kerak');
      return;
    }
    setSelectedFile(file);
  };

  const handlePreview = async () => {
    if (!selectedFile) return;
    try {
      setIsPreviewing(true);
      const data = await applicationsApi.previewExcelImport(selectedFile);
      setPreviewData(data);
      setFilter(data.errorCount > 0 ? 'ERROR' : 'ALL');
      setStep('preview');
    } catch (err) {
      toast.error('Excel faylini tekshirishda xatolik', {
        description: getErrorMessage(err),
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDownloadPreviewErrorReport = async () => {
    if (!selectedFile) return;
    try {
      setIsDownloadingErrorReport(true);
      const blob = await applicationsApi.downloadImportErrorReport(selectedFile);
      const today = new Date().toISOString().slice(0, 10);
      triggerBlobDownload(
        new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `Xatoli_qatorlar_${today}.xlsx`,
      );
      toast.success('Xatoli qatorlar qizil belgilangan Excel shaklida yuklab olindi');
    } catch (err) {
      toast.error('Xatolik hisobotini yuklab olishda xatolik', {
        description: getErrorMessage(err),
      });
    } finally {
      setIsDownloadingErrorReport(false);
    }
  };

  const handleCommit = async () => {
    if (!selectedFile) return;
    try {
      setIsCommitting(true);
      const result = await applicationsApi.commitExcelImport(selectedFile, { skipErrors: true });
      setCommitResult(result);
      setStep('result');

      // Agar bazaga yozilmay qolgan xatoli qatorlar mavjud bo'lsa -> qizil katakli Excelni avtomatik yuklab beramiz
      if (result.errorReportBase64 && result.errorReportFileName) {
        downloadBase64Xlsx(result.errorReportBase64, result.errorReportFileName);
      }

      if (result.createdCount > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['applications'], refetchType: 'all' }),
          queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'], refetchType: 'all' }),
          queryClient.invalidateQueries({ queryKey: ['citizens'], refetchType: 'all' }),
          queryClient.invalidateQueries({ queryKey: ['cards'], refetchType: 'all' }),
          queryClient.invalidateQueries({ queryKey: ['transfers'], refetchType: 'all' }),
        ]);
        toast.success(
          `${result.createdCount} ta ariza bazaga muvaffaqiyatli yozildi` +
            (result.failedCount > 0
              ? `. ${result.failedCount} ta xatoli qator Excel faylida qaytarildi.`
              : ''),
        );
      } else if (result.failedCount > 0) {
        toast.warning(
          `Yangi ariza qo'shilmadi. ${result.failedCount} ta xatoli qator qizil belgilangan Excel faylida yuklab olindi.`,
        );
      } else {
        toast.info('Barcha qatorlar dublikat sifatida o‘tkazib yuborildi.');
      }

      onImportCompleted?.(result);
    } catch (err) {
      toast.error('Arizalarni bazaga yozishda xatolik', {
        description: getErrorMessage(err),
      });
    } finally {
      setIsCommitting(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (!previewData) return [];
    if (filter === 'ALL') return previewData.rows;
    return previewData.rows.filter((r) => r.status === filter);
  }, [previewData, filter]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <span>Excel orqali ommaviy ariza yuklash</span>
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' &&
              "Bazadagi jonli ma'lumotnomalar (dropdownlar) va enum qo'llanmasi bilan tayyorlangan Excel shablonini yuklab oling, to'ldiring va tekshiruvga yuboring."}
            {step === 'preview' &&
              "Fayl bazaga yozilmasdan to'liq tekshirildi. Tayyor qatorlarni saqlashingiz, xatoli qatorlarni esa qizil belgilangan Excel shaklida yuklab olishingiz mumkin."}
            {step === 'result' && 'Import jarayoni yakunlandi. Natijalar bilan tanishing.'}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: SHABLON VA FAYL YUKLASH */}
        {step === 'upload' && (
          <div className="space-y-4">
            {/* 1. Shablon yuklab olish bloki */}
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[11px]">
                    1-qadam
                  </Badge>
                  <span className="text-sm font-semibold text-foreground">
                    Dinamik Excel shablonini yuklab oling
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Shablon 4 ta sahifadan iborat: <strong>1. Arizalar</strong>,{' '}
                  <strong>2. Qo&apos;shimcha o&apos;tkazmalar</strong>,{' '}
                  <strong>3. Gumonlanuvchi izlari</strong> va{' '}
                  <strong>4. Yo&apos;riqnoma va Enumlar</strong>. Barcha tuman, mahalla, status,
                  jinoyat, bank va enum ustunlarida tayyor dropdown ro&apos;yxatlar mavjud.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={isDownloadingTemplate}
                onClick={handleDownloadTemplate}
                className="shrink-0 gap-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer font-semibold"
              >
                {isDownloadingTemplate ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>Shablonni yuklab olish (.xlsx)</span>
              </Button>
            </div>

            {/* Qisqa qoidalar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <span>Ortiqcha ma&apos;lumot kiritilmaydi</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Tuman, mahalla, status, bank, jinoyat va provayderlar faqat bazadagi mavjud
                  ro&apos;yxatdan bog&apos;lanadi; yangi ma&apos;lumotnoma yaratilmaydi.
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Avtomatik dublikat himoyasi</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Mavjud fuqaro va 16 xonali kartalar qayta yaratilmasdan bog&apos;lanadi; takroriy
                  arizalar avtomatik o&apos;tkazib yuboriladi.
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  <span>Qizil belgilangan xatolik Exceli</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Xato bo&apos;lgan qatorlar aynan xato kataklarida qizil fon bilan alohida Excel
                  bo&apos;lib qaytadi — tuzatib o&apos;zini qayta yuklaysiz.
                </p>
              </div>
            </div>

            {/* 2. Fayl tanlash (Dropzone) */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const dropped = e.dataTransfer.files?.[0] || null;
                validateAndSetFile(dropped);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : selectedFile
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30',
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => validateAndSetFile(e.target.files?.[0] || null)}
              />

              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {selectedFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="rounded-full p-1 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Faylni olib tashlash"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Boshqa fayl tanlash uchun bosing
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    To&apos;ldirilgan Excel (.xlsx) faylini shu yerga tashlang yoki tanlang
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Maksimal hajm: 10 MB • Bir yuklashda 1000 tagacha ariza • [NAMUNA] qatori
                    avtomatik o&apos;tkazib yuboriladi
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW / VALIDATSIYA NATIJALARI */}
        {step === 'preview' && previewData && (
          <div className="space-y-4">
            {/* Statistika kartochkalari */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="text-[11px] font-medium text-muted-foreground">Jami qatorlar</div>
                <div className="text-2xl font-bold text-foreground mt-0.5">
                  {previewData.totalRows}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  Tayyor (Yangi)
                </div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {previewData.readyCount}
                </div>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <div className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                  Dublikat (O&apos;tkaziladi)
                </div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  {previewData.duplicateCount}
                </div>
              </div>
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                <div className="text-[11px] font-medium text-red-700 dark:text-red-300">
                  Xatoli qatorlar
                </div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-0.5">
                  {previewData.errorCount}
                </div>
              </div>
            </div>

            {previewData.ignoredExtraColumns.length > 0 && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3.5 py-2.5 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Ortiqcha ustunlar e&apos;tiborsiz qoldirildi (bazaga yozilmaydi):</strong>{' '}
                  {previewData.ignoredExtraColumns.join(', ')}
                </div>
              </div>
            )}

            {previewData.orphanErrors.length > 0 && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    2- yoki 3-sahifada 1-sahifaga bog&apos;lanmagan{' '}
                    {previewData.orphanErrors.length} ta qator aniqlandi:
                  </span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 pl-1">
                  {previewData.orphanErrors.slice(0, 5).map((oe, idx) => (
                    <li key={idx}>
                      {oe.sheet === 'EXTRA_TRANSFERS'
                        ? "2. Qo'shimcha o'tkazmalar"
                        : '3. Gumonlanuvchi izlari'}{' '}
                      ({oe.rowNumber}-qator): {oe.message}
                    </li>
                  ))}
                  {previewData.orphanErrors.length > 5 && (
                    <li>... va yana {previewData.orphanErrors.length - 5} ta qator</li>
                  )}
                </ul>
              </div>
            )}

            {/* Filtr tugmalari */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: 'ALL', label: `Barchasi (${previewData.totalRows})` },
                    { key: 'READY', label: `Tayyor (${previewData.readyCount})` },
                    { key: 'DUPLICATE', label: `Dublikat (${previewData.duplicateCount})` },
                    { key: 'ERROR', label: `Xatoli (${previewData.errorCount})` },
                  ] as Array<{ key: PreviewFilter; label: string }>
                ).map((tab) => (
                  <Button
                    key={tab.key}
                    type="button"
                    size="sm"
                    variant={filter === tab.key ? 'default' : 'outline'}
                    onClick={() => setFilter(tab.key)}
                    className="h-7 text-xs cursor-pointer"
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>

              {(previewData.errorCount > 0 || previewData.orphanErrorsCount > 0) && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isDownloadingErrorReport}
                  onClick={handleDownloadPreviewErrorReport}
                  className="h-8 text-xs gap-1.5 border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer font-semibold"
                >
                  {isDownloadingErrorReport ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span>Xatoli qatorlarni yuklab olish (Qizil belgilangan)</span>
                </Button>
              )}
            </div>

            {/* Qatorlar jadvali */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="max-h-[340px] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 sticky top-0 z-10 border-b border-border">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-3 py-2 font-semibold w-14">Qator</th>
                      <th className="px-3 py-2 font-semibold">Ariza № / Sana</th>
                      <th className="px-3 py-2 font-semibold">Tuman / Jinoyat</th>
                      <th className="px-3 py-2 font-semibold">Arizachi</th>
                      <th className="px-3 py-2 font-semibold">Zarar / Izlar</th>
                      <th className="px-3 py-2 font-semibold">Holat va Sabab</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          Tanlangan filtr bo&apos;yicha qatorlar topilmadi
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={cn(
                            'align-top',
                            row.status === 'ERROR' && 'bg-red-500/5',
                            row.status === 'DUPLICATE' && 'bg-amber-500/5',
                          )}
                        >
                          <td className="px-3 py-2 font-mono font-semibold text-muted-foreground">
                            #{row.rowNumber}
                          </td>
                          <td className="px-3 py-2 space-y-0.5">
                            <div className="font-semibold text-foreground">
                              {row.applicationNumber || (
                                <span className="text-muted-foreground font-normal">Raqamsiz</span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {row.date || '—'}
                              {row.linkCode ? ` • Kod: ${row.linkCode}` : ''}
                            </div>
                          </td>
                          <td className="px-3 py-2 space-y-0.5">
                            <div className="font-medium text-foreground">
                              {row.districtName || '—'}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                              {row.crimeLabel || '—'}
                            </div>
                          </td>
                          <td className="px-3 py-2 space-y-1">
                            <div className="font-medium text-foreground">
                              {row.citizenFullName || '—'}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {row.citizenIdentifier || '—'}
                            </div>
                            {row.matchedExistingCitizen && (
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 px-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 gap-1"
                              >
                                <UserCheck className="h-2.5 w-2.5" />
                                Mavjud fuqaro biriktiriladi
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2 space-y-1">
                            <div className="font-semibold text-foreground">
                              {formatMoney(row.totalAmount, row.currency)}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {row.transfersCount} o&apos;tkazma • {row.suspectCluesCount} iz
                            </div>
                            {row.matchedExistingCards && row.matchedExistingCards.length > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 px-1.5 border-blue-500/40 text-blue-600 dark:text-blue-400 gap-1"
                              >
                                <CreditCard className="h-2.5 w-2.5" />
                                {row.matchedExistingCards.length} mavjud karta
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2 space-y-1 max-w-[280px]">
                            {row.status === 'READY' && (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                                Tayyor
                              </Badge>
                            )}
                            {row.status === 'DUPLICATE' && (
                              <div className="space-y-1">
                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                  Dublikat (O&apos;tkaziladi)
                                </Badge>
                                <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug">
                                  {row.duplicateReason}
                                </p>
                              </div>
                            )}
                            {row.status === 'ERROR' && (
                              <div className="space-y-1">
                                <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30">
                                  Xatoli ({row.errors.length})
                                </Badge>
                                <ul className="list-disc list-inside text-[11px] text-red-600 dark:text-red-400 space-y-0.5 leading-snug">
                                  {row.errors.map((errMsg, i) => (
                                    <li key={i}>{errMsg}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {previewData.readyCount > 0 && previewData.errorCount > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  Saqlash bosilganda faqat <strong>{previewData.readyCount} ta tayyor ariza</strong>{' '}
                  bazaga yoziladi. Bazaga yozilmay qolgan{' '}
                  <strong>{previewData.errorCount} ta xatoli qator</strong> esa aynan xato chiqqan
                  kataklarida <strong>qizil fon</strong> bilan avtomatik Excel fayl bo&apos;lib
                  yuklab beriladi.
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: YAKUNIY NATIJA */}
        {step === 'result' && commitResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Bazaga muvaffaqiyatli yozildi
                </div>
                <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {commitResult.createdCount}
                </div>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  Dublikat (O&apos;tkazib yuborildi)
                </div>
                <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                  {commitResult.skippedDuplicateCount}
                </div>
              </div>
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <div className="text-xs font-medium text-red-700 dark:text-red-300">
                  Yozilmay qolgan (Xatoli)
                </div>
                <div className="text-3xl font-extrabold text-red-600 dark:text-red-400 mt-1">
                  {commitResult.failedCount}
                </div>
              </div>
            </div>

            {commitResult.errorReportBase64 && commitResult.errorReportFileName && (
              <div className="rounded-xl border border-red-500/35 bg-red-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Bazaga yozilmagan xatoli qatorlar Exceli tayyor</span>
                  </div>
                  <p className="text-xs text-red-700/90 dark:text-red-300/90 leading-relaxed">
                    <strong>{commitResult.errorReportFileName}</strong> fayli avtomatik yuklab
                    olindi. Unda faqat xatoli qatorlar qoldirilgan va aynan xato chiqqan kataklar{' '}
                    <strong>qizil fon va izoh</strong> bilan belgilangan. Qizil kataklarni
                    to&apos;g&apos;irlab, aynan shu faylning o&apos;zini qayta yuklashingiz mumkin.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    downloadBase64Xlsx(
                      commitResult.errorReportBase64!,
                      commitResult.errorReportFileName!,
                    )
                  }
                  className="shrink-0 gap-2 border-red-500/50 text-red-700 dark:text-red-300 hover:bg-red-500/15 cursor-pointer font-semibold"
                >
                  <Download className="h-4 w-4" />
                  <span>Qayta yuklab olish</span>
                </Button>
              </div>
            )}

            {commitResult.createdApplications.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/50 px-3.5 py-2 text-xs font-semibold text-foreground border-b border-border">
                  Yaratilgan arizalar ({commitResult.createdApplications.length} ta)
                </div>
                <div className="max-h-[200px] overflow-auto divide-y divide-border/50">
                  {commitResult.createdApplications.slice(0, 50).map((item) => (
                    <div
                      key={item.id}
                      className="px-3.5 py-2 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-muted-foreground">#{item.rowNumber}</span>
                        <span className="font-semibold text-foreground">
                          {item.application_number || 'Raqamsiz ariza'}
                        </span>
                        {item.citizen_name && (
                          <span className="text-muted-foreground">— {item.citizen_name}</span>
                        )}
                      </div>
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                        Saqlandi
                      </Badge>
                    </div>
                  ))}
                  {commitResult.createdApplications.length > 50 && (
                    <div className="px-3.5 py-2 text-xs text-muted-foreground text-center">
                      ... va yana {commitResult.createdApplications.length - 50} ta ariza
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="cursor-pointer"
              >
                Bekor qilish
              </Button>
              <Button
                type="button"
                disabled={!selectedFile || isPreviewing}
                onClick={handlePreview}
                className="gap-2 cursor-pointer font-semibold"
              >
                {isPreviewing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Tekshirilmoqda...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Faylni tekshirish (Preview)</span>
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'preview' && previewData && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isCommitting}
                onClick={() => setStep('upload')}
                className="gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Boshqa fayl tanlash</span>
              </Button>
              <Button
                type="button"
                disabled={previewData.readyCount === 0 || isCommitting}
                onClick={handleCommit}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer font-semibold"
              >
                {isCommitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Bazaga yozilmoqda...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{previewData.readyCount} ta tayyor arizani bazaga saqlash</span>
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'result' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={resetAll}
                className="gap-1.5 cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                <span>Yana fayl yuklash</span>
              </Button>
              <Button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="cursor-pointer font-semibold"
              >
                Yopish
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
