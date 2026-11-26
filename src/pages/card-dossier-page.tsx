import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  GitBranch,
  Loader2,
  Plus,
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
import { TransitTransferDialog } from '@/components/intelligence/transit-transfer-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { copyTextToClipboard } from '@/lib/clipboard';
import {
  buildCardVerdict,
  formatDossierCard,
  formatDossierDate,
  formatDossierMoney,
  formatDossierPhone,
  getRoleMeta,
  useDossierTrail,
} from '@/lib/dossier-navigation';
import { getErrorMessage } from '@/lib/error';

type TransferDirFilter = 'ALL' | 'INCOMING' | 'OUTGOING';

export function CardDossierPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);
  const [bindOpen, setBindOpen] = useState(false);
  const [transitOpen, setTransitOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'excel' | 'docx' | null>(null);
  const [drawerTarget, setDrawerTarget] = useState<QuickDrawerTarget | null>(null);
  const [dirFilter, setDirFilter] = useState<TransferDirFilter>('ALL');

  const {
    data: dossier,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['card-dossier', id],
    queryFn: () => intelligenceApi.getCardDossier(id!),
    enabled: !!id,
  });

  const displayNum = formatDossierCard(dossier?.card?.card_number, dossier?.card?.masked_number);

  const currentTrailItem = useMemo(
    () => ({
      label: `Karta ${displayNum}`,
      to: `/cards/${id}`,
      kind: 'card' as const,
    }),
    [displayNum, id],
  );

  const fallbackRoot = useMemo(
    () => ({
      label: 'Plastik kartalar',
      to: '/cards',
      kind: 'cards' as const,
    }),
    [],
  );

  const { breadcrumbs, previousItem, navigateWithTrail, goBack, goToBreadcrumb } = useDossierTrail(
    fallbackRoot,
    currentTrailItem,
  );

  const confirmMatchMut = useMutation({
    mutationFn: (payload: { citizen_id: string; card_id: string }) =>
      intelligenceApi.confirmProbableMatch(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['card-dossier', id] });
      toast.success('Karta egasi tasdiqlandi');
    },
    onError: (err) => toast.error('Xatolik', { description: getErrorMessage(err) }),
  });

  const handleExport = async (format: 'excel' | 'docx') => {
    if (!id) return;
    try {
      setExportingFormat(format);
      const blob = await intelligenceApi.exportDossier('card', id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Karta_360_Dosye_${id.slice(0, 6)}.${format === 'docx' ? 'docx' : 'xlsx'}`;
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

  const filteredTransfers = useMemo(() => {
    const list = dossier?.transfers || [];
    if (dirFilter === 'ALL') return list;
    return list.filter((tr) => tr.direction === dirFilter);
  }, [dossier?.transfers, dirFilter]);

  const transferCounts = useMemo(() => {
    const list = dossier?.transfers || [];
    return {
      all: list.length,
      in: list.filter((t) => t.direction === 'INCOMING').length,
      out: list.filter((t) => t.direction !== 'INCOMING').length,
    };
  }, [dossier?.transfers]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Karta maʼlumotlari yuklanmoqda...</p>
      </div>
    );
  }

  if (isError || !dossier || !dossier.card) {
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

  const card = dossier.card;
  const stats = dossier.stats;
  const ownerCitizen = dossier.citizen;
  const ownerFullName = ownerCitizen?.full_name?.trim() || card.full_name || null;
  const verdict = buildCardVerdict(stats, dossier.directApplications);

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

      {/* 2. Ixcham Karta Pasporti + Egasi + Inline Ko'rsatkichlar */}
      <Card className="py-0 gap-0 border-border/80 bg-card overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${
                  verdict.tone === 'critical' || verdict.tone === 'danger'
                    ? 'bg-rose-500/12 border-rose-500/40 text-rose-600'
                    : 'bg-amber-500/12 border-amber-500/35 text-amber-600'
                }`}
              >
                <CreditCard className="h-5 w-5" />
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-extrabold font-mono tracking-wide text-foreground break-all">
                    {displayNum}
                  </h1>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      void copyTextToClipboard(
                        (card.card_number || displayNum).replace(/\s+/g, ''),
                      ).then((ok) => {
                        if (!ok) {
                          toast.error('Nusxa olib boʻlmadi');
                          return;
                        }
                        setCopied(true);
                        toast.success('Karta raqami nusxalandi');
                        setTimeout(() => setCopied(false), 1800);
                      });
                    }}
                    className="h-7 px-2 text-xs gap-1 cursor-pointer text-muted-foreground"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {copied ? 'Nusxalandi' : 'Nusxa'}
                  </Button>
                  <InlineRoleBadge verdict={verdict} />
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {card.inferred_bank_name || card.bank?.name || 'Bank koʻrsatilmagan'}
                  </span>
                  {card.expire_date && (
                    <span className="font-mono">Muddati: {card.expire_date}</span>
                  )}
                  {ownerCitizen ? (
                    <button
                      type="button"
                      onClick={() => navigateWithTrail(`/citizens/${ownerCitizen.id}`)}
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
                    >
                      <User className="h-3.5 w-3.5" />
                      Egasi: {ownerFullName}
                      {ownerCitizen.phone_number
                        ? ` (${formatDossierPhone(ownerCitizen.phone_number)})`
                        : ''}
                    </button>
                  ) : ownerFullName ? (
                    <span>Kartadagi F.I.O: {ownerFullName}</span>
                  ) : (
                    <span>Egasi koʻrsatilmagan</span>
                  )}
                </div>
              </div>
            </div>

            {dossier.canMutate && (
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBindOpen(true)}
                  className="h-7 px-2.5 text-xs gap-1 cursor-pointer"
                >
                  <UserCheck className="h-3.5 w-3.5 text-primary" />
                  {ownerCitizen ? 'Egasini oʻzgartirish' : 'Fuqaroga biriktirish'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setTransitOpen(true)}
                  className="h-7 px-2.5 text-xs gap-1 cursor-pointer"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />+ Oʻtkazma
                </Button>
              </div>
            )}
          </div>

          {/* Ixcham 1-qator ko'rsatkichlar */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-3 border-t border-border/60 text-xs">
            <span>
              Kirim:{' '}
              <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                {formatDossierMoney(stats.totalIncomingAmount)}
              </strong>{' '}
              <span className="text-muted-foreground">({transferCounts.in})</span>
            </span>
            <span>
              Chiqim:{' '}
              <strong className="font-mono text-rose-600 dark:text-rose-400">
                {formatDossierMoney(stats.totalOutgoingAmount)}
              </strong>{' '}
              <span className="text-muted-foreground">({transferCounts.out})</span>
            </span>
            <span>
              Arizalar: <strong className="font-mono">{stats.totalApplications} ta</strong>
            </span>
            <span>
              Tranzaksiyalar: <strong className="font-mono">{stats.transactionsCount} ta</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {dossier.probableMatches.length > 0 && (
        <Card className="py-0 gap-0 border-amber-500/40 bg-amber-500/5 overflow-hidden">
          <CardHeader className="px-4 py-3 pb-2">
            <CardTitle className="text-xs font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
              Ehtimoliy karta egasi ({dossier.probableMatches.length} ta nomzod)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            {dossier.probableMatches.map((pm) => (
              <div
                key={pm.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border border-amber-500/30 bg-background/80 text-xs"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => navigateWithTrail(pm.target_route)}
                    className="font-bold text-primary hover:underline cursor-pointer mr-2"
                  >
                    {pm.title}
                  </button>
                  <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30 text-[10px]">
                    {pm.confidence}% moslik
                  </Badge>
                  <p className="text-muted-foreground mt-0.5">{pm.reason}</p>
                </div>
                {dossier.canMutate && (
                  <Button
                    size="sm"
                    onClick={() => confirmMatchMut.mutate(pm.confirm_action)}
                    disabled={confirmMatchMut.isPending}
                    className="h-7 text-xs gap-1 shrink-0 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Tasdiqlash
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 3. Alohida Tablar */}
      <Tabs defaultValue="transfers" className="w-full space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 w-full justify-start">
          <TabsTrigger value="transfers" className="text-xs gap-1.5 cursor-pointer">
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>Tranzaksiyalar</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
              {dossier.transfers.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="applications" className="text-xs gap-1.5 cursor-pointer">
            <FileText className="h-3.5 w-3.5" />
            <span>Tushgan Arizalar</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
              {dossier.directApplications.length + dossier.multiHopChains.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="flow" className="text-xs gap-1.5 cursor-pointer">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Moliyaviy Pul Oqimi</span>
          </TabsTrigger>

          <TabsTrigger value="analytics" className="text-xs gap-1.5 cursor-pointer">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Statistika va Dalillar</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: TRANZAKSIYALAR */}
        <TabsContent value="transfers" className="space-y-3 mt-0">
          <SectionTitle
            title="Kartadagi kirim-chiqim tranzaksiyalar"
            count={dossier.transfers.length}
            action={
              dossier.canMutate ? (
                <Button
                  size="sm"
                  onClick={() => setTransitOpen(true)}
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Vipiska / Oʻtkazma
                </Button>
              ) : undefined
            }
          />

          {transferCounts.in > 0 && transferCounts.out > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { key: 'ALL', label: `Barchasi (${transferCounts.all})` },
                  { key: 'INCOMING', label: `↙ Kirim (${transferCounts.in})` },
                  { key: 'OUTGOING', label: `↗ Chiqim (${transferCounts.out})` },
                ] as { key: TransferDirFilter; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDirFilter(opt.key)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    dirFilter === opt.key
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
                    <TableHead>Yoʻnalish</TableHead>
                    <TableHead>Summa</TableHead>
                    <TableHead>Joʻnatuvchi</TableHead>
                    <TableHead>Qabul qiluvchi</TableHead>
                    <TableHead>Provayder</TableHead>
                    <TableHead>Sana va vaqt</TableHead>
                    <TableHead>Ariza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-xs text-muted-foreground"
                      >
                        Oʻtkazmalar topilmadi
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransfers.map((tr) => (
                      <TableRow key={tr.id} className="text-xs">
                        <TableCell>
                          {tr.direction === 'INCOMING' ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                              <ArrowDownLeft className="h-3.5 w-3.5" /> Kirim
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                              <ArrowUpRight className="h-3.5 w-3.5" /> Chiqim
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono font-bold whitespace-nowrap">
                          {formatDossierMoney(tr.amount, tr.currency)}
                        </TableCell>
                        <TableCell>
                          {tr.sender_card_id ? (
                            <button
                              type="button"
                              onClick={() =>
                                tr.sender_card_id === card.id
                                  ? undefined
                                  : setDrawerTarget({ type: 'card', id: tr.sender_card_id! })
                              }
                              className={`text-left ${
                                tr.sender_card_id === card.id
                                  ? 'text-muted-foreground'
                                  : 'text-primary hover:underline cursor-pointer'
                              }`}
                            >
                              <span className="font-mono font-semibold block">
                                {formatDossierCard(tr.sender_card_number)}
                              </span>
                              {tr.sender_owner_name && (
                                <span className="text-[11px] text-muted-foreground">
                                  {tr.sender_owner_name}
                                </span>
                              )}
                            </button>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {tr.receiver_card_id ? (
                            <button
                              type="button"
                              onClick={() =>
                                tr.receiver_card_id === card.id
                                  ? undefined
                                  : setDrawerTarget({ type: 'card', id: tr.receiver_card_id! })
                              }
                              className={`text-left ${
                                tr.receiver_card_id === card.id
                                  ? 'text-muted-foreground'
                                  : 'text-primary hover:underline cursor-pointer'
                              }`}
                            >
                              <span className="font-mono font-semibold block">
                                {formatDossierCard(tr.receiver_card_number)}
                              </span>
                              {tr.receiver_owner_name && (
                                <span className="text-[11px] text-muted-foreground">
                                  {tr.receiver_owner_name}
                                </span>
                              )}
                            </button>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tr.payment_provider || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                          {formatDossierDate(tr.transfer_date)} {tr.transfer_time || ''}
                        </TableCell>
                        <TableCell>
                          {tr.application_id ? (
                            <button
                              type="button"
                              onClick={() =>
                                setDrawerTarget({ type: 'application', id: tr.application_id! })
                              }
                              className="font-mono font-bold text-primary hover:underline cursor-pointer"
                            >
                              № {tr.application_number || 'Ariza'}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">Vipiska</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: TUSHGAN ARIZALAR */}
        <TabsContent value="applications" className="space-y-4 mt-0">
          <SectionTitle
            title="Ushbu karta qatnashgan arizalar"
            count={dossier.directApplications.length}
          />
          <Card className="py-0 gap-0 border-border/80 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead>Ariza №</TableHead>
                    <TableHead>Jabrlanuvchi</TableHead>
                    <TableHead>Karta roli</TableHead>
                    <TableHead>Zarar summasi</TableHead>
                    <TableHead>Tuman</TableHead>
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
                          <TableCell className="font-medium">{app.victim_name || '—'}</TableCell>
                          <TableCell>
                            <Badge className={`text-[11px] ${roleMeta.badgeClass}`}>
                              {roleMeta.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono font-bold text-rose-500 whitespace-nowrap">
                            {formatDossierMoney(app.transfer_amount, app.currency)}
                          </TableCell>
                          <TableCell>{app.district_name || '—'}</TableCell>
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

          {dossier.multiHopChains.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <SectionTitle
                title="Karta egasining boshqa kartalari orqali bogʻliq ishlar"
                count={dossier.multiHopChains.length}
                icon={<GitBranch className="h-4 w-4 text-amber-500" />}
              />
              {dossier.multiHopChains.map((chain, i) => (
                <Card
                  key={i}
                  onClick={() =>
                    setDrawerTarget({ type: 'application', id: chain.target_application.id })
                  }
                  className="py-0 gap-0 border-l-4 border-l-amber-500 border-border/80 hover:bg-muted/20 cursor-pointer"
                >
                  <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                      {chain.chain_steps.map((step, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-muted border font-semibold break-all">
                            {step}
                          </span>
                          {idx < chain.chain_steps.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
                          )}
                        </span>
                      ))}
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

        {/* TAB 3: MOLIYAVIY PUL OQIMI (TABSIZ + FULLSCREEN) */}
        <TabsContent value="flow" className="mt-0">
          <EntityNetworkGraph
            financialGraph={dossier.financialGraph}
            heightClassName="h-[520px]"
            title="Moliyaviy Pul Oqimi"
          />
        </TabsContent>

        {/* TAB 4: STATISTIKA VA DALILLAR */}
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
        entityType="card"
        entityId={card.id}
        entityLabel={displayNum}
        invalidateKeys={[['card-dossier', id], ['cards']]}
      />

      <TransitTransferDialog
        open={transitOpen}
        onOpenChange={setTransitOpen}
        availableCards={[card]}
        defaultSenderCardNumber={card.card_number || ''}
        onSuccessInvalidateKeys={[['card-dossier', id], ['financial-flow-graph']]}
      />
    </div>
  );
}

export default CardDossierPage;
