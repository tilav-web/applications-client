import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  Fingerprint,
  GitBranch,
  Link2,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  ShieldAlert,
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
import type { CardRelationItem, CitizenRelationItem, LinkedApplicationInfo } from '@/types/models';

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

interface UnifiedClueItem {
  key: string;
  id?: string;
  entityType?: 'phone' | 'identifier';
  label: string;
  value: string;
  normalized: string;
  operator?: string | null;
  role: string;
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
  const [activeTab, setActiveTab] = useState<string>('applications');
  const [drawerTarget, setDrawerTarget] = useState<QuickDrawerTarget | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['application-relations', id],
    queryFn: () => applicationsApi.getRelations(id!),
    enabled: !!id,
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

  // Kartalarni tartiblash: firibgar/qabul qiluvchi kartalar eng tepada
  const cardRelations = useMemo(() => {
    const list = [...(data?.card_relations || [])];
    list.sort((a, b) => {
      const aRec = a.role_in_current_app === 'RECEIVER' ? 1 : 0;
      const bRec = b.role_in_current_app === 'RECEIVER' ? 1 : 0;
      if (aRec !== bRec) return bRec - aRec;
      return b.linked_applications.length - a.linked_applications.length;
    });
    return list;
  }, [data?.card_relations]);

  const otherCitizens = useMemo(
    () => (data?.citizen_relations || []).filter((cr) => cr.citizen.id !== primaryCitizenId),
    [data?.citizen_relations, primaryCitizenId],
  );

  const multiHopChains = useMemo(() => data?.multi_hop_chains || [], [data?.multi_hop_chains]);

  // Telefon, Telegram, Instagram va barcha gumonlanuvchi belgilarini dublikatsiz birlashtirish
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
        if (item.role === 'SUSPECT') existing.role = 'SUSPECT';
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

    // 1. Intelligence synced clues (phone & digital identifiers)
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

