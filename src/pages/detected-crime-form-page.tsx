import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Globe,
  HardDrive,
  Loader2,
  MapPin,
  Paperclip,
  Plus,
  Radar,
  Radio,
  RotateCcw,
  Save,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { SuspectTreeBuilder } from '@/components/applications/suspect-tree-builder';
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
import { DistrictSearchSelect } from '@/components/ui/district-search-select';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { useDebounce } from '@/hooks/use-debounce';
import {
  citizensApi,
  crimesApi,
  decisionTypesApi,
  departmentServicesApi,
  detectedCrimesApi,
  detectedCrimeStatusesApi,
  detectionSourcesApi,
  districtsApi,
  filesApi,
} from '@/lib/api';
import { formatLocalDateISO, toLocalDateInputValue } from '@/lib/date';
import { getErrorMessage } from '@/lib/error';
import type {
  Citizen,
  DetectedCrimeEvidence,
  DetectedCrimeMeasure,
  DetectedCrimeMeasureType,
  DetectedCrimeQualification,
  DetentionStatus,
  EvidenceType,
  SuspectCrimeRole,
} from '@/types/models';

interface SuspectDraft {
  citizen_id: string;
  citizen_name: string;
  citizen_passport?: string | null;
  citizen_phone?: string | null;
  role_in_crime: SuspectCrimeRole;
  detention_status: DetentionStatus;
  is_repeat_offender: boolean;
  repeat_info?: string;
  notes: string;
}

const EVIDENCE_TYPE_OPTIONS: Array<{ value: EvidenceType; label: string }> = [
  { value: 'PHONE', label: 'Mobil telefon (IMEI)' },
  { value: 'LAPTOP_PC', label: 'Noutbuk / Kompyuter' },
  { value: 'SIM_CARD', label: 'SIM-karta' },
  { value: 'STORAGE_MEDIA', label: 'Fleshka / Qattiq disk' },
  { value: 'CRYPTO_WALLET', label: 'Kripto-hamyon / Birja akkaunti' },
  { value: 'BANK_CARD', label: 'Plastik karta' },
  { value: 'SCREENSHOT_VIDEO', label: 'Skrinshot / Video / Kanal yozuvi' },
  { value: 'DOCUMENT', label: 'Hujjat / Bayonnoma' },
  { value: 'CASH', label: 'Naqd pul mablag‘i' },
  { value: 'OTHER', label: 'Boshqa dalil' },
];

const MEASURE_PRESETS: Array<{ type: DetectedCrimeMeasureType; label: string }> = [
  { type: 'CARD_BLOCKED', label: 'Karta / bank hisobi bloklandi' },
  { type: 'CHANNEL_BLOCKED', label: 'Telegram kanal / bot / sayt bloklashga yuborildi' },
  { type: 'DEVICE_SEIZED', label: 'Telefon / kompyuter olib qo‘yildi' },
  { type: 'EXPERTISE_ORDERED', label: 'Ekspertiza tayinlandi' },
  { type: 'SUSPECT_DETAINED', label: 'Gumonlanuvchi ushlandi' },
  { type: 'SENT_TO_INVESTIGATION', label: 'Tergovga yuborildi (JI qo‘zg‘atildi)' },
  { type: 'SENT_TO_COURT', label: 'Sudga yuborildi (MJTK / JK)' },
  { type: 'DAMAGE_RECOVERED', label: 'Zarar qoplandi' },
  { type: 'TRANSFERRED_AGENCY', label: 'Boshqa organga o‘tkazildi' },
  { type: 'OTHER', label: 'Boshqa operativ chora' },
];

