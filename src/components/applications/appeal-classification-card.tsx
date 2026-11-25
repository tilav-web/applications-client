import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ChevronDown,
  Copy,
  FilePlus2,
  GitBranch,
  History,
  Link2,
  Scale,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { applicationsApi } from '@/lib/api';
import type {
  AppealType,
  ApplicantType,
  Application,
  ApplicationRepeatType,
  CitizenPreviousApplication,
  SubmissionForm,
} from '@/types/models';

const APPEAL_TYPE_OPTIONS: { value: AppealType; label: string }[] = [
  { value: 'APPEAL', label: 'Ariza' },
  { value: 'COMPLAINT', label: 'Shikoyat' },
  { value: 'PROPOSAL', label: 'Taklif' },
];

const SUBMISSION_FORM_OPTIONS: { value: SubmissionForm; label: string }[] = [
  { value: 'WRITTEN', label: 'Yozma' },
  { value: 'ORAL', label: 'Og‘zaki' },
  { value: 'ELECTRONIC', label: 'Elektron' },
];

const APPLICANT_TYPE_OPTIONS: { value: ApplicantType; label: string }[] = [
  { value: 'INDIVIDUAL', label: 'Yakka tartibdagi' },
  { value: 'COLLECTIVE', label: 'Jamoaviy' },
  { value: 'LEGAL_ENTITY', label: 'Yuridik shaxs / tashkilot' },
  { value: 'ANONYMOUS', label: 'Anonim' },
  { value: 'CONFESSION', label: 'Aybini bo‘yniga olish arzi' },
];

const REPEAT_TYPE_OPTIONS: {
  value: ApplicationRepeatType;
  label: string;
}[] = [
  { value: 'PRIMARY', label: 'Birlamchi' },
  { value: 'REPEAT', label: 'Takroriy' },
  { value: 'DUPLICATE', label: 'Dublikat' },
  { value: 'SUPPLEMENTAL', label: 'Qo‘shimcha' },
];

interface AppealClassificationCardProps {
  currentApplicationId?: string;
  selectedCitizenId: string | null;
  appealType: AppealType;
  onAppealTypeChange: (val: AppealType) => void;
  submissionForm: SubmissionForm;
  onSubmissionFormChange: (val: SubmissionForm) => void;
  applicantType: ApplicantType;
  onApplicantTypeChange: (val: ApplicantType) => void;
  repeatType: ApplicationRepeatType;
  onRepeatTypeChange: (val: ApplicationRepeatType) => void;
  parentApplicationId: string | null;
  onParentApplicationChange: (
    appId: string | null,
    previewApp?: Application | CitizenPreviousApplication | null,
  ) => void;
  repeatReason: string;
  onRepeatReasonChange: (val: string) => void;
  isReviewTerminated: boolean;
  onIsReviewTerminatedChange: (val: boolean) => void;
  terminationNote: string;
  onTerminationNoteChange: (val: string) => void;
  /** Avvalgi arizadan Fuqaro, Tuman, Jinoyat turi/usulini avtomatik nusxalash */
  onCopyFromParent?: (parentId: string) => void;
}

