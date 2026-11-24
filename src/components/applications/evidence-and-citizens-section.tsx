import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  Download,
  Edit2,
  ExternalLink,
  File as FileIcon,
  FileUp,
  Loader2,
  MapPin,
  Paperclip,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
  UserPlus,
} from 'lucide-react';
import { type RefObject, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DistrictSearchSelect } from '@/components/ui/district-search-select';
import { FemaleIcon, MaleIcon } from '@/components/ui/gender-icons';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { QuickLocationDialog } from '@/components/ui/quick-location-dialog';
import { toast } from '@/components/ui/sonner';
import { usePermissions } from '@/hooks/use-permissions';
import {
  documentsApi,
  getFileDownloadUrl,
  getFileViewUrl,
  neighborhoodsApi,
  type UploadedFile,
} from '@/lib/api';
import type { CustomFieldType, District } from '@/types/models';

import type { AppCustomFieldState } from './application-form.types';

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function CustomCitizenMahallaSelect({
  districtId,
  mahallaId,
  onSelect,
}: {
  districtId: string | null;
  mahallaId: string | null;
  onSelect: (id: string | null, name: string) => void;
}) {
  const { data: mahallasData } = useQuery({
    queryKey: ['custom-citizen-neighborhoods-select', districtId],
    queryFn: () => neighborhoodsApi.getAll({ district_id: districtId!, limit: 200 }),
    enabled: Boolean(districtId),
  });

  const items = mahallasData?.items || [];

  return (
    <select
      value={mahallaId || ''}
      disabled={!districtId}
      onChange={(e) => {
        const val = e.target.value;
        const found = items.find((m) => m.id === val);
        onSelect(val || null, found?.name || '');
      }}
      className={`h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold uppercase shadow-sm focus:outline-none focus:ring-2 focus:ring-ring ${
        !districtId ? 'bg-muted/50 cursor-not-allowed opacity-60 text-muted-foreground' : ''
      }`}
    >
      <option value="">
        {districtId ? '-- MAHALLANI TANLANG --' : 'AVVAL TUMANNI TANLANG...'}
      </option>
      {items.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}

interface ApplicationDocSummary {
  id: string;
  title?: string | null;
  file_name: string;
  size: number;
  version?: number | null;
}

interface EvidenceAndCitizensSectionProps {
  applicationId?: string;
  evidenceFiles: UploadedFile[];
  isUploadingEvidence: boolean;
  isDraggingEvidence: boolean;
  setIsDraggingEvidence: (val: boolean) => void;
  evidenceInputRef: RefObject<HTMLInputElement | null>;
  onUploadEvidenceFiles: (files: FileList | null) => void;
  onRemoveEvidenceFile: (index: number) => void;
  appDocuments: ApplicationDocSummary[];
  wordFileInputRef: RefObject<HTMLInputElement | null>;
  isUploadingWord: boolean;
  onOpenWordUploadDialog: (file: File) => void;
  onOpenTemplateModal: (initialTemplateId: string) => void;
  onEditDocument: (docId: string) => void;
  onRequestDeleteDocument: (doc: { id: string; title: string }) => void;
  customFields: AppCustomFieldState[];
  allDistricts: District[];
  onAddCustomFieldItem: (type: CustomFieldType, defaultLabel: string) => void;
  onRemoveCustomFieldItem: (clientId: string) => void;
  onUpdateCustomFieldItem: (
    clientId: string,
    updater: (prev: AppCustomFieldState) => AppCustomFieldState,
  ) => void;
}

export function EvidenceAndCitizensSection({
  applicationId,
  evidenceFiles,
  isUploadingEvidence,
  isDraggingEvidence,
  setIsDraggingEvidence,
  evidenceInputRef,
  onUploadEvidenceFiles,
  onRemoveEvidenceFile,
  appDocuments,
  wordFileInputRef,
  isUploadingWord,
  onOpenWordUploadDialog,
  onOpenTemplateModal,
  onEditDocument,
  onRequestDeleteDocument,
  customFields,
  allDistricts,
  onAddCustomFieldItem,
  onRemoveCustomFieldItem,
  onUpdateCustomFieldItem,
}: EvidenceAndCitizensSectionProps) {
  const { canWrite } = usePermissions();
  const [quickLocTarget, setQuickLocTarget] = useState<{
    open: boolean;
    clientId: string;
    initialRegionId?: string | null;
    initialDistrictId?: string | null;
    initialDistrictQuery?: string;
  }>({ open: false, clientId: '' });
  const citizenFields = customFields.filter((cf) => cf.type === 'CITIZEN');

  return (
    <div className="p-5 sm:p-6 space-y-6 bg-amber-50 dark:bg-amber-950/20 transition-colors">
      <div className="flex items-center gap-2.5 border-b border-amber-200/70 dark:border-amber-800/40 pb-3">
        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          <Paperclip className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            4. Isbotlar, Kvitansiyalar va Qo‘shimcha Subyektlar
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Tergov dalillari (chek skrinshotlari, PDF ko‘chirmalar) va ishga aloqador boshqa
            shaxslar
          </p>
        </div>
      </div>

      {/* A. YAGONA MINIO FAYL VA ISBOTLAR YUKLASH ZONASI */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <UploadCloud className="h-4 w-4 text-primary" />
            Ishga oid fayl va skrinshotlar ({evidenceFiles.length} ta ilova)
          </span>
          <input
            ref={evidenceInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => onUploadEvidenceFiles(e.target.files)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => evidenceInputRef.current?.click()}
            disabled={isUploadingEvidence}
            className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
          >
            {isUploadingEvidence ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Yuklanmoqda...</span>
              </>
            ) : (
              <>
                <FileUp className="h-3.5 w-3.5" />
                <span>+ Fayl tanlash</span>
              </>
            )}
          </Button>
        </div>

        {/* DRAG & DROP ZONE */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingEvidence(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDraggingEvidence(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingEvidence(false);
            onUploadEvidenceFiles(e.dataTransfer.files);
          }}
          onClick={() => evidenceInputRef.current?.click()}
          className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center ${
            isDraggingEvidence
              ? 'border-primary bg-primary/10'
              : 'border-border/80 hover:border-primary/50 bg-muted/10'
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {isUploadingEvidence ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <UploadCloud className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-foreground">
              Fayllarni shu yerga tashlang yoki bosing
            </p>
            <p className="text-[11px] text-muted-foreground">
              PNG, JPG, PDF, DOCX, MP3, MP4 formatdagi kvitansiya, audio yoki skrinshotlar
            </p>
          </div>
        </div>

        {/* YUKLANGAN FAYLLAR GRIDI */}
        {evidenceFiles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {evidenceFiles.map((f, idx) => {
              const previewUrl = getFileViewUrl(f);
              const downloadUrl = getFileDownloadUrl(f);
              const isImg =
                f.mimetype?.startsWith('image/') ||
                f.url?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
                f.original_name?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
                f.key?.match(/\.(jpg|jpeg|png|webp|gif)$/i);

              return (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {isImg ? (
                      <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-border/80 bg-muted/30 flex items-center justify-center">
                        <img
                          src={previewUrl}
                          alt={f.original_name || 'Isbot'}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center text-primary">
                        <FileIcon className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {f.original_name || 'Fayl'}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {formatFileSize(f.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={downloadUrl || previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
                      title="Ochish / Yuklab olish"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => onRemoveEvidenceFile(idx)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition"
                      title="O‘chirish"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* B. RASMIY WORD HUJJATLARI (.DOCX / ONLYOFFICE) */}
      <div className="pt-4 border-t border-border/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 font-serif font-black text-xs">
              W
            </div>
            <div>
              <span className="text-xs font-bold text-foreground">
                Rasmiy Word Hujjatlari ({appDocuments.length} ta hujjat)
              </span>
              <p className="text-[11px] text-muted-foreground">
                Tergov hujjati yoki blank. Kompyuterdan Word yuklash yoki yangi Word yaratib tizimda
                ONLYOFFICE orqali tahrirlash
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <input
              ref={wordFileInputRef}
              type="file"
              accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onOpenWordUploadDialog(file);
                  e.target.value = '';
                }
              }}
            />

            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (!applicationId) {
                  toast.info('Rasmiy Word hujjat yaratish uchun avval arizani saqlang');
                  return;
                }
                onOpenTemplateModal('tushuntirish-telegram');
              }}
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
              onClick={() => {
                if (!applicationId) {
                  toast.info('Word faylini biriktirish uchun avval arizani saqlang');
                  return;
                }
                wordFileInputRef.current?.click();
              }}
              disabled={isUploadingWord}
              className="h-8 text-xs gap-1.5 border-border font-medium cursor-pointer"
              title="Kompyuterdan mavjud Word (.docx / .doc) faylini yuklash"
            >
              {isUploadingWord ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UploadCloud className="h-3.5 w-3.5 text-blue-600" />
              )}
              <span>Kompyuterdan yuklash</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (!applicationId) {
                  toast.info('Yangi Word hujjat ochish uchun avval arizani saqlang');
                  return;
                }
                onOpenTemplateModal('blank');
              }}
              className="h-8 text-xs gap-1.5 font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
              title="Yangi bo‘sh Word blank yaratish va ONLYOFFICE da tahrirlash"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Yangi Word</span>
            </Button>
          </div>
        </div>

        {/* YUKLANGAN WORD HUJJATLARI GRIDI */}
        {appDocuments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {appDocuments.map((doc) => (
              <div
                key={doc.id}
                className="p-3 rounded-xl border border-border/80 bg-card hover:border-blue-400 transition shadow-2xs flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#185abd] text-white font-serif font-black text-xs shadow-2xs">
                    W
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-xs font-semibold text-foreground truncate"
                      title={doc.title || doc.file_name}
                    >
                      {doc.title || doc.file_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {(doc.size / 1024).toFixed(1)} KB &bull; v{doc.version || 1}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onEditDocument(doc.id)}
                    className="h-7 px-2 text-[11px] font-semibold bg-[#185abd] hover:bg-[#12448f] text-white gap-1 cursor-pointer"
                    title="ONLYOFFICE muharririda ochish va tahrirlash"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Tahrirlash</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      window.open(documentsApi.getFileUrl(doc.id), '_blank', 'noopener,noreferrer');
                    }}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Yuklab olish"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      onRequestDeleteDocument({ id: doc.id, title: doc.title || doc.file_name })
                    }
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 cursor-pointer"
                    title="O‘chirish"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/10 text-center space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Hozircha biriktirilgan Word hujjati yo‘q
            </p>
            <p className="text-[11px] text-muted-foreground">
              Yuqoridagi tugmalar orqali kompyuterdan Word faylni yuklashingiz yoki yangi bo‘sh Word
              yaratib OnlyOffice&apos;da to‘ldirishingiz mumkin.
            </p>
          </div>
        )}
      </div>

      {/* C. QO'SHIMCHA FUQAROLAR */}
      <div className="pt-4 border-t border-border/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-foreground">
              Ishga aloqador qo‘shimcha fuqarolar ({citizenFields.length})
            </span>
            <p className="text-[11px] text-muted-foreground">
              Gumonlanuvchilar, guvohlar, sheriklar yoki boshqa aloqador shaxslarni kiritish
            </p>
          </div>
        </div>

        {/* QO'SHILGAN FUQAROLAR KARTOCHKALARI */}
        {citizenFields.length > 0 && (
          <div className="space-y-4 pt-1">
            {citizenFields.map((cf) => {
              const citDistId = cf.inline_citizen?.district_id || null;
              const citMahId = cf.inline_citizen?.neighborhood_id || null;

              return (
                <div
                  key={cf.clientId}
                  className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3.5"
                >
                  {/* Karta sarlavhasi: Icon + Fuqaro Roli Inputi + O'chirish tugmasi */}
                  <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-2.5">
                    <div className="flex items-center gap-2.5 flex-1">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <Input
                        placeholder="Fuqaro maqomi / Roli (Masalan: Gumonlanuvchi, Guvoh, Sherik...)"
                        value={cf.label}
                        onChange={(e) =>
                          onUpdateCustomFieldItem(cf.clientId, (f) => ({
                            ...f,
                            label: e.target.value.toUpperCase(),
                          }))
                        }
                        className="h-9 text-xs font-bold w-full max-w-md uppercase text-primary placeholder:text-muted-foreground/60 placeholder:normal-case placeholder:font-normal"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveCustomFieldItem(cf.clientId)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 shrink-0"
                      title="Fuqaroni ro‘yxatdan o‘chirish"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* FUQARO ANKETASI */}
                  <div className="space-y-3">
                    {/* 1-Qator: Ism, Familiya, Sharif */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Ism *
                        </label>
                        <Input
                          placeholder="ISM"
                          value={cf.inline_citizen?.first_name || ''}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            onUpdateCustomFieldItem(cf.clientId, (f) => ({
                              ...f,
                              inline_citizen: {
                                ...(f.inline_citizen || {
                                  first_name: '',
                                  last_name: '',
                                  middle_name: '',
                                  passport: '',
                                  phone_number: '',
                                }),
                                first_name: val,
                              },
                            }));
                          }}
                          className="h-9 text-xs uppercase font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Familiya
                        </label>
                        <Input
                          placeholder="FAMILIYA"
                          value={cf.inline_citizen?.last_name || ''}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            onUpdateCustomFieldItem(cf.clientId, (f) => ({
                              ...f,
                              inline_citizen: {
                                ...(f.inline_citizen || {
                                  first_name: '',
                                  last_name: '',
                                  middle_name: '',
                                  passport: '',
                                  phone_number: '',
                                }),
                                last_name: val,
                              },
                            }));
                          }}
                          className="h-9 text-xs uppercase font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Sharif (Otasining ismi)
                        </label>
                        <Input
                          placeholder="SHARIF"
                          value={cf.inline_citizen?.middle_name || ''}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            onUpdateCustomFieldItem(cf.clientId, (f) => ({
                              ...f,
                              inline_citizen: {
                                ...(f.inline_citizen || {
                                  first_name: '',
                                  last_name: '',
                                  middle_name: '',
                                  passport: '',
                                  phone_number: '',
                                }),
                                middle_name: val,
                              },
                            }));
                          }}
                          className="h-9 text-xs uppercase font-medium"
                        />
                      </div>
                    </div>

                    {/* 2-Qator: Tug'ilgan sana, Jinsi */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Tug‘ilgan Sana
                        </label>
                        <Input
                          type="date"
                          value={cf.inline_citizen?.birth_date || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            onUpdateCustomFieldItem(cf.clientId, (f) => ({
                              ...f,
                              inline_citizen: {
                                ...(f.inline_citizen || {
                                  first_name: '',
                                  last_name: '',
                                  middle_name: '',
                                  passport: '',
                                  phone_number: '',
                                }),
                                birth_date: val,
                              },
                            }));
                          }}
                          className="h-9 text-xs cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Jinsi
                        </label>
                        <div className="grid grid-cols-2 gap-2 h-9">
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateCustomFieldItem(cf.clientId, (f) => ({
                                ...f,
                                inline_citizen: {
                                  ...(f.inline_citizen || {
                                    first_name: '',
                                    last_name: '',
                                    middle_name: '',
                                    passport: '',
                                    phone_number: '',
                                  }),
                                  gender: f.inline_citizen?.gender === 'male' ? '' : 'male',
                                },
                              }));
                            }}
                            className={`h-full flex items-center justify-center gap-1.5 rounded-md border text-xs font-semibold transition-colors cursor-pointer ${
                              cf.inline_citizen?.gender === 'male'
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-background hover:bg-muted text-foreground border-input'
                            }`}
                          >
                            <MaleIcon className="h-3.5 w-3.5" /> Erkak
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateCustomFieldItem(cf.clientId, (f) => ({
                                ...f,
                                inline_citizen: {
                                  ...(f.inline_citizen || {
                                    first_name: '',
                                    last_name: '',
                                    middle_name: '',
                                    passport: '',
                                    phone_number: '',
                                  }),
                                  gender: f.inline_citizen?.gender === 'female' ? '' : 'female',
                                },
                              }));
                            }}
                            className={`h-full flex items-center justify-center gap-1.5 rounded-md border text-xs font-semibold transition-colors cursor-pointer ${
                              cf.inline_citizen?.gender === 'female'
                                ? 'bg-pink-600 text-white border-pink-600'
                                : 'bg-background hover:bg-muted text-foreground border-input'
                            }`}
                          >
                            <FemaleIcon className="h-3.5 w-3.5" /> Ayol
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 3-Qator: Telefon, Pasport, JSHSHIR */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Telefon raqami
                        </label>
                        <PhoneInput
                          value={cf.inline_citizen?.phone_number}
                          onChange={(val) => {
                            onUpdateCustomFieldItem(cf.clientId, (f) => ({
                              ...f,
                              inline_citizen: {
                                ...(f.inline_citizen || {
                                  first_name: '',
                                  last_name: '',
                                  middle_name: '',
                                  passport: '',
                                  phone_number: '',
                                }),
                                phone_number: val,
                              },
                            }));
                          }}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Pasport seriya & raqam
                        </label>
                        <Input
                          placeholder="AA1234567"
                          value={cf.inline_citizen?.passport || ''}
                          onChange={(e) => {
                            const val = e.target.value
                              .toUpperCase()
                              .replace(/[^A-Z0-9]/g, '')
                              .slice(0, 9);
                            onUpdateCustomFieldItem(cf.clientId, (f) => ({
                              ...f,
                              inline_citizen: {
                                ...(f.inline_citizen || {
                                  first_name: '',
                                  last_name: '',
                                  middle_name: '',
                                  passport: '',
                                  phone_number: '',
                                }),
                                passport: val,
                              },
                            }));
                          }}
                          className="h-9 text-xs font-mono font-bold uppercase"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          JSHSHIR (PINFL - 14 ta raqam)
                        </label>
                        <Input
                          placeholder="14 TALIK RAQAM"
                          value={cf.inline_citizen?.pinfl || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 14);
                            onUpdateCustomFieldItem(cf.clientId, (f) => ({
                              ...f,
                              inline_citizen: {
                                ...(f.inline_citizen || {
                                  first_name: '',
                                  last_name: '',
                                  middle_name: '',
                                  passport: '',
                                  phone_number: '',
                                }),
                                pinfl: val,
                              },
                            }));
                          }}
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* 3-Qator: Yashash Tumani va Yashash Mahallasi */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Yashash Tumani */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-primary" />
                            Yashash Tumani
                          </label>
                          {citDistId && (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px] py-0 px-1.5">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              Tanlandi
                            </Badge>
                          )}
                        </div>
                        <DistrictSearchSelect
                          districts={allDistricts}
                          value={citDistId}
                          onChange={(dId, found) => {
                            onUpdateCustomFieldItem(cf.clientId, (f) => ({
                              ...f,
                              inline_citizen: {
                                ...(f.inline_citizen || {
                                  first_name: '',
                                  last_name: '',
                                  passport: '',
                                  phone_number: '',
                                }),
                                district_id: dId,
                                district_name: found?.name || '',
                                neighborhood_id: null,
                                neighborhood_name: '',
                              },
                            }));
                          }}
                          groupedByRegion
                          onQuickAdd={
                            canWrite
                              ? (q) =>
                                  setQuickLocTarget({
                                    open: true,
                                    clientId: cf.clientId,
                                    initialDistrictQuery: q,
                                  })
                              : undefined
                          }
                          size="sm"
                          placeholder="-- TUMANNI TANLANG --"
                          searchPlaceholder="Tuman yoki viloyat nomini qidiring..."
                        />
                      </div>

                      {/* Yashash Mahallasi */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-primary" />
                            Yashash Mahallasi
                          </label>
                          <div className="flex items-center gap-2">
                            {citMahId && (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px] py-0 px-1.5">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Tanlandi
                              </Badge>
                            )}
                            {canWrite && (
                              <button
                                type="button"
                                onClick={() => {
                                  const currentDist = allDistricts.find((d) => d.id === citDistId);
                                  setQuickLocTarget({
                                    open: true,
                                    clientId: cf.clientId,
                                    initialRegionId: currentDist?.region_id || null,
                                    initialDistrictId: citDistId || null,
                                  });
                                }}
                                className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <Plus className="h-2.5 w-2.5" />
                                Qo‘shish
                              </button>
                            )}
                          </div>
                        </div>
                        <CustomCitizenMahallaSelect
                          districtId={citDistId}
                          mahallaId={citMahId}
                          onSelect={(mId, mName) => {
                            onUpdateCustomFieldItem(cf.clientId, (f) => ({
                              ...f,
                              inline_citizen: {
                                ...(f.inline_citizen || {
                                  first_name: '',
                                  last_name: '',
                                  passport: '',
                                  phone_number: '',
                                }),
                                neighborhood_id: mId,
                                neighborhood_name: mName,
                              },
                            }));
                          }}
                        />
                      </div>
                    </div>

                    {/* 4-Qator: Aniq yashash manzili */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        Aniq yashash manzili (Ko‘cha, uy, xonadon...)
                      </label>
                      <Input
                        placeholder="VILOYAT, TUMAN, KO‘CHA, UY..."
                        value={cf.inline_citizen?.address || ''}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          onUpdateCustomFieldItem(cf.clientId, (f) => ({
                            ...f,
                            inline_citizen: {
                              ...(f.inline_citizen || {
                                first_name: '',
                                last_name: '',
                                middle_name: '',
                                passport: '',
                                phone_number: '',
                              }),
                              address: val,
                            },
                          }));
                        }}
                        className="h-9 text-xs uppercase"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PASTDAGI UZUN TUGMA (HUDDI KARTA KABI) */}
        <Button
          type="button"
          variant="outline"
          onClick={() => onAddCustomFieldItem('CITIZEN', '')}
          className="w-full h-11 border-dashed border-2 border-primary/40 hover:border-primary hover:bg-primary/5 text-primary text-xs font-semibold gap-2 shadow-sm rounded-xl transition-all"
        >
          <UserPlus className="h-4 w-4" />
          <span>Fuqaro qo‘shish</span>
        </Button>
      </div>

      <QuickLocationDialog
        open={quickLocTarget.open}
        onOpenChange={(open) => setQuickLocTarget((prev) => ({ ...prev, open }))}
        initialRegionId={quickLocTarget.initialRegionId}
        initialDistrictId={quickLocTarget.initialDistrictId}
        initialDistrictQuery={quickLocTarget.initialDistrictQuery}
        onCreated={({ district, neighborhood }) => {
          if (!quickLocTarget.clientId) return;
          onUpdateCustomFieldItem(quickLocTarget.clientId, (f) => ({
            ...f,
            inline_citizen: {
              ...(f.inline_citizen || {
                first_name: '',
                last_name: '',
                passport: '',
                phone_number: '',
              }),
              district_id: district.id,
              district_name: district.name || '',
              neighborhood_id: neighborhood ? neighborhood.id : null,
              neighborhood_name: neighborhood?.name || '',
            },
          }));
        }}
      />
    </div>
  );
}
