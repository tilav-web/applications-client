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
  CollapsibleInsightPanel,
  DossierMetricStrip,
  type DossierNavSection,
  DossierSectionNav,
  DossierTopBar,
  RoleVerdictBanner,
  SectionHeading,
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
import { applicationsApi, intelligenceApi } from '@/lib/api';
import {
  buildCitizenVerdict,
  formatDossierCard,
  formatDossierDate,
  formatDossierMoney,
  formatDossierPhone,
  getRoleMeta,
  useDossierTrail,
} from '@/lib/dossier-navigation';
import type { CardRelationItem, CitizenRelationItem, LinkedApplicationInfo } from '@/types/models';

const renderStatusBadge = (label: string, color?: string | null) => {
  const c = (color || '').toLowerCase();
  if (c.includes('amber') || c.includes('yellow') || label === 'JARAYONDA') {
    return (
      <Badge className="bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/30">
        {label}
      </Badge>
    );
  }
  if (c.includes('emerald') || c.includes('green') || label === 'HAL_QILINDI') {
    return (
      <Badge className="bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
        {label}
      </Badge>
    );
  }
  if (c.includes('red') || c.includes('rose') || label === 'RAD_ETILDI') {
    return (
      <Badge className="bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/30">
        {label}
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/30">
      {label}
    </Badge>
  );
};

export function ApplicationRelationsPage() {
  const { id } = useParams<{ id: string }>();
  const [drawerTarget, setDrawerTarget] = useState<QuickDrawerTarget | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['application-relations', id],
    queryFn: () => applicationsApi.getRelations(id!),
    enabled: !!id,
  });

  const app = data?.application;
  const primaryCitizenId = app?.citizen?.id;

  // Arizachi fuqaroning to'liq 360° ma'lumotlari (rol hukmi, barcha arizalari, kartalari va tranzaksiyalari)
  const { data: primaryCitizenDossier, isLoading: isCitizenDossierLoading } = useQuery({
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
  const cardRelations = useMemo(() => {
    const list = [...(data?.card_relations || [])];
    // Firibgar / qabul qiluvchi kartalar eng tepada turadi
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
  const clueRelations = data?.clue_relations || [];
  const multiHopChains = data?.multi_hop_chains || [];

  const primaryAppsCount = primaryCitizenDossier?.directApplications.length ?? 0;
  const primaryCardsCount = primaryCitizenDossier?.ownedCards.length ?? 0;
  const hasCluesOrChains = clueRelations.length > 0 || multiHopChains.length > 0;
  const hasGraph = Boolean(data?.network_graph || data?.graph);

  const navSections = useMemo<DossierNavSection[]>(() => {
    const list: DossierNavSection[] = [
      {
        id: 'sec-subject',
        step: 1,
        label: 'Ariza va Fuqaro',
        alert: Boolean(primaryCitizenDossier?.stats.isCrossRoleCollision),
      },
      {
        id: 'sec-applications',
        step: 2,
        label: 'Fuqaro arizalari',
        count:
          primaryAppsCount + otherCitizens.reduce((s, c) => s + c.linked_applications.length, 0),
      },
      {
        id: 'sec-cards',
        step: 3,
        label: 'Kartalar va Oʻtkazmalar',
        count: Math.max(cardRelations.length, primaryCardsCount),
        alert: Boolean(stats?.has_fraud_card_link),
      },
    ];
    let stepNum = 4;
    if (hasCluesOrChains) {
      list.push({
        id: 'sec-clues',
        step: stepNum++,
        label: 'Izlar va Zanjirlar',
        count: clueRelations.length + multiHopChains.length,
      });
    }
    if (hasGraph) {
      list.push({
        id: 'sec-graph',
        step: stepNum,
        label: 'Grafik sxema',
      });
    }
    return list;
  }, [
    primaryCitizenDossier?.stats.isCrossRoleCollision,
    primaryAppsCount,
    otherCitizens,
    cardRelations.length,
    primaryCardsCount,
    stats?.has_fraud_card_link,
    hasCluesOrChains,
    clueRelations.length,
    multiHopChains.length,
    hasGraph,
  ]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Ariza va fuqaro bogʻliqliklari tayyorlanmoqda...
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
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Xatolik yuz berdi</h2>
            <p className="text-sm text-muted-foreground">
              {(error as Error)?.message || 'Bogʻliqliklar maʻlumotlarini yuklab boʻlmadi.'}
            </p>
            <Button onClick={() => refetch()} variant="outline" className="gap-2 cursor-pointer">
              <RefreshCw className="h-4 w-4" />
              Qayta urinish
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
  const graphStepNumber = hasCluesOrChains ? 5 : 4;

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Yuqori Breadcrumb va Amallar */}
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

      {/* Sticky Ketma-ket Navigatsiya Paneli */}
      <DossierSectionNav sections={navSections} />

      {/* Xavfli Firibgarlik Zanjiri Ogohlantirishi */}
      {stats?.has_fraud_card_link && (
        <div className="rounded-xl border border-red-500/45 bg-red-500/10 p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs sm:text-sm">
            <h4 className="font-bold text-red-700 dark:text-red-300">
              Diqqat: Firibgar kartasi boshqa arizalarda ham takrorlangan!
            </h4>
            <p className="text-red-700/90 dark:text-red-300/90 leading-relaxed">
              Ushbu arizada pul tushgan plastik karta boshqa jabrlanuvchilarning arizalarida ham
              qabul qiluvchi sifatida aniqlandi. Pastda kartalar boʻlimida barcha bogʻliq arizalar
              koʻrsatilgan.
            </p>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 1-BO'LIM: JORIY ARIZA VA ASOSIY FUQARO MA'LUMOTLARI + ROL XULOSASI    */}
      {/* ===================================================================== */}
      <section id="sec-subject" className="scroll-mt-20 space-y-4">
        <SectionHeading
          step={1}
          title="Joriy ariza va fuqaro maʼlumotlari"
          subtitle="Avval ushbu arizaning egasi kim ekanligi va tizimda Jabrlanuvchimi yoki Firibgar/Dropper ekanligi"
          icon={<User className="h-4 w-4 text-primary" />}
        />

        {/* Joriy Ariza Ixcham Sarlavhasi */}
        <Card className="py-0 gap-0 border-border/80 bg-card/70 overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[11px] gap-1 border-primary/30 text-primary bg-primary/5"
                  >
                    <Link2 className="h-3 w-3" /> Joriy ariza
                  </Badge>
                  <h1 className="font-mono text-lg sm:text-xl font-extrabold text-foreground">
                    № {app.application_number || 'Raqamsiz'}
                  </h1>
                  {renderStatusBadge(
                    app.application_status?.name || app.status || 'YANGI',
                    app.application_status?.color,
                  )}
                </div>
                {app.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{app.description}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0 text-xs">
                <span className="inline-flex items-center gap-1 font-mono text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDossierDate(app.date)}
                </span>
                {stats?.current_app_loss ? (
                  <span className="font-mono text-sm font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                    {formatDossierMoney(stats.current_app_loss)}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Asosiy Fuqaro Profili */}
            {citizen ? (
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-primary/12 border border-primary/25 text-primary flex items-center justify-center shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigateWithTrail(`/citizens/${citizen.id}`)}
                          className="text-base sm:text-lg font-extrabold text-foreground hover:text-primary hover:underline text-left cursor-pointer"
                        >
                          {citizenFullName}
                        </button>
                        <Badge variant="secondary" className="text-[11px]">
                          Arizachi fuqaro
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                        {citizen.phone_number && (
                          <span className="inline-flex items-center gap-1 text-foreground font-semibold">
                            <Phone className="h-3 w-3 text-primary" />
                            {formatDossierPhone(citizen.phone_number)}
                          </span>
                        )}
                        <span>
                          Pasport:{' '}
                          <strong className="text-foreground">{citizen.passport || '—'}</strong>
                        </span>
                        <span>
                          JSHSHIR:{' '}
                          <strong className="text-foreground">{citizen.pinfl || '—'}</strong>
                        </span>
                        {(citizen.district?.name ||
                          citizen.neighborhood?.name ||
                          citizen.address) && (
                          <span className="inline-flex items-center gap-1 font-sans">
                            <MapPin className="h-3 w-3 text-primary shrink-0" />
                            {[citizen.district?.name, citizen.neighborhood?.name, citizen.address]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDrawerTarget({ type: 'citizen', id: citizen.id })}
                      className="h-8 text-xs gap-1.5 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Tez koʻrish
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => navigateWithTrail(`/citizens/${citizen.id}`)}
                      className="h-8 text-xs gap-1.5 cursor-pointer"
                    >
                      <span>Fuqaro toʻliq dosyesi</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Fuqaroning butun baza bo‘yicha aniq Rol Hukmi */}
                {isCitizenDossierLoading ? (
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Fuqaroning tizimdagi roli va barcha arizalari tekshirilmoqda...
                  </div>
                ) : primaryVerdict ? (
                  <RoleVerdictBanner
                    verdict={primaryVerdict}
                    riskScore={primaryCitizenDossier?.stats.riskScore}
                  />
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                Ushbu arizaga fuqaro profili biriktirilmagan.
              </div>
            )}

            {/* Joriy arizadagi asosiy o‘tkazma (Kim -> Kimga) */}
            {app.transfer && (app.transfer.sender_card || app.transfer.receiver_card) && (
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 text-xs min-w-0 flex-1">
                  {app.transfer.sender_card ? (
                    <button
                      type="button"
                      onClick={() =>
                        setDrawerTarget({ type: 'card', id: app.transfer!.sender_card!.id })
                      }
                      className="px-3 py-2 rounded-lg border border-blue-500/30 bg-blue-500/5 hover:border-blue-500 text-left cursor-pointer min-w-0"
                    >
                      <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 block">
                        Joʻnatuvchi (Jabrlanuvchi)
                      </span>
                      <span className="font-mono font-bold text-foreground block">
                        {formatDossierCard(
                          app.transfer.sender_card.card_number,
                          app.transfer.sender_card.masked_number,
                        )}
                      </span>
                    </button>
                  ) : null}

                  <div className="flex items-center gap-1.5 text-muted-foreground font-mono font-bold px-1">
                    <ArrowRight className="h-4 w-4 text-rose-500 shrink-0" />
                    <span className="text-rose-600 dark:text-rose-400">
                      {formatDossierMoney(app.transfer.amount, app.transfer.currency || 'UZS')}
                    </span>
                    <ArrowRight className="h-4 w-4 text-rose-500 shrink-0" />
                  </div>

                  {app.transfer.receiver_card ? (
                    <button
                      type="button"
                      onClick={() =>
                        setDrawerTarget({ type: 'card', id: app.transfer!.receiver_card!.id })
                      }
                      className="px-3 py-2 rounded-lg border border-rose-500/40 bg-rose-500/8 hover:border-rose-500 text-left cursor-pointer min-w-0"
                    >
                      <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 block">
                        Qabul qiluvchi (Firibgar / Dropper)
                      </span>
                      <span className="font-mono font-bold text-foreground block">
                        {formatDossierCard(
                          app.transfer.receiver_card.card_number,
                          app.transfer.receiver_card.masked_number,
                        )}
                      </span>
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Qabul qiluvchi karta kiritilmagan
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ixcham Raqamlar Qatori */}
        <DossierMetricStrip
          items={[
            {
              label: 'Bogʻlangan arizalar',
              value: `${stats?.total_linked_applications ?? 0} ta`,
              sub: 'Karta, fuqaro yoki iz orqali',
            },
            {
              label: 'Bogʻliq umumiy zarar',
              value: formatDossierMoney(stats?.grand_total_loss),
              sub: 'Joriy + bogʻliq arizalar',
              tone: 'danger',
            },
            {
              label: 'Aloqador kartalar',
              value: `${Math.max(stats?.total_cards_count ?? 0, primaryCardsCount)} ta`,
              sub: `${cardRelations.length} ta takroriy karta`,
            },
            {
              label: 'Aloqador fuqarolar',
              value: `${stats?.total_citizens_count ?? 0} ta`,
              sub: 'JSHSHIR, pasport yoki tel boʻyicha',
              tone: 'info',
            },
          ]}
        />
      </section>

      {/* ===================================================================== */}
      {/* 2-BO'LIM: SHU FUQAROGA VA ALOQADOR SHAXSLARGA TEGISHLI ARIZALAR       */}
      {/* ===================================================================== */}
      <section id="sec-applications" className="scroll-mt-20 space-y-4">
        <SectionHeading
          step={2}
          title="Fuqaroga tegishli barcha arizalar"
          subtitle="Arizachi fuqaro qaysi ishlarda Jabrlanuvchi va qaysi ishlarda Firibgar / Dropper sifatida qatnashgan"
          count={primaryCitizenDossier?.directApplications.length ?? 0}
          icon={<FileText className="h-4 w-4 text-primary" />}
        />

        {primaryCitizenDossier && primaryCitizenDossier.directApplications.length > 0 ? (
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
                  {primaryCitizenDossier.directApplications.map((item) => {
                    const roleMeta = getRoleMeta(item.role_in_app);
                    const isCurrent = item.id === app.id;
                    return (
                      <TableRow
                        key={item.id}
                        onClick={() => setDrawerTarget({ type: 'application', id: item.id })}
                        className={`cursor-pointer transition-colors hover:bg-muted/40 ${
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
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {item.match_reasons.join('; ') || '—'}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs whitespace-nowrap">
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
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {formatDossierDate(item.date)}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDrawerTarget({ type: 'application', id: item.id })}
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
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : !isCitizenDossierLoading ? (
          <Card className="border-border/70 bg-muted/20">
            <CardContent className="p-5 text-center text-xs text-muted-foreground">
              Ushbu fuqaroning boshqa bogʻliq arizalari topilmadi.
            </CardContent>
          </Card>
        ) : null}

        {/* Boshqa mos kelgan / aloqador fuqarolar (masalan gumonlanuvchi yoki dublikat profil) */}
        {otherCitizens.length > 0 && (
          <div className="space-y-3 pt-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              Boshqa aloqador fuqarolar ({otherCitizens.length})
            </p>
            {otherCitizens.map((citR: CitizenRelationItem) => (
              <Card
                key={citR.citizen.id}
                className="py-0 gap-0 border-border/80 bg-card/60 overflow-hidden"
              >
                <CardHeader className="p-4 bg-muted/30 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => navigateWithTrail(`/citizens/${citR.citizen.id}`)}
                        className="font-bold text-sm text-foreground hover:text-primary hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{citR.citizen.full_name?.trim() || 'Fuqaro'}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-primary" />
                      </button>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5 font-mono">
                        {citR.citizen.phone_number && (
                          <span>{formatDossierPhone(citR.citizen.phone_number)}</span>
                        )}
                        {citR.citizen.passport && <span>Pasport: {citR.citizen.passport}</span>}
                        {citR.citizen.pinfl && <span>JSHSHIR: {citR.citizen.pinfl}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
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
                      <Eye className="h-3 w-3" /> Tez koʻrish
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
                            {la.description || 'Tafsilot kiritilmagan'}
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
      </section>

      {/* ===================================================================== */}
      {/* 3-BO'LIM: KARTALAR, TRANZAKSIYALAR VA TUSHGAN ARIZALAR                */}
      {/* ===================================================================== */}
      <section id="sec-cards" className="scroll-mt-20 space-y-4">
        <SectionHeading
          step={3}
          title="Kartalar, tranzaksiyalar va kartalarga tushgan arizalar"
          subtitle="Avval firibgar/takroriy kartalar va ularga tushgan boshqa arizalar, soʻngra fuqaroning kartalari boʻyicha tranzaksiyalar"
          count={cardRelations.length}
          icon={<CreditCard className="h-4 w-4 text-primary" />}
        />

        {/* A. Takrorlangan kartalar va ularga tushgan boshqa arizalar */}
        {cardRelations.length > 0 && (
          <div className="space-y-3.5">
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
                      ? 'border-red-500/50 bg-red-500/[0.02]'
                      : 'border-border/80 bg-card/70'
                  }`}
                >
                  <CardHeader className="p-4 bg-muted/30 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isReceiver
                            ? 'bg-red-500/12 text-red-600 border-red-500/30'
                            : 'bg-blue-500/10 text-blue-600 border-blue-500/25'
                        }`}
                      >
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigateWithTrail(`/cards/${cr.card.id}`)}
                            className="font-mono text-base font-extrabold text-foreground hover:text-primary hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            {formatDossierCard(cr.card.card_number, cr.card.masked_number)}
                            <ExternalLink className="h-3.5 w-3.5 text-primary" />
                          </button>
                          {isReceiver ? (
                            <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/35 text-xs font-bold gap-1">
                              <ShieldAlert className="h-3 w-3" />
                              Firibgar / Pul olgan karta
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-semibold">
                              Jabrlanuvchi kartasi
                            </Badge>
                          )}
                          {cr.card.bank_name && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Building2 className="h-3 w-3" />
                              {cr.card.bank_name}
                            </Badge>
                          )}
                        </div>
                        {cr.card.full_name && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3 text-primary" />
                            Karta egasi:{' '}
                            <strong className="text-foreground">{cr.card.full_name}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <div className="text-left lg:text-right mr-1">
                        <span className="text-[10px] uppercase text-muted-foreground block">
                          Boshqa arizalardagi zarar
                        </span>
                        <span className="font-mono text-sm font-extrabold text-rose-600 dark:text-rose-400">
                          {formatDossierMoney(totalLossForCard)}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDrawerTarget({ type: 'card', id: cr.card.id })}
                        className="h-7 text-xs gap-1 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Karta oʻtkazmalari
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/10">
                          <TableHead>Ariza №</TableHead>
                          <TableHead>Jabrlanuvchi / Arizachi</TableHead>
                          <TableHead>Ushbu arizadagi roli</TableHead>
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
                                {la.citizen_name ? (
                                  <div>
                                    <p className="font-semibold text-foreground">
                                      {la.citizen_name}
                                    </p>
                                    {la.citizen_phone && (
                                      <p className="text-[11px] font-mono text-muted-foreground">
                                        {formatDossierPhone(la.citizen_phone)}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  '—'
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

        {/* B. Arizachi fuqaroning barcha kartalari -> ichida tranzaksiyalar va arizalar */}
        {primaryCitizenDossier &&
          (primaryCitizenDossier.ownedCards.length > 0 ||
            primaryCitizenDossier.transfers.length > 0) && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                {citizenFullName} — kartalari va ulardagi tranzaksiyalar (
                {primaryCitizenDossier.ownedCards.length})
              </p>
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
            <Card className="border-border/70 bg-muted/20">
              <CardContent className="p-5 text-center text-xs text-muted-foreground">
                Kartalar va pul oʻtkazmalari boʻyicha bogʻliqlik topilmadi.
              </CardContent>
            </Card>
          )}
      </section>

      {/* ===================================================================== */}
      {/* 4-BO'LIM: TELEFON, RAQAMLI IZLAR VA ZANJIRLI BOG'LIQLIKLAR (FAQAT BOR BO'LSA) */}
      {/* ===================================================================== */}
      {hasCluesOrChains && (
        <section id="sec-clues" className="scroll-mt-20 space-y-4">
          <SectionHeading
            step={4}
            title="Telefon raqamlar, raqamli izlar va bilvosita zanjirlar"
            subtitle="Telegram, Instagram, IMEI, IP, kripto-hamyon va 2–3 qadamli bogʻlangan ishlar"
            count={clueRelations.length + multiHopChains.length}
            icon={<Fingerprint className="h-4 w-4 text-purple-500" />}
          />

          {clueRelations.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {clueRelations.map((cl) => {
                const roleMeta = getRoleMeta(cl.role_in_current_app);
                return (
                  <Card
                    key={`${cl.entity_type}-${cl.id}`}
                    className="py-0 gap-0 border-border/80 bg-card/70 overflow-hidden"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setDrawerTarget({ type: cl.entity_type, id: cl.id })}
                            className="font-mono text-sm font-extrabold text-primary hover:underline text-left break-all cursor-pointer"
                          >
                            {cl.value}
                          </button>
                          <p className="text-xs text-muted-foreground">
                            {cl.label}
                            {cl.operator ? ` · ${cl.operator}` : ''}
                          </p>
                        </div>
                        <Badge className={`text-[10px] shrink-0 ${roleMeta.badgeClass}`}>
                          {roleMeta.shortLabel}
                        </Badge>
                      </div>

                      {cl.owner_citizen && (
                        <button
                          type="button"
                          onClick={() =>
                            setDrawerTarget({ type: 'citizen', id: cl.owner_citizen!.id })
                          }
                          className="w-full p-2 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-xs flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <span className="inline-flex items-center gap-1.5 font-semibold truncate">
                            <User className="h-3.5 w-3.5 text-primary shrink-0" />
                            Egasi: {cl.owner_citizen.full_name}
                          </span>
                          <span className="text-[11px] text-primary shrink-0">Koʻrish →</span>
                        </button>
                      )}

                      {cl.linked_applications.length > 0 && (
                        <div className="space-y-1 pt-2 border-t border-border/60">
                          <span className="text-[10px] font-bold uppercase text-rose-500">
                            Boshqa {cl.linked_applications.length} ta arizada uchragan:
                          </span>
                          {cl.linked_applications.map((la) => (
                            <div
                              key={la.id}
                              onClick={() => setDrawerTarget({ type: 'application', id: la.id })}
                              className="flex items-center justify-between gap-2 text-xs p-1.5 rounded hover:bg-muted cursor-pointer"
                            >
                              <span className="font-mono font-bold text-primary">
                                № {la.application_number}
                              </span>
                              <span className="font-mono text-rose-500">
                                {formatDossierMoney(la.transfer_amount, la.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {multiHopChains.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5" />
                Bilvosita (2–3 qadamli) zanjirli arizalar ({multiHopChains.length})
              </p>
              {multiHopChains.map((chain, idx) => (
                <Card
                  key={idx}
                  onClick={() =>
                    setDrawerTarget({ type: 'application', id: chain.target_application.id })
                  }
                  className="py-0 gap-0 border-amber-500/40 bg-amber-500/[0.03] hover:border-amber-500 cursor-pointer transition-all"
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
                        {chain.target_application.description || 'Izoh mavjud emas'}
                      </p>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <span className="font-mono text-xs font-extrabold text-rose-500 block">
                        {formatDossierMoney(chain.target_application.transfer_amount)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {chain.target_application.district_name ||
                          formatDossierDate(chain.target_application.date)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ===================================================================== */}
      {/* 5-BO'LIM: GRAFIK SXEMA (ENG PASTDA, YIG'ILGAN HOLDA)                  */}
      {/* ===================================================================== */}
      {hasGraph && (
        <section id="sec-graph" className="scroll-mt-20 space-y-3">
          <SectionHeading
            step={graphStepNumber}
            title="Interaktiv grafik sxema"
            subtitle="Pul oqimi va bogʻliqliklarni vizual xaritada koʻrish uchun quyidan oching"
            icon={<GitBranch className="h-4 w-4 text-primary" />}
          />
          <CollapsibleInsightPanel
            title="Bogʻliqliklar va pul oqimi grafigi"
            subtitle="Karta va fuqarolar oʻrtasidagi barcha aloqalar interaktiv sxemada"
            icon={<GitBranch className="h-4 w-4" />}
            badgeText={`${data.network_graph?.nodes.length || data.graph?.nodes.length || 0} ta tugun`}
            defaultOpen={false}
          >
            <EntityNetworkGraph
              networkGraph={data.network_graph}
              financialGraph={data.graph}
              defaultMode="financial"
            />
          </CollapsibleInsightPanel>
        </section>
      )}

      {/* O‘ngdan ochiladigan Tezkor Yon Oyna (Kontekstni yo‘qotmasdan ko‘rish) */}
      <DossierQuickDrawer
        target={drawerTarget}
        onClose={() => setDrawerTarget(null)}
        trail={breadcrumbs}
      />
    </div>
  );
}

export default ApplicationRelationsPage;
