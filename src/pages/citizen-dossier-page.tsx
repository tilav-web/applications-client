import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  GitBranch,
  Link2,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { EntityNetworkGraph } from '@/components/graph/entity-network-graph';
import { CitizenCardsBreakdown } from '@/components/intelligence/citizen-cards-breakdown';
import { CitizenDetectedCrimesCard } from '@/components/intelligence/citizen-detected-crimes-card';
import { DossierAnalyticsSection } from '@/components/intelligence/dossier-analytics-section';
import {
  DossierQuickDrawer,
  type QuickDrawerTarget,
} from '@/components/intelligence/dossier-quick-drawer';
import {
  CollapsibleInsightPanel,
  DossierMetricStrip,
  type DossierNavSection,
  DossierSectionNav,
  DossierTopBar,
  RoleVerdictBanner,
  SectionHeading,
} from '@/components/intelligence/dossier-shell';
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
import { applicationsApi, banksApi, intelligenceApi, suspectFieldConfigsApi } from '@/lib/api';
import {
  buildCitizenVerdict,
  formatDossierDate,
  formatDossierMoney,
  formatDossierPhone,
  getRoleMeta,
  isDangerRole,
  useDossierTrail,
} from '@/lib/dossier-navigation';
import { getErrorMessage } from '@/lib/error';
import type { EntityLinkRole } from '@/types/models';

type AppRoleFilter = 'ALL' | 'VICTIM' | 'DANGER' | 'OTHER';

