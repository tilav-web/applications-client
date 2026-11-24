import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CreditCard,
  Eye,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  GitBranch,
  Layers,
  Link2,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EntityNetworkGraph } from '@/components/graph/entity-network-graph';
import { CitizenDetectedCrimesCard } from '@/components/intelligence/citizen-detected-crimes-card';
import { DossierAnalyticsSection } from '@/components/intelligence/dossier-analytics-section';
import { LiveRadarBadge } from '@/components/intelligence/live-radar-badge';
import { TransitTransferDialog } from '@/components/intelligence/transit-transfer-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { applicationsApi, banksApi, intelligenceApi, suspectFieldConfigsApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { EntityLinkRole } from '@/types/models';

const formatMoney = (val?: number | null, cur = 'UZS') =>
  `${new Intl.NumberFormat('uz-UZ').format(Math.round(Number(val || 0)))} ${cur}`;

const formatDate = (d?: string | null) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return d;
  }
};

const formatCard = (num?: string | null, masked?: string | null) => {
  const clean = (num || '').replace(/\D/g, '');
  if (clean.length === 16) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)} ${clean.slice(12, 16)}`;
  }
  return masked || num || '—';
};

export function CitizenDossierPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [addPhoneOpen, setAddPhoneOpen] = useState(false);
  const [phoneForm, setPhoneForm] = useState({
    phone_number: '',
    label: 'Qoʻshimcha raqam',
    notes: '',
  });

  const [addCardOpen, setAddCardOpen] = useState(false);
  const [cardForm, setCardForm] = useState({ card_number: '', expire_date: '', bank_name: '' });

  const [addIdentOpen, setAddIdentOpen] = useState(false);
  const [identForm, setIdentForm] = useState({
    type: 'telegram_username',
    value: '',
    notes: '',
  });

  const [transitOpen, setTransitOpen] = useState(false);
  const [linkAppOpen, setLinkAppOpen] = useState(false);
  const [linkAppForm, setLinkAppForm] = useState<{
    application_id: string;
    role: EntityLinkRole;
    note: string;
  }>({
    application_id: '',
    role: 'SUSPECT',
    note: '',
  });
  const [exportingFormat, setExportingFormat] = useState<'excel' | 'docx' | null>(null);

  const {
    data: dossier,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['citizen-dossier', id],
    queryFn: () => intelligenceApi.getCitizenDossier(id!),
    enabled: !!id,
  });

  const { data: banksData } = useQuery({
    queryKey: ['banks-all-for-dossier'],
    queryFn: () => banksApi.getAll({ limit: 100 }),
    enabled: addCardOpen,
  });

  const { data: suspectConfigs } = useQuery({
    queryKey: ['suspect-field-configs-active'],
    queryFn: () => suspectFieldConfigsApi.getAllActive(),
    enabled: addIdentOpen,
  });

  const { data: recentAppsData } = useQuery({
    queryKey: ['apps-for-role-linking'],
    queryFn: () => applicationsApi.getAll({ page: 1, limit: 50 }),
    enabled: linkAppOpen,
  });

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['citizen-dossier', id] }),
      queryClient.invalidateQueries({ queryKey: ['citizens'] }),
      queryClient.invalidateQueries({ queryKey: ['cards'] }),
    ]);
  };

  const addPhoneMut = useMutation({
    mutationFn: () => intelligenceApi.addPhoneToCitizen(id!, phoneForm),
    onSuccess: async (res) => {
      await invalidateAll();
      setAddPhoneOpen(false);
      setPhoneForm({ phone_number: '', label: 'Qoʻshimcha raqam', notes: '' });
      if (res.newlyLinkedAppsCount > 0) {
        toast.warning(
          `Diqqat! Ushbu raqam oldin ${res.newlyLinkedAppsCount} ta arizada qayd etilgan edi — barchasi fuqaroga bogʻlandi!`,
        );
      } else {
        toast.success('Telefon raqami qoʻshildi');
      }
    },
    onError: (err) => toast.error('Xatolik', { description: getErrorMessage(err) }),
  });

  const removePhoneMut = useMutation({
    mutationFn: (phoneId: string) => intelligenceApi.removePhone(phoneId),
    onSuccess: async () => {
      await invalidateAll();
      toast.success('Telefon raqami olib tashlandi');
    },
    onError: (err) => toast.error('Xatolik', { description: getErrorMessage(err) }),
  });

  const addCardMut = useMutation({
    mutationFn: () => intelligenceApi.addCardToCitizen(id!, cardForm),
    onSuccess: async (res) => {
      await invalidateAll();
      setAddCardOpen(false);
      setCardForm({ card_number: '', expire_date: '', bank_name: '' });
      if (res.newlyLinkedAppsCount > 0) {
        toast.warning(
          `Diqqat! Karta oldin ${res.newlyLinkedAppsCount} ta arizada oʻtgan — fuqaroga avtomatik zanjirlandi!`,
        );
      } else {
        toast.success('Plastik karta fuqaroga biriktirildi');
      }
    },
    onError: (err) => toast.error('Xatolik', { description: getErrorMessage(err) }),
  });

  const unlinkCardMut = useMutation({
    mutationFn: (cardId: string) => intelligenceApi.unlinkCardFromCitizen(cardId),
    onSuccess: async () => {
      await invalidateAll();
      toast.success('Karta fuqaro profilidan uzildi');
    },
    onError: (err) => toast.error('Xatolik', { description: getErrorMessage(err) }),
  });

  const addIdentMut = useMutation({
    mutationFn: () => intelligenceApi.addIdentifierToCitizen(id!, identForm),
    onSuccess: async (res) => {
      await invalidateAll();
      setAddIdentOpen(false);
      setIdentForm({ type: 'telegram_username', value: '', notes: '' });
      if (res.newlyLinkedAppsCount > 0) {
        toast.warning(
          `Ushbu belgi ${res.newlyLinkedAppsCount} ta arizada gumonlanuvchi sifatida topildi va bogʻlandi!`,
        );
      } else {
        toast.success('Raqamli identifikator biriktirildi');
      }
    },
    onError: (err) => toast.error('Xatolik', { description: getErrorMessage(err) }),
  });

  const removeIdentMut = useMutation({
    mutationFn: (identId: string) => intelligenceApi.removeIdentifier(identId),
    onSuccess: async () => {
      await invalidateAll();
      toast.success('Identifikator uzildi');
    },
  });

  const confirmMatchMut = useMutation({
    mutationFn: (payload: { citizen_id: string; card_id: string }) =>
      intelligenceApi.confirmProbableMatch(payload),
    onSuccess: async () => {
      await invalidateAll();
      toast.success('Ehtimoliy moslik tasdiqlandi va fuqaroga biriktirildi!');
    },
    onError: (err) => toast.error('Xatolik', { description: getErrorMessage(err) }),
  });

  const linkRoleMut = useMutation({
    mutationFn: () =>
      intelligenceApi.linkCitizenRoleToApplication({
        application_id: linkAppForm.application_id,
        citizen_id: id!,
        role: linkAppForm.role,
        note: linkAppForm.note,
      }),
    onSuccess: async () => {
      await invalidateAll();
      setLinkAppOpen(false);
      toast.success('Fuqaro tanlangan arizaga biriktirildi');
    },
    onError: (err) => toast.error('Xatolik', { description: getErrorMessage(err) }),
  });

  const handleExport = async (format: 'excel' | 'docx') => {
    if (!id) return;
    try {
      setExportingFormat(format);
      const blob = await intelligenceApi.exportDossier('citizen', id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Fuqaro_360_Dosye_${id.slice(0, 6)}.${format === 'docx' ? 'docx' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Maʼlumotnoma (${format.toUpperCase()}) yuklab olindi`);
    } catch (err) {
      toast.error('Eksportda xatolik', { description: getErrorMessage(err) });
    } finally {
      setExportingFormat(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Fuqaro 360° tahliliy dosyesi yuklanmoqda...</p>
      </div>
    );
  }

  if (isError || !dossier || !dossier.citizen) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/citizens')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Fuqarolar roʻyxatiga qaytish
        </Button>
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardContent className="p-6 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold">{getErrorMessage(error)}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cit = dossier.citizen;
  const stats = dossier.stats;
  const fullName =
    [cit.last_name, cit.first_name, cit.middle_name].filter(Boolean).join(' ') || 'Ismsiz fuqaro';

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Yuqori Navigatsiya va Eksport Tugmalari */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/citizens')}
          className="gap-2 -ml-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Fuqarolar bazasiga qaytish</span>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Yangilash
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('excel')}
            disabled={exportingFormat !== null}
            className="h-8 text-xs gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel Dosye
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('docx')}
            disabled={exportingFormat !== null}
            className="h-8 text-xs gap-1.5 border-blue-500/40 text-blue-600 dark:text-blue-400 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
            Word Maʼlumotnoma
          </Button>
        </div>
      </div>

      {/* Shaxsiy Pasport / Dosye Sarlavha Bloki */}
      <Card className="py-0 gap-0 border-border/80 bg-card/70 backdrop-blur-md overflow-hidden min-w-0">
        <CardContent className="p-4 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 min-w-0">
          <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
            <div
              className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shrink-0 border-2 ${
                stats.riskLevel === 'CRITICAL' || stats.riskLevel === 'HIGH'
                  ? 'bg-rose-500/15 border-rose-500 text-rose-500'
                  : 'bg-primary/15 border-primary/40 text-primary'
              }`}
            >
              <User className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>

            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-foreground break-words">
                  {fullName}
                </h1>
                <Badge
                  className={
                    stats.riskLevel === 'CRITICAL' || stats.riskLevel === 'HIGH'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 font-bold'
                      : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                  }
                >
                  Xavf: {stats.riskScore}%
                </Badge>
                <span
                  className={`text-xs font-semibold break-words ${
                    stats.riskLevel === 'CRITICAL' || stats.riskLevel === 'HIGH'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {stats.riskLabel}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono break-words">
                <span>
                  Pasport: <strong className="text-foreground">{cit.passport || '—'}</strong>
                </span>
                <span>
                  JSHSHIR: <strong className="text-foreground">{cit.pinfl || '—'}</strong>
                </span>
                {cit.birth_date && <span>T.Sana: {formatDate(cit.birth_date)}</span>}
                {(cit.district?.name || cit.neighborhood?.name || cit.address) && (
                  <span className="flex items-center gap-1 font-sans break-words">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      {[cit.district?.name, cit.neighborhood?.name, cit.address]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </span>
                )}
                {(cit.occupation_category ||
                  cit.occupation ||
                  cit.workplace ||
                  cit.work_position) && (
                  <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium">
                    <span>
                      {[
                        cit.occupation_category?.name,
                        cit.occupation?.name,
                        cit.workplace?.name,
                        cit.work_position,
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {dossier.canMutate && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddCardOpen(true)}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <CreditCard className="h-3.5 w-3.5 text-amber-500" />+ Karta biriktirish
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddPhoneOpen(true)}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Phone className="h-3.5 w-3.5 text-emerald-500" />+ Telefon qoʻshish
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddIdentOpen(true)}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Fingerprint className="h-3.5 w-3.5 text-purple-500" />+ Raqamli iz
              </Button>
              <Button
                size="sm"
                onClick={() => setTransitOpen(true)}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />+ Oʻtkazma / Vipiska
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aniqlangan Jinoyatlar / MJTK Tarixi */}
      <CitizenDetectedCrimesCard citizenId={cit.id} />

      {/* Ikki tomonlama rol (Cross-Role Collision) ogohlantirish banneri */}
      {stats.isCrossRoleCollision && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
          <ShieldAlert className="h-6 w-6 text-rose-500 shrink-0 animate-pulse mt-0.5" />
          <div className="text-xs sm:text-sm space-y-1 min-w-0">
            <h4 className="font-bold text-rose-600 dark:text-rose-400 break-words">
              Muhim Tergov Signali: Qarama-qarshi Rollar Toʻqnashuvi!
            </h4>
            <p className="text-muted-foreground break-words">
              Ushbu shaxs <strong>{stats.victimAppsCount} ta arizada Jabrlanuvchi</strong> sifatida,
              ammo boshqa{' '}
              <strong>{stats.suspectOrDropperAppsCount} ta arizada Dropper / Gumonlanuvchi</strong>{' '}
              sifatida qatnashgan!
            </p>
          </div>
        </div>
      )}

      {/* Ehtimoliy Mosliklar (Soft/Fuzzy Matches) — 1-klik bilan tasdiqlash */}
      {dossier.probableMatches.length > 0 && (
        <Card className="py-0 gap-0 border-amber-500/40 bg-amber-500/5 min-w-0 overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex flex-wrap items-center gap-2 text-amber-700 dark:text-amber-400">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="break-words">
                Ehtimoliy Bogʻliqliklar Topildi ({dossier.probableMatches.length} ta — Tasdiqlash
                kutilmoqda)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2.5 min-w-0">
            {dossier.probableMatches.map((pm) => (
              <div
                key={pm.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-amber-500/30 bg-background/80 min-w-0 overflow-hidden"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span
                      onClick={() => navigate(pm.target_route)}
                      className="font-mono font-bold text-sm text-primary hover:underline cursor-pointer break-all"
                    >
                      {pm.title}
                    </span>
                    <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                      {pm.confidence}% moslik
                    </Badge>
                    {pm.linked_apps_count > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {pm.linked_apps_count} ta ariza · {formatMoney(pm.total_amount)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground break-words">{pm.reason}</p>
                </div>

                {dossier.canMutate && (
                  <Button
                    size="sm"
                    onClick={() => confirmMatchMut.mutate(pm.confirm_action)}
                    disabled={confirmMatchMut.isPending}
                    className="h-8 text-xs gap-1.5 shrink-0 cursor-pointer self-start sm:self-auto"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Tasdiqlash va biriktirish
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 4 ta Asosiy KPI Kartochkalari */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Bogʻliq Arizalar
              </p>
              <p className="text-2xl font-extrabold font-mono mt-0.5">{stats.totalApplications}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
                Jabr.: {stats.victimAppsCount} · Gumon/Drop.: {stats.suspectOrDropperAppsCount}
              </p>
            </div>
            <Layers className="h-8 w-8 text-primary opacity-75 shrink-0" />
          </CardContent>
        </Card>

        <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Arizalardagi Zarar
              </p>
              <p className="text-lg sm:text-xl font-extrabold font-mono text-rose-500 mt-0.5 break-words">
                {formatMoney(stats.totalLossInLinkedApps)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
                Zanjirli: {dossier.multiHopChains.length} ta qoʻshimcha ish
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-rose-500 opacity-75 shrink-0" />
          </CardContent>
        </Card>

        <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Kartalarga Kirim
              </p>
              <p className="text-lg sm:text-xl font-extrabold font-mono text-emerald-600 mt-0.5 break-words">
                {formatMoney(stats.totalIncomingAmount)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
                Chiqim: {formatMoney(stats.totalOutgoingAmount)}
              </p>
            </div>
            <ArrowDownLeft className="h-8 w-8 text-emerald-500 opacity-75 shrink-0" />
          </CardContent>
        </Card>

        <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Biriktirilgan Rekvizitlar
              </p>
              <p className="text-2xl font-extrabold font-mono mt-0.5">
                {dossier.ownedCards.length +
                  dossier.ownedPhones.length +
                  dossier.ownedIdentifiers.length}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
                {dossier.ownedCards.length} karta · {dossier.ownedPhones.length} tel ·{' '}
                {dossier.ownedIdentifiers.length} iz
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-amber-500 opacity-75 shrink-0" />
          </CardContent>
        </Card>
      </div>

      {/* Asosiy Tablar */}
      <Tabs defaultValue="overview" className="w-full space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="overview" className="text-xs gap-1.5 cursor-pointer">
            <GitBranch className="h-3.5 w-3.5" />
            Rekvizitlar & Xarita
          </TabsTrigger>
          <TabsTrigger value="applications" className="text-xs gap-1.5 cursor-pointer">
            <FileText className="h-3.5 w-3.5" />
            Bogʻliq Arizalar ({dossier.directApplications.length + dossier.multiHopChains.length})
          </TabsTrigger>
          <TabsTrigger value="flows" className="text-xs gap-1.5 cursor-pointer">
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Kartalar Oqimi ({dossier.transfers.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs gap-1.5 cursor-pointer">
            <Sparkles className="h-3.5 w-3.5" />
            Mikro-Statistika & Dalillar
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: REKVIZITLAR VA IKKI REJIMLI XARITA */}
        <TabsContent value="overview" className="space-y-6">
          {/* Kartalar, Telefonlar va Raqamli Izlar 3 ta ustunda */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* 1. Fuqaro Kartalari */}
            <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 min-w-0">
                  <CreditCard className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="truncate">Plastik Kartalar ({dossier.ownedCards.length})</span>
                </CardTitle>
                {dossier.canMutate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddCardOpen(true)}
                    className="h-7 px-2 text-xs gap-1 shrink-0 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Qoʻshish
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2 min-w-0">
                {dossier.ownedCards.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">
                    Karta biriktirilmagan
                  </p>
                ) : (
                  dossier.ownedCards.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/cards/${c.id}`)}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border/80 bg-background/70 hover:border-primary/50 cursor-pointer transition-all min-w-0 overflow-hidden"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs font-extrabold text-foreground break-all">
                          {formatCard(c.card_number, c.masked_number)}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {c.bank?.name || 'Bank'} {c.expire_date ? `· ${c.expire_date}` : ''}
                          </span>
                        </p>
                      </div>
                      {dossier.canMutate && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            unlinkCardMut.mutate(c.id);
                          }}
                          className="p-1 text-muted-foreground hover:text-rose-500 cursor-pointer shrink-0"
                          title="Fuqarodan uzish"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* 2. Fuqaro Telefon Raqamlari */}
            <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 min-w-0">
                  <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="truncate">Telefon Raqamlar ({dossier.ownedPhones.length})</span>
                </CardTitle>
                {dossier.canMutate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddPhoneOpen(true)}
                    className="h-7 px-2 text-xs gap-1 shrink-0 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Qoʻshish
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2 min-w-0">
                {dossier.ownedPhones.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">
                    Telefon kiritilmagan
                  </p>
                ) : (
                  dossier.ownedPhones.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/dossier/phone/${p.id}`)}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border/80 bg-background/70 hover:border-primary/50 cursor-pointer transition-all min-w-0 overflow-hidden"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="font-mono text-xs font-extrabold text-foreground break-all">
                            {p.formatted_number || `+${p.phone_number}`}
                          </span>
                          {p.is_primary && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">
                              Asosiy
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground break-words">
                          {p.operator || 'Aloqa'} {p.label ? `· ${p.label}` : ''}
                        </p>
                      </div>
                      {dossier.canMutate && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePhoneMut.mutate(p.id);
                          }}
                          className="p-1 text-muted-foreground hover:text-rose-500 cursor-pointer shrink-0"
                          title="O'chirish / Uzish"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* 3. Raqamli Izlar (Telegram, IP, IMEI, Kripto) */}
            <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden md:col-span-2 xl:col-span-1">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 min-w-0">
                  <Fingerprint className="h-4 w-4 text-purple-500 shrink-0" />
                  <span className="truncate">
                    Raqamli Izlar ({dossier.ownedIdentifiers.length})
                  </span>
                </CardTitle>
                {dossier.canMutate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddIdentOpen(true)}
                    className="h-7 px-2 text-xs gap-1 shrink-0 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Qoʻshish
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2 min-w-0">
                {dossier.ownedIdentifiers.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">
                    Telegram, IMEI, IP yoki kripto-hamyon biriktirilmagan
                  </p>
                ) : (
                  dossier.ownedIdentifiers.map((ident) => (
                    <div
                      key={ident.id}
                      onClick={() => navigate(`/dossier/identifier/${ident.id}`)}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border/80 bg-background/70 hover:border-primary/50 cursor-pointer transition-all min-w-0 overflow-hidden"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs font-extrabold text-foreground break-all">
                          {ident.raw_value}
                        </p>
                        <p className="text-[11px] text-muted-foreground break-words">
                          {ident.type_label || ident.type} {ident.notes ? `· ${ident.notes}` : ''}
                        </p>
                      </div>
                      {dossier.canMutate && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeIdentMut.mutate(ident.id);
                          }}
                          className="p-1 text-muted-foreground hover:text-rose-500 cursor-pointer shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Ikki rejimli Interaktiv Bog'liqliklar Grafi */}
          <EntityNetworkGraph
            networkGraph={dossier.networkGraph}
            financialGraph={dossier.financialGraph}
            defaultMode="network"
          />
        </TabsContent>

        {/* TAB 2: BOG'LANGAN ARIZALAR VA ZANJIRLAR */}
        <TabsContent value="applications" className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">
              Toʻgʻridan-toʻgʻri bogʻlangan arizalar ({dossier.directApplications.length})
            </h3>
            {dossier.canMutate && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLinkAppOpen(true)}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Link2 className="h-3.5 w-3.5" />
                Arizaga aniq rol bilan biriktirish
              </Button>
            )}
          </div>

          <Card className="py-0 gap-0 border-border/80 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ariza №</TableHead>
                  <TableHead>Fuqaroning Roli</TableHead>
                  <TableHead>Bogʻlanish Asosi</TableHead>
                  <TableHead>Tuman</TableHead>
                  <TableHead>Zarar Summasi</TableHead>
                  <TableHead>Sana</TableHead>
                  <TableHead className="text-right">Amal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dossier.directApplications.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-xs text-muted-foreground"
                    >
                      Hozircha arizalar topilmadi
                    </TableCell>
                  </TableRow>
                ) : (
                  dossier.directApplications.map((app) => (
                    <TableRow
                      key={app.id}
                      onClick={() => navigate(`/applications/${app.id}`)}
                      className="cursor-pointer hover:bg-muted/40"
                    >
                      <TableCell className="font-mono font-bold text-primary">
                        № {app.application_number}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            app.role_in_app === 'DROPPER' || app.role_in_app === 'SUSPECT'
                              ? 'bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px]'
                              : 'bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]'
                          }
                        >
                          {app.role_in_app}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate">
                        {app.match_reasons.join('; ')}
                      </TableCell>
                      <TableCell className="text-xs">{app.district_name || '—'}</TableCell>
                      <TableCell className="font-mono font-bold text-rose-500 text-xs">
                        {app.transfer_amount ? formatMoney(app.transfer_amount, app.currency) : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatDate(app.date)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Zanjirli (2-3 qadamli Multi-Hop) Bog'liqliklar */}
          {dossier.multiHopChains.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold flex flex-wrap items-center gap-2">
                <GitBranch className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  Zanjirli (Bilvosita 2–3 qadamli) bogʻlangan arizalar (
                  {dossier.multiHopChains.length})
                </span>
              </h3>
              <div className="space-y-2.5">
                {dossier.multiHopChains.map((chain, idx) => (
                  <Card
                    key={idx}
                    onClick={() => navigate(`/applications/${chain.target_application.id}`)}
                    className="py-0 gap-0 border-amber-500/30 bg-amber-500/[0.03] hover:border-amber-500/60 cursor-pointer transition-all min-w-0 overflow-hidden"
                  >
                    <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono min-w-0">
                          {chain.chain_steps.map((step, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1.5 max-w-full"
                            >
                              <span className="px-2 py-0.5 rounded bg-background border border-border font-semibold break-all">
                                {step}
                              </span>
                              {sIdx < chain.chain_steps.length - 1 && (
                                <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
                              )}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground break-words">
                          {chain.target_application.description || 'Izoh kiritilmagan'}
                        </p>
                      </div>
                      <span className="font-mono text-xs font-bold text-rose-500 shrink-0">
                        {formatMoney(chain.target_application.transfer_amount)}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: KARTALAR OQIMI VA O'TKAZMALAR */}
        <TabsContent value="flows" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">
                Fuqaroning barcha kartalari boʻyicha oʻtkazmalar harakati (
                {dossier.transfers.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Kirim va chiqim pul oqimlari hamda kontragent kartalar
              </p>
            </div>
            {dossier.canMutate && (
              <Button
                size="sm"
                onClick={() => setTransitOpen(true)}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Vipiska / Tranzit oʻtkazma qoʻshish
              </Button>
            )}
          </div>

          <Card className="py-0 gap-0 border-border/80 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Yoʻnalish</TableHead>
                  <TableHead>Summa</TableHead>
                  <TableHead>Joʻnatuvchi Karta</TableHead>
                  <TableHead>Qabul Qiluvchi Karta</TableHead>
                  <TableHead>Toʻlov Tizimi</TableHead>
                  <TableHead>Sana va Soat</TableHead>
                  <TableHead>Ariza</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dossier.transfers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-xs text-muted-foreground"
                    >
                      Fuqaro kartalari boʻyicha oʻtkazmalar topilmadi
                    </TableCell>
                  </TableRow>
                ) : (
                  dossier.transfers.map((tr) => (
                    <TableRow key={tr.id}>
                      <TableCell>
                        {tr.direction === 'INCOMING' ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] gap-1">
                            <ArrowDownLeft className="h-3 w-3" /> Kirim
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px] gap-1">
                            <ArrowUpRight className="h-3 w-3" /> Chiqim
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-xs">
                        {formatMoney(tr.amount, tr.currency)}
                      </TableCell>
                      <TableCell>
                        {tr.sender_card_id ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/cards/${tr.sender_card_id}`)}
                            className="text-left hover:underline cursor-pointer"
                          >
                            <span className="font-mono text-xs font-semibold text-primary block">
                              {tr.sender_card_number}
                            </span>
                            {tr.sender_owner_name && (
                              <span className="text-[10px] text-muted-foreground">
                                {tr.sender_owner_name}
                              </span>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tr.receiver_card_id ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/cards/${tr.receiver_card_id}`)}
                            className="text-left hover:underline cursor-pointer"
                          >
                            <span className="font-mono text-xs font-semibold text-primary block">
                              {tr.receiver_card_number}
                            </span>
                            {tr.receiver_owner_name && (
                              <span className="text-[10px] text-muted-foreground">
                                {tr.receiver_owner_name}
                              </span>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{tr.payment_provider || '—'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatDate(tr.transfer_date)} {tr.transfer_time || ''}
                      </TableCell>
                      <TableCell>
                        {tr.application_id ? (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => navigate(`/applications/${tr.application_id}`)}
                            className="h-auto p-0 font-mono text-xs"
                          >
                            № {tr.application_number || 'Ariza'}
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Vipiska</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 4: MIKRO-STATISTIKA VA DALILLAR */}
        <TabsContent value="analytics">
          <DossierAnalyticsSection
            stats={dossier.stats}
            coOccurringClues={dossier.coOccurringClues}
            evidenceFiles={dossier.evidenceFiles}
          />
        </TabsContent>
      </Tabs>

      {/* DIALOG 1: TELEFON QO'SHISH */}
      <Dialog open={addPhoneOpen} onOpenChange={setAddPhoneOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fuqaroga Telefon Raqami Qoʻshish</DialogTitle>
            <DialogDescription>
              Agar ushbu raqam oldin biror arizada gumonlanuvchi sifatida oʻtgan boʻlsa, tizim uni
              avtomatik bogʻlaydi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold">Telefon raqami *</label>
                {phoneForm.phone_number && (
                  <LiveRadarBadge type="phone_number" value={phoneForm.phone_number} />
                )}
              </div>
              <Input
                value={phoneForm.phone_number}
                onChange={(e) => setPhoneForm({ ...phoneForm, phone_number: e.target.value })}
                placeholder="+998 90 123 45 67"
                className="font-mono font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Yorliq / Holati</label>
              <Input
                value={phoneForm.label}
                onChange={(e) => setPhoneForm({ ...phoneForm, label: e.target.value })}
                placeholder="Shaxsiy / Bankka ulangan / Ikkinchi raqam"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Qoʻshimcha izoh</label>
              <Input
                value={phoneForm.notes}
                onChange={(e) => setPhoneForm({ ...phoneForm, notes: e.target.value })}
                placeholder="Operator maʼlumotnomasi asosida..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPhoneOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={() => addPhoneMut.mutate()} disabled={addPhoneMut.isPending}>
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: KARTA QO'SHISH */}
      <Dialog open={addCardOpen} onOpenChange={setAddCardOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fuqaroga Plastik Karta Biriktirish</DialogTitle>
            <DialogDescription>
              Markaziy bank / Uzcard / Humo javob xatida aniqlangan kartalarni kiriting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold">Karta raqami (16 talik) *</label>
                {cardForm.card_number && (
                  <LiveRadarBadge type="card_number" value={cardForm.card_number} />
                )}
              </div>
              <Input
                value={cardForm.card_number}
                onChange={(e) => setCardForm({ ...cardForm, card_number: e.target.value })}
                placeholder="8600 1234 5678 9012"
                className="font-mono font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Muddati (MM/YY)</label>
                <Input
                  value={cardForm.expire_date}
                  onChange={(e) => setCardForm({ ...cardForm, expire_date: e.target.value })}
                  placeholder="08/29"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Emitent Bank</label>
                <Input
                  list="dossier-banks-list"
                  value={cardForm.bank_name}
                  onChange={(e) => setCardForm({ ...cardForm, bank_name: e.target.value })}
                  placeholder="Agrobank / TBC..."
                />
                <datalist id="dossier-banks-list">
                  {banksData?.items?.map((b) => (
                    <option key={b.id} value={b.name || ''} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCardOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={() => addCardMut.mutate()} disabled={addCardMut.isPending}>
              Biriktirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: RAQAMLI IDENTIFIKATOR QO'SHISH */}
      <Dialog open={addIdentOpen} onOpenChange={setAddIdentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Raqamli Identifikator Qoʻshish</DialogTitle>
            <DialogDescription>
              Telegram nik/ID, Instagram, IMEI, Kripto-hamyon yoki IP manzilni fuqaroga biriktiring.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Belgi turi</label>
              <select
                value={identForm.type}
                onChange={(e) => setIdentForm({ ...identForm, type: e.target.value })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs font-semibold"
              >
                <option value="telegram_username">Telegram Username</option>
                <option value="telegram_id">Telegram ID</option>
                <option value="instagram_username">Instagram Username</option>
                <option value="imei">IMEI Kod</option>
                <option value="crypto_wallet">Kripto-hamyon</option>
                <option value="ip_address">IP Manzil</option>
                <option value="car_plate">Avtoraqam</option>
                {suspectConfigs?.map((cfg) => (
                  <option key={cfg.id} value={cfg.key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold">Qiymat *</label>
                {identForm.value && (
                  <LiveRadarBadge type={identForm.type} value={identForm.value} />
                )}
              </div>
              <Input
                value={identForm.value}
                onChange={(e) => setIdentForm({ ...identForm, value: e.target.value })}
                placeholder="@username, 682910442, TR7NHq..."
                className="font-mono font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Izoh</label>
              <Input
                value={identForm.notes}
                onChange={(e) => setIdentForm({ ...identForm, notes: e.target.value })}
                placeholder="Tezkor qidiruv natijasida aniqlandi..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddIdentOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={() => addIdentMut.mutate()} disabled={addIdentMut.isPending}>
              Biriktirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: ARIZAGA ROL BILAN BIRIKTIRISH */}
      <Dialog open={linkAppOpen} onOpenChange={setLinkAppOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fuqaroni Arizaga Aniq Rol Bilan Biriktirish</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Arizani tanlang *</label>
              <select
                value={linkAppForm.application_id}
                onChange={(e) => setLinkAppForm({ ...linkAppForm, application_id: e.target.value })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs font-semibold"
              >
                <option value="">Arizani tanlang...</option>
                {recentAppsData?.items?.map((a) => (
                  <option key={a.id} value={a.id}>
                    № {a.application_number || 'Raqamsiz'} — {a.citizen?.last_name || ''}{' '}
                    {a.citizen?.first_name || ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Arizadagi Roli *</label>
              <select
                value={linkAppForm.role}
                onChange={(e) =>
                  setLinkAppForm({ ...linkAppForm, role: e.target.value as EntityLinkRole })
                }
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs font-semibold"
              >
                <option value="SUSPECT">Gumonlanuvchi / Firibgar</option>
                <option value="DROPPER">Dropper (Karta egasi / Vositachi)</option>
                <option value="WITNESS">Guvoh</option>
                <option value="VICTIM">Jabrlanuvchi</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Tergovchi izohi</label>
              <Input
                value={linkAppForm.note}
                onChange={(e) => setLinkAppForm({ ...linkAppForm, note: e.target.value })}
                placeholder="Soʻroq bayonnomasi asosida gumonlanuvchi deb topildi..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkAppOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              onClick={() => linkRoleMut.mutate()}
              disabled={!linkAppForm.application_id || linkRoleMut.isPending}
            >
              Biriktirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 5: BANK VIPISKASI / TRANZIT O'TKAZMA */}
      <TransitTransferDialog
        open={transitOpen}
        onOpenChange={setTransitOpen}
        availableCards={dossier.ownedCards}
        onSuccessInvalidateKeys={[['citizen-dossier', id], ['financial-flow-graph']]}
      />
    </div>
  );
}

export default CitizenDossierPage;
