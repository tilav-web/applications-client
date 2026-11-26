import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  Loader2,
  Phone,
  RefreshCw,
  Sparkles,
  TrendingUp,
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
  DossierTopBar,
  InlineRoleBadge,
  SectionTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Rekvizit maʼlumotlari yuklanmoqda...</p>
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
            <AlertTriangle className="h-9 w-9 text-rose-500 mx-auto" />
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
  const verdict = buildClueVerdict(stats, isPhone ? 'Telefon' : 'Raqamli iz');

  return (
    <div className="w-full space-y-4 pb-12">
      {/* 1. Yagona qatorli TopBar */}
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

      {/* 2. Ixcham Rekvizit Pasporti + Egasi */}
      <Card className="py-0 gap-0 border-border/80 bg-card overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-11 w-11 rounded-xl bg-purple-500/12 border border-purple-500/35 text-purple-600 flex items-center justify-center shrink-0">
                {isPhone ? <Phone className="h-5 w-5" /> : <Fingerprint className="h-5 w-5" />}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-extrabold font-mono text-foreground break-all">
                    {mainTitle}
                  </h1>
                  <InlineRoleBadge verdict={verdict} />
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{subTitle}</span>
                  {owner ? (
                    <button
                      type="button"
                      onClick={() => navigateWithTrail(`/citizens/${owner.id}`)}
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
                    >
                      <User className="h-3.5 w-3.5" />
                      Egasi: {ownerName}
                    </button>
                  ) : (
                    <span>Egasi biriktirilmagan</span>
                  )}
                </div>
              </div>
            </div>

            {dossier.canMutate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBindOpen(true)}
                className="h-7 px-2.5 text-xs gap-1 shrink-0 cursor-pointer self-start"
              >
                <UserCheck className="h-3.5 w-3.5 text-primary" />
                {owner ? 'Egasini oʻzgartirish' : 'Fuqaroga biriktirish'}
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-3 border-t border-border/60 text-xs">
            <span>
              Uchragan arizalar: <strong className="font-mono">{stats.totalApplications} ta</strong>
            </span>
            <span>
              Bogʻliq zarar:{' '}
              <strong className="font-mono text-rose-600 dark:text-rose-400">
                {formatDossierMoney(stats.totalLossInLinkedApps)}
              </strong>
            </span>
            <span className="text-muted-foreground">
              Gumonlanuvchi: {stats.suspectOrDropperAppsCount} · Jabrlanuvchi:{' '}
              {stats.victimAppsCount} · Birga uchragan izlar: {dossier.coOccurringClues.length}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Alohida Tablar */}
      <Tabs defaultValue="applications" className="w-full space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 w-full justify-start">
          <TabsTrigger value="applications" className="text-xs gap-1.5 cursor-pointer">
            <FileText className="h-3.5 w-3.5" />
            <span>Uchragan Arizalar</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
              {dossier.directApplications.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="flow" className="text-xs gap-1.5 cursor-pointer">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Moliyaviy Pul Oqimi</span>
          </TabsTrigger>

          <TabsTrigger value="analytics" className="text-xs gap-1.5 cursor-pointer">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Statistika va Aloqador izlar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-3 mt-0">
          <SectionTitle
            title="Ushbu rekvizit uchragan arizalar"
            count={dossier.directApplications.length}
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
        </TabsContent>

        <TabsContent value="flow" className="mt-0">
          <EntityNetworkGraph
            financialGraph={dossier.financialGraph}
            heightClassName="h-[520px]"
            title="Moliyaviy Pul Oqimi"
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          <DossierAnalyticsSection
            stats={dossier.stats}
            coOccurringClues={dossier.coOccurringClues}
            evidenceFiles={dossier.evidenceFiles}
          />
        </TabsContent>
      </Tabs>

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