    // 2. Suspect tree matched relations (e.g. Telegram usernames matched across apps)
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
      upsert({
        key: `tree-${tc.path}-${tc.normalized}`,
        label: tc.path,
        value: tc.value,
        normalized: tc.normalized,
        role: 'SUSPECT',
        linkedApps: [],
      });
    }

    // Takrorlangan (boshqa arizalarda uchragan) belgilar eng tepada turadi
    const list = Array.from(map.values()).sort((a, b) => {
      if (b.linkedApps.length !== a.linkedApps.length) {
        return b.linkedApps.length - a.linkedApps.length;
      }
      const aSus = a.role === 'SUSPECT' ? 1 : 0;
      const bSus = b.role === 'SUSPECT' ? 1 : 0;
      return bSus - aSus;
    });

    return { unifiedClues: list, repeatedTokens: repeated };
  }, [data?.clue_relations, data?.suspect_relations, data?.application?.suspect_tree]);

  // "Nima sababdan bog'liqlik chiqdi?" — eng yuqoridagi 1-qatorli aniq sabablar ro'yxati
  const matchReasonsSummary = useMemo(() => {
    const items: {
      key: string;
      text: string;
      danger?: boolean;
      targetTab: string;
    }[] = [];

    for (const cr of cardRelations) {
      const isRec = cr.role_in_current_app === 'RECEIVER';
      const n = cr.linked_applications.length;
      items.push({
        key: `card-${cr.card.id}`,
        text: `${isRec ? 'Firibgar kartasi' : 'Karta'} ${formatDossierCard(cr.card.card_number, cr.card.masked_number)} → yana ${n} ta ariza (jami ${n + 1})`,
        danger: isRec,
        targetTab: 'cards',
      });
    }

    for (const citR of data?.citizen_relations || []) {
      const n = citR.linked_applications.length;
      const label =
        citR.citizen.id === primaryCitizenId
          ? `Bir xil fuqaro (${citR.citizen.full_name?.trim() || 'Arizachi'})`
          : `Aloqador fuqaro (${citR.citizen.full_name?.trim() || 'Fuqaro'})`;
      items.push({
        key: `cit-${citR.citizen.id}`,
        text: `${label} → yana ${n} ta ariza (jami ${n + 1})`,
        targetTab: 'applications',
      });
    }

    for (const cl of unifiedClues) {
      if (cl.linkedApps.length > 0) {
        const n = cl.linkedApps.length;
        items.push({
          key: `clue-${cl.key}`,
          text: `${cl.label}: ${cl.value} → yana ${n} ta ariza (jami ${n + 1})`,
          danger: getRoleMeta(cl.role).isDanger,
          targetTab: 'clues',
        });
      }
    }

    if (multiHopChains.length > 0) {
      items.push({
        key: 'multihop',
        text: `Bilvosita zanjir → ${multiHopChains.length} ta ariza`,
        danger: true,
        targetTab: 'applications',
      });
    }

    return items;
  }, [cardRelations, data?.citizen_relations, primaryCitizenId, unifiedClues, multiHopChains]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Bogʻliqliklar yuklanmoqda...</p>
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

  const citizenApps = primaryCitizenDossier?.directApplications || [];
  const totalAppsTabCount =
    Math.max(
      citizenApps.length,
      (data.citizen_relations || []).reduce((s, c) => s + c.linked_applications.length, 0),
    ) + multiHopChains.length;

  const ownedCards = primaryCitizenDossier?.ownedCards || [];
  const ownedPhones = primaryCitizenDossier?.ownedPhones || [];
  const ownedIdentifiers = primaryCitizenDossier?.ownedIdentifiers || [];
  const cardsTabCount = Math.max(cardRelations.length, ownedCards.length);
  const financialNodesCount = data.graph?.nodes?.length || 0;

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

      {/* Xavf ogohlantirishi (faqat firibgar kartasi takrorlanganda yoki ikki tomonlama rolda!) */}
      {stats?.has_fraud_card_link && (
        <CompactDangerAlert
          title="Takroriy firibgar kartasi yoki belgisi aniqlandi"
          message="Ushbu arizadagi qabul qiluvchi karta yoki gumonlanuvchi belgisi boshqa jabrlanuvchilarning arizalarida ham qayd etilgan."
        />
      )}
      {primaryCitizenDossier?.stats.isCrossRoleCollision && (
        <CompactDangerAlert
          title="Ikki tomonlama rol toʻqnashuvi"
          message={`Bu fuqaro ${primaryCitizenDossier.stats.victimAppsCount} ta arizada Jabrlanuvchi, ammo ${primaryCitizenDossier.stats.suspectOrDropperAppsCount} ta arizada Firibgar / Dropper sifatida qatnashgan.`}
        />
      )}

      {/* 2. Joriy ariza + Fuqaro to'liq ma'lumotlari + Nima bog'landi? (Bitta toza, ixcham karta) */}
      <Card className="py-0 gap-0 border-border/80 bg-card overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* A. Joriy ariza 1-qator sarlavha */}
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

            <div className="flex flex-wrap items-center gap-3 shrink-0 text-xs">
              {(stats?.grand_total_loss ?? 0) > 0 && (
                <div className="text-right">
                  <span className="text-[10px] uppercase text-muted-foreground block">
                    Umumiy zarar
                  </span>
                  <span className="font-mono text-sm font-extrabold text-rose-600 dark:text-rose-400">
                    {formatDossierMoney(stats?.grand_total_loss)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* B. Nima bog'landi? — 1 soniyada tushunarli aniq sabablar */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-primary" />
              Topilgan bogʻliqliklar ({stats?.total_linked_applications ?? 0} ta boshqa ariza)
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
                Boshqa arizalar bilan kesishma topilmadi — quyida fuqaro va joriy ariza
                maʼlumotlari.
              </p>
            )}
          </div>

          {/* C. Fuqaro to'liq ma'lumotlari (F.I.SH, roli, telefonlari, kartalari, raqamli izlari) */}
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

              {/* Fuqaroning telefonlari, kartalari va raqamli izlari — ixcham qator */}
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

      {/* 3. Alohida Tablar — har bir ma'lumot guruhi o'zining toza tabida */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 w-full justify-start">
          <TabsTrigger value="applications" className="text-xs gap-1.5 cursor-pointer">
            <FileText className="h-3.5 w-3.5" />
            <span>Arizalar</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
              {totalAppsTabCount}
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="cards" className="text-xs gap-1.5 cursor-pointer">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Kartalar va Oʻtkazmalar</span>
            <Badge
              variant={stats?.has_fraud_card_link ? 'destructive' : 'secondary'}
              className="text-[10px] px-1.5 py-0 font-mono"
            >
              {cardsTabCount}
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="clues" className="text-xs gap-1.5 cursor-pointer">
            <Fingerprint className="h-3.5 w-3.5" />
            <span>Telefon va Gumonlanuvchi belgilari</span>
            <Badge
              variant={
                unifiedClues.some((c) => c.linkedApps.length > 0 && getRoleMeta(c.role).isDanger)
                  ? 'destructive'
                  : 'secondary'
              }
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

        {/* TAB 1: ARIZALAR VA ALOQADOR SHAXSLAR */}
        <TabsContent value="applications" className="space-y-4 mt-0">
          <SectionTitle
            title="Fuqaroga tegishli barcha arizalar"
            count={citizenApps.length}
            subtitle="Ariza ustiga bosing — oʻng oynada uning toʻliq mazmuni, oʻtkazmalari va Telegram/telefon kabi gumonlanuvchi belgilari ochiladi"
          />

          <Card className="py-0 gap-0 border-border/80 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead>Ariza №</TableHead>
                    <TableHead>Fuqaroning roli</TableHead>
                    <TableHead>Bogʻlanish sababi</TableHead>
                    <TableHead>Zarar summasi</TableHead>
                    <TableHead>Holati</TableHead>
                    <TableHead>Sana</TableHead>
                    <TableHead className="text-right">Oʻtish</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {citizenApps.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-xs text-muted-foreground"
                      >
                        Fuqaro boʻyicha bogʻliq arizalar topilmadi
                      </TableCell>
                    </TableRow>
                  ) : (
                    citizenApps.map((item) => {
                      const roleMeta = getRoleMeta(item.role_in_app);
                      const isCurrent = item.id === app.id;
                      return (
                        <TableRow
                          key={item.id}
                          onClick={() => setDrawerTarget({ type: 'application', id: item.id })}
                          className={`cursor-pointer hover:bg-muted/40 transition-colors text-xs ${
                            isCurrent ? 'bg-primary/[0.04]' : ''
                          }`}
                        >
                          <TableCell className="font-mono font-bold text-primary whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>№ {item.application_number}</span>
                              {isCurrent && (
                                <Badge variant="secondary" className="text-[10px]">
                                  Joriy
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[11px] ${roleMeta.badgeClass}`}>
                              {roleMeta.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-xs truncate">
                            {item.match_reasons.join('; ') || '—'}
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

          {/* Boshqa aloqador fuqarolar */}
          {otherCitizens.length > 0 && (
            <div className="space-y-3 pt-1">
              <SectionTitle
                title="Boshqa aloqador fuqarolar"
                count={otherCitizens.length}
                icon={<Users className="h-4 w-4 text-primary" />}
              />
              {otherCitizens.map((citR: CitizenRelationItem) => (
                <Card key={citR.citizen.id} className="py-0 gap-0 border-border/80 overflow-hidden">
                  <CardHeader className="px-4 py-3 bg-muted/25 border-b flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => navigateWithTrail(`/citizens/${citR.citizen.id}`)}
                        className="font-bold text-sm text-foreground hover:text-primary hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{citR.citizen.full_name?.trim() || 'Fuqaro'}</span>
                        <ExternalLink className="h-3 w-3 text-primary" />
                      </button>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono">
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
                        {citR.linked_applications.map((la: LinkedApplicationInfo) => (
                          <TableRow
                            key={la.id}
                            onClick={() => setDrawerTarget({ type: 'application', id: la.id })}
                            className="hover:bg-muted/30 cursor-pointer text-xs"
                          >
                            <TableCell className="font-mono font-bold text-primary whitespace-nowrap">
                              № {la.application_number}
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
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Bilvosita 2–3 qadamli zanjirlar */}
          {multiHopChains.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <SectionTitle
                title="Bilvosita (2–3 qadamli) zanjirli bogʻliqliklar"
                count={multiHopChains.length}
                icon={<GitBranch className="h-4 w-4 text-amber-500" />}
              />
              {multiHopChains.map((chain, idx) => (
                <Card
                  key={idx}
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
        </TabsContent>

        {/* TAB 2: KARTALAR VA O'TKAZMALAR */}
        <TabsContent value="cards" className="space-y-4 mt-0">
          {cardRelations.length > 0 && (
            <div className="space-y-3">
              <SectionTitle
                title="Boshqa arizalarda takrorlangan kartalar"
                count={cardRelations.length}
                subtitle="Firibgar/qabul qiluvchi kartalar eng tepada koʻrsatiladi"
              />
              {cardRelations.map((cr: CardRelationItem) => {
                const isReceiver = cr.role_in_current_app === 'RECEIVER';
                const totalLossForCard = cr.linked_applications.reduce(
                  (sum, item) => sum + (Number(item.transfer_amount) || 0),
                  0,
                );
                return (
                  <Card
                    key={cr.card.id}
                    className={`py-0 gap-0 overflow-hidden ${
                      isReceiver
                        ? 'border-l-4 border-l-rose-500 border-border/80'
                        : 'border-border/80'
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
                        {isReceiver ? (
                          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35 text-[11px] font-bold gap-1">
                            <ShieldAlert className="h-3 w-3" />
                            Firibgar / Pul olgan
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[11px]">
                            Jabrlanuvchi kartasi
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
            (!primaryCitizenDossier ||
              (primaryCitizenDossier.ownedCards.length === 0 &&
                primaryCitizenDossier.transfers.length === 0)) && (
              <Card className="border-border/70 bg-muted/15">
                <CardContent className="p-8 text-center text-xs text-muted-foreground">
                  Ushbu ariza va fuqaro boʻyicha plastik kartalar yoki pul oʻtkazmalari
                  kiritilmagan.
                </CardContent>
              </Card>
            )}
        </TabsContent>

        {/* TAB 3: TELEFON RAQAMLAR VA GUMONLANUVCHI BELGILARI (TELEGRAM, INSTAGRAM, IP VA B.) */}
        <TabsContent value="clues" className="space-y-4 mt-0">
          <SectionTitle
            title="Telefon raqamlar va gumonlanuvchi belgilari"
            count={unifiedClues.length}
            subtitle="Arizaga biriktirilgan Telegram username, telefon, Instagram, IP, kripto-hamyon va ularning boshqa arizalarda takrorlanishi"
          />

          {unifiedClues.length === 0 ? (
            <Card className="border-border/70 bg-muted/15">
              <CardContent className="p-8 text-center text-xs text-muted-foreground">
                Telefon raqami yoki Telegram/raqamli gumonlanuvchi belgilari kiritilmagan.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {unifiedClues.map((cl) => {
                const roleMeta = getRoleMeta(cl.role);
                const isRepeated = cl.linkedApps.length > 0;
                const isDangerRepeat = isRepeated && roleMeta.isDanger;
                return (
                  <Card
                    key={cl.key}
                    className={`py-0 gap-0 overflow-hidden ${
                      isDangerRepeat
                        ? 'border-l-4 border-l-rose-500 border-border/80 bg-card'
                        : isRepeated
                          ? 'border-l-4 border-l-blue-500 border-border/80 bg-card'
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
                          {isRepeated && (
                            <Badge
                              className={
                                isDangerRepeat
                                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35 text-[10px] font-bold'
                                  : 'bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-semibold'
                              }
                            >
                              Yana {cl.linkedApps.length} ta arizada (jami{' '}
                              {cl.linkedApps.length + 1} ta)
                            </Badge>
                          )}
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
                          Boshqa arizalarda takrorlanmagan
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 4: FAQAT MOLIYAVIY PUL OQIMI (TABSIZ + KATTA EKRANDA KO'RISH) */}
        <TabsContent value="flow" className="mt-0">
          <EntityNetworkGraph
            financialGraph={data.graph}
            heightClassName="h-[520px]"
            title="Moliyaviy Pul Oqimi"
          />
        </TabsContent>
      </Tabs>

      {/* Tezkor Yon Oyna — ariza bosganda uning barcha o'tkazmalari va gumonlanuvchi belgilari chiqadi */}
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