export function CitizenDossierPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [drawerTarget, setDrawerTarget] = useState<QuickDrawerTarget | null>(null);
  const [roleFilter, setRoleFilter] = useState<AppRoleFilter>('ALL');

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

  const fullName = dossier?.citizen?.full_name?.trim() || 'Fuqaro';

  const currentTrailItem = useMemo(
    () => ({
      label: fullName,
      to: `/citizens/${id}`,
      kind: 'citizen' as const,
    }),
    [fullName, id],
  );

  const fallbackRoot = useMemo(
    () => ({
      label: 'Fuqarolar bazasi',
      to: '/citizens',
      kind: 'citizens' as const,
    }),
    [],
  );

  const { breadcrumbs, previousItem, navigateWithTrail, goBack, goToBreadcrumb } = useDossierTrail(
    fallbackRoot,
    currentTrailItem,
  );

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

  const filteredApplications = useMemo(() => {
    const apps = dossier?.directApplications || [];
    if (roleFilter === 'ALL') return apps;
    if (roleFilter === 'DANGER') return apps.filter((a) => isDangerRole(a.role_in_app));
    if (roleFilter === 'VICTIM') return apps.filter((a) => a.role_in_app === 'VICTIM');
    return apps.filter((a) => a.role_in_app !== 'VICTIM' && !isDangerRole(a.role_in_app));
  }, [dossier?.directApplications, roleFilter]);

  const roleCounts = useMemo(() => {
    const apps = dossier?.directApplications || [];
    return {
      all: apps.length,
      victim: apps.filter((a) => a.role_in_app === 'VICTIM').length,
      danger: apps.filter((a) => isDangerRole(a.role_in_app)).length,
      other: apps.filter((a) => a.role_in_app !== 'VICTIM' && !isDangerRole(a.role_in_app)).length,
    };
  }, [dossier?.directApplications]);

  const navSections = useMemo<DossierNavSection[]>(() => {
    if (!dossier) return [];
    const cluesCount = dossier.ownedPhones.length + dossier.ownedIdentifiers.length;
    return [
      {
        id: 'sec-profile',
        step: 1,
        label: 'Shaxs va Rol',
        alert: dossier.stats.isCrossRoleCollision || dossier.stats.suspectOrDropperAppsCount > 0,
      },
      {
        id: 'sec-apps',
        step: 2,
        label: 'Arizalar',
        count: dossier.directApplications.length + dossier.multiHopChains.length,
      },
      {
        id: 'sec-cards',
        step: 3,
        label: 'Kartalar va Oʻtkazmalar',
        count: dossier.ownedCards.length,
      },
      {
        id: 'sec-clues',
        step: 4,
        label: 'Telefon va Izlar',
        count: cluesCount,
      },
      {
        id: 'sec-graph',
        step: 5,
        label: 'Graf va Statistika',
      },
    ];
  }, [dossier]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Fuqaro bogʻliqlik dosyesi yuklanmoqda...</p>
      </div>
    );
  }

  if (isError || !dossier || !dossier.citizen) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-4">
        <DossierTopBar
          breadcrumbs={breadcrumbs}
          backLabel={previousItem.label}
          onBack={goBack}
          onBreadcrumbClick={goToBreadcrumb}
        />
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
  const verdict = buildCitizenVerdict(stats);
  const hasMultipleRoles =
    [roleCounts.victim > 0, roleCounts.danger > 0, roleCounts.other > 0].filter(Boolean).length > 1;

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Yuqori Breadcrumb va Eksport Tugmalari */}
      <DossierTopBar
        breadcrumbs={breadcrumbs}
        backLabel={previousItem.label}
        onBack={goBack}
        onBreadcrumbClick={goToBreadcrumb}
        actions={
          <>
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
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('docx')}
              disabled={exportingFormat !== null}
              className="h-8 text-xs gap-1.5 border-blue-500/40 text-blue-600 dark:text-blue-400 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              Word
            </Button>
          </>
        }
      />

      {/* Sticky Tezkor Sakrash Paneli */}
      <DossierSectionNav sections={navSections} />

      {/* ===================================================================== */}
      {/* 1-BO'LIM: SHAXS PASPORTI VA ANIQ ROL HUKMI                            */}
      {/* ===================================================================== */}
      <section id="sec-profile" className="scroll-mt-20 space-y-4">
        <Card className="py-0 gap-0 border-border/80 bg-card/70 overflow-hidden">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shrink-0 border-2 ${
                    verdict.tone === 'critical' || verdict.tone === 'danger'
                      ? 'bg-rose-500/15 border-rose-500 text-rose-500'
                      : 'bg-primary/15 border-primary/40 text-primary'
                  }`}
                >
                  <User className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>

                <div className="space-y-1.5 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground break-words">
                    {fullName}
                  </h1>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                    {cit.phone_number && (
                      <span className="inline-flex items-center gap-1 text-foreground font-semibold">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                        {formatDossierPhone(cit.phone_number)}
                      </span>
                    )}
                    <span>
                      Pasport: <strong className="text-foreground">{cit.passport || '—'}</strong>
                    </span>
                    <span>
                      JSHSHIR: <strong className="text-foreground">{cit.pinfl || '—'}</strong>
                    </span>
                    {cit.birth_date && <span>T.sana: {formatDossierDate(cit.birth_date)}</span>}
                  </div>

                  {(cit.district?.name ||
                    cit.neighborhood?.name ||
                    cit.address ||
                    cit.occupation_category ||
                    cit.occupation ||
                    cit.workplace ||
                    cit.work_position) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {(cit.district?.name || cit.neighborhood?.name || cit.address) && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          {[cit.district?.name, cit.neighborhood?.name, cit.address]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      )}
                      {(cit.occupation_category ||
                        cit.occupation ||
                        cit.workplace ||
                        cit.work_position) && (
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                          {[
                            cit.occupation_category?.name,
                            cit.occupation?.name,
                            cit.workplace?.name,
                            cit.work_position,
                          ]
                            .filter(Boolean)
                            .join(' • ')}
                        </span>
                      )}
                    </div>
                  )}
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
                    <CreditCard className="h-3.5 w-3.5 text-amber-500" />+ Karta
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddPhoneOpen(true)}
                    className="h-8 text-xs gap-1.5 cursor-pointer"
                  >
                    <Phone className="h-3.5 w-3.5 text-emerald-500" />+ Telefon
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
                    <ArrowRightLeft className="h-3.5 w-3.5" />+ Oʻtkazma
                  </Button>
                </div>
              )}
            </div>

            {/* Aniq Rol Hukmi — Jabrlanuvchimi yoki Firibgar/Droppermi */}
            <RoleVerdictBanner verdict={verdict} riskScore={stats.riskScore} />
          </CardContent>
        </Card>

        {/* Ixcham 4 ta Ko'rsatkich Qatori */}
        <DossierMetricStrip
          items={[
            {
              label: 'Jami arizalar',
              value: `${stats.totalApplications} ta`,
              sub: `Jabrlanuvchi: ${stats.victimAppsCount} · Firibgar/Dropper: ${stats.suspectOrDropperAppsCount}`,
            },
            {
              label: 'Arizalardagi zarar',
              value: formatDossierMoney(stats.totalLossInLinkedApps),
              sub:
                dossier.multiHopChains.length > 0
                  ? `+ ${dossier.multiHopChains.length} ta zanjirli ish`
                  : 'Bogʻliq ishlar yigʻindisi',
              tone: 'danger',
            },
            {
              label: 'Kartalarga kirim',
              value: formatDossierMoney(stats.totalIncomingAmount),
              sub: `Chiqim: ${formatDossierMoney(stats.totalOutgoingAmount)}`,
              tone: 'success',
            },
            {
              label: 'Rekvizitlar',
              value: `${dossier.ownedCards.length} karta`,
              sub: `${dossier.ownedPhones.length} telefon · ${dossier.ownedIdentifiers.length} raqamli iz`,
              tone: 'info',
            },
          ]}
        />

        {/* Aniqlangan Jinoyatlar / MJTK Tarixi (faqat mavjud bo'lsa chiqadi) */}
        <CitizenDetectedCrimesCard citizenId={cit.id} />

        {/* Ehtimoliy Mosliklar — 1 bosishda tasdiqlash (faqat mavjud bo'lsa chiqadi) */}
        {dossier.probableMatches.length > 0 && (
          <Card className="py-0 gap-0 border-amber-500/40 bg-amber-500/5 overflow-hidden">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>
                  Ehtimoliy mosliklar topildi ({dossier.probableMatches.length} ta — tasdiqlash
                  kutilmoqda)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-2">
              {dossier.probableMatches.map((pm) => (
                <div
                  key={pm.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-amber-500/30 bg-background/80"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigateWithTrail(pm.target_route)}
                        className="font-mono font-bold text-sm text-primary hover:underline cursor-pointer text-left"
                      >
                        {pm.title}
                      </button>
                      <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                        {pm.confidence}% moslik
                      </Badge>
                      {pm.linked_apps_count > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {pm.linked_apps_count} ta ariza · {formatDossierMoney(pm.total_amount)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{pm.reason}</p>
                  </div>

                  {dossier.canMutate && (
                    <Button
                      size="sm"
                      onClick={() => confirmMatchMut.mutate(pm.confirm_action)}
                      disabled={confirmMatchMut.isPending}
                      className="h-8 text-xs gap-1.5 shrink-0 cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Tasdiqlash
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {/* ===================================================================== */}
      {/* 2-BO'LIM: SHU FUQAROGA TEGISHLI BARCHA ARIZALAR                       */}
      {/* ===================================================================== */}
      <section id="sec-apps" className="scroll-mt-20 space-y-4">
        <SectionHeading
          step={2}
          title="Shu fuqaroga tegishli arizalar"
          subtitle="Har bir arizada fuqaroning aniq roli, bogʻlanish sababi va zarar summasi"
          count={dossier.directApplications.length}
          icon={<FileText className="h-4 w-4 text-primary" />}
          action={
            dossier.canMutate ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLinkAppOpen(true)}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Link2 className="h-3.5 w-3.5" />
                Arizaga biriktirish
              </Button>
            ) : undefined
          }
        />

        {hasMultipleRoles && (
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: 'ALL', label: `Barchasi (${roleCounts.all})` },
                ...(roleCounts.victim > 0
                  ? [{ key: 'VICTIM', label: `Jabrlanuvchi (${roleCounts.victim})` }]
                  : []),
                ...(roleCounts.danger > 0
                  ? [{ key: 'DANGER', label: `Firibgar / Dropper (${roleCounts.danger})` }]
                  : []),
                ...(roleCounts.other > 0
                  ? [{ key: 'OTHER', label: `Boshqa (${roleCounts.other})` }]
                  : []),
              ] as { key: AppRoleFilter; label: string }[]
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRoleFilter(opt.key)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  roleFilter === opt.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <Card className="py-0 gap-0 border-border/80 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead>Ariza №</TableHead>
                  <TableHead>Fuqaroning roli</TableHead>
                  <TableHead>Bogʻlanish asosi</TableHead>
                  <TableHead>Tuman</TableHead>
                  <TableHead>Zarar summasi</TableHead>
                  <TableHead>Sana</TableHead>
                  <TableHead className="text-right">Oʻtish</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-xs text-muted-foreground"
                    >
                      Arizalar topilmadi
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApplications.map((app) => {
                    const roleMeta = getRoleMeta(app.role_in_app);
                    return (
                      <TableRow
                        key={app.id}
                        onClick={() => setDrawerTarget({ type: 'application', id: app.id })}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <TableCell className="font-mono font-bold text-primary whitespace-nowrap">
                          № {app.application_number}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[11px] ${roleMeta.badgeClass}`}>
                            {roleMeta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {app.match_reasons.join('; ') || '—'}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {app.district_name || '—'}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs whitespace-nowrap">
                          {app.transfer_amount
                            ? formatDossierMoney(app.transfer_amount, app.currency)
                            : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {formatDossierDate(app.date)}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDrawerTarget({ type: 'application', id: app.id })}
                              className="h-7 w-7 p-0 cursor-pointer"
                              title="Tez koʻrish"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => navigateWithTrail(`/applications/${app.id}`)}
                              className="h-7 w-7 p-0 text-primary cursor-pointer"
                              title="Toʻliq ochish"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Bilvosita 2–3 qadamli zanjirli arizalar */}
        {dossier.multiHopChains.length > 0 && (
          <div className="space-y-2.5 pt-1">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5" />
              Bilvosita (2–3 qadamli) zanjirli arizalar ({dossier.multiHopChains.length})
            </p>
            {dossier.multiHopChains.map((chain, idx) => (
              <Card
                key={idx}
                onClick={() =>
                  setDrawerTarget({ type: 'application', id: chain.target_application.id })
                }
                className="py-0 gap-0 border-amber-500/35 bg-amber-500/[0.03] hover:border-amber-500 cursor-pointer transition-all"
              >
                <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                      {chain.chain_steps.map((step, sIdx) => (
                        <span key={sIdx} className="inline-flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-background border border-border font-semibold break-all">
                            {step}
                          </span>
                          {sIdx < chain.chain_steps.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
                          )}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {chain.target_application.description || 'Izoh kiritilmagan'}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold text-rose-500 shrink-0">
                    {formatDossierMoney(chain.target_application.transfer_amount)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* 3-BO'LIM: KARTALAR -> ICHIDA TRANZAKSIYALAR VA TUSHGAN ARIZALAR       */}
      {/* ===================================================================== */}
      <section id="sec-cards" className="scroll-mt-20 space-y-4">
        <SectionHeading
          step={3}
          title="Fuqaroning kartalari, tranzaksiyalari va tushgan arizalari"
          subtitle="Har bir karta ichida uning kirim-chiqim oʻtkazmalari va bogʻlangan arizalari jamlangan"
          count={dossier.ownedCards.length}
          icon={<CreditCard className="h-4 w-4 text-amber-500" />}
          action={
            dossier.canMutate ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddCardOpen(true)}
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Karta biriktirish
                </Button>
                <Button
                  size="sm"
                  onClick={() => setTransitOpen(true)}
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Vipiska / Oʻtkazma
                </Button>
              </>
            ) : undefined
          }
        />

        <CitizenCardsBreakdown
          cards={dossier.ownedCards}
          transfers={dossier.transfers}
          directApplications={dossier.directApplications}
          canMutate={dossier.canMutate}
          onUnlinkCard={(cardId) => unlinkCardMut.mutate(cardId)}
          onQuickViewCard={(cardId) => setDrawerTarget({ type: 'card', id: cardId })}
          onOpenFullCard={(cardId) => navigateWithTrail(`/cards/${cardId}`)}
          onQuickViewApp={(appId) => setDrawerTarget({ type: 'application', id: appId })}
          onOpenFullApp={(appId) => navigateWithTrail(`/applications/${appId}`)}
        />
      </section>

      {/* ===================================================================== */}
      {/* 4-BO'LIM: TELEFON RAQAMLAR VA RAQAMLI IZLAR                           */}
      {/* ===================================================================== */}
      <section id="sec-clues" className="scroll-mt-20 space-y-4">
        <SectionHeading
          step={4}
          title="Telefon raqamlar va raqamli izlar"
          subtitle="Aloqa raqamlari, Telegram, Instagram, IMEI, IP va kripto-hamyonlar"
          count={dossier.ownedPhones.length + dossier.ownedIdentifiers.length}
          icon={<Fingerprint className="h-4 w-4 text-purple-500" />}
          action={
            dossier.canMutate ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddPhoneOpen(true)}
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Telefon
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddIdentOpen(true)}
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Raqamli iz
                </Button>
              </>
            ) : undefined
          }
        />

        {dossier.ownedPhones.length === 0 && dossier.ownedIdentifiers.length === 0 ? (
          <Card className="border-border/70 bg-muted/20">
            <CardContent className="p-5 text-center text-xs text-muted-foreground">
              Qoʻshimcha telefon raqamlari yoki raqamli izlar kiritilmagan.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Telefonlar */}
            <Card className="py-0 gap-0 border-border/80 bg-card/70 overflow-hidden">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-500" />
                  Telefon raqamlar ({dossier.ownedPhones.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2">
                {dossier.ownedPhones.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Kiritilmagan</p>
                ) : (
                  dossier.ownedPhones.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setDrawerTarget({ type: 'phone', id: p.id })}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border/80 bg-background/70 hover:border-primary/50 cursor-pointer transition-all"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-extrabold text-foreground">
                            {p.formatted_number || formatDossierPhone(p.phone_number)}
                          </span>
                          {p.is_primary && (
                            <Badge variant="secondary" className="text-[10px]">
                              Asosiy
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {p.operator || 'Aloqa'}
                          {p.label ? ` · ${p.label}` : ''}
                        </p>
                      </div>
                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => navigateWithTrail(`/dossier/phone/${p.id}`)}
                          className="h-7 w-7 p-0 text-primary cursor-pointer"
                          title="Toʻliq dosye"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        {dossier.canMutate && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePhoneMut.mutate(p.id)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500 cursor-pointer"
                            title="Oʻchirish"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Raqamli izlar */}
            <Card className="py-0 gap-0 border-border/80 bg-card/70 overflow-hidden">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-purple-500" />
                  Raqamli izlar ({dossier.ownedIdentifiers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2">
                {dossier.ownedIdentifiers.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Kiritilmagan</p>
                ) : (
                  dossier.ownedIdentifiers.map((ident) => (
                    <div
                      key={ident.id}
                      onClick={() => setDrawerTarget({ type: 'identifier', id: ident.id })}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border/80 bg-background/70 hover:border-primary/50 cursor-pointer transition-all"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-extrabold text-foreground break-all">
                          {ident.raw_value}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {ident.type_label || ident.type}
                          {ident.notes ? ` · ${ident.notes}` : ''}
                        </p>
                      </div>
                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => navigateWithTrail(`/dossier/identifier/${ident.id}`)}
                          className="h-7 w-7 p-0 text-primary cursor-pointer"
                          title="Toʻliq dosye"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        {dossier.canMutate && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeIdentMut.mutate(ident.id)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500 cursor-pointer"
                            title="Uzish"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* 5-BO'LIM: GRAFIK SXEMA VA MIKRO-STATISTIKA (YIG'ILGAN HOLDA)          */}
      {/* ===================================================================== */}
      <section id="sec-graph" className="scroll-mt-20 space-y-3">
        <SectionHeading
          step={5}
          title="Grafik sxema, mikro-statistika va dalillar"
          subtitle="Asosiy oʻqishga xalaqit bermasligi uchun yigʻilgan — kerak paytda 1 bosishda ochiladi"
          icon={<GitBranch className="h-4 w-4 text-primary" />}
        />

        <CollapsibleInsightPanel
          title="Interaktiv bogʻliqliklar va pul oqimi grafigi"
          subtitle="Fuqaro, kartalar, telefonlar va bogʻlangan arizalar vizual xaritada"
          icon={<GitBranch className="h-4 w-4" />}
          badgeText={`${dossier.networkGraph?.nodes.length || 0} ta tugun`}
          defaultOpen={false}
        >
          <EntityNetworkGraph
            networkGraph={dossier.networkGraph}
            financialGraph={dossier.financialGraph}
            defaultMode="network"
          />
        </CollapsibleInsightPanel>

        <CollapsibleInsightPanel
          title="Mikro-statistika, birga uchragan rekvizitlar va chek/dalil fayllar"
          subtitle="Soatbay faollik, tumanlar kesimi, toʻlov provayderlari va biriktirilgan cheklar"
          icon={<Sparkles className="h-4 w-4" />}
          badgeText={`${dossier.coOccurringClues.length} rekvizit · ${dossier.evidenceFiles.length} fayl`}
          defaultOpen={false}
        >
          <DossierAnalyticsSection
            stats={dossier.stats}
            coOccurringClues={dossier.coOccurringClues}
            evidenceFiles={dossier.evidenceFiles}
          />
        </CollapsibleInsightPanel>
      </section>

      {/* Tezkor Yon Oyna */}
      <DossierQuickDrawer
        target={drawerTarget}
        onClose={() => setDrawerTarget(null)}
        trail={breadcrumbs}
      />

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
                    № {a.application_number || 'Raqamsiz'} — {a.citizen?.full_name?.trim() || ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Arizadagi roli *</label>
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
