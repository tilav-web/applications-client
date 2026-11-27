import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  Fingerprint,
  Gavel,
  GitBranch,
  Link2,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { EntityNetworkGraph } from '@/components/graph/entity-network-graph';
import { CitizenCardsBreakdown } from '@/components/intelligence/citizen-cards-breakdown';
import {
  DossierQuickDrawer,
  type QuickDrawerTarget,
} from '@/components/intelligence/dossier-quick-drawer';
import {
  CompactDangerAlert,
  DossierTopBar,
  InlineRoleBadge,
  SectionTitle,
} from '@/components/intelligence/dossier-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { applicationsApi, intelligenceApi } from '@/lib/api';
import {
  buildCitizenVerdict,
  extractSuspectCluesFromTree,
  formatDossierCard,
  formatDossierDate,
  formatDossierMoney,
  formatDossierPhone,
  getRoleMeta,
  normalizeClueValue,
  useDossierTrail,
} from '@/lib/dossier-navigation';
import { getErrorMessage } from '@/lib/error';
import type {
  ApplicantRepeatApplicationItem,
  CardRelationItem,
  CitizenRelationItem,
  DetectedCrimeLinkItem,
  LinkedApplicationInfo,
  ProbableMatchItem,
  Transfer,
  UnifiedLinkedApplication,
} from '@/types/models';

