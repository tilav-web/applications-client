import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  GitBranch,
  Loader2,
  Phone,
  RefreshCw,
  Sparkles,
  User,
  UserCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { EntityNetworkGraph } from '@/components/graph/entity-network-graph';
import { BindToCitizenDialog } from '@/components/intelligence/bind-to-citizen-dialog';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { intelligenceApi } from '@/lib/api';
import {
  buildClueVerdict,
  formatDossierDate,
  formatDossierMoney,
  formatDossierPhone,
  getRoleMeta,
  useDossierTrail,
} from '@/lib/dossier-navigation';
import { getErrorMessage } from '@/lib/error';

export function ClueDossierPage() {
  const { type, id } = useParams<{ type: 'phone' | 'identifier'; id: string }>();

  const entityType: 'phone' | 'identifier' = type === 'phone' ? 'phone' : 'identifier';
  const [bindOpen, setBindOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'excel' | 'docx' | null>(null);
  const [drawerTarget, setDrawerTarget] = useState<QuickDrawerTarget | null>(null);

  const {
    data: dossier,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['clue-dossier', entityType, id],
    queryFn: () =>
      entityType === 'phone'
        ? intelligenceApi.getPhoneDossier(id!)
        : intelligenceApi.getIdentifierDossier(id!),
    enabled: !!id,
  });

  const isPhone = entityType === 'phone';
  const mainTitle = isPhone
    ? dossier?.phone?.formatted_number ||
      formatDossierPhone(dossier?.phone?.phone_number) ||
      'Telefon'
    : dossier?.identifier?.raw_value || 'Raqamli iz';

  const currentTrailItem = useMemo(
    () => ({
      label: mainTitle,
      to: `/dossier/${entityType}/${id}`,
      kind: entityType,
    }),
    [mainTitle, entityType, id],
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

  const handleExport = async (format: 'excel' | 'docx') => {
    if (!id) return;
    try {
      setExportingFormat(format);
      const blob = await intelligenceApi.exportDossier(entityType, id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rekvizit_360_Dosye_${id.slice(0, 6)}.${format === 'docx' ? 'docx' : 'xlsx'}`;
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

  const navSections = useMemo<DossierNavSection[]>(() => {
    if (!dossier) return [];
    return [
      { id: 'sec-clue', step: 1, label: isPhone ? 'Telefon va Egasi' : 'Raqamli iz va Egasi' },
      {
        id: 'sec-apps',
        step: 2,
        label: 'Uchragan arizalar',
        count: dossier.directApplications.length,
      },
      { id: 'sec-graph', step: 3, label: 'Graf va Statistika' },
    ];
  }, [dossier, isPhone]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Rekvizit dosyesi yuklanmoqda...</p>
      </div>
    );
  }

  if (isError || !dossier) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-4">
        <DossierTopBar
          breadcrumbs={breadcrumbs}
          backLabel={previousItem.label}
          onBack={goBack}
          onBreadcrumbClick={goToBreadcrumb}
        />
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardContent className="p-6 text-center space-y-2">
            <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold">{getErrorMessage(error)}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subTitle = isPhone
    ? `Aloqa operatori: ${dossier.phone?.operator || 'Nomaʼlum'}`
    : `Turi: ${dossier.identifier?.type_label || dossier.identifier?.type || 'Raqamli iz'}`;

  const owner = dossier.citizen;
  const ownerName = owner?.full_name?.trim() || null;
  const stats = dossier.stats;
  const verdict = buildClueVerdict(stats, isPhone ? 'Telefon raqami' : 'Raqamli iz');

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
              className="h-8 text-xs gap-1.5 border-emerald-500/40 text-emerald-600 cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('docx')}
              disabled={exportingFormat !== null}
              className="h-8 text-xs gap-1.5 border-blue-500/40 text-blue-600 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              Word
            </Button>
          </>
        }
      />

      {/* Sticky Navigatsiya */}
      <DossierSectionNav sections={navSections} />

      {/* ===================================================================== */}
      {/* 1-BO'LIM: REKVIZIT PASPORTI, EGASI VA ROL HUKMI                       */}
      {/* ===================================================================== */}
      <section id="sec-clue" className="scroll-mt-20 space-y-4">
        <Card className="py-0 gap-0 border-border/80 bg-card/70 overflow-hidden">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-purple-500/15 border-2 border-purple-500/40 text-purple-500 flex items-center justify-center shrink-0">
                  {isPhone ? (
                    <Phone className="h-6 w-6 sm:h-7 sm:w-7" />
                  ) : (
                    <Fingerprint className="h-6 w-6 sm:h-7 sm:w-7" />
                  )}
                </div>

                <div className="space-y-1 min-w-0">
                  <h1 className="text-lg sm:text-2xl font-extrabold font-mono text-foreground break-all">
                    {mainTitle}
                  </h1>
                  <p className="text-xs text-muted-foreground">{subTitle}</p>
                </div>
              </div>

              {dossier.canMutate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBindOpen(true)}
                  className="h-8 text-xs gap-1.5 shrink-0 cursor-pointer self-start"
                >
                  <UserCheck className="h-3.5 w-3.5 text-primary" />
                  {owner ? 'Boshqa fuqaroga oʻtkazish' : 'Fuqaroga biriktirish'}
                </Button>
              )}
            </div>

            {/* Egasi (Fuqaro) */}
            {owner ? (
              <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase text-primary block">
                      Rekvizit egasi (Fuqaro)
                    </span>
                    <button
                      type="button"
                      onClick={() => navigateWithTrail(`/citizens/${owner.id}`)}
                      className="text-sm font-extrabold text-foreground hover:text-primary hover:underline cursor-pointer text-left truncate block"
                    >
                      {ownerName}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDrawerTarget({ type: 'citizen', id: owner.id })}
                    className="h-7 text-xs gap-1 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" /> Tez koʻrish
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => navigateWithTrail(`/citizens/${owner.id}`)}
                    className="h-7 text-xs gap-1 cursor-pointer"
                  >
                    <span>Fuqaro dosyesi</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 text-xs text-amber-700 dark:text-amber-300">
                Ushbu rekvizit egasi hali bazadagi fuqaro profiliga biriktirilmagan.
              </div>
            )}

            <RoleVerdictBanner verdict={verdict} riskScore={stats.riskScore} />
          </CardContent>
        </Card>

        <DossierMetricStrip
          items={[
            {
              label: 'Uchragan arizalar',
              value: `${stats.totalApplications} ta`,
              sub: 'Jami bogʻlangan ishlar',
            },
            {
              label: 'Bogʻliq zarar',
              value: formatDossierMoney(stats.totalLossInLinkedApps),
              sub: 'Arizalar yigʻindisi',
              tone: 'danger',
            },
            {
              label: 'Birga uchragan izlar',
              value: `${dossier.coOccurringClues.length} ta`,
              sub: 'Aloqador karta va niklar',
              tone: 'info',
            },
            {
              label: 'Gumonlanuvchi ishlari',
              value: `${stats.suspectOrDropperAppsCount} ta`,
              sub: `Jabrlanuvchi: ${stats.victimAppsCount} ta`,
            },
          ]}
        />
      </section>

      {/* ===================================================================== */}
      {/* 2-BO'LIM: UCHRAGAN ARIZALAR                                           */}
      {/* ===================================================================== */}
      <section id="sec-apps" className="scroll-mt-20 space-y-4">
        <SectionHeading
          step={2}
          title="Ushbu rekvizit uchragan arizalar"
          subtitle="Rekvizit qayd etilgan barcha murojaatlar"
          count={dossier.directApplications.length}
          icon={<FileText className="h-4 w-4 text-primary" />}
        />

        <Card className="py-0 gap-0 border-border/80 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead>Ariza №</TableHead>
                  <TableHead>Jabrlanuvchi</TableHead>
                  <TableHead>Roli</TableHead>
                  <TableHead>Tuman</TableHead>
                  <TableHead>Zarar summasi</TableHead>
                  <TableHead>Sana</TableHead>
                  <TableHead className="text-right">Oʻtish</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dossier.directApplications.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-xs text-muted-foreground"
                    >
                      Arizalar topilmadi
                    </TableCell>
                  </TableRow>
                ) : (
                  dossier.directApplications.map((app) => {
                    const roleMeta = getRoleMeta(app.role_in_app);
                    return (
                      <TableRow
                        key={app.id}
                        onClick={() => setDrawerTarget({ type: 'application', id: app.id })}
                        className="cursor-pointer hover:bg-muted/40 text-xs"
                      >
                        <TableCell className="font-mono font-bold text-primary whitespace-nowrap">
                          № {app.application_number}
                        </TableCell>
                        <TableCell>{app.victim_name || '—'}</TableCell>
                        <TableCell>
                          <Badge className={`text-[11px] ${roleMeta.badgeClass}`}>
                            {roleMeta.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{app.district_name || '—'}</TableCell>
                        <TableCell className="font-mono font-bold text-rose-500 whitespace-nowrap">
                          {formatDossierMoney(app.transfer_amount, app.currency)}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
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
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => navigateWithTrail(`/applications/${app.id}`)}
                              className="h-7 w-7 p-0 text-primary cursor-pointer"
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
      </section>

      {/* ===================================================================== */}
      {/* 3-BO'LIM: GRAFIK SXEMA VA MIKRO-STATISTIKA (YIG'ILGAN HOLDA)          */}
      {/* ===================================================================== */}
      <section id="sec-graph" className="scroll-mt-20 space-y-3">
        <SectionHeading
          step={3}
          title="Grafik sxema va mikro-statistika"
          subtitle="Bogʻliqliklar xaritasi va birga uchragan boshqa rekvizitlar"
          icon={<GitBranch className="h-4 w-4 text-primary" />}
        />

        <CollapsibleInsightPanel
          title="Bogʻliqliklar grafigi"
          subtitle="Ushbu rekvizit bilan bogʻlangan barcha shaxslar va arizalar xaritada"
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
          title="Mikro-statistika va birga uchragan rekvizitlar"
          subtitle="Hududlar kesimi, vaqt faolligi va aloqador kartalar/niklar"
          icon={<Sparkles className="h-4 w-4" />}
          badgeText={`${dossier.coOccurringClues.length} rekvizit`}
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

      <BindToCitizenDialog
        open={bindOpen}
        onOpenChange={setBindOpen}
        entityType={entityType}
        entityId={id!}
        entityLabel={mainTitle}
        invalidateKeys={[['clue-dossier', entityType, id]]}
      />
    </div>
  );
}

export default ClueDossierPage;