export function DetectedCrimeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [reportNumber, setReportNumber] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [kuspNumber, setKuspNumber] = useState('');
  const [detectedAt, setDetectedAt] = useState(() => formatLocalDateISO());
  const [qualificationType, setQualificationType] =
    useState<DetectedCrimeQualification>('CRIMINAL');
  const [crimeId, setCrimeId] = useState('');
  const [mjtkArticle, setMjtkArticle] = useState('');
  const [detectionSourceId, setDetectionSourceId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [deptServiceId, setDeptServiceId] = useState('');
  const [platform, setPlatform] = useState('Telegram');
  const [channelUrl, setChannelUrl] = useState('');
  const [estimatedDamage, setEstimatedDamage] = useState('');
  const [description, setDescription] = useState('');
  const [officerNotes, setOfficerNotes] = useState('');
  const [crimeStatusId, setCrimeStatusId] = useState('');
  const [measures, setMeasures] = useState<DetectedCrimeMeasure[]>([]);
  const [decisionTypeId, setDecisionTypeId] = useState('');
  const [decisionNumber, setDecisionNumber] = useState('');
  const [decisionDate, setDecisionDate] = useState('');
  const [decisionNote, setDecisionNote] = useState('');

  const [suspects, setSuspects] = useState<SuspectDraft[]>([]);
  const [citizenSearch, setCitizenSearch] = useState('');
  const debouncedCitizenSearch = useDebounce(citizenSearch, 250);

  // Yangi fuqaro tezkor qo'shish (bazada yo'q bo'lsa)
  const [showNewCitizenForm, setShowNewCitizenForm] = useState(false);
  const [newCitizen, setNewCitizen] = useState({
    last_name: '',
    first_name: '',
    middle_name: '',
    passport: '',
    phone_number: '',
  });
  const [creatingCitizen, setCreatingCitizen] = useState(false);

  const [suspectTree, setSuspectTree] = useState<unknown[]>([]);
  const [evidences, setEvidences] = useState<DetectedCrimeEvidence[]>([]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const hydratedIdRef = useRef<string | null>(null);
  const { data: existing, isLoading: isLoadingExisting } = useQuery({
    queryKey: ['detected-crime', id],
    queryFn: () => detectedCrimesApi.getOne(id as string),
    enabled: isEdit,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: districtsRes } = useQuery({
    queryKey: ['districts-for-dc-form'],
    queryFn: () => districtsApi.getAll({ page: 1, limit: 500 }),
  });
  const { data: crimesRes } = useQuery({
    queryKey: ['crimes-for-dc-form'],
    queryFn: () => crimesApi.getAll({ page: 1, limit: 200 }),
  });
  const { data: sources } = useQuery({
    queryKey: ['detection-sources-active'],
    queryFn: () => detectionSourcesApi.getAll(),
  });
  const { data: crimeStatuses } = useQuery({
    queryKey: ['detected-crime-statuses-active'],
    queryFn: () => detectedCrimeStatusesApi.getAll(),
  });
  const { data: deptServices } = useQuery({
    queryKey: ['dept-services-for-dc-form'],
    queryFn: () => departmentServicesApi.getAll(),
  });
  const { data: decisionTypes } = useQuery({
    queryKey: ['decision-types-for-dc-form'],
    queryFn: () => decisionTypesApi.getAll(),
  });

  const { data: matchedCitizensRes } = useQuery({
    queryKey: ['citizens-search-dc', debouncedCitizenSearch],
    queryFn: () => citizensApi.getAll({ page: 1, limit: 8, search: debouncedCitizenSearch }),
    enabled: debouncedCitizenSearch.trim().length >= 2,
  });

  const allStatuses = crimeStatuses || [];
  const currentStatusObj = allStatuses.find((s) => s.id === crimeStatusId);
  const currentStatusLabel = currentStatusObj?.name || 'Fosh etildi (Qayd etildi)';

  useEffect(() => {
    if (!existing || hydratedIdRef.current === existing.id) return;
    hydratedIdRef.current = existing.id;
    setTitle(existing.title || '');
    setCaseNumber(existing.case_number || '');
    setReportNumber(existing.report_number || '');
    setReportDate(toLocalDateInputValue(existing.report_date));
    setKuspNumber(existing.kusp_number || '');
    setDetectedAt(toLocalDateInputValue(existing.detected_at));
    setQualificationType(existing.qualification_type || 'PRE_INVESTIGATION');
    setCrimeId(existing.crime_id || '');
    setMjtkArticle(existing.mjtk_article || '');
    setDetectionSourceId(existing.detection_source_id || '');
    setDistrictId(existing.district_id || '');
    setDeptServiceId(existing.department_service_id || '');
    setPlatform(existing.platform || '');
    setChannelUrl(existing.channel_or_source_url || '');
    setEstimatedDamage(
      existing.estimated_damage !== null && existing.estimated_damage !== undefined
        ? String(existing.estimated_damage)
        : '',
    );
    setDescription(existing.description || '');
    setOfficerNotes(existing.officer_notes || '');
    setCrimeStatusId(existing.crime_status_id || '');
    setMeasures(Array.isArray(existing.measures) ? existing.measures : []);
    setDecisionTypeId(existing.decision_type_id || '');
    setDecisionNumber(existing.decision_number || '');
    setDecisionDate(toLocalDateInputValue(existing.decision_date));
    setDecisionNote(existing.decision_note || '');
    setSuspectTree(Array.isArray(existing.suspect_tree) ? existing.suspect_tree : []);
    setSuspects(
      (existing.suspects || []).map((s) => ({
        citizen_id: s.citizen_id,
        citizen_name: s.citizen
          ? `${s.citizen.last_name || ''} ${s.citizen.first_name || ''} ${s.citizen.middle_name || ''}`.trim()
          : 'Fuqaro',
        citizen_passport: s.citizen?.passport,
        citizen_phone: s.citizen?.phone_number,
        role_in_crime: s.role_in_crime,
        detention_status: s.detention_status,
        is_repeat_offender: Boolean(s.is_repeat_offender),
        notes: s.notes || '',
      })),
    );
    setEvidences(existing.evidences || []);
  }, [existing]);

  const handleAddSuspect = async (c: Citizen) => {
    if (suspects.some((s) => s.citizen_id === c.id)) {
      toast.info('Bu fuqaro allaqachon ro‘yxatga qo‘shilgan');
      return;
    }
    const name =
      `${c.last_name || ''} ${c.first_name || ''} ${c.middle_name || ''}`.trim() || 'Fuqaro';
    let isRepeat = false;
    let repeatInfo = '';
    try {
      const check = await detectedCrimesApi.checkCitizenRepeat(c.id, id);
      if (check.isRepeat) {
        isRepeat = true;
        const articles = check.items
          .map((i) => i.article || i.title)
          .slice(0, 2)
          .join(', ');
        repeatInfo = `Ilgari ${check.count} ta aniqlangan holatda qayd etilgan (${articles})`;
        toast.warning(`Takroriy shaxs aniqlandi: ${name}`, { description: repeatInfo });
      }
    } catch {
      // ignore check error
    }

    setSuspects((prev) => [
      ...prev,
      {
        citizen_id: c.id,
        citizen_name: name,
        citizen_passport: c.passport,
        citizen_phone: c.phone_number,
        role_in_crime: 'IJROCHI',
        detention_status: 'ANIQLANMOQDA',
        is_repeat_offender: isRepeat,
        repeat_info: repeatInfo,
        notes: '',
      },
    ]);
    setCitizenSearch('');
  };

  const handleCreateAndAttachCitizen = async () => {
    if (!newCitizen.first_name.trim() && !newCitizen.last_name.trim()) {
      toast.error('Ism yoki familiyani kiriting');
      return;
    }
    setCreatingCitizen(true);
    try {
      const created = await citizensApi.create({
        first_name: newCitizen.first_name.trim(),
        last_name: newCitizen.last_name.trim(),
        middle_name: newCitizen.middle_name.trim() || undefined,
        passport: newCitizen.passport.trim().toUpperCase() || undefined,
        phone_number: newCitizen.phone_number.trim() || undefined,
      });
      await handleAddSuspect(created);
      setNewCitizen({
        last_name: '',
        first_name: '',
        middle_name: '',
        passport: '',
        phone_number: '',
      });
      setShowNewCitizenForm(false);
      toast.success('Yangi fuqaro bazaga qo‘shildi va gumonlanuvchi sifatida biriktirildi');
    } catch (err) {
      toast.error('Fuqaro qo‘shishda xatolik', { description: getErrorMessage(err) });
    } finally {
      setCreatingCitizen(false);
    }
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        title: title.trim(),
        case_number: caseNumber.trim() || null,
        report_number: reportNumber.trim() || null,
        report_date: reportDate || null,
        kusp_number: kuspNumber.trim() || null,
        detected_at: detectedAt || undefined,
        qualification_type: qualificationType,
        crime_id: crimeId || null,
        mjtk_article: mjtkArticle.trim() || null,
        detection_source_id: detectionSourceId || null,
        district_id: districtId || null,
        department_service_id: deptServiceId || null,
        platform: platform.trim() || null,
        channel_or_source_url: channelUrl.trim() || null,
        estimated_damage: estimatedDamage ? Number(estimatedDamage) : null,
        description: description.trim() || null,
        officer_notes: officerNotes.trim() || null,
        crime_status_id: crimeStatusId || null,
        measures: measures.filter((m) => m.title.trim()),
        decision_type_id: decisionTypeId || null,
        decision_number: decisionNumber.trim() || null,
        decision_date: decisionDate || null,
        decision_note: decisionNote.trim() || null,
        suspect_tree: suspectTree,
        suspects: suspects.map((s) => ({
          citizen_id: s.citizen_id,
          role_in_crime: s.role_in_crime,
          detention_status: s.detention_status,
          is_repeat_offender: s.is_repeat_offender,
          notes: s.notes || null,
        })),
        evidences: evidences
          .filter((e) => e.title.trim())
          .map((e) => ({
            evidence_type: e.evidence_type,
            title: e.title.trim(),
            identifier_value: e.identifier_value?.trim() || null,
            file_key: e.file_key || null,
            file_name: e.file_name || null,
            notes: e.notes?.trim() || null,
          })),
      };
      return isEdit
        ? detectedCrimesApi.update(id as string, payload)
        : detectedCrimesApi.create(payload);
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['detected-crimes'] });
      void queryClient.invalidateQueries({ queryKey: ['detected-crimes-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['detected-crime', saved.id] });
      toast.success(isEdit ? 'Ma’lumotlar yangilandi' : 'Aniqlangan jinoyat ro‘yxatga olindi');
      navigate(`/detected-crimes/${saved.id}`);
    },
    onError: (err) => {
      toast.error('Saqlashda xatolik', { description: getErrorMessage(err) });
    },
  });

  if (isEdit && isLoadingExisting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-xs text-muted-foreground font-mono">
          Aniqlangan jinoyat shakli yuklanmoqda...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-24">
      {/* ===================================================================== */}
      {/* YAGONA RASMIY ANIQLANGAN JINOYAT BAYONNOMASI (DOSSIER CONTAINER)      */}
      {/* ===================================================================== */}
      <div className="bg-card border border-border shadow-xl rounded-2xl overflow-hidden divide-y divide-border/60">
        {/* ================================================================= */}
        {/* BOSHQARUV VA PROTOKOL REKVIZITLARI (TOP HEADER)                   */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 bg-card flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
              <Radar className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  {isEdit ? 'Aniqlangan Jinoyatni Tahrirlash' : 'Yangi Aniqlangan Jinoyat / Holat'}
                </h1>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-mono px-2 py-0.5 border-primary/40 text-primary font-bold bg-primary/5"
                >
                  {currentStatusLabel}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {isEdit
                  ? `${caseNumber || existing?.case_number || id} kodli aniqlangan jinoyat ma‘lumotlarini o‘zgartirish`
                  : 'JPK 322-modda 4-bandi — Bildirgi / Tezkor-qidiruv / Kiber-monitoring orqali aniqlangan holat'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap xl:flex-nowrap items-center gap-2.5 shrink-0">
            {/* Aniqlash usuli */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-background border border-input rounded-lg px-2.5 h-9 shadow-2xs">
              <Radio className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                Manba:
              </span>
              <select
                value={detectionSourceId}
                onChange={(e) => setDetectionSourceId(e.target.value)}
                className="h-7 border-0 p-0 text-xs font-semibold bg-transparent text-foreground focus:outline-none cursor-pointer max-w-[165px]"
              >
                <option value="">-- Tanlang --</option>
                {(sources || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Aniqlangan sana */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-background border border-input rounded-lg px-2.5 h-9 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                Sana:
              </span>
              <input
                type="date"
                value={detectedAt}
                onChange={(e) => setDetectedAt(e.target.value)}
                className="h-7 border-0 p-0 text-xs font-mono bg-transparent text-foreground focus:outline-none"
              />
            </div>

            {/* Holat (Status) */}
            <select
              value={crimeStatusId}
              onChange={(e) => setCrimeStatusId(e.target.value)}
              className="h-9 rounded-lg border border-input bg-white dark:bg-background px-2.5 text-xs shadow-2xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer max-w-[210px]"
            >
              <option value="">Fosh etildi (Standart)</option>
              {allStatuses.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 1-QISM: BILDIRGI (RAPORT), ICHKI KOD VA HUDUD                     */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 space-y-4 bg-rose-50/45 dark:bg-rose-950/15 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-200/70 dark:border-rose-800/40 pb-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                  <FileText className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground whitespace-nowrap">
                  1. Bildirgi (Raport) va Hududiy Rekvizitlar
                </h2>
              </div>

              <div className="flex items-center gap-2 bg-white dark:bg-background border border-input rounded-lg px-3 h-9 shadow-2xs min-w-[230px] sm:w-64">
                <span className="text-xs font-bold text-primary font-mono">№</span>
                <Input
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value.toUpperCase())}
                  placeholder="AJ-2026-0001 (avto)"
                  className="h-7 w-full border-0 p-0 text-xs font-mono font-bold focus-visible:ring-0 bg-transparent shadow-none uppercase text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            <Badge
              variant="outline"
              className="text-[11px] text-rose-600 border-rose-300 dark:border-rose-800 bg-white/80 dark:bg-rose-950/40 shrink-0 font-semibold py-1 px-2.5"
            >
              Arizasiz aniqlangan (JPK 322-m.)
            </Badge>
          </div>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-4">
                Aniqlangan holat qisqa sarlavhasi <span className="text-rose-600">*</span>
              </label>
              <Input
                placeholder="Masalan: Telegram kanalda taqiqlangan materiallar tarqatish holati fosh etildi"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 text-xs font-medium bg-white dark:bg-background shadow-2xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-4">
                  Bildirgi (Raport) raqami
                </label>
                <Input
                  placeholder="№ 124/2026"
                  value={reportNumber}
                  onChange={(e) => setReportNumber(e.target.value)}
                  className="h-10 text-xs font-mono bg-white dark:bg-background shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-4">
                  Bildirgi sanasi
                </label>
                <Input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="h-10 text-xs bg-white dark:bg-background shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-4">
                  KUSP / E-material №
                </label>
                <Input
                  placeholder="KUSP raqami..."
                  value={kuspNumber}
                  onChange={(e) => setKuspNumber(e.target.value)}
                  className="h-10 text-xs font-mono bg-white dark:bg-background shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-4">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Hudud (Tuman / Shahar)</span>
                </label>
                <DistrictSearchSelect
                  districts={districtsRes?.items || []}
                  value={districtId || null}
                  onChange={(dId) => setDistrictId(dId || '')}
                  onlyRegionCode="QASHQADARYO"
                  placeholder="-- TUMANNI TANLANG --"
                  searchPlaceholder="Qashqadaryo tumanini qidiring..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2-QISM: HUQUQIY MALAKA (JK/MJTK), PLATFORMA, MUDDAT VA QAROR      */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 space-y-5 bg-amber-50/45 dark:bg-amber-950/15 transition-colors">
          <div className="flex items-center justify-between border-b border-amber-200/70 dark:border-amber-800/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                <Scale className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                2. Huquqiy Malaka (JK / MJTK), Platforma va Qaror
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-4">
                  Huquqiy malaka turi
                </label>
                <select
                  value={qualificationType}
                  onChange={(e) =>
                    setQualificationType(e.target.value as DetectedCrimeQualification)
                  }
                  className="h-10 w-full rounded-md border border-input bg-white dark:bg-background px-3 py-2 text-xs font-semibold uppercase shadow-2xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="PRE_INVESTIGATION">Tergovga qadar tekshiruvda</option>
                  <option value="CRIMINAL">Jinoyat (JK)</option>
                  <option value="ADMINISTRATIVE">Ma’muriy huquqbuzarlik (MJTK)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-4">
                  Jinoyat kodeksi (JK) moddasi
                </label>
                <select
                  value={crimeId}
                  onChange={(e) => setCrimeId(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-white dark:bg-background px-3 py-2 text-xs font-semibold shadow-2xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">-- JK MODDASINI TANLANG --</option>
                  {(crimesRes?.items || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.article} {c.title && c.title !== c.article ? `— ${c.title}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-4">
                  MJTK moddasi (ma’muriy bo‘lsa)
                </label>
                <Input
                  placeholder="Masalan: MJTK 189-modda, 155⁴-modda..."
                  value={mjtkArticle}
                  onChange={(e) => setMjtkArticle(e.target.value)}
                  className="h-10 text-xs bg-white dark:bg-background shadow-2xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-4">
                  <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Platforma / Muhit</span>
                </label>
                <Input
                  placeholder="Telegram, Instagram, TikTok, Sayt..."
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="h-10 text-xs bg-white dark:bg-background shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-4">
                  Kanal / Guruh / Bot / URL manzili
                </label>
                <Input
                  placeholder="@kanal_nomi yoki https://t.me/..."
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  className="h-10 text-xs font-mono bg-white dark:bg-background shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-4">
                  Noqonuniy aylanma / zarar (UZS)
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={estimatedDamage}
                  onChange={(e) => setEstimatedDamage(e.target.value)}
                  className="h-10 text-xs font-mono bg-white dark:bg-background shadow-2xs"
                />
              </div>
            </div>

            <div className="border-t border-amber-200/60 dark:border-amber-800/30 pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-4">
                    <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Biriktirilgan Sohaviy Xizmat</span>
                  </label>
                  <select
                    value={deptServiceId}
                    onChange={(e) => setDeptServiceId(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-white dark:bg-background px-3 py-2 text-xs font-semibold uppercase shadow-2xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                  >
                    <option value="">-- SOHAVIY XIZMATNI TANLANG --</option>
                    {(deptServices || []).map((ds) => (
                      <option key={ds.id} value={ds.id}>
                        {ds.short_name ? `[${ds.short_name}] ` : ''}
                        {ds.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-4">
                    <Scale className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Qabul qilingan Yakuniy Qaror Turi</span>
                  </label>
                  <select
                    value={decisionTypeId}
                    onChange={(e) => setDecisionTypeId(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-white dark:bg-background px-3 py-2 text-xs font-semibold uppercase shadow-2xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                  >
                    <option value="">-- QAROR TURINI TANLANG --</option>
                    {(decisionTypes || []).map((dt) => (
                      <option key={dt.id} value={dt.id}>
                        {dt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-4">
                    JI / Bayonnoma raqami
                  </label>
                  <Input
                    placeholder="JI № yoki MJTK bayonnoma №"
                    value={decisionNumber}
                    onChange={(e) => setDecisionNumber(e.target.value)}
                    className="h-10 text-xs font-mono bg-white dark:bg-background shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-4">
                    Qaror sanasi
                  </label>
                  <Input
                    type="date"
                    value={decisionDate}
                    onChange={(e) => setDecisionDate(e.target.value)}
                    className="h-10 text-xs bg-white dark:bg-background shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-4">
                    Qaror bo‘yicha izoh
                  </label>
                  <Input
                    placeholder="Sud qarori, jarima yoki tergov..."
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    className="h-10 text-xs bg-white dark:bg-background shadow-2xs"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
              <div className="lg:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-4">
                  Fabula (Batafsil holat tavsifi)
                </label>
                <textarea
                  rows={4}
                  placeholder="Holat qanday aniqlangani, tarqatilgan kontent yoki noqonuniy harakat mohiyati..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-input bg-white dark:bg-background p-3 text-xs shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-4">
                  Mas‘ul xodimning ichki qaydlari
                </label>
                <textarea
                  rows={4}
                  placeholder="Tezkor qaydlar, qo‘shimcha ko‘rsatmalar..."
                  value={officerNotes}
                  onChange={(e) => setOfficerNotes(e.target.value)}
                  className="w-full rounded-lg border border-input bg-white dark:bg-background p-3 text-xs shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2.5-QISM: KO'RILGAN CHORALAR (OPERATIV VA PROTSESSUAL AMALLAR)    */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 space-y-4 bg-sky-50/45 dark:bg-sky-950/15 transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200/70 dark:border-sky-800/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Ko‘rilgan Choralar va Operativ Amallar ({measures.length})
              </h2>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Tezkor qo‘shish uchun tugmalardan birini bosing:
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {MEASURE_PRESETS.map((preset) => (
              <Button
                key={preset.type}
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setMeasures((prev) => [
                    ...prev,
                    {
                      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                      measure_type: preset.type,
                      title: preset.label,
                      date: new Date().toISOString().slice(0, 10),
                      reference_number: '',
                      notes: '',
                    },
                  ])
                }
                className="h-7 text-[11px] bg-white dark:bg-background hover:bg-sky-100/60 gap-1 cursor-pointer"
              >
                <Plus className="h-3 w-3 text-primary" />
                {preset.label}
              </Button>
            ))}
          </div>

          {measures.length > 0 && (
            <div className="space-y-2.5 pt-1">
              {measures.map((m, idx) => (
                <div
                  key={m.id || idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center rounded-xl border border-border/80 bg-white dark:bg-background p-3 shadow-2xs"
                >
                  <Input
                    placeholder="Chora nomi..."
                    value={m.title}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMeasures((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, title: val } : row)),
                      );
                    }}
                    className="sm:col-span-4 h-9 text-xs font-medium"
                  />
                  <Input
                    type="date"
                    value={m.date || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMeasures((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, date: val } : row)),
                      );
                    }}
                    className="sm:col-span-2 h-9 text-xs"
                  />
                  <Input
                    placeholder="Xat / Bayonnoma №"
                    value={m.reference_number || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMeasures((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, reference_number: val } : row)),
                      );
                    }}
                    className="sm:col-span-2 h-9 text-xs font-mono"
                  />
                  <Input
                    placeholder="Natija / Izoh (masalan: 8600... karta bloklandi)"
                    value={m.notes || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMeasures((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, notes: val } : row)),
                      );
                    }}
                    className="sm:col-span-3 h-9 text-xs"
                  />
                  <div className="sm:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive cursor-pointer"
                      onClick={() => setMeasures((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* 3-QISM: GUMONLANUVCHILAR / HUQUQBUZARLAR (FUQAROLAR BAZASI)       */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 space-y-4 bg-blue-50/45 dark:bg-blue-950/15 transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/70 dark:border-blue-800/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                <UserPlus className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                3. Gumonlanuvchilar / Huquqbuzarlar ({suspects.length})
              </h2>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewCitizenForm((v) => !v)}
              className="h-8 text-xs gap-1.5 bg-background cursor-pointer"
            >
              {showNewCitizenForm ? (
                <X className="h-3.5 w-3.5" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {showNewCitizenForm ? 'Yopish' : 'Yangi fuqaro yaratib biriktirish'}
            </Button>
          </div>

          <div className="space-y-3 pt-1">
            {/* Mavjud fuqarolar bazasidan qidiruv */}
            <div className="relative">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Fuqarolar bazasidan qidirish (F.I.O., pasport, JSHSHIR, telefon)..."
                value={citizenSearch}
                onChange={(e) => setCitizenSearch(e.target.value)}
                className="pl-9 h-10 text-xs bg-background"
              />
              {debouncedCitizenSearch.trim().length >= 2 &&
                (matchedCitizensRes?.items?.length || 0) > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl p-1.5 max-h-60 overflow-y-auto">
                    {matchedCitizensRes!.items.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => void handleAddSuspect(c)}
                        className="px-3 py-2 rounded-lg hover:bg-muted cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold">
                            {c.last_name} {c.first_name} {c.middle_name}
                          </span>
                          {c.passport && (
                            <span className="ml-2 font-mono text-[11px] text-primary">
                              {c.passport}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">{c.phone_number}</span>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Yangi fuqaro tezkor formasi */}
            {showNewCitizenForm && (
              <div className="rounded-xl border border-blue-300/70 dark:border-blue-800 bg-background p-4 space-y-3">
                <div className="text-xs font-bold text-foreground">
                  Yangi fuqaro profilini yaratish (bazaga qo‘shiladi va shu ishga biriktiriladi)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                  <Input
                    placeholder="Familiya *"
                    value={newCitizen.last_name}
                    onChange={(e) => setNewCitizen((p) => ({ ...p, last_name: e.target.value }))}
                    className="h-9 text-xs uppercase"
                  />
                  <Input
                    placeholder="Ism *"
                    value={newCitizen.first_name}
                    onChange={(e) => setNewCitizen((p) => ({ ...p, first_name: e.target.value }))}
                    className="h-9 text-xs uppercase"
                  />
                  <Input
                    placeholder="Sharif"
                    value={newCitizen.middle_name}
                    onChange={(e) => setNewCitizen((p) => ({ ...p, middle_name: e.target.value }))}
                    className="h-9 text-xs uppercase"
                  />
                  <Input
                    placeholder="Pasport (AA1234567)"
                    value={newCitizen.passport}
                    onChange={(e) =>
                      setNewCitizen((p) => ({ ...p, passport: e.target.value.toUpperCase() }))
                    }
                    className="h-9 text-xs font-mono uppercase"
                  />
                  <Input
                    placeholder="Telefon (+998...)"
                    value={newCitizen.phone_number}
                    onChange={(e) => setNewCitizen((p) => ({ ...p, phone_number: e.target.value }))}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewCitizenForm(false)}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Bekor qilish
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={creatingCitizen}
                    loading={creatingCitizen}
                    onClick={() => void handleCreateAndAttachCitizen()}
                    className="h-8 text-xs gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Yaratish va Biriktirish
                  </Button>
                </div>
              </div>
            )}

            {/* Biriktirilgan gumonlanuvchilar ro'yxati */}
            {suspects.length > 0 ? (
              <div className="space-y-2.5">
                {suspects.map((s, idx) => (
                  <div
                    key={s.citizen_id}
                    className="rounded-xl border border-border/80 bg-background p-3.5 space-y-2.5 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Bazadagi fuqaro
                        </Badge>
                        <span className="text-xs font-bold">{s.citizen_name}</span>
                        {s.citizen_passport && (
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {s.citizen_passport}
                          </Badge>
                        )}
                        {s.citizen_phone && (
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {s.citizen_phone}
                          </span>
                        )}
                        {s.is_repeat_offender && (
                          <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px] gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Takroriy shaxs
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive cursor-pointer"
                        onClick={() => setSuspects((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {s.repeat_info && (
                      <div className="text-[11px] text-rose-600 font-medium">{s.repeat_info}</div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <select
                        value={s.role_in_crime}
                        onChange={(e) => {
                          const val = e.target.value as SuspectCrimeRole;
                          setSuspects((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, role_in_crime: val } : row,
                            ),
                          );
                        }}
                        className="h-9 rounded-md border border-input bg-background px-2.5 text-xs font-medium"
                      >
                        <option value="TASHKILOTCHI">Tashkilotchi</option>
                        <option value="ADMIN">Kanal / Guruh admini</option>
                        <option value="IJROCHI">Ijrochi / Tarqatuvchi</option>
                        <option value="VOSITACHI">Vositachi</option>
                        <option value="KARTA_EGASI">Karta / Hamyon egasi</option>
                        <option value="BOSHQA">Boshqa rol</option>
                      </select>

                      <select
                        value={s.detention_status}
                        onChange={(e) => {
                          const val = e.target.value as DetentionStatus;
                          setSuspects((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, detention_status: val } : row,
                            ),
                          );
                        }}
                        className="h-9 rounded-md border border-input bg-background px-2.5 text-xs font-medium"
                      >
                        <option value="ANIQLANMOQDA">Aniqlanmoqda</option>
                        <option value="USHLANGAN">Ushlangan (JPK 221-m.)</option>
                        <option value="TILXATDA">Tilxat / Garovda</option>
                        <option value="QIDIRUVDA">Qidiruvda</option>
                        <option value="OZODLIKDA">Ozodlikda</option>
                      </select>

                      <Input
                        placeholder="Izoh (ixtiyoriy)..."
                        value={s.notes}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSuspects((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, notes: val } : row)),
                          );
                        }}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic py-1">
                Hali gumonlanuvchilar biriktirilmagan. Yuqoridagi qidiruv orqali bazadan tanlang
                yoki yangi fuqaro qo‘shing.
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 4-QISM: RAQAMLI IZLAR VA IDENTIFIKATORLAR (SUSPECT TREE)          */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 space-y-4 bg-purple-50/45 dark:bg-purple-950/15 transition-colors">
          <div className="flex items-center justify-between border-b border-purple-200/70 dark:border-purple-800/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                4. Raqamli Izlar va Identifikatorlar (Telegram ID, IP, Karta, Kripto)
              </h2>
            </div>
          </div>

          <div className="pt-1">
            <SuspectTreeBuilder value={suspectTree} onChange={setSuspectTree} />
          </div>
        </div>

        {/* ================================================================= */}
        {/* 5-QISM: OLIB QO'YILGAN ASHYOVIY VA RAQAMLI DALILLAR               */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 space-y-4 bg-emerald-50/45 dark:bg-emerald-950/15 transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/70 dark:border-emerald-800/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <HardDrive className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                5. Olib Qo‘yilgan Ashyoviy va Raqamli Dalillar ({evidences.length})
              </h2>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setEvidences((prev) => [
                  ...prev,
                  { evidence_type: 'PHONE', title: '', identifier_value: '', notes: '' },
                ])
              }
              className="h-8 text-xs gap-1.5 bg-background cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Dalil qo‘shish
            </Button>
          </div>

          <div className="space-y-2.5 pt-1">
            {evidences.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">
                Telefon (IMEI), noutbuk, SIM-karta, kripto-hamyon yoki skrinshot/video dalillarni
                qo‘shing.
              </div>
            ) : (
              evidences.map((ev, idx) => (
                <div
                  key={idx}
                  className="space-y-2 rounded-xl border border-border/80 p-3 bg-background shadow-2xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <select
                      value={ev.evidence_type}
                      onChange={(e) => {
                        const val = e.target.value as EvidenceType;
                        setEvidences((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, evidence_type: val } : r)),
                        );
                      }}
                      className="sm:col-span-3 h-9 rounded-md border border-input bg-background px-2.5 text-xs font-medium"
                    >
                      {EVIDENCE_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="Nomi (masalan: iPhone 14 Pro, Telegram skrinshot)"
                      value={ev.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEvidences((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, title: val } : r)),
                        );
                      }}
                      className="sm:col-span-4 h-9 text-xs"
                    />
                    <Input
                      placeholder="IMEI / Seriya / Karta / Hamyon"
                      value={ev.identifier_value || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEvidences((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, identifier_value: val } : r)),
                        );
                      }}
                      className="sm:col-span-4 h-9 text-xs font-mono"
                    />
                    <div className="sm:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive cursor-pointer"
                        onClick={() => setEvidences((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md border border-input bg-muted/30 hover:bg-muted cursor-pointer">
                        <Upload className="h-3 w-3 text-primary" />
                        {uploadingIdx === idx
                          ? 'Yuklanmoqda...'
                          : ev.file_key
                            ? 'Faylni almashtirish'
                            : 'Skrinshot / Fayl biriktirish'}
                        <input
                          type="file"
                          className="hidden"
                          disabled={uploadingIdx === idx}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingIdx(idx);
                            try {
                              const uploaded = await filesApi.uploadSingle(file, 'detected-crimes');
                              setEvidences((prev) =>
                                prev.map((r, i) =>
                                  i === idx
                                    ? {
                                        ...r,
                                        file_key: uploaded.key,
                                        file_name: uploaded.original_name || file.name,
                                        title: r.title.trim() ? r.title : file.name,
                                      }
                                    : r,
                                ),
                              );
                              toast.success('Dalil fayli yuklandi');
                            } catch (err) {
                              toast.error('Fayl yuklashda xato', {
                                description: getErrorMessage(err),
                              });
                            } finally {
                              setUploadingIdx(null);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                      {ev.file_key && (
                        <a
                          href={filesApi.getViewUrl({ key: ev.file_key })}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                        >
                          <Paperclip className="h-3 w-3" />
                          {ev.file_name || 'Biriktirilgan fayl'}
                        </a>
                      )}
                    </div>
                    <Input
                      placeholder="Dalil bo‘yicha izoh (ixtiyoriy)..."
                      value={ev.notes || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEvidences((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, notes: val } : r)),
                        );
                      }}
                      className="h-8 text-[11px] max-w-xs"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* YAKUNIY STICKY SAQLASH VA BEKOR QILISH PANELI                         */}
      {/* ===================================================================== */}
      <div className="sticky bottom-0 z-30 -mx-1 pt-2 bg-gradient-to-t from-background via-background/95 to-transparent">
        <div className="w-full px-4 py-3.5 sm:px-5 rounded-xl border border-border bg-white/95 dark:bg-card/95 backdrop-blur-xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
              <Radar className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-foreground tracking-tight">
                  Aniqlangan jinoyat {caseNumber ? `№ ${caseNumber}` : '(Avto kod)'}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono uppercase px-2 py-0 border-primary/40 text-primary font-bold"
                >
                  {currentStatusLabel}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {title.trim()
                  ? 'Barcha ko‘rilgan choralar, gumonlanuvchilar, raqamli izlar va dalillar saqlanadi'
                  : 'Saqlash uchun yuqorida «Aniqlangan holat qisqa sarlavhasi»ni kiriting'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => setIsCancelModalOpen(true)}
              disabled={saveMut.isPending}
              className="h-10 text-xs font-semibold px-4 gap-2 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              Bekor qilish
            </Button>

            <Button
              type="button"
              size="default"
              disabled={!title.trim() || saveMut.isPending}
              onClick={() => saveMut.mutate()}
              className="h-10 text-xs font-bold px-6 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 transition-all cursor-pointer min-w-[180px]"
            >
              {saveMut.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saqlanmoqda...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{isEdit ? 'O‘zgarishlarni Saqlash' : 'Saqlash & Yakunlash'}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* BEKOR QILISH DIALOGI */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <RotateCcw className="h-5 w-5 text-slate-500" />
              <span>{isEdit ? 'Tahrirlashni bekor qilish' : 'Formadan chiqish'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm leading-relaxed pt-1">
              {isEdit
                ? 'Haqiqatan ham tahrirlash formasidan chiqmoqchimisiz? Kiritilgan oxirgi o‘zgarishlar saqlanmaydi.'
                : 'Haqiqatan ham aniqlangan jinoyat kiritish formasidan chiqmoqchimisiz? Kiritilgan ma‘lumotlar saqlanmaydi.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsCancelModalOpen(false)}
              className="text-xs h-10 px-4 cursor-pointer"
            >
              Yo‘q, davom etish
            </Button>
            <Button
              onClick={() => {
                setIsCancelModalOpen(false);
                navigate(isEdit && id ? `/detected-crimes/${id}` : '/detected-crimes');
              }}
              className="text-xs h-10 px-5 font-semibold cursor-pointer gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Ha, bekor qilinsin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