const renderStatusBadge = (label: string, color?: string | null) => {
  const c = (color || '').toLowerCase();
  if (c.includes('amber') || c.includes('yellow') || label === 'JARAYONDA') {
    return (
      <Badge className="bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[11px]">
        {label}
      </Badge>
    );
  }
  if (c.includes('emerald') || c.includes('green') || label === 'HAL_QILINDI') {
    return (
      <Badge className="bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[11px]">
        {label}
      </Badge>
    );
  }
  if (c.includes('red') || c.includes('rose') || label === 'RAD_ETILDI') {
    return (
      <Badge className="bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[11px]">
        {label}
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[11px]">
      {label}
    </Badge>
  );
};

const DESTINATION_TYPE_LABELS: Record<string, string> = {
  CARD: 'Plastik karta',
  CRYPTO: 'Kripto / Birja',
  PLATFORM: 'Onlayn servis',
  BANK_ACCOUNT: 'Bank hisob raqami',
  CASH: 'Naqd / ATM',
  OTHER: 'Boshqa kanal',
};

const NON_LINKABLE_LABELS = new Set([
  'telegram_bio',
  'other_info',
  'telegram bio',
  'boshqa maʼlumot',
]);

interface UnifiedClueItem {
  key: string;
  id?: string;
  entityType?: 'phone' | 'identifier';
  label: string;
  value: string;
  normalized: string;
  operator?: string | null;
  role: string;
  isNonLinkable?: boolean;
  ownerCitizen?: { id: string; full_name: string } | null;
  linkedApps: {
    id: string;
    application_number: string;
    citizen_name?: string | null;
    transfer_amount?: number | null;
    currency?: string;
    date?: string | null;
  }[];
}

export function ApplicationRelationsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('applications');
  const [drawerTarget, setDrawerTarget] = useState<QuickDrawerTarget | null>(null);
  const [showApplicantRepeats, setShowApplicantRepeats] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['application-relations', id],
    queryFn: () => applicationsApi.getRelations(id!),
    enabled: !!id,
  });

  const confirmMatchMutation = useMutation({
    mutationFn: (payload: { citizen_id: string; card_id: string }) =>
      intelligenceApi.confirmProbableMatch(payload),
    onSuccess: async () => {
      toast.success('Karta fuqaroga muvaffaqiyatli bogʻlandi va bogʻliqliklar yangilandi');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['application-relations', id] }),
        queryClient.invalidateQueries({ queryKey: ['applications'] }),
      ]);
    },
    onError: (err) => {
      toast.error('Bogʻlashda xatolik yuz berdi', { description: getErrorMessage(err) });
    },
  });

  const app = data?.application;
  const primaryCitizenId = app?.citizen?.id;

  const { data: primaryCitizenDossier } = useQuery({
    queryKey: ['citizen-dossier', primaryCitizenId],
    queryFn: () => intelligenceApi.getCitizenDossier(primaryCitizenId!),
    enabled: Boolean(primaryCitizenId),
  });

  const currentTrailItem = useMemo(
    () => ({
      label: `Bogʻliqliklar · № ${app?.application_number || '...'}`,
      to: `/applications/${id}/relations`,
      kind: 'relations' as const,
    }),
    [app?.application_number, id],
  );

  const fallbackRoot = useMemo(
    () => ({
      label: 'Arizalar roʻyxati',
      to: '/applications',
      kind: 'applications' as const,
    }),
    [],
  );

  const { breadcrumbs, previousItem, navigateWithTrail, goBack, goToBreadcrumb } = useDossierTrail(
    fallbackRoot,
    currentTrailItem,
  );

  const stats = data?.stats;

  // Firibgar-markazli bog'langan arizalar (backend unified list)
  const linkedApplications = useMemo<UnifiedLinkedApplication[]>(
    () => data?.linked_applications || [],
    [data?.linked_applications],
  );

  // Arizachining o'z avvalgi murojaatlari (takroriylik — firibgar bog'liqligidan alohida)
  const applicantRepeatApps = useMemo<ApplicantRepeatApplicationItem[]>(
    () => data?.applicant_repeat_applications || [],
    [data?.applicant_repeat_applications],
  );

  // Aniqlangan jinoyatlar kesishmalari
  const detectedCrimes = useMemo<DetectedCrimeLinkItem[]>(
    () => data?.detected_crime_relations || [],
    [data?.detected_crime_relations],
  );

  // Ehtimoliy karta-egasi mosliklari
  const probableMatches = useMemo<ProbableMatchItem[]>(
    () => data?.probable_matches || [],
    [data?.probable_matches],
  );

  // Joriy arizaning barcha o'tkazmalari
  const currentTransfers = useMemo<Transfer[]>(() => {
    if (Array.isArray(app?.transfers) && app.transfers.length > 0) return app.transfers;
    if (app?.transfer) return [app.transfer];
    return [];
  }, [app]);

  // Kartalarni tartiblash: firibgar/qabul qiluvchi/gumonlanuvchi kartalar eng tepada
  const cardRelations = useMemo(() => {
    const list = [...(data?.card_relations || [])];
    list.sort((a, b) => {
      const score = (role: string) =>
        role === 'RECEIVER' || role === 'SUSPECT' ? 3 : role === 'TRANSIT' ? 2 : 1;
      const diff = score(b.role_in_current_app) - score(a.role_in_current_app);
      if (diff !== 0) return diff;
      return b.linked_applications.length - a.linked_applications.length;
    });
    return list;
  }, [data?.card_relations]);

  const citizenRelations = useMemo<CitizenRelationItem[]>(
    () => data?.citizen_relations || [],
    [data?.citizen_relations],
  );

  const multiHopChains = useMemo(() => data?.multi_hop_chains || [], [data?.multi_hop_chains]);

  // Gumonlanuvchi belgilari (telefon, Telegram, kripto, sayt va b.) dublikatsiz birlashtirish
  const { unifiedClues, repeatedTokens } = useMemo(() => {
    const map = new Map<string, UnifiedClueItem>();
    const repeated = new Set<string>();

    const upsert = (item: UnifiedClueItem) => {
      const existing = map.get(item.normalized);
      if (!existing) {
        map.set(item.normalized, {
          ...item,
          linkedApps: [...item.linkedApps],
        });
      } else {
        if (!existing.id && item.id) {
          existing.id = item.id;
          existing.entityType = item.entityType;
        }
        if (!existing.ownerCitizen && item.ownerCitizen) {
          existing.ownerCitizen = item.ownerCitizen;
        }
        if (item.role === 'SUSPECT' || item.role === 'DROPPER') existing.role = item.role;
        const seenIds = new Set(existing.linkedApps.map((a) => a.id));
        for (const la of item.linkedApps) {
          if (!seenIds.has(la.id)) {
            existing.linkedApps.push(la);
            seenIds.add(la.id);
          }
        }
      }
      if (item.linkedApps.length > 0 && item.normalized) {
        repeated.add(item.normalized);
      }
    };

    // 1. Intelligence synced fraudster/cross-role clues (phone & digital identifiers)
    for (const cl of data?.clue_relations || []) {
      const norm = normalizeClueValue(cl.value);
      if (!norm) continue;
      upsert({
        key: `${cl.entity_type}-${cl.id}`,
        id: cl.id,
        entityType: cl.entity_type,
        label: cl.label,
        value: cl.value,
        normalized: norm,
        operator: cl.operator,
        role: cl.role_in_current_app,
        ownerCitizen: cl.owner_citizen,
        linkedApps: cl.linked_applications.map((la) => ({
          id: la.id,
          application_number: la.application_number,
          citizen_name: la.victim_name,
          transfer_amount: la.transfer_amount,
          currency: la.currency,
          date: la.date,
        })),
      });
    }

    // 2. Suspect tree matched relations
    for (const sr of data?.suspect_relations || []) {
      const norm = normalizeClueValue(sr.value);
      if (!norm) continue;
      upsert({
        key: `suspect-${sr.field_path}-${norm}`,
        label: sr.field_path || 'Gumonlanuvchi belgisi',
        value: sr.value,
        normalized: norm,
        role: 'SUSPECT',
        linkedApps: sr.linked_applications.map((la) => ({
          id: la.id,
          application_number: la.application_number,
          citizen_name: la.citizen_name,
          transfer_amount: la.transfer_amount,
          currency: la.currency,
          date: la.date,
        })),
      });
    }

    // 3. Current app's raw suspect_tree clues (even if 0 other matches yet)
    for (const tc of extractSuspectCluesFromTree(data?.application?.suspect_tree)) {
      const pathLower = (tc.path || '').toLowerCase();
      const isNonLinkable =
        NON_LINKABLE_LABELS.has(pathLower) ||
        pathLower.includes('bio') ||
        pathLower.includes('izoh');
      upsert({
        key: `tree-${tc.path}-${tc.normalized}`,
        label: tc.path,
        value: tc.value,
        normalized: tc.normalized,
        role: 'SUSPECT',
        isNonLinkable,
        linkedApps: [],
      });
    }

    const list = Array.from(map.values()).sort((a, b) => {
      if (b.linkedApps.length !== a.linkedApps.length) {
        return b.linkedApps.length - a.linkedApps.length;
      }
      const aSus = a.role === 'SUSPECT' || a.role === 'DROPPER' ? 1 : 0;
      const bSus = b.role === 'SUSPECT' || b.role === 'DROPPER' ? 1 : 0;
      return bSus - aSus;
    });

    return { unifiedClues: list, repeatedTokens: repeated };
  }, [data?.clue_relations, data?.suspect_relations, data?.application?.suspect_tree]);

  // "Nima sababdan firibgar bog'liqligi chiqdi?" — eng yuqoridagi 1-qatorli aniq sabablar
  const matchReasonsSummary = useMemo(() => {
    const items: {
      key: string;
      text: string;
      danger?: boolean;
      targetTab: string;
    }[] = [];

    if (detectedCrimes.length > 0) {
      items.push({
        key: 'detected-crimes',
        text: `Aniqlangan jinoyat ishi → ${detectedCrimes.length} ta kesishma`,
        danger: true,
        targetTab: 'applications',
      });
    }

    for (const cr of cardRelations) {
      const isFraudRole =
        cr.role_in_current_app === 'RECEIVER' ||
        cr.role_in_current_app === 'SUSPECT' ||
        cr.role_in_current_app === 'TRANSIT';
      const n = cr.linked_applications.length;
      const prefix =
        cr.role_in_current_app === 'RECEIVER' || cr.role_in_current_app === 'SUSPECT'
          ? 'Firibgar/Dropper kartasi'
          : cr.role_in_current_app === 'TRANSIT'
            ? 'Tranzit karta'
            : 'Karta rol toʻqnashuvi';
      items.push({
        key: `card-${cr.card.id}`,
        text: `${prefix} ${formatDossierCard(cr.card.card_number, cr.card.masked_number)} → yana ${n} ta ariza`,
        danger: isFraudRole || cr.linked_applications.some((la) => la.is_cross_role),
        targetTab: 'cards',
      });
    }

    for (const citR of citizenRelations) {
      const n = citR.linked_applications.length;
      const roleMeta = getRoleMeta(citR.role_in_current_app);
      const isCross = Boolean(
        citR.is_cross_role || citR.linked_applications.some((la) => la.is_cross_role),
      );
      const label = isCross
        ? `Rol toʻqnashuvi (${citR.citizen.full_name?.trim() || 'Fuqaro'})`
        : `${roleMeta.shortLabel} (${citR.citizen.full_name?.trim() || 'Fuqaro'})`;
      items.push({
        key: `cit-${citR.citizen.id}`,
        text: `${label} → yana ${n} ta ariza`,
        danger: isCross || roleMeta.isDanger,
        targetTab: 'applications',
      });
    }

    for (const cl of unifiedClues) {
      if (cl.linkedApps.length > 0) {
        const n = cl.linkedApps.length;
        items.push({
          key: `clue-${cl.key}`,
          text: `${cl.label}: ${cl.value} → yana ${n} ta ariza`,
          danger: true,
          targetTab: 'clues',
        });
      }
    }

    if (multiHopChains.length > 0) {
      items.push({
        key: 'multihop',
        text: `Bilvosita firibgar zanjiri → ${multiHopChains.length} ta ariza`,
        danger: true,
        targetTab: 'applications',
      });
    }

    if (probableMatches.length > 0) {
      items.push({
        key: 'probable',
        text: `Ehtimoliy karta-egasi mosligi → ${probableMatches.length} ta`,
        danger: false,
        targetTab: 'applications',
      });
    }

    return items;
  }, [
    detectedCrimes.length,
    cardRelations,
    citizenRelations,
    unifiedClues,
    multiHopChains.length,
    probableMatches.length,
  ]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">
          Firibgar bogʻliqliklari tahlil qilinmoqda...
        </p>
      </div>
    );
  }

  if (isError || !data || !app) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <DossierTopBar
          breadcrumbs={breadcrumbs}
          backLabel={previousItem.label}
          onBack={goBack}
          onBreadcrumbClick={goToBreadcrumb}
        />
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-6 text-center space-y-3">
            <AlertTriangle className="h-9 w-9 text-red-500 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {(error as Error)?.message || 'Bogʻliqliklarni yuklab boʻlmadi.'}
            </p>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" /> Qayta urinish
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const citizen = primaryCitizenDossier?.citizen || app.citizen;
  const citizenFullName = citizen?.full_name?.trim() || 'Fuqaro koʻrsatilmagan';
  const primaryVerdict = primaryCitizenDossier
    ? buildCitizenVerdict(primaryCitizenDossier.stats)
    : null;

  const hasCrossRoleCollision = Boolean(
    stats?.has_cross_role_collision || primaryCitizenDossier?.stats.isCrossRoleCollision,
  );
  const totalFraudTabCount =
    linkedApplications.length + multiHopChains.length + detectedCrimes.length;

  const ownedCards = primaryCitizenDossier?.ownedCards || [];
  const ownedPhones = primaryCitizenDossier?.ownedPhones || [];
  const ownedIdentifiers = primaryCitizenDossier?.ownedIdentifiers || [];
  const cardsTabCount = Math.max(cardRelations.length, currentTransfers.length);
  const financialNodesCount = data.graph?.nodes?.length || 0;
  const repeatedCluesCount = unifiedClues.filter((c) => c.linkedApps.length > 0).length;

  return (
    <div className="w-full space-y-4 pb-12">
      {/* 1. Yagona ixcham qatorli header */}
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
              className="h-8 gap-1.5 cursor-pointer text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Yangilash</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWithTrail(`/applications/${app.id}`)}
              className="h-8 gap-1.5 cursor-pointer text-xs"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Arizani ochish</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => navigateWithTrail(`/applications/edit/${app.id}`)}
              className="h-8 gap-1.5 cursor-pointer text-xs"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Tahrirlash</span>
            </Button>
          </>
        }
      />

      {/* Ustuvor xavf ogohlantirishlari (faqat firibgar, rol to'qnashuvi yoki jinoyat ishi!) */}
      {hasCrossRoleCollision && (
        <CompactDangerAlert
          title="Ikki tomonlama rol toʻqnashuvi (Jabrlanuvchi ↔ Firibgar / Dropper)"
          message="Ushbu arizadagi shaxs, karta yoki telefon raqami bir arizada Jabrlanuvchi, boshqa arizada esa Firibgar / Dropper sifatida qayd etilgan."
        />
      )}
      {detectedCrimes.length > 0 && (
        <CompactDangerAlert
          title={`Aniqlangan jinoyat ishi bilan kesishma (${detectedCrimes.length} ta)`}
          message="Mazkur arizadagi firibgar kartasi, telefon raqami yoki raqamli izi allaqachon fosh etilgan jinoyat ishida ashyoviy dalil yoki gumonlanuvchi sifatida qayd etilgan."
        />
      )}
      {stats?.has_fraud_card_link && (
        <CompactDangerAlert
          title="Takroriy firibgar / dropper kartasi yoki raqamli izi aniqlandi"
          message="Ushbu arizadagi qabul qiluvchi karta, gumonlanuvchi telefoni yoki raqamli izi boshqa jabrlanuvchilarning arizalarida ham qayd etilgan."
        />
      )}

      {/* 2. Joriy ariza + Nima bog'landi? + Arizachi ma'lumotlari */}
      <Card className="py-0 gap-0 border-border/80 bg-card overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* A. Joriy ariza sarlavhasi */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/60">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-base sm:text-lg font-extrabold text-foreground">
                  № {app.application_number || 'Raqamsiz'}
                </span>
                {renderStatusBadge(
                  app.application_status?.name || app.status || 'YANGI',
                  app.application_status?.color,
                )}
                <span className="text-xs text-muted-foreground font-mono inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDossierDate(app.date)}
                </span>
              </div>
              {app.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{app.description}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0 text-xs">
              {(stats?.total_linked_loss ?? 0) > 0 && (
                <div className="text-right">
                  <span className="text-[10px] uppercase text-muted-foreground block">
                    Bogʻliq arizalar zarari
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                    {formatDossierMoney(stats?.total_linked_loss)}
                  </span>
                </div>
              )}
              {(stats?.grand_total_loss ?? 0) > 0 && (
                <div className="text-right">
                  <span className="text-[10px] uppercase text-muted-foreground block">
                    Umumiy zanjir zarari
                  </span>
                  <span className="font-mono text-sm font-extrabold text-rose-600 dark:text-rose-400">
                    {formatDossierMoney(stats?.grand_total_loss)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* B. Firibgar bog'liqligi sabablari */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-primary" />
              Topilgan firibgar bogʻliqliklari ({stats?.total_linked_applications ?? 0} ta boshqa
              ariza
              {detectedCrimes.length > 0 ? ` · ${detectedCrimes.length} ta jinoyat` : ''})
            </span>
            {matchReasonsSummary.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {matchReasonsSummary.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setActiveTab(m.targetTab)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                      m.danger
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/35 hover:bg-rose-500/15'
                        : 'bg-blue-500/8 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/15'
                    }`}
                  >
                    <span>{m.text}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Boshqa arizalardagi firibgar kartasi, telefon raqami yoki raqamli izlar bilan
                kesishma topilmadi.
              </p>
            )}
          </div>

          {/* C. Arizachi (Jabrlanuvchi) qisqa profili */}
          {citizen && (
            <div className="pt-3 border-t border-border/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <User className="h-4 w-4 text-primary shrink-0" />
                    <button
                      type="button"
                      onClick={() => navigateWithTrail(`/citizens/${citizen.id}`)}
                      className="text-base font-extrabold text-foreground hover:text-primary hover:underline text-left cursor-pointer"
                    >
                      {citizenFullName}
                    </button>
                    {primaryVerdict && <InlineRoleBadge verdict={primaryVerdict} />}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                    {citizen.phone_number && (
                      <span className="text-foreground font-semibold">
                        {formatDossierPhone(citizen.phone_number)}
                      </span>
                    )}
                    {citizen.passport && (
                      <span>
                        Pasport: <strong className="text-foreground">{citizen.passport}</strong>
                      </span>
                    )}
                    {citizen.pinfl && (
                      <span>
                        JSHSHIR: <strong className="text-foreground">{citizen.pinfl}</strong>
                      </span>
                    )}
                    {(citizen.district?.name || citizen.neighborhood?.name || citizen.address) && (
                      <span className="inline-flex items-center gap-1 font-sans">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {[citizen.district?.name, citizen.neighborhood?.name, citizen.address]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWithTrail(`/citizens/${citizen.id}`)}
                  className="h-7 px-2.5 text-xs gap-1 shrink-0 cursor-pointer self-start sm:self-center"
                >
                  <span>Fuqaro dosyesi</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>

              {(ownedPhones.length > 0 || ownedCards.length > 0 || ownedIdentifiers.length > 0) && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {ownedPhones.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setDrawerTarget({ type: 'phone', id: p.id })}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-muted/30 hover:border-primary font-mono text-xs cursor-pointer"
                    >
                      <Phone className="h-3 w-3 text-emerald-600" />
                      <span>{p.formatted_number || formatDossierPhone(p.phone_number)}</span>
                      {p.operator && (
                        <span className="text-[10px] text-muted-foreground font-sans">
                          · {p.operator}
                        </span>
                      )}
                    </button>
                  ))}
                  {ownedCards.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setDrawerTarget({ type: 'card', id: c.id })}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-muted/30 hover:border-primary font-mono text-xs cursor-pointer"
                    >
                      <CreditCard className="h-3 w-3 text-amber-600" />
                      <span>{formatDossierCard(c.card_number, c.masked_number)}</span>
                      {c.bank?.name && (
                        <span className="text-[10px] text-muted-foreground font-sans">
                          · {c.bank.name}
                        </span>
                      )}
                    </button>
                  ))}
                  {ownedIdentifiers.map((ident) => (
                    <button
                      key={ident.id}
                      type="button"
                      onClick={() => setDrawerTarget({ type: 'identifier', id: ident.id })}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-muted/30 hover:border-primary font-mono text-xs cursor-pointer"
                    >
                      <Fingerprint className="h-3 w-3 text-purple-600" />
                      <span>{ident.raw_value}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. 4 ta toza tahliliy tab */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 w-full justify-start">
          <TabsTrigger value="applications" className="text-xs gap-1.5 cursor-pointer">
            <FileText className="h-3.5 w-3.5" />
            <span>Firibgar bogʻliqliklari</span>
            <Badge
              variant={totalFraudTabCount > 0 ? 'destructive' : 'secondary'}
              className="text-[10px] px-1.5 py-0 font-mono"
            >
              {totalFraudTabCount}
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="cards" className="text-xs gap-1.5 cursor-pointer">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Dropper kartalar va Oʻtkazmalar</span>
            <Badge
              variant={stats?.has_fraud_card_link ? 'destructive' : 'secondary'}
              className="text-[10px] px-1.5 py-0 font-mono"
            >
              {cardsTabCount}
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="clues" className="text-xs gap-1.5 cursor-pointer">
            <Fingerprint className="h-3.5 w-3.5" />
            <span>Gumonlanuvchi belgilari</span>
            <Badge
              variant={repeatedCluesCount > 0 ? 'destructive' : 'secondary'}
              className="text-[10px] px-1.5 py-0 font-mono"
            >
              {unifiedClues.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="flow" className="text-xs gap-1.5 cursor-pointer">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Moliyaviy Pul Oqimi</span>
            {financialNodesCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                {financialNodesCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: FIRIBGAR-MARKAZLI BOG'LIQ ARIZALAR, JINOYATLAR, ZANJIRLAR */}
        <TabsContent value="applications" className="space-y-4 mt-0">
          <SectionTitle
            title="Firibgar / Dropper izi orqali bogʻlangan arizalar"
            count={linkedApplications.length}
            subtitle="Faqat firibgar/dropper kartasi, gumonlanuvchi telefoni, Telegram/kripto izi yoki rol toʻqnashuvi boʻyicha mos kelgan boshqa arizalar"
          />

          <Card className="py-0 gap-0 border-border/80 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead>Ariza №</TableHead>
                    <TableHead>Jabrlanuvchi (Arizachi)</TableHead>
                    <TableHead>Bogʻlanish sababi</TableHead>
                    <TableHead>U yerdagi rol</TableHead>
                    <TableHead>Zarar summasi</TableHead>
                    <TableHead>Holati</TableHead>
                    <TableHead>Sana</TableHead>
                    <TableHead className="text-right">Oʻtish</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkedApplications.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-xs text-muted-foreground"
                      >
                        Ushbu arizadagi firibgar kartasi, telefon raqami yoki raqamli izlari boshqa
                        arizalarda topilmadi.
                      </TableCell>
                    </TableRow>
                  ) : (
                    linkedApplications.map((item) => {
                      const roleMeta = getRoleMeta(item.role_in_that_app);
                      return (
                        <TableRow
                          key={item.id}
                          onClick={() => setDrawerTarget({ type: 'application', id: item.id })}
                          className={`cursor-pointer hover:bg-muted/40 transition-colors text-xs ${
                            item.is_cross_role ? 'bg-rose-500/[0.04]' : ''
                          }`}
                        >
                          <TableCell className="whitespace-nowrap">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 font-mono font-bold text-primary">
                                <span>№ {item.application_number}</span>
                                {item.is_cross_role && (
                                  <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35 text-[9px] px-1 py-0">
                                    Rol toʻqnashuvi
                                  </Badge>
                                )}
                              </div>
                              {(item.district_name || item.crime_article) && (
                                <p className="text-[10px] text-muted-foreground">
                                  {[item.district_name, item.crime_article]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold text-foreground">
                              {item.citizen_name || '—'}
                            </p>
                            {item.citizen_phone && (
                              <p className="text-[11px] font-mono text-muted-foreground">
                                {formatDossierPhone(item.citizen_phone)}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="max-w-sm">
                            <div className="flex flex-wrap gap-1">
                              {item.match_reasons.map((mr, mIdx) => (
                                <span
                                  key={`${mr.kind}-${mr.value}-${mIdx}`}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                    mr.danger || mr.is_cross_role
                                      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                  }`}
                                >
                                  <span>{mr.label}:</span>
                                  <span className="font-mono break-all">{mr.value}</span>
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[11px] ${roleMeta.badgeClass}`}>
                              {roleMeta.shortLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            {item.transfer_amount
                              ? formatDossierMoney(item.transfer_amount, item.currency)
                              : '—'}
                          </TableCell>
                          <TableCell>
                            {renderStatusBadge(
                              item.status_label || item.status || 'YANGI',
                              item.status_color,
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                            {formatDossierDate(item.date)}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setDrawerTarget({ type: 'application', id: item.id })
                                }
                                className="h-7 w-7 p-0 cursor-pointer"
                                title="Tez koʻrish"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => navigateWithTrail(`/applications/${item.id}`)}
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

          {/* Aniqlangan jinoyatlar bilan kesishmalar */}
          {detectedCrimes.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <SectionTitle
                title="Aniqlangan jinoyatlar bilan kesishmalar"
                count={detectedCrimes.length}
                icon={<Gavel className="h-4 w-4 text-rose-500" />}
                subtitle="Ushbu arizadagi firibgar belgilari quyidagi fosh etilgan jinoyat ishlarida qayd etilgan"
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {detectedCrimes.map((dc) => (
                  <Card
                    key={dc.id}
                    onClick={() =>
                      navigateWithTrail(dc.target_route || `/detected-crimes/${dc.id}`)
                    }
                    className="py-0 gap-0 border-l-4 border-l-rose-600 border-border/80 hover:bg-rose-500/[0.04] cursor-pointer transition-colors"
                  >
                    <CardContent className="p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {dc.case_number && (
                              <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35 font-mono text-[10px]">
                                № {dc.case_number}
                              </Badge>
                            )}
                            {dc.crime_article && (
                              <Badge variant="outline" className="text-[10px]">
                                {dc.crime_article}
                              </Badge>
                            )}
                            {dc.status_label && (
                              <Badge variant="secondary" className="text-[10px]">
                                {dc.status_label}
                              </Badge>
                            )}
                          </div>
                          <p className="font-bold text-sm text-foreground">{dc.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {[dc.district_name, formatDossierDate(dc.detected_at)]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      </div>
                      {dc.matched_by.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1 border-t border-border/60">
                          {dc.matched_by.map((m, idx) => (
                            <Badge
                              key={idx}
                              className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px]"
                            >
                              {m}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Ehtimoliy mosliklar (1-bosishda tasdiqlash) */}
          {probableMatches.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <SectionTitle
                title="Ehtimoliy karta-egasi mosliklari (Tizim taklifi)"
                count={probableMatches.length}
                icon={<Sparkles className="h-4 w-4 text-indigo-500" />}
                subtitle="Dropper kartadagi F.I.SH. bazadagi fuqaro bilan mos keldi — tasdiqlasangiz karta profilga bogʻlanadi"
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {probableMatches.map((pm) => (
                  <Card
                    key={pm.id}
                    className="py-0 gap-0 border-l-4 border-l-indigo-500 border-border/80 bg-card"
                  >
                    <CardContent className="p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-mono text-[10px]">
                              Ishonchlilik: {pm.confidence}%
                            </Badge>
                            {pm.linked_apps_count > 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                {pm.linked_apps_count} ta ariza
                              </Badge>
                            )}
                          </div>
                          <p className="font-bold text-xs sm:text-sm text-foreground">{pm.title}</p>
                          <p className="text-[11px] font-mono text-muted-foreground">
                            {pm.subtitle}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{pm.reason}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => navigateWithTrail(pm.target_route)}
                          className="h-7 text-xs gap-1 cursor-pointer"
                        >
                          <Eye className="h-3 w-3" /> Koʻrish
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={confirmMatchMutation.isPending}
                          onClick={() =>
                            confirmMatchMutation.mutate({
                              citizen_id: pm.confirm_action.citizen_id,
                              card_id: pm.confirm_action.card_id,
                            })
                          }
                          className="h-7 text-xs gap-1 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Tasdiqlash va bogʻlash</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Bilvosita 2–3 qadamli firibgar zanjirlari */}
          {multiHopChains.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <SectionTitle
                title="Bilvosita (2–3 qadamli) firibgar zanjirlari"
                count={multiHopChains.length}
                icon={<GitBranch className="h-4 w-4 text-amber-500" />}
                subtitle="Dropper/gumonlanuvchi shaxs, uning boshqa kartalari, tranzit oʻtkazmalari yoki raqamli izlari orqali bogʻlangan zanjir"
              />
              {multiHopChains.map((chain, idx) => (
                <Card
                  key={`${chain.target_application.id}-${idx}`}
                  onClick={() =>
                    setDrawerTarget({ type: 'application', id: chain.target_application.id })
                  }
                  className="py-0 gap-0 border-l-4 border-l-amber-500 border-border/80 hover:bg-muted/20 cursor-pointer transition-colors"
                >
                  <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                        {chain.chain_steps.map((step, sIdx) => (
                          <span key={sIdx} className="inline-flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-muted border border-border font-semibold break-all">
                              {step}
                            </span>
                            {sIdx < chain.chain_steps.length - 1 && (
                              <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
                            )}
                          </span>
                        ))}
                      </div>
                      {chain.target_application.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {chain.target_application.description}
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-xs font-bold text-rose-500 shrink-0">
                      {formatDossierMoney(chain.target_application.transfer_amount)}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Gumonlanuvchi / Rol to'qnashuvi shaxslar */}
          {citizenRelations.length > 0 && (
            <div className="space-y-3 pt-1">
              <SectionTitle
                title="Aloqador gumonlanuvchi va rol toʻqnashuvi shaxslar"
                count={citizenRelations.length}
                icon={<Users className="h-4 w-4 text-rose-500" />}
              />
              {citizenRelations.map((citR: CitizenRelationItem) => {
                const roleMeta = getRoleMeta(citR.role_in_current_app);
                return (
                  <Card
                    key={citR.citizen.id}
                    className="py-0 gap-0 border-l-4 border-l-rose-500 border-border/80 overflow-hidden"
                  >
                    <CardHeader className="px-4 py-3 bg-muted/25 border-b flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigateWithTrail(`/citizens/${citR.citizen.id}`)}
                            className="font-bold text-sm text-foreground hover:text-primary hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{citR.citizen.full_name?.trim() || 'Fuqaro'}</span>
                            <ExternalLink className="h-3 w-3 text-primary" />
                          </button>
                          <Badge className={`text-[10px] ${roleMeta.badgeClass}`}>
                            {roleMeta.shortLabel}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono mt-0.5">
                          {citR.citizen.phone_number && (
                            <span>{formatDossierPhone(citR.citizen.phone_number)}</span>
                          )}
                          {citR.citizen.passport && <span>Pasport: {citR.citizen.passport}</span>}
                          {citR.citizen.pinfl && <span>JSHSHIR: {citR.citizen.pinfl}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {citR.match_reasons.map((r, i) => (
                          <Badge key={i} variant="secondary" className="text-[11px]">
                            {r}
                          </Badge>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDrawerTarget({ type: 'citizen', id: citR.citizen.id })}
                          className="h-7 text-xs gap-1 cursor-pointer"
                        >
                          <Eye className="h-3 w-3" /> Koʻrish
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                      <Table>
                        <TableBody>
                          {citR.linked_applications.map((la: LinkedApplicationInfo) => {
                            const laRole = getRoleMeta(la.role_in_that_app);
                            return (
                              <TableRow
                                key={la.id}
                                onClick={() => setDrawerTarget({ type: 'application', id: la.id })}
                                className="hover:bg-muted/30 cursor-pointer text-xs"
                              >
                                <TableCell className="font-mono font-bold text-primary whitespace-nowrap">
                                  № {la.application_number}
                                </TableCell>
                                <TableCell>
                                  <Badge className={`text-[10px] ${laRole.badgeClass}`}>
                                    {laRole.shortLabel}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-md truncate">
                                  {la.description || '—'}
                                </TableCell>
                                <TableCell className="font-mono font-bold text-rose-500 whitespace-nowrap">
                                  {formatDossierMoney(la.transfer_amount, la.currency)}
                                </TableCell>
                                <TableCell>
                                  {renderStatusBadge(la.status_label, la.status_color)}
                                </TableCell>
                                <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                                  {formatDossierDate(la.date)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Arizachining o'z avvalgi murojaatlari — alohida neytral yig'iladigan blok */}
          {applicantRepeatApps.length > 0 && (
            <Card className="py-0 gap-0 border-dashed border-border/80 bg-muted/15 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowApplicantRepeats((v) => !v)}
                className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      Arizachining oʻz avvalgi murojaatlari ({applicantRepeatApps.length} ta)
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Bu fuqaroning jabrlanuvchi sifatidagi takroriy murojaatlari — firibgar
                      bogʻliqliklari hisobiga kiritilmaydi
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <span>{showApplicantRepeats ? 'Yashirish' : 'Koʻrish'}</span>
                  {showApplicantRepeats ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              </button>

              {showApplicantRepeats && (
                <div className="border-t border-border/60 overflow-x-auto bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/15">
                        <TableHead>Ariza №</TableHead>
                        <TableHead>Hudud / Modda</TableHead>
                        <TableHead>Zarar summasi</TableHead>
                        <TableHead>Holati</TableHead>
                        <TableHead>Sana</TableHead>
                        <TableHead className="text-right">Oʻtish</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applicantRepeatApps.map((ra) => (
                        <TableRow
                          key={ra.id}
                          onClick={() => setDrawerTarget({ type: 'application', id: ra.id })}
                          className="hover:bg-muted/30 cursor-pointer text-xs"
                        >
                          <TableCell className="font-mono font-bold text-primary whitespace-nowrap">
                            № {ra.application_number}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {[ra.district_name, ra.crime_article].filter(Boolean).join(' · ') ||
                              '—'}
                          </TableCell>
                          <TableCell className="font-mono font-semibold whitespace-nowrap">
                            {ra.transfer_amount
                              ? formatDossierMoney(ra.transfer_amount, ra.currency)
                              : '—'}
                          </TableCell>
                          <TableCell>
                            {renderStatusBadge(
                              ra.status_label || ra.status || 'YANGI',
                              ra.status_color,
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                            {formatDossierDate(ra.date)}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => navigateWithTrail(`/applications/${ra.id}`)}
                              className="h-7 w-7 p-0 text-primary cursor-pointer"
                              title="Arizani ochish"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          )}
        </TabsContent>

        {/* TAB 2: DROPPER KARTALAR VA BARCHA O'TKAZMALAR */}
        <TabsContent value="cards" className="space-y-4 mt-0">
          {cardRelations.length > 0 && (
            <div className="space-y-3">
              <SectionTitle
                title="Boshqa arizalarda takrorlangan firibgar / dropper kartalari"
                count={cardRelations.length}
                subtitle="Faqat firibgar/dropper/tranzit roli yoki rol toʻqnashuvi aniqlangan kartalar"
              />
              {cardRelations.map((cr: CardRelationItem) => {
                const isFraud =
                  cr.role_in_current_app === 'RECEIVER' || cr.role_in_current_app === 'SUSPECT';
                const isTransit = cr.role_in_current_app === 'TRANSIT';
                const totalLossForCard = cr.linked_applications.reduce(
                  (sum, item) => sum + (Number(item.transfer_amount) || 0),
                  0,
                );
                return (
                  <Card
                    key={cr.card.id}
                    className={`py-0 gap-0 overflow-hidden ${
                      isFraud
                        ? 'border-l-4 border-l-rose-500 border-border/80'
                        : isTransit
                          ? 'border-l-4 border-l-amber-500 border-border/80'
                          : 'border-l-4 border-l-orange-500 border-border/80'
                    }`}
                  >
                    <CardHeader className="px-4 py-3 bg-muted/20 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => navigateWithTrail(`/cards/${cr.card.id}`)}
                          className="font-mono text-sm sm:text-base font-extrabold text-foreground hover:text-primary hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          {formatDossierCard(cr.card.card_number, cr.card.masked_number)}
                          <ExternalLink className="h-3.5 w-3.5 text-primary" />
                        </button>
                        {isFraud ? (
                          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35 text-[11px] font-bold gap-1">
                            <ShieldAlert className="h-3 w-3" />
                            Firibgar / Dropper
                          </Badge>
                        ) : isTransit ? (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35 text-[11px] font-bold">
                            Tranzit karta
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/35 text-[11px] font-bold">
                            Rol toʻqnashuvi (Joʻnatuvchi ↔ Dropper)
                          </Badge>
                        )}
                        {cr.card.bank_name && (
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> {cr.card.bank_name}
                          </span>
                        )}
                        {(cr.card.citizen_name || cr.card.full_name) &&
                          (cr.card.citizen_id ? (
                            <button
                              type="button"
                              onClick={() =>
                                setDrawerTarget({ type: 'citizen', id: cr.card.citizen_id! })
                              }
                              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <User className="h-3 w-3" />
                              Egasi: {cr.card.citizen_name || cr.card.full_name}
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Egasi: {cr.card.full_name}
                            </span>
                          ))}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-extrabold text-rose-600 dark:text-rose-400">
                          {formatDossierMoney(totalLossForCard)}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDrawerTarget({ type: 'card', id: cr.card.id })}
                          className="h-7 text-xs gap-1 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" /> Karta oʻtkazmalari
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/10">
                            <TableHead>Ariza №</TableHead>
                            <TableHead>Arizachi</TableHead>
                            <TableHead>Karta roli</TableHead>
                            <TableHead>Summa</TableHead>
                            <TableHead>Holati</TableHead>
                            <TableHead>Sana</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cr.linked_applications.map((la: LinkedApplicationInfo) => {
                            const roleMeta = getRoleMeta(la.role_in_that_app);
                            return (
                              <TableRow
                                key={la.id}
                                onClick={() => setDrawerTarget({ type: 'application', id: la.id })}
                                className="hover:bg-muted/30 cursor-pointer text-xs"
                              >
                                <TableCell className="font-mono font-bold text-primary whitespace-nowrap">
                                  № {la.application_number}
                                </TableCell>
                                <TableCell>
                                  <p className="font-semibold text-foreground">
                                    {la.citizen_name || '—'}
                                  </p>
                                  {la.citizen_phone && (
                                    <p className="text-[11px] font-mono text-muted-foreground">
                                      {formatDossierPhone(la.citizen_phone)}
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge className={`text-[11px] ${roleMeta.badgeClass}`}>
                                    {roleMeta.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono font-bold text-rose-500 whitespace-nowrap">
                                  {formatDossierMoney(la.transfer_amount, la.currency)}
                                </TableCell>
                                <TableCell>
                                  {renderStatusBadge(la.status_label, la.status_color)}
                                </TableCell>
                                <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                                  {formatDossierDate(la.date)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Joriy arizadagi barcha o'tkazmalar va chiqish kanallari (karta + kripto/servis/hisob raqam) */}
          {currentTransfers.length > 0 && (
            <div className="space-y-3">
              <SectionTitle
                title="Joriy arizadagi barcha pul oʻtkazmalari va chiqish kanallari"
                count={currentTransfers.length}
              />
              <Card className="py-0 gap-0 border-border/80 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead>#</TableHead>
                        <TableHead>Joʻnatuvchi karta</TableHead>
                        <TableHead>Qabul qiluvchi / Chiqish kanali</TableHead>
                        <TableHead>Summa</TableHead>
                        <TableHead>Provayder / Chek ID</TableHead>
                        <TableHead>Sana</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentTransfers.map((tr, idx) => {
                        const destType = tr.destination_type || 'CARD';
                        const details = (tr.destination_details || {}) as Record<
                          string,
                          string | undefined
                        >;
                        return (
                          <TableRow key={tr.id || idx} className="text-xs">
                            <TableCell className="font-mono text-muted-foreground">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="font-mono">
                              {tr.sender_card ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDrawerTarget({ type: 'card', id: tr.sender_card!.id })
                                  }
                                  className="text-primary hover:underline cursor-pointer"
                                >
                                  {formatDossierCard(
                                    tr.sender_card.card_number,
                                    tr.sender_card.masked_number,
                                  )}
                                </button>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {tr.receiver_card ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDrawerTarget({ type: 'card', id: tr.receiver_card!.id })
                                  }
                                  className="font-mono font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                                >
                                  {formatDossierCard(
                                    tr.receiver_card.card_number,
                                    tr.receiver_card.masked_number,
                                  )}
                                </button>
                              ) : (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge className="bg-purple-500/12 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[10px]">
                                    {DESTINATION_TYPE_LABELS[destType] || destType}
                                  </Badge>
                                  {tr.receiver_identifier ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDrawerTarget({
                                          type: 'identifier',
                                          id: tr.receiver_identifier!.id,
                                        })
                                      }
                                      className="font-mono font-bold text-primary hover:underline cursor-pointer break-all"
                                    >
                                      {tr.destination_label || tr.receiver_identifier.raw_value}
                                    </button>
                                  ) : (
                                    <span className="font-mono font-semibold break-all">
                                      {tr.destination_label ||
                                        [details.platform, details.value]
                                          .filter(Boolean)
                                          .join(' · ') ||
                                        'Koʻrsatilmagan'}
                                    </span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                              {formatDossierMoney(tr.amount, tr.currency || 'UZS')}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                <span>{tr.payment_provider?.name || '—'}</span>
                                {tr.transaction_id && (
                                  <p className="text-[10px] font-mono text-muted-foreground">
                                    ID: {tr.transaction_id}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                              {formatDossierDate(tr.transfer_date)}
                              {tr.transfer_time ? ` ${tr.transfer_time}` : ''}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          )}

          {primaryCitizenDossier &&
            (primaryCitizenDossier.ownedCards.length > 0 ||
              primaryCitizenDossier.transfers.length > 0) && (
              <div className="space-y-3">
                <SectionTitle
                  title={`${citizenFullName} — kartalari va tranzaksiyalari`}
                  count={primaryCitizenDossier.ownedCards.length}
                />
                <CitizenCardsBreakdown
                  cards={primaryCitizenDossier.ownedCards}
                  transfers={primaryCitizenDossier.transfers}
                  directApplications={primaryCitizenDossier.directApplications}
                  onQuickViewCard={(cardId) => setDrawerTarget({ type: 'card', id: cardId })}
                  onOpenFullCard={(cardId) => navigateWithTrail(`/cards/${cardId}`)}
                  onQuickViewApp={(appId) => setDrawerTarget({ type: 'application', id: appId })}
                  onOpenFullApp={(appId) => navigateWithTrail(`/applications/${appId}`)}
                />
              </div>
            )}

          {cardRelations.length === 0 &&
            currentTransfers.length === 0 &&
            (!primaryCitizenDossier ||
              (primaryCitizenDossier.ownedCards.length === 0 &&
                primaryCitizenDossier.transfers.length === 0)) && (
              <Card className="border-border/70 bg-muted/15">
                <CardContent className="p-8 text-center text-xs text-muted-foreground">
                  Ushbu ariza boʻyicha plastik kartalar yoki pul oʻtkazmalari kiritilmagan.
                </CardContent>
              </Card>
            )}
        </TabsContent>

        {/* TAB 3: GUMONLANUVCHI BELGILARI (TELEFON, TELEGRAM, KRIPTO, SAYT VA B.) */}
        <TabsContent value="clues" className="space-y-4 mt-0">
          <SectionTitle
            title="Firibgar telefon raqamlari va raqamli izlari"
            count={unifiedClues.length}
            subtitle="Gumonlanuvchiga tegishli Telegram, WhatsApp, telefon, phishing sayt, kripto-hamyon va ularning boshqa arizalarda takrorlanishi"
          />

          {unifiedClues.length === 0 ? (
            <Card className="border-border/70 bg-muted/15">
              <CardContent className="p-8 text-center text-xs text-muted-foreground">
                Gumonlanuvchiga tegishli telefon raqami yoki raqamli izlar kiritilmagan.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {unifiedClues.map((cl) => {
                const roleMeta = getRoleMeta(cl.role);
                const isRepeated = cl.linkedApps.length > 0;
                return (
                  <Card
                    key={cl.key}
                    className={`py-0 gap-0 overflow-hidden ${
                      isRepeated
                        ? 'border-l-4 border-l-rose-500 border-border/80 bg-card'
                        : 'border-border/80 bg-card'
                    }`}
                  >
                    <CardContent className="p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {cl.id && cl.entityType ? (
                            <button
                              type="button"
                              onClick={() => setDrawerTarget({ type: cl.entityType!, id: cl.id! })}
                              className="font-mono text-sm font-extrabold text-primary hover:underline text-left break-all cursor-pointer"
                            >
                              {cl.value}
                            </button>
                          ) : (
                            <p className="font-mono text-sm font-extrabold text-foreground break-all">
                              {cl.value}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {cl.label}
                            {cl.operator ? ` · ${cl.operator}` : ''}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1 shrink-0">
                          {cl.isNonLinkable ? (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Faqat izoh
                            </Badge>
                          ) : isRepeated ? (
                            <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35 text-[10px] font-bold">
                              Yana {cl.linkedApps.length} ta arizada
                            </Badge>
                          ) : null}
                          <Badge className={`text-[10px] ${roleMeta.badgeClass}`}>
                            {roleMeta.shortLabel}
                          </Badge>
                        </div>
                      </div>

                      {cl.ownerCitizen && (
                        <button
                          type="button"
                          onClick={() =>
                            setDrawerTarget({ type: 'citizen', id: cl.ownerCitizen!.id })
                          }
                          className="w-full px-2.5 py-1.5 rounded-md border border-border bg-muted/25 hover:border-primary text-xs flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <span className="inline-flex items-center gap-1.5 font-semibold truncate">
                            <User className="h-3.5 w-3.5 text-primary shrink-0" />
                            Egasi: {cl.ownerCitizen.full_name}
                          </span>
                          <span className="text-[11px] text-primary shrink-0">Profil →</span>
                        </button>
                      )}

                      {cl.linkedApps.length > 0 ? (
                        <div className="space-y-1 pt-2 border-t border-border/60">
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground block px-2">
                            Boshqa bogʻlangan arizalar ({cl.linkedApps.length}):
                          </span>
                          {cl.linkedApps.map((la) => (
                            <div
                              key={la.id}
                              onClick={() => setDrawerTarget({ type: 'application', id: la.id })}
                              className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                            >
                              <div className="min-w-0 truncate">
                                <span className="font-mono font-bold text-primary">
                                  № {la.application_number}
                                </span>
                                {la.citizen_name && (
                                  <span className="text-muted-foreground ml-1.5">
                                    · {la.citizen_name}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-rose-500 shrink-0">
                                {la.transfer_amount
                                  ? formatDossierMoney(la.transfer_amount, la.currency)
                                  : formatDossierDate(la.date)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          {cl.isNonLinkable
                            ? 'Erkin matn (avtomatik bogʻliqlik sifatida solishtirilmaydi)'
                            : 'Boshqa arizalarda takrorlanmagan'}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 4: MOLIYAVIY PUL OQIMI */}
        <TabsContent value="flow" className="mt-0">
          <EntityNetworkGraph
            financialGraph={data.graph}
            heightClassName="h-[520px]"
            title="Moliyaviy Pul Oqimi"
          />
        </TabsContent>
      </Tabs>

      {/* Tezkor Yon Oyna */}
      <DossierQuickDrawer
        target={drawerTarget}
        onClose={() => setDrawerTarget(null)}
        trail={breadcrumbs}
        repeatedTokens={repeatedTokens}
      />
    </div>
  );
}

export default ApplicationRelationsPage;