const formatShortDate = (dateStr?: string | null) => {
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

export function AppealClassificationCard({
  currentApplicationId,
  selectedCitizenId,
  appealType,
  onAppealTypeChange,
  submissionForm,
  onSubmissionFormChange,
  applicantType,
  onApplicantTypeChange,
  repeatType,
  onRepeatTypeChange,
  parentApplicationId,
  onParentApplicationChange,
  repeatReason,
  onRepeatReasonChange,
  isReviewTerminated,
  onIsReviewTerminatedChange,
  terminationNote,
  onTerminationNoteChange,
  onCopyFromParent,
}: AppealClassificationCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const debouncedParentSearch = useDebounce(parentSearch, 250);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => searchInputRef.current?.focus(), 20);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [dropdownOpen]);

  // 1. Tanlangan fuqaroning avvalgi arizalari (avtomatik takroriy ogohlantirish uchun)
  const { data: citizenPrevApps = [] } = useQuery({
    queryKey: ['citizen-previous-apps', selectedCitizenId, currentApplicationId || ''],
    queryFn: () => applicationsApi.getByCitizen(selectedCitizenId!, currentApplicationId),
    enabled: Boolean(selectedCitizenId),
    staleTime: 30 * 1000,
  });

  // 2. Barcha arizalar ichidan qidiruv (ota ariza tanlash dropdowni uchun)
  const { data: searchedAppsData } = useQuery({
    queryKey: ['parent-applications-search', debouncedParentSearch],
    queryFn: () =>
      applicationsApi.getAll({
        page: 1,
        limit: 15,
        search: debouncedParentSearch.trim() || undefined,
      }),
    enabled: dropdownOpen,
    staleTime: 15 * 1000,
  });

  // 3. Tanlangan ota ariza haqida qisqa ma'lumot (agar URL ?parentId= bilan ochilgan bo'lsa ham)
  const { data: selectedParentApp } = useQuery({
    queryKey: ['parent-application-preview', parentApplicationId],
    queryFn: () => applicationsApi.getOne(parentApplicationId!),
    enabled: Boolean(parentApplicationId),
    staleTime: 60 * 1000,
  });

  const searchOptions = useMemo(() => {
    const raw = (searchedAppsData?.items || []).filter((a) => a.id !== currentApplicationId);
    return raw;
  }, [searchedAppsData, currentApplicationId]);

  const isLinkedMode = repeatType !== 'PRIMARY';
  const showAutoDetectBanner =
    Boolean(selectedCitizenId) && citizenPrevApps.length > 0 && repeatType === 'PRIMARY';

  return (
    <div className="rounded-xl border border-border/80 bg-card/70 p-3.5 sm:p-4 space-y-3 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
            Murojaat tasnifi va takroriylik
          </h3>
        </div>

        {isLinkedMode && (
          <Badge
            variant="outline"
            className={
              repeatType === 'REPEAT'
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px]'
                : repeatType === 'DUPLICATE'
                  ? 'border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[11px]'
                  : 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px]'
            }
          >
            <GitBranch className="h-3 w-3 mr-1" />
            {repeatType === 'REPEAT'
              ? 'Takroriy murojaat'
              : repeatType === 'DUPLICATE'
                ? 'Dublikat (zararga qo‘shilmaydi)'
                : 'Qo‘shimcha murojaat'}
          </Badge>
        )}
      </div>

      {/* AVTOMATIK ANIQLASH BANNERI: Fuqaroning avvalgi arizalari topilganda */}
      {showAutoDetectBanner && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-amber-800 dark:text-amber-300">
                Ushbu fuqaro nomidan bazada avvalgi {citizenPrevApps.length} ta murojaat mavjud!
              </p>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80">
                Agar bu murojaat avvalgisining davomi yoki nusxasi bo‘lsa, quyidan 1 bosishda
                bog‘lab qo‘ying:
              </p>
            </div>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {citizenPrevApps.slice(0, 4).map((prev) => (
              <div
                key={prev.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/25 bg-background/85 px-2.5 py-1.5 text-[11px]"
              >
                <div className="min-w-0">
                  <span className="font-mono font-bold text-foreground">
                    {prev.application_number || 'Raqamsiz'}
                  </span>
                  <span className="text-muted-foreground mx-1.5">•</span>
                  <span className="text-muted-foreground">{formatShortDate(prev.date)}</span>
                  {prev.crime_name && (
                    <>
                      <span className="text-muted-foreground mx-1.5">•</span>
                      <span className="text-foreground/80">{prev.crime_name}</span>
                    </>
                  )}
                  <Badge variant="secondary" className="ml-2 text-[10px] py-0 px-1.5">
                    {prev.status_name}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onRepeatTypeChange('REPEAT');
                      onParentApplicationChange(prev.id, prev);
                      onCopyFromParent?.(prev.id);
                    }}
                    className="px-2 py-1 rounded-md bg-amber-600 text-white hover:bg-amber-700 font-semibold cursor-pointer transition-colors"
                  >
                    Takroriy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRepeatTypeChange('DUPLICATE');
                      onParentApplicationChange(prev.id, prev);
                      onCopyFromParent?.(prev.id);
                    }}
                    className="px-2 py-1 rounded-md bg-purple-600 text-white hover:bg-purple-700 font-semibold cursor-pointer transition-colors"
                  >
                    Dublikat
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRepeatTypeChange('SUPPLEMENTAL');
                      onParentApplicationChange(prev.id, prev);
                      onCopyFromParent?.(prev.id);
                    }}
                    className="px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-semibold cursor-pointer transition-colors"
                  >
                    Qo‘shimcha
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1-QATOR: Barcha tasnif maydonlari ixcham select ko'rinishida */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Murojaat turi */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground">Murojaat turi</label>
          <select
            value={appealType}
            onChange={(e) => onAppealTypeChange(e.target.value as AppealType)}
            className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          >
            {APPEAL_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Berilish shakli */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground">Berilish shakli</label>
          <select
            value={submissionForm}
            onChange={(e) => onSubmissionFormChange(e.target.value as SubmissionForm)}
            className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          >
            {SUBMISSION_FORM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Murojaat etuvchi toifasi */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground">
            Murojaat etuvchi toifasi
          </label>
          <select
            value={applicantType}
            onChange={(e) => onApplicantTypeChange(e.target.value as ApplicantType)}
            className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          >
            {APPLICANT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Takroriylik darajasi */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground">
            Takroriylik darajasi
          </label>
          <select
            value={repeatType}
            onChange={(e) => {
              const val = e.target.value as ApplicationRepeatType;
              onRepeatTypeChange(val);
              if (val === 'PRIMARY') {
                onParentApplicationChange(null, null);
              }
            }}
            className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          >
            {REPEAT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3-QATOR: Agar Takroriy / Dublikat / Qo'shimcha bo'lsa — Avvalgi arizaga bog'lash */}
      {isLinkedMode && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 space-y-3">
          {/* Agar fuqaro allaqachon tanlangan bo'lsa va uning eski arizalari bo'lsa — darhol ko'rsatamiz */}
          {selectedCitizenId && citizenPrevApps.length > 0 && !parentApplicationId && (
            <div className="rounded-lg border border-primary/25 bg-background/90 p-2.5 space-y-1.5">
              <div className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Ushbu fuqaroning avvalgi arizalari ({citizenPrevApps.length} ta) — bog‘lash uchun
                tanlang:
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {citizenPrevApps.map((prev) => (
                  <button
                    key={prev.id}
                    type="button"
                    onClick={() => {
                      onParentApplicationChange(prev.id, prev);
                      onCopyFromParent?.(prev.id);
                    }}
                    className="w-full flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-card hover:border-primary hover:bg-primary/5 px-2.5 py-1.5 text-left text-[11px] transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 truncate">
                      <span className="font-mono font-bold text-primary">
                        {prev.application_number || 'Raqamsiz'}
                      </span>
                      <span className="text-muted-foreground mx-1.5">•</span>
                      <span>{formatShortDate(prev.date)}</span>
                      {prev.crime_name && (
                        <span className="text-muted-foreground ml-1.5">({prev.crime_name})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                        {prev.status_name}
                      </Badge>
                      <span className="text-primary font-semibold">Tanlash →</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Avvalgi arizani tanlash (ichida qidiruvli select) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-primary" />
                  Bog‘lanadigan avvalgi ariza
                </label>
                {parentApplicationId && onCopyFromParent && (
                  <button
                    type="button"
                    onClick={() => onCopyFromParent(parentApplicationId)}
                    className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    title="Fuqaro, tuman va jinoyat turini avvalgi arizadan avtomatik to'ldirish"
                  >
                    <Copy className="h-3 w-3" />
                    Ma’lumotlarni nusxalash
                  </button>
                )}
              </div>

              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((p) => !p)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-left text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer hover:border-primary/50"
                >
                  <span className="truncate">
                    {selectedParentApp ? (
                      <span>
                        <span className="font-mono text-primary">
                          {selectedParentApp.application_number || 'Raqamsiz'}
                        </span>
                        <span className="text-muted-foreground mx-1.5">•</span>
                        <span>
                          {selectedParentApp.citizen
                            ? `${selectedParentApp.citizen.last_name || ''} ${selectedParentApp.citizen.first_name || ''}`.trim()
                            : 'Fuqaro'}
                        </span>
                        <span className="text-muted-foreground ml-1.5 text-[10px]">
                          ({formatShortDate(selectedParentApp.date)})
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground font-normal">
                        Avvalgi arizani raqami yoki fuqaro nomi bilan tanlang...
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    {parentApplicationId && (
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation();
                          onParentApplicationChange(null, null);
                        }}
                        className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                        title="Bog'lanishni olib tashlash"
                      >
                        <X className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </span>
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-border/70 bg-muted/20">
                      <div className="relative">
                        <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={parentSearch}
                          onChange={(e) => setParentSearch(e.target.value)}
                          placeholder="Ariza raqami, F.I.Sh., pasport yoki telefon..."
                          className="w-full h-8 rounded-md border border-input bg-background pl-8 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
                      {citizenPrevApps.length > 0 && !parentSearch.trim() && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-bold uppercase text-primary">
                            Ushbu fuqaroning avvalgi arizalari
                          </div>
                          {citizenPrevApps.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => {
                                onParentApplicationChange(a.id, a);
                                if (!selectedCitizenId) {
                                  onCopyFromParent?.(a.id);
                                }
                                setDropdownOpen(false);
                                setParentSearch('');
                              }}
                              className={`w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center justify-between gap-2 cursor-pointer ${
                                parentApplicationId === a.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <div className="min-w-0 truncate">
                                <span className="font-mono font-bold">
                                  {a.application_number || 'Raqamsiz'}
                                </span>
                                <span className="mx-1.5 opacity-70">•</span>
                                <span>{formatShortDate(a.date)}</span>
                                {a.crime_name && (
                                  <span className="ml-1.5 opacity-80">({a.crime_name})</span>
                                )}
                              </div>
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {a.status_name}
                              </Badge>
                            </button>
                          ))}
                          <div className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase text-muted-foreground border-t border-border/50 mt-1">
                            Boshqa arizalar (qidiruv)
                          </div>
                        </>
                      )}

                      {searchOptions.length === 0 ? (
                        <div className="py-5 text-center text-xs text-muted-foreground">
                          Ariza topilmadi
                        </div>
                      ) : (
                        searchOptions.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => {
                              onParentApplicationChange(a.id, a);
                              setDropdownOpen(false);
                              setParentSearch('');
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center justify-between gap-2 cursor-pointer ${
                              parentApplicationId === a.id
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            }`}
                          >
                            <div className="min-w-0 truncate">
                              <span className="font-mono font-bold">
                                {a.application_number || 'Raqamsiz'}
                              </span>
                              <span className="mx-1.5 opacity-70">•</span>
                              <span>
                                {a.citizen
                                  ? `${a.citizen.last_name || ''} ${a.citizen.first_name || ''}`.trim()
                                  : 'Fuqaro'}
                              </span>
                              <span className="ml-1.5 text-[10px] opacity-70">
                                ({formatShortDate(a.date)})
                              </span>
                            </div>
                            <span className="text-[10px] opacity-80 shrink-0">
                              {a.application_status?.name || a.status || 'Yangi'}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Eslatma: 3- yoki 4-marta takroriy kelsa ham, avvalgi istalgan arizani tanlasangiz
                tizim avtomatik bitta birlamchi ildiz ostida birlashtiradi.
              </p>
            </div>

            {/* Takroriy / dublikat sababi */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FilePlus2 className="h-3.5 w-3.5 text-primary" />
                {repeatType === 'REPEAT'
                  ? 'Takroriy murojaat sababi'
                  : repeatType === 'DUPLICATE'
                    ? 'Dublikat kelib tushgan kanal / izoh'
                    : 'Qo‘shimcha ma’lumot mazmuni'}
              </label>
              <Input
                value={repeatReason}
                onChange={(e) => onRepeatReasonChange(e.target.value)}
                placeholder={
                  repeatType === 'REPEAT'
                    ? 'Masalan: Avvalgi rad qaroridan norozi, qo‘shimcha tekshiruv so‘ragan...'
                    : repeatType === 'DUPLICATE'
                      ? 'Masalan: PM.gov.uz orqali 102 arizasining dublikati keldi...'
                      : 'Masalan: Jabrlanuvchi qo‘shimcha chek va firibgar kartasini taqdim etdi...'
                }
                className="h-9 text-xs bg-background"
              />
            </div>
          </div>

          {/* O'RQ-445 30-modda: Ko'rib chiqishni tugatish belgisi (faqat Takroriy uchun) */}
          {repeatType === 'REPEAT' && (
            <div className="pt-2 border-t border-primary/15 space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isReviewTerminated}
                  onChange={(e) => onIsReviewTerminatedChange(e.target.checked)}
                  className="rounded border-input h-4 w-4 accent-rose-600"
                />
                <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                <span>
                  O‘RQ-445 30-moddaga asosan takroriy murojaatlarni ko‘rib chiqish tugatilgan
                </span>
              </label>
              {isReviewTerminated && (
                <Input
                  value={terminationNote}
                  onChange={(e) => onTerminationNoteChange(e.target.value)}
                  placeholder="Ko‘rib chiqishni tugatish qarori raqami, sanasi va asosi..."
                  className="h-9 text-xs bg-background border-rose-500/40"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
