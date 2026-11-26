import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  GitBranch,
  Layers,
  Loader2,
  Phone,
  RefreshCw,
  Sparkles,
  TrendingUp,
  User,
  UserCheck,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EntityNetworkGraph } from '@/components/graph/entity-network-graph';
import { BindToCitizenDialog } from '@/components/intelligence/bind-to-citizen-dialog';
import { DossierAnalyticsSection } from '@/components/intelligence/dossier-analytics-section';
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
import { getErrorMessage } from '@/lib/error';

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

export function ClueDossierPage() {
  const { type, id } = useParams<{ type: 'phone' | 'identifier'; id: string }>();
  const navigate = useNavigate();

  const entityType: 'phone' | 'identifier' = type === 'phone' ? 'phone' : 'identifier';
  const [bindOpen, setBindOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'excel' | 'docx' | null>(null);

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">360° Tahliliy Dosye yuklanmoqda...</p>
      </div>
    );
  }

  if (isError || !dossier) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Orqaga qaytish
        </Button>
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardContent className="p-6 text-center space-y-2">
            <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold">{getErrorMessage(error)}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPhone = entityType === 'phone';
  const mainTitle = isPhone
    ? dossier.phone?.formatted_number || `+${dossier.phone?.phone_number || ''}`
    : dossier.identifier?.raw_value || 'Identifikator';
  const subTitle = isPhone
    ? `Aloqa operatori: ${dossier.phone?.operator || 'Nomaʼlum'}`
    : `Turi: ${dossier.identifier?.type_label || dossier.identifier?.type || 'Raqamli iz'}`;

  const owner = dossier.citizen;
  const ownerName = owner?.full_name?.trim() || null;
  const stats = dossier.stats;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2 -ml-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Orqaga qaytish</span>
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
            className="h-8 text-xs gap-1.5 border-emerald-500/40 text-emerald-600 cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel Dosye
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('docx')}
            disabled={exportingFormat !== null}
            className="h-8 text-xs gap-1.5 border-blue-500/40 text-blue-600 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
            Word Maʼlumotnoma
          </Button>
        </div>
      </div>

      {/* Header Card */}
      <Card className="py-0 gap-0 border-border/80 bg-card/70 backdrop-blur-md min-w-0 overflow-hidden">
        <CardContent className="p-4 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 min-w-0">
          <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-purple-500/15 border-2 border-purple-500/40 text-purple-500 flex items-center justify-center shrink-0">
              {isPhone ? (
                <Phone className="h-6 w-6 sm:h-7 sm:w-7" />
              ) : (
                <Fingerprint className="h-6 w-6 sm:h-7 sm:w-7" />
              )}
            </div>

            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h1 className="text-lg sm:text-2xl font-extrabold font-mono text-foreground break-all">
                  {mainTitle}
                </h1>
                <Badge
                  className={
                    stats.suspectOrDropperAppsCount > 0
                      ? 'bg-rose-500/15 text-rose-600 border-rose-500/30 font-bold'
                      : 'bg-blue-500/15 text-blue-600 border-blue-500/30'
                  }
                >
                  Xavf: {stats.riskScore}%
                </Badge>
                <span
                  className={`text-xs font-semibold break-words ${
                    stats.suspectOrDropperAppsCount > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {stats.riskLabel}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground break-words">
                <span>{subTitle}</span>
                {owner ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/citizens/${owner.id}`)}
                    className="inline-flex items-center gap-1 font-bold text-primary hover:underline cursor-pointer break-words text-left"
                  >
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span>Egasi: {ownerName} ➔</span>
                  </button>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                    Egasi hali shaxsga biriktirilmagan
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {dossier.canMutate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBindOpen(true)}
              className="h-8 text-xs gap-1.5 shrink-0 cursor-pointer self-start xl:self-auto"
            >
              <UserCheck className="h-3.5 w-3.5 text-primary" />
              {owner ? 'Boshqa fuqaroga oʻtkazish' : 'Fuqaroga biriktirish'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Uchragan Arizalar
              </p>
              <p className="text-2xl font-extrabold font-mono mt-0.5">{stats.totalApplications}</p>
            </div>
            <Layers className="h-8 w-8 text-primary opacity-75 shrink-0" />
          </CardContent>
        </Card>

        <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Jami Bogʻliq Zarar
              </p>
              <p className="text-lg sm:text-xl font-extrabold font-mono text-rose-500 mt-0.5 break-words">
                {formatMoney(stats.totalLossInLinkedApps)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-rose-500 opacity-75 shrink-0" />
          </CardContent>
        </Card>

        <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Birga Uchragan Rekvizitlar
              </p>
              <p className="text-2xl font-extrabold font-mono mt-0.5">
                {dossier.coOccurringClues.length}
              </p>
            </div>
            <Fingerprint className="h-8 w-8 text-purple-500 opacity-75 shrink-0" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="graph" className="w-full space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="graph" className="text-xs gap-1.5 cursor-pointer">
            <GitBranch className="h-3.5 w-3.5" />
            Bogʻliqliklar Xaritasi
          </TabsTrigger>
          <TabsTrigger value="applications" className="text-xs gap-1.5 cursor-pointer">
            <FileText className="h-3.5 w-3.5" />
            Uchragan Arizalar ({dossier.directApplications.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs gap-1.5 cursor-pointer">
            <Sparkles className="h-3.5 w-3.5" />
            Mikro-Statistika & Aloqador Rekvizitlar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="graph">
          <EntityNetworkGraph
            networkGraph={dossier.networkGraph}
            financialGraph={dossier.financialGraph}
            defaultMode="network"
          />
        </TabsContent>

        <TabsContent value="applications">
          <Card className="py-0 gap-0 border-border/80 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ariza №</TableHead>
                  <TableHead>Jabrlanuvchi</TableHead>
                  <TableHead>Roli</TableHead>
                  <TableHead>Tuman</TableHead>
                  <TableHead>Zarar Summasi</TableHead>
                  <TableHead>Sana</TableHead>
                  <TableHead className="text-right">Koʻrish</TableHead>
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
                  dossier.directApplications.map((app) => (
                    <TableRow
                      key={app.id}
                      onClick={() => navigate(`/applications/${app.id}`)}
                      className="cursor-pointer hover:bg-muted/40"
                    >
                      <TableCell className="font-mono font-bold text-primary">
                        № {app.application_number}
                      </TableCell>
                      <TableCell className="text-xs">{app.victim_name || '—'}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            app.role_in_app === 'SUSPECT'
                              ? 'bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px]'
                              : 'bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]'
                          }
                        >
                          {app.role_in_app}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{app.district_name || '—'}</TableCell>
                      <TableCell className="font-mono font-bold text-rose-500 text-xs">
                        {formatMoney(app.transfer_amount, app.currency)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatDate(app.date)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Eye className="h-4 w-4 ml-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <DossierAnalyticsSection
            stats={dossier.stats}
            coOccurringClues={dossier.coOccurringClues}
            evidenceFiles={dossier.evidenceFiles}
          />
        </TabsContent>
      </Tabs>

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
