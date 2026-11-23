import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  HardDrive,
  Paperclip,
  Plus,
  Radar,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { SuspectTreeBuilder } from '@/components/applications/suspect-tree-builder';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { useDebounce } from '@/hooks/use-debounce';
import {
  applicationStatusesApi,
  citizensApi,
  crimesApi,
  decisionTypesApi,
  departmentServicesApi,
  detectedCrimesApi,
  detectionSourcesApi,
  districtsApi,
  filesApi,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type {
  Citizen,
  DetectedCrimeEvidence,
  DetectedCrimeQualification,
  DetentionStatus,
  EvidenceType,
  SuspectCrimeRole,
} from '@/types/models';

interface SuspectDraft {
  citizen_id: string;
  citizen_name: string;
  citizen_passport?: string | null;
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
  const [detectedAt, setDetectedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [qualificationType, setQualificationType] =
    useState<DetectedCrimeQualification>('PRE_INVESTIGATION');
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
  const [statusId, setStatusId] = useState('');
  const [slaDays, setSlaDays] = useState<number>(10);
  const [decisionTypeId, setDecisionTypeId] = useState('');
  const [decisionNumber, setDecisionNumber] = useState('');
  const [decisionDate, setDecisionDate] = useState('');
  const [decisionNote, setDecisionNote] = useState('');

  const [suspects, setSuspects] = useState<SuspectDraft[]>([]);
  const [citizenSearch, setCitizenSearch] = useState('');
  const debouncedCitizenSearch = useDebounce(citizenSearch, 250);

  const [suspectTree, setSuspectTree] = useState<unknown[]>([]);
  const [evidences, setEvidences] = useState<DetectedCrimeEvidence[]>([]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const { data: existing } = useQuery({
    queryKey: ['detected-crime', id],
    queryFn: () => detectedCrimesApi.getOne(id as string),
    enabled: isEdit,
  });

  const { data: districtsRes } = useQuery({
    queryKey: ['districts-for-dc-form'],
    queryFn: () => districtsApi.getAll({ page: 1, limit: 200 }),
  });
  const { data: crimesRes } = useQuery({
    queryKey: ['crimes-for-dc-form'],
    queryFn: () => crimesApi.getAll({ page: 1, limit: 200 }),
  });
  const { data: sources } = useQuery({
    queryKey: ['detection-sources-active'],
    queryFn: () => detectionSourcesApi.getAll(),
  });
  const { data: statusesRes } = useQuery({
    queryKey: ['statuses-for-dc-form'],
    queryFn: () => applicationStatusesApi.getAll({ page: 1, limit: 100 }),
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

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title || '');
    setCaseNumber(existing.case_number || '');
    setReportNumber(existing.report_number || '');
    setReportDate(existing.report_date ? existing.report_date.slice(0, 10) : '');
    setKuspNumber(existing.kusp_number || '');
    setDetectedAt(existing.detected_at ? existing.detected_at.slice(0, 10) : '');
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
    setStatusId(existing.status_id || '');
    setSlaDays(existing.sla_days || 10);
    setDecisionTypeId(existing.decision_type_id || '');
    setDecisionNumber(existing.decision_number || '');
    setDecisionDate(existing.decision_date ? existing.decision_date.slice(0, 10) : '');
    setDecisionNote(existing.decision_note || '');
    setSuspectTree(Array.isArray(existing.suspect_tree) ? existing.suspect_tree : []);
    setSuspects(
      (existing.suspects || []).map((s) => ({
        citizen_id: s.citizen_id,
        citizen_name: s.citizen
          ? `${s.citizen.last_name || ''} ${s.citizen.first_name || ''} ${s.citizen.middle_name || ''}`.trim()
          : 'Fuqaro',
        citizen_passport: s.citizen?.passport,
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
        role_in_crime: 'IJROCHI',
        detention_status: 'ANIQLANMOQDA',
        is_repeat_offender: isRepeat,
        repeat_info: repeatInfo,
        notes: '',
      },
    ]);
    setCitizenSearch('');
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
        status_id: statusId || null,
        sla_days: slaDays || 10,
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
      toast.success(isEdit ? 'Ma’lumotlar yangilandi' : 'Aniqlangan jinoyat ro‘yxatga olindi');
      navigate(`/detected-crimes/${saved.id}`);
    },
    onError: (err) => {
      toast.error('Saqlashda xatolik', { description: getErrorMessage(err) });
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate('/detected-crimes')}
            className="h-9 w-9 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Radar className="h-5 w-5 text-rose-600" />
              {isEdit ? 'Aniqlangan jinoyatni tahrirlash' : 'Yangi aniqlangan jinoyat / holat'}
            </h1>
            <p className="text-xs text-muted-foreground">
              JPK 322-modda 4-bandi (Bildirgi / Tezkor-qidiruv / Kiber-monitoring)
            </p>
          </div>
        </div>

        <Button
          type="button"
          disabled={!title.trim() || saveMut.isPending}
          loading={saveMut.isPending}
          onClick={() => saveMut.mutate()}
          className="gap-2 cursor-pointer"
        >
          <Save className="h-4 w-4" />
          Saqlash
        </Button>
      </div>

      {/* 1. Asosiy va Bildirgi rekvizitlari */}
      <Card className="border-border/80 bg-card/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">
            1. Bildirgi (Raport), Aniqlash Usuli va Hudud
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold">Qisqa sarlavha *</label>
              <Input
                placeholder="Masalan: Telegram kanalda taqiqlangan video tarqatish holati fosh etildi"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Aniqlangan sana</label>
              <Input
                type="date"
                value={detectedAt}
                onChange={(e) => setDetectedAt(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Ichki kod (ixtiyoriy, avto)</label>
              <Input
                placeholder="AJ-2026-0001"
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Bildirgi (Raport) raqami</label>
              <Input
                placeholder="№ 124/2026"
                value={reportNumber}
                onChange={(e) => setReportNumber(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Bildirgi sanasi</label>
              <Input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">KUSP / E-material №</label>
              <Input
                placeholder="KUSP raqami..."
                value={kuspNumber}
                onChange={(e) => setKuspNumber(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Aniqlash usuli / manbasi</label>
              <select
                value={detectionSourceId}
                onChange={(e) => setDetectionSourceId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="">-- Tanlang --</option>
                {(sources || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Hudud (Tuman / Shahar)</label>
              <select
                value={districtId}
                onChange={(e) => setDistrictId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="">-- Tumanni tanlang --</option>
                {(districtsRes?.items || []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Sohaviy xizmat</label>
              <select
                value={deptServiceId}
                onChange={(e) => setDeptServiceId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="">-- Xizmatni tanlang --</option>
                {(deptServices || []).map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.short_name ? `${ds.short_name} — ${ds.name}` : ds.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Huquqiy malaka va Raqamli platforma */}
      <Card className="border-border/80 bg-card/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">
            2. Huquqiy Malaka (JK / MJTK) va Platforma
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Malaka turi</label>
              <select
                value={qualificationType}
                onChange={(e) => setQualificationType(e.target.value as DetectedCrimeQualification)}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs font-semibold"
              >
                <option value="PRE_INVESTIGATION">Tergovga qadar tekshiruvda</option>
                <option value="CRIMINAL">Jinoyat (JK)</option>
                <option value="ADMINISTRATIVE">Ma’muriy huquqbuzarlik (MJTK)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Jinoyat kodeksi (JK) moddasi</label>
              <select
                value={crimeId}
                onChange={(e) => setCrimeId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="">-- JK moddasini tanlang --</option>
                {(crimesRes?.items || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.article} {c.title && c.title !== c.article ? `— ${c.title}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">MJTK moddasi (agar ma’muriy bo‘lsa)</label>
              <Input
                placeholder="Masalan: MJTK 189-modda, 155⁴-modda..."
                value={mjtkArticle}
                onChange={(e) => setMjtkArticle(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Platforma / Muhit</label>
              <Input
                placeholder="Telegram, Instagram, TikTok, Sayt..."
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Kanal / Guruh / Bot / URL manzili</label>
              <Input
                placeholder="@kanal_nomi yoki https://t.me/..."
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">
                Noqonuniy aylanma / zarar (UZS, ixtiyoriy)
              </label>
              <Input
                type="number"
                placeholder="0"
                value={estimatedDamage}
                onChange={(e) => setEstimatedDamage(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold">Batafsil fabula (holat tavsifi)</label>
            <textarea
              rows={4}
              placeholder="Holat qanday aniqlangani, tarqatilgan kontent/harakat mohiyati..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. Gumonlanuvchilar / Huquqbuzarlar */}
      <Card className="border-border/80 bg-card/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            3. Gumonlanuvchilar / Huquqbuzarlar ({suspects.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Fuqarolar bazasidan qidirish (F.I.O., pasport, JSHSHIR, telefon)..."
              value={citizenSearch}
              onChange={(e) => setCitizenSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
            {debouncedCitizenSearch.trim().length >= 2 &&
              (matchedCitizensRes?.items?.length || 0) > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl p-1.5 max-h-56 overflow-y-auto">
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

          {suspects.length > 0 && (
            <div className="space-y-2">
              {suspects.map((s, idx) => (
                <div
                  key={s.citizen_id}
                  className="rounded-xl border border-border/70 bg-background/60 p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{s.citizen_name}</span>
                      {s.citizen_passport && (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {s.citizen_passport}
                        </Badge>
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={s.role_in_crime}
                      onChange={(e) => {
                        const val = e.target.value as SuspectCrimeRole;
                        setSuspects((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, role_in_crime: val } : row)),
                        );
                      }}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
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
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
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
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Raqamli izlar va gumonlanuvchi identifikatorlari */}
      <Card className="border-border/80 bg-card/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            4. Raqamli Izlar va Identifikatorlar (Telegram ID, IP, Karta, Kripto)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SuspectTreeBuilder value={suspectTree} onChange={setSuspectTree} />
        </CardContent>
      </Card>

      {/* 5. Olib qo'yilgan ashyoviy va raqamli dalillar */}
      <Card className="border-border/80 bg-card/70">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            5. Olib Qo‘yilgan Ashyoviy va Raqamli Dalillar ({evidences.length})
          </CardTitle>
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
            className="h-7 text-xs gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Dalil qo‘shish
          </Button>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {evidences.length === 0 ? (
            <div className="text-xs text-muted-foreground italic">
              Telefon (IMEI), noutbuk, SIM-karta, kripto-hamyon yoki skrinshot dalillarni qo‘shing.
            </div>
          ) : (
            evidences.map((ev, idx) => (
              <div
                key={idx}
                className="space-y-2 rounded-lg border border-border/70 p-2.5 bg-background/60"
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
                    className="sm:col-span-3 h-8 rounded-md border border-input bg-background px-2 text-xs"
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
                    className="sm:col-span-4 h-8 text-xs"
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
                    className="sm:col-span-4 h-8 text-xs font-mono"
                  />
                  <div className="sm:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive cursor-pointer"
                      onClick={() => setEvidences((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md border border-input bg-background hover:bg-muted cursor-pointer">
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
                    className="h-7 text-[11px] max-w-xs"
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 6. Status, Muddat va Yakuniy Qaror */}
      <Card className="border-border/80 bg-card/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">
            6. Holat, Protsessual Muddat va Yakuniy Qaror
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Holati (Status)</label>
              <select
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="">-- Standart (Yangi) --</option>
                {(statusesRes?.items || []).map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Tekshiruv muddati (JPK 329-m.)</label>
              <select
                value={slaDays}
                onChange={(e) => setSlaDays(Number(e.target.value) || 10)}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value={3}>3 kun (Tezkor)</option>
                <option value={10}>10 kun (Standart JPK)</option>
                <option value={30}>30 kun (Uzaytirilgan)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Yakuniy qaror turi</label>
              <select
                value={decisionTypeId}
                onChange={(e) => setDecisionTypeId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="">-- Tanlanmagan --</option>
                {(decisionTypes || []).map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">JI / Bayonnoma raqami</label>
              <Input
                placeholder="JI № yoki MJTK bayonnoma №"
                value={decisionNumber}
                onChange={(e) => setDecisionNumber(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Qaror sanasi</label>
              <Input
                type="date"
                value={decisionDate}
                onChange={(e) => setDecisionDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Qaror bo‘yicha izoh</label>
              <Input
                placeholder="Sud qarori, jarima yoki tergovga yuborish izohi..."
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Xodimning ichki qaydlari</label>
              <Input
                placeholder="Tezkor qaydlar..."
                value={officerNotes}
                onChange={(e) => setOfficerNotes(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
