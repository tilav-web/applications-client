import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  FileCheck2,
  FilePlus2,
  FileText,
  Languages,
  Loader2,
  PenTool,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import * as React from 'react';
import { useEffect, useState } from 'react';

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
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import {
  documentsApi,
  type DocumentTemplateItem,
  type GenerateFromTemplatePayload,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/error';

interface TemplateGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  applicationNumber?: string | null;
  initialTemplateId?: string;
  onSuccess: (newDocId: string) => void;
}

const QUICK_TITLE_SUGGESTIONS = [
  'Yangi hujjat',
  'Tergov qarori',
  'Murojaat bayonnomasi',
  'Bankka so‘rovnoma',
  'Tushuntirish xati',
  'Muzlatish qarori',
  'Ekspertiza tayinlash qarori',
];

export function TemplateGeneratorModal({
  isOpen,
  onClose,
  applicationId,
  initialTemplateId,
  onSuccess,
}: TemplateGeneratorModalProps) {
  const [script, setScript] = useState<'lotin' | 'krill'>('lotin');
  const [templates, setTemplates] = useState<DocumentTemplateItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplateId || 'tushuntirish-telegram',
  );
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field values for form editing
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [documentTitle, setDocumentTitle] = useState('');

  // When initialTemplateId changes or modal opens
  useEffect(() => {
    if (isOpen && initialTemplateId) {
      setSelectedTemplateId(initialTemplateId);
    }
  }, [isOpen, initialTemplateId]);

  // 1. Load available templates
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoadingTemplates(true);
    documentsApi
      .getTemplates(script)
      .then((data) => {
        if (cancelled) return;
        setTemplates(data);
        setSelectedTemplateId((prev) => {
          if (data.length > 0 && !data.some((t) => t.id === prev)) {
            return initialTemplateId || data[0].id;
          }
          return prev;
        });
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(`Shablonlarni yuklashda xatolik: ${getErrorMessage(err)}`);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingTemplates(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, script, initialTemplateId]);

  // 2. Load preview / prefilled data whenever template or script changes
  useEffect(() => {
    if (!isOpen || !applicationId || !selectedTemplateId) return;
    if (selectedTemplateId === 'blank') {
      setFieldValues({});
      setDocumentTitle(script === 'krill' ? 'Янги ҳужжат' : 'Yangi hujjat');
      setIsLoadingPreview(false);
      return;
    }

    let cancelled = false;
    setIsLoadingPreview(true);
    documentsApi
      .getTemplatePreview(applicationId, selectedTemplateId, script)
      .then((previewRes) => {
        if (cancelled) return;
        setFieldValues(previewRes.prefilledData || {});
        // Qisqa va lo'nda standart nom: masalan "Tushuntirish xati", "Bayonnoma", "Sanksiya qarori"
        const shortTitle =
          previewRes.template.defaultDocTitle ||
          previewRes.template.title.split('(')[0].trim() ||
          'Rasmiy hujjat';
        setDocumentTitle(shortTitle);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(`Shablon ma'lumotlarini to'ldirishda xatolik: ${getErrorMessage(err)}`);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingPreview(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, applicationId, selectedTemplateId, script]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const isBlankDoc = selectedTemplateId === 'blank';

  const handleFieldChange = (key: string, val: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTemplateId) {
      toast.error('Shablon yoki hujjat turi tanlanmadi');
      return;
    }

    const finalTitle = documentTitle.trim() || (isBlankDoc ? 'Yangi hujjat' : 'Rasmiy hujjat');

    setIsSubmitting(true);
    try {
      const payload: GenerateFromTemplatePayload = {
        templateId: selectedTemplateId,
        script,
        title: finalTitle,
        customData: isBlankDoc ? {} : fieldValues,
      };

      const createdDoc = await documentsApi.createFromTemplate(applicationId, payload);
      toast.success(
        isBlankDoc
          ? 'Bo‘sh Word hujjati muvaffaqiyatli yaratildi va ochildi!'
          : 'Hujjat shablon asosida muvaffaqiyatli yaratildi va ochildi!',
      );
      onClose();
      if (createdDoc?.id) {
        onSuccess(createdDoc.id);
      }
    } catch (err) {
      toast.error(`Hujjat yaratishda xatolik: ${getErrorMessage(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="w-[96vw] max-w-6xl xl:max-w-7xl h-[92vh] max-h-[940px] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl rounded-2xl border-border/80">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border bg-muted/20 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <span>Rasmiy Word Hujjati Yaratish</span>
                  <Badge
                    variant="outline"
                    className="text-[11px] bg-blue-500/10 text-blue-600 border-blue-500/30 font-semibold px-2 py-0.5"
                  >
                    {isBlankDoc ? 'Bo‘sh blank' : 'Shablon bilan avtomatik'}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Kerakli shablonni yoki bo‘sh Word blankni tanlang, nomini kiriting va darhol
                  ONLYOFFICE da tahrirlang.
                </DialogDescription>
              </div>
            </div>

            {/* Script (Lotin / Krill) Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/80 rounded-xl border border-border self-start sm:self-auto shrink-0 shadow-2xs">
              <Languages className="h-3.5 w-3.5 text-muted-foreground ml-2 mr-0.5" />
              <button
                type="button"
                onClick={() => setScript('lotin')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  script === 'lotin'
                    ? 'bg-background text-foreground shadow-xs ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Lotin alifbosi
              </button>
              <button
                type="button"
                onClick={() => setScript('krill')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  script === 'krill'
                    ? 'bg-background text-foreground shadow-xs ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Крилл алифбоси
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body with 2 Columns */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
          {/* Left Column: Template Selection List (4 Cols) */}
          <div className="md:col-span-4 border-r border-border p-4 bg-muted/10 flex flex-col gap-2 overflow-y-auto">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Hujjat Turlari & Shablonlar ({templates.length})
              </span>
              {isLoadingTemplates && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="space-y-2 mt-1">
              {templates.map((tmpl) => {
                const isSelected = tmpl.id === selectedTemplateId;
                const isBlank = tmpl.id === 'blank';
                const isSanksiya = tmpl.category === 'Sanksiya';
                const isBayonnoma = tmpl.category === 'Bayonnoma';

                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 shadow-sm ring-1 ring-blue-500/30'
                        : 'border-border/70 bg-card hover:bg-muted/50 hover:border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {isBlank ? (
                          <FilePlus2 className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                        ) : isSanksiya ? (
                          <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        ) : isBayonnoma ? (
                          <BookOpen className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <FileText className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="text-xs sm:text-sm font-bold text-foreground leading-snug block">
                            {tmpl.title}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={isBlank ? 'default' : 'secondary'}
                        className={`text-[10px] px-1.5 py-0.5 shrink-0 font-mono font-semibold ${
                          isBlank ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''
                        }`}
                      >
                        {isBlank ? 'Bo‘sh' : `${tmpl.pageCount} bet`}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                      {tmpl.description}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                      <span className="font-semibold text-primary">{tmpl.category}</span>
                      <span className="font-mono text-muted-foreground">
                        {isBlank ? 'Erkin matn' : `${tmpl.fields.length} ta maydon`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Pre-filled Fields Review & Edit or Blank Config (8 Cols) */}
          <div className="md:col-span-8 p-4 sm:p-5 flex flex-col justify-between overflow-hidden bg-background">
            <div className="space-y-3.5 flex-1 overflow-hidden flex flex-col">
              {/* Info banner */}
              {isBlankDoc ? (
                <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-900 dark:text-purple-200 text-xs shrink-0 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FilePlus2 className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>
                      <strong>Bo‘sh Word Blank:</strong> Hech qanday shablonsiz toza hujjat
                      yaratiladi va ONLYOFFICE da erkin tahrirlash uchun ochiladi.
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-purple-500/40 text-[10px] font-semibold shrink-0"
                  >
                    Toza blank
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      Arizadagi barcha mavjud ma’lumotlar avtomatik joylashtirildi. Kerakli
                      o‘zgartirishlarni kiritishingiz mumkin.
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 text-[10px] bg-emerald-500/15 font-semibold px-1.5 py-0.5 shrink-0"
                  >
                    Avto-to‘ldirish
                  </Badge>
                </div>
              )}

              {/* Title input (User requirement: Must always prompt officer for file title with short clean default!) */}
              <div className="space-y-1.5 shrink-0 bg-muted/20 p-3 rounded-xl border border-border/80">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <PenTool className="h-3.5 w-3.5 text-blue-600" />
                    <span>Hujjat Nomi (Fayl sarlavhasi) *</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Ro‘yxatda va ONLYOFFICE da aks etadi
                  </span>
                </label>
                <Input
                  autoFocus
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="Masalan: Tushuntirish xati yoki Tergov qarori..."
                  required
                  className="h-10 text-xs sm:text-sm font-semibold bg-background"
                />

                {/* Quick suggestions pills */}
                <div className="flex items-center flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Tezkor nomlar:
                  </span>
                  {QUICK_TITLE_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setDocumentTitle(sug)}
                      className="text-[11px] px-2 py-0.5 rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer hover:border-primary/40 font-medium"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fields form area (only when template is selected) */}
              {!isBlankDoc && selectedTemplate?.isDynamic && (
                <div className="flex-1 overflow-hidden flex flex-col pt-1 min-h-0">
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-emerald-500/5 rounded-xl border border-dashed border-emerald-500/30">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-3">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground">Universal Dinamik Shablon</h4>
                    <p className="text-xs text-muted-foreground max-w-md mt-1.5 leading-relaxed">
                      Arizadagi barcha ma’lumotlar (fuqaro, tuman, karta, o‘tkazmalar) avtomatik
                      ravishda Word hujjatingizga to‘liq joylashtiriladi. Hujjat yaratilgach,
                      ONLYOFFICE muharriri ochilib, yakuniy tahrirlash imkoni beriladi.
                    </p>
                    {selectedTemplate.availableTags &&
                      selectedTemplate.availableTags.length > 0 && (
                        <div className="mt-3 max-w-md">
                          <span className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                            Ushbu shablondagi dinamik teglar (
                            {selectedTemplate.availableTags.length} ta):
                          </span>
                          <div className="flex flex-wrap gap-1 justify-center max-h-24 overflow-y-auto">
                            {selectedTemplate.availableTags.map((tag: string) => (
                              <code
                                key={tag}
                                className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-primary font-mono"
                              >
                                {`{{${tag}}}`}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {!isBlankDoc && !selectedTemplate?.isDynamic && (
                <div className="flex-1 overflow-hidden flex flex-col pt-1 min-h-0">
                  <div className="flex items-center justify-between pb-2 border-b border-border shrink-0">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                      <span>Shablon Maydonlari ({selectedTemplate?.fields.length || 0})</span>
                    </span>
                    {isLoadingPreview && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Yuklanmoqda...
                      </span>
                    )}
                  </div>

                  <div className="flex-1 pr-2 pt-2.5 overflow-y-auto min-h-0 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                      {selectedTemplate?.fields.map((f) => {
                        const val = fieldValues[f.key] || '';
                        const isFullWidth =
                          f.key === 'citizenFullName' ||
                          f.key === 'citizenAddress' ||
                          f.key === 'headTitle' ||
                          f.key === 'prosecutorInfo' ||
                          f.key === 'inspectionDescription' ||
                          f.key === 'witness1' ||
                          f.key === 'witness2';

                        return (
                          <div
                            key={f.key}
                            className={`space-y-1 ${isFullWidth ? 'sm:col-span-2' : ''}`}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <label className="font-semibold text-foreground text-[11px] sm:text-xs">
                                {f.label} {f.required && <span className="text-red-500">*</span>}
                              </label>
                              {val ? (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium bg-emerald-500/10 px-1 py-0.2 rounded">
                                  bazada mavjud
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  ixtiyoriy
                                </span>
                              )}
                            </div>
                            <Input
                              value={val}
                              onChange={(e) => handleFieldChange(f.key, e.target.value)}
                              placeholder={f.placeholder || f.label}
                              className="h-9 text-xs font-mono bg-muted/20 border-border/80 focus:border-blue-500 focus:bg-background transition-colors"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Blank document instructions helper */}
              {isBlankDoc && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/10 rounded-xl border border-dashed border-border/80">
                  <div className="h-12 w-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center mb-3">
                    <FilePlus2 className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">Bo‘sh Word Blank Yaratish</h4>
                  <p className="text-xs text-muted-foreground max-w-md mt-1.5 leading-relaxed">
                    Ushbu parametr tanlanganda hech qanday tayyor matnsiz bo‘m-bo‘sh rasmiy Word
                    hujjati yaratiladi. Hujjat nomini yuqorida tasdiqlang va pastdagi tugmani
                    bosing. ONLYOFFICE muharriri ochilib, to‘g‘ridan-to‘g‘ri yozishni boshlashingiz
                    mumkin bo‘ladi.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 sm:p-4 border-t border-border bg-muted/20 flex items-center justify-between sm:justify-between w-full shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="hidden sm:inline">
              Yaratilgandan so‘ng hujjat avtomatik ONLYOFFICE da ochiladi
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs h-9 px-4 cursor-pointer font-medium"
            >
              Bekor qilish
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSubmit()}
              disabled={isSubmitting || isLoadingPreview || !documentTitle.trim()}
              className="text-xs h-9 px-5 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 cursor-pointer gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Yaratilmoqda...</span>
                </>
              ) : (
                <>
                  <FileCheck2 className="h-3.5 w-3.5" />
                  <span>Hujjatni Yaratish & Ochish</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
