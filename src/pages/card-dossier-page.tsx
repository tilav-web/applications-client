import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Eye,
  FileSpreadsheet,
  FileText,
  GitBranch,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  User,
  UserCheck,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EntityNetworkGraph } from '@/components/graph/entity-network-graph';
import { BindToCitizenDialog } from '@/components/intelligence/bind-to-citizen-dialog';
import { DossierAnalyticsSection } from '@/components/intelligence/dossier-analytics-section';
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

const formatCard = (num?: string | null, masked?: string | null) => {
  const clean = (num || '').replace(/\D/g, '');
  if (clean.length === 16) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)} ${clean.slice(12, 16)}`;
  }
  return masked || num || 'Raqamsiz';
};

export function CardDossierPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);
  const [bindOpen, setBindOpen] = useState(false);
  const [transitOpen, setTransitOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'excel' | 'docx' | null>(null);

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

  const confirmMatchMut = useMutation({
    mutationFn: (payload: { citizen_id: string; card_id: string }) =>
      intelligenceApi.confirmProbableMatch(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['card-dossier', id] });
      toast.success('Karta egasi tasdiqlandi va fuqaroga biriktirildi');
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Plastik karta 360° dosyesi yuklanmoqda...</p>
      </div>
    );
  }

  if (isError || !dossier || !dossier.card) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cards')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Kartalar roʻyxatiga qaytish
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

  const card = dossier.card;
  const stats = dossier.stats;
  const displayNum = formatCard(card.card_number, card.masked_number);
  const ownerCitizen = dossier.citizen;
  const ownerFullName = ownerCitizen?.full_name?.trim() || card.full_name || null;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/cards')}
          className="gap-2 -ml-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Plastik kartalar bazasiga qaytish</span>
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

      {/* Karta Pasporti Banneri */}
      <Card className="py-0 gap-0 border-border/80 bg-card/70 backdrop-blur-md min-w-0 overflow-hidden">
        <CardContent className="p-4 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 min-w-0">
          <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
            <div
              className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shrink-0 border-2 ${
                stats.riskLevel === 'CRITICAL' || stats.riskLevel === 'HIGH'
                  ? 'bg-rose-500/15 border-rose-500 text-rose-500'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-500'
              }`}
            >
              <CreditCard className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>

            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h1 className="text-lg sm:text-2xl font-extrabold font-mono tracking-wider text-foreground break-all">
                  {displayNum}
                </h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void copyTextToClipboard(
                      (card.card_number || displayNum).replace(/\s+/g, ''),
                    ).then((ok) => {
                      if (!ok) {
                        toast.error('Nusxa olib bo‘lmadi');
                        return;
                      }
                      setCopied(true);
                      toast.success('Karta raqami nusxalandi');
                      setTimeout(() => setCopied(false), 1800);
                    });
                  }}
                  className="h-7 px-2 text-xs gap-1 cursor-pointer shrink-0"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copied ? 'Nusxalandi' : 'Nusxa'}
                </Button>
                <Badge
                  className={
                    stats.riskLevel === 'CRITICAL' || stats.riskLevel === 'HIGH'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 font-bold'
                      : 'bg-blue-500/15 text-blue-600 border-blue-500/30'
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

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground break-words">
                <Badge variant="outline" className="gap-1 text-xs">
                  <Building2 className="h-3 w-3 shrink-0" />
                  {card.inferred_bank_name || card.bank?.name || 'Bank'}
                </Badge>
                {card.expire_date && <span className="font-mono">Muddati: {card.expire_date}</span>}
                {ownerCitizen ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/citizens/${ownerCitizen.id}`)}
                    className="inline-flex items-center gap-1 font-bold text-primary hover:underline cursor-pointer break-words text-left"
                  >
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span>Egasi: {ownerFullName} ➔</span>
                  </button>
                ) : ownerFullName ? (
                  <span className="font-medium text-foreground break-words">
                    Kartadagi F.I.O: {ownerFullName} (Fuqaro profiliga ulanmagan)
                  </span>
                ) : (
                  <span>Karta egasi koʻrsatilmagan</span>
                )}
              </div>
            </div>
          </div>

          {dossier.canMutate && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBindOpen(true)}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <UserCheck className="h-3.5 w-3.5 text-primary" />
                {ownerCitizen ? 'Egasini oʻzgartirish' : 'Fuqaroga biriktirish'}
              </Button>
              <Button
                size="sm"
                onClick={() => setTransitOpen(true)}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />+ Vipiska / Tranzit oʻtkazma
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ehtimoliy Karta Egasi Mosliklari */}
      {dossier.probableMatches.length > 0 && (
        <Card className="py-0 gap-0 border-amber-500/40 bg-amber-500/5 min-w-0 overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex flex-wrap items-center gap-2 text-amber-700 dark:text-amber-400">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>
                Ehtimoliy Karta Egasi Topildi ({dossier.probableMatches.length} ta nomzod)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2 min-w-0">
            {dossier.probableMatches.map((pm) => (
              <div
                key={pm.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-amber-500/30 bg-background/80 min-w-0 overflow-hidden"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      onClick={() => navigate(pm.target_route)}
                      className="font-bold text-sm text-primary hover:underline cursor-pointer break-words"
                    >
                      {pm.title}
                    </span>
                    <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30 text-[10px]">
                      {pm.confidence}% moslik
                    </Badge>
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
                    Tasdiqlab biriktirish
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Jami Kirim (Total In)
              </p>
              <p className="text-lg sm:text-xl font-extrabold font-mono text-emerald-600 mt-0.5 break-words">
                {formatMoney(stats.totalIncomingAmount)}
              </p>
            </div>
            <ArrowDownLeft className="h-8 w-8 text-emerald-500 opacity-75 shrink-0" />
          </CardContent>
        </Card>

        <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Jami Chiqim (Total Out)
              </p>
              <p className="text-lg sm:text-xl font-extrabold font-mono text-rose-500 mt-0.5 break-words">
                {formatMoney(stats.totalOutgoingAmount)}
              </p>
            </div>
            <ArrowUpRight className="h-8 w-8 text-rose-500 opacity-75 shrink-0" />
          </CardContent>
        </Card>

        <Card className="py-0 gap-0 border-border/80 bg-card/60 min-w-0 overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Bogʻlangan Arizalar
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
                Tranzaksiyalar Soni
              </p>
              <p className="text-2xl font-extrabold font-mono mt-0.5">{stats.transactionsCount}</p>
            </div>
            <ArrowRightLeft className="h-8 w-8 text-amber-500 opacity-75 shrink-0" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="graph" className="w-full space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="graph" className="text-xs gap-1.5 cursor-pointer">
            <GitBranch className="h-3.5 w-3.5" />
            Bogʻliqliklar & Pul Oqimi Xaritasi
          </TabsTrigger>
          <TabsTrigger value="transfers" className="text-xs gap-1.5 cursor-pointer">
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Kirim-Chiqim Oʻtkazmalar ({dossier.transfers.length})
          </TabsTrigger>
          <TabsTrigger value="applications" className="text-xs gap-1.5 cursor-pointer">
            <FileText className="h-3.5 w-3.5" />
            Arizalar & Zanjirlar (
            {dossier.directApplications.length + dossier.multiHopChains.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs gap-1.5 cursor-pointer">
            <Sparkles className="h-3.5 w-3.5" />
            Mikro-Statistika & Dalillar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="graph">
          <EntityNetworkGraph
            networkGraph={dossier.networkGraph}
            financialGraph={dossier.financialGraph}
            defaultMode="network"
          />
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <Card className="py-0 gap-0 border-border/80 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Yoʻnalish</TableHead>
                  <TableHead>Summa</TableHead>
                  <TableHead>Joʻnatuvchi</TableHead>
                  <TableHead>Qabul Qiluvchi</TableHead>
                  <TableHead>Provayder</TableHead>
                  <TableHead>Sana va Vaqt</TableHead>
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
                      Ushbu karta boʻyicha oʻtkazmalar kiritilmagan
                    </TableCell>
                  </TableRow>
                ) : (
                  dossier.transfers.map((tr) => (
                    <TableRow key={tr.id}>
                      <TableCell>
                        {tr.direction === 'INCOMING' ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                            ↙ Kirim
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px]">
                            ↗ Chiqim
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
                            className="font-mono text-xs font-semibold text-primary hover:underline cursor-pointer"
                          >
                            {tr.sender_card_number}
                          </button>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {tr.receiver_card_id ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/cards/${tr.receiver_card_id}`)}
                            className="font-mono text-xs font-semibold text-primary hover:underline cursor-pointer"
                          >
                            {tr.receiver_card_number}
                          </button>
                        ) : (
                          '—'
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
                          <span className="text-xs text-muted-foreground">Vipiska</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <Card className="py-0 gap-0 border-border/80 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ariza №</TableHead>
                  <TableHead>Jabrlanuvchi</TableHead>
                  <TableHead>Karta Roli</TableHead>
                  <TableHead>Zarar Summasi</TableHead>
                  <TableHead>Tuman</TableHead>
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
                      <TableCell className="text-xs font-medium">
                        {app.victim_name || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            app.role_in_app === 'DROPPER'
                              ? 'bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px]'
                              : 'bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]'
                          }
                        >
                          {app.role_in_app}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-rose-500 text-xs">
                        {formatMoney(app.transfer_amount, app.currency)}
                      </TableCell>
                      <TableCell className="text-xs">{app.district_name || '—'}</TableCell>
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

          {dossier.multiHopChains.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold flex flex-wrap items-center gap-2">
                <GitBranch className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  Karta egasining boshqa kartalari orqali bogʻliq ishlar (
                  {dossier.multiHopChains.length})
                </span>
              </h3>
              {dossier.multiHopChains.map((chain, i) => (
                <Card
                  key={i}
                  onClick={() => navigate(`/applications/${chain.target_application.id}`)}
                  className="py-0 gap-0 border-amber-500/30 bg-amber-500/[0.03] hover:border-amber-500 cursor-pointer min-w-0 overflow-hidden"
                >
                  <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono min-w-0">
                      {chain.chain_steps.map((step, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 max-w-full">
                          <span className="px-2 py-0.5 rounded bg-background border font-semibold break-all">
                            {step}
                          </span>
                          {idx < chain.chain_steps.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
                          )}
                        </span>
                      ))}
                    </div>
                    <span className="font-mono text-xs font-bold text-rose-500 shrink-0">
                      {formatMoney(chain.target_application.transfer_amount)}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
