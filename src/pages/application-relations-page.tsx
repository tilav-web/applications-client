import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CreditCard,
  Eye,
  Layers,
  Link2,
  Loader2,
  Pencil,
  Phone,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

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
import { applicationsApi } from '@/lib/api';
import type {
  CardRelationItem,
  CitizenRelationItem,
  LinkedApplicationInfo,
} from '@/types/models';

const formatCurrency = (amount?: number | null, currency = 'UZS') => {
  if (amount === undefined || amount === null) return '—';
  return `${new Intl.NumberFormat('uz-UZ').format(Math.round(amount))} ${currency}`;
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatCardNumber = (num?: string | null, masked?: string | null) => {
  const val = num || masked;
  if (!val) return 'Raqam kiritilmagan';
  const clean = val.replace(/\D/g, '');
  if (clean.length === 16) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)} ${clean.slice(12, 16)}`;
  }
  return val;
};

export function ApplicationRelationsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['application-relations', id],
    queryFn: () => applicationsApi.getRelations(id!),
    enabled: !!id,
  });

  const app = data?.application;
  const stats = data?.stats;
  const cardRelations = data?.card_relations || [];
  const citizenRelations = data?.citizen_relations || [];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Ariza bog'liqliklari va tahliliy zanjir hisoblanmoqda...
        </p>
      </div>
    );
  }

  if (isError || !data || !app) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/applications')}
          className="gap-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Arizalar ro'yxatiga qaytish
        </Button>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-6 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Xatolik yuz berdi</h2>
            <p className="text-sm text-muted-foreground">
              {(error as Error)?.message || 'Bog‘liqliklar ma‘lumotlarini yuklab bo‘lmadi.'}
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

  const renderStatusBadge = (label: string, color?: string | null) => {
    const c = (color || '').toLowerCase();
    if (c.includes('amber') || c.includes('yellow') || label === 'JARAYONDA') {
      return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30">{label}</Badge>;
    }
    if (c.includes('emerald') || c.includes('green') || label === 'HAL_QILINDI') {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">{label}</Badge>
      );
    }
    if (c.includes('red') || c.includes('rose') || label === 'RAD_ETILDI') {
      return <Badge className="bg-red-500/10 text-red-500 border-red-500/30">{label}</Badge>;
    }
    return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">{label}</Badge>;
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Navigation & Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/applications')}
            className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Arizalar ro'yxatiga qaytish</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5 cursor-pointer text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Yangilash</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/applications/${app.id}`)}
              className="gap-1.5 cursor-pointer text-xs"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Arizani ko'rish</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => navigate(`/applications/edit/${app.id}`)}
              className="gap-1.5 cursor-pointer text-xs"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Tahrirlash</span>
            </Button>
          </div>
        </div>

        {/* Page Title Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary mb-1">
              <Link2 className="h-3.5 w-3.5" />
              <span>Tahliliy Bog'liqliklar Markazi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
              <span>Ariza Bog'liqliklari</span>
              <span className="font-mono text-primary text-xl sm:text-2xl font-bold bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                № {app.application_number || 'Raqamsiz'}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Mazkur ariza bo‘yicha aniqlangan umumiy firibgar kartalar, jabrlanuvchilar va takroriy fuqaro profillari tahlili
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {renderStatusBadge(
              app.application_status?.name || app.status || 'YANGI',
              app.application_status?.color,
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(app.date)}
            </span>
          </div>
        </div>
      </div>

      {/* Critical Fraud Chain Alert Banner */}
      {stats?.has_fraud_card_link && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 sm:p-5 text-red-600 dark:text-red-400 flex items-start gap-3.5 shadow-sm">
          <ShieldAlert className="h-6 w-6 text-red-500 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm sm:text-base tracking-tight text-red-600 dark:text-red-300">
              Diqqat: Xavfli Firibgarlik Zanjiri Aniqlangan!
            </h4>
            <p className="text-xs sm:text-sm text-red-600/90 dark:text-red-400/90 leading-relaxed">
              Ushbu arizadagi <strong>pul tushgan (firibgar) plastik kartasi</strong> boshqa jabrlanuvchilarning arizalarida ham qabul qiluvchi sifatida aniqlandi. Mazkur arizalarni yagona guruhli firibgarlik jinoyati doirasida birlashtirish tavsiya etiladi.
            </p>
          </div>
        </div>
      )}

      {/* Analytics KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Linked Applications */}
        <Card className="border-border/80 bg-card/60 backdrop-blur-sm relative overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Bog'langan Arizalar
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-foreground">
                  {stats?.total_linked_applications ?? 0}
                </span>
                <span className="text-xs text-muted-foreground font-medium">ta murojaat</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Karta yoki fuqaro orqali aloqador</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Layers className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Loss Amount */}
        <Card className="border-border/80 bg-card/60 backdrop-blur-sm relative overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Aniqlangan Umumiy Zarar
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-extrabold tracking-tight font-mono text-rose-500">
                  {formatCurrency(stats?.grand_total_loss)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Bog'liq barcha arizalar yig'indisi</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Shared Cards Count */}
        <Card className="border-border/80 bg-card/60 backdrop-blur-sm relative overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Aloqador Plastik Kartalar
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-foreground">
                  {stats?.total_cards_count ?? 0}
                </span>
                <span className="text-xs text-muted-foreground font-medium">ta karta</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Tizimda takrorlangan moliyaviy rekvizitlar</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <CreditCard className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Citizen Matches */}
        <Card className="border-border/80 bg-card/60 backdrop-blur-sm relative overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Aloqador Fuqarolar
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-foreground">
                  {stats?.total_citizens_count ?? 0}
                </span>
                <span className="text-xs text-muted-foreground font-medium">ta shaxs</span>
              </div>
              <p className="text-[11px] text-muted-foreground">JSHSHIR, pasport yoki tel bo'yicha</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 1: Plastic Cards Relations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span>Plastik Kartalar Bo'yicha Bog'liqliklar</span>
              <Badge variant="outline" className="text-xs">
                {cardRelations.length} ta karta
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              Ushbu arizadagi karta raqamlari boshqa qaysi arizalarda uchraganligi va umumiy moliyaviy zarar
            </p>
          </div>
        </div>

        {cardRelations.length === 0 ? (
          <Card className="border-border/60 bg-muted/20">
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              Ushbu arizaga tegishli kartalar bo'yicha boshqa arizalarda takrorlanish topilmadi.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {cardRelations.map((cr: CardRelationItem) => {
              const isReceiver = cr.role_in_current_app === 'RECEIVER';
              const totalLossForCard = cr.linked_applications.reduce(
                (sum, item) => sum + (Number(item.transfer_amount) || 0),
                0,
              );
              return (
                <Card
                  key={cr.card.id}
                  className={`border transition-all overflow-hidden ${
                    isReceiver
                      ? 'border-red-500/50 bg-red-500/[0.02]'
                      : 'border-border/80 bg-card/60'
                  }`}
                >
                  <CardHeader className="p-4 sm:p-5 bg-muted/30 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isReceiver
                            ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                            : 'bg-primary/10 text-primary border border-primary/20'
                        }`}
                      >
                        <CreditCard className="h-5 w-5" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-base sm:text-lg font-extrabold tracking-wide text-foreground">
                            {formatCardNumber(cr.card.card_number, cr.card.masked_number)}
                          </span>
                          {cr.card.bank_name && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Building2 className="h-3 w-3" />
                              {cr.card.bank_name}
                            </Badge>
                          )}
                          {isReceiver ? (
                            <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 text-xs font-bold gap-1">
                              <ShieldAlert className="h-3 w-3" />
                              Qabul qiluvchi (Firibgar / Dropper)
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs">
                              Jo'natuvchi karta
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                          {cr.card.full_name && (
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <User className="h-3 w-3 text-primary" />
                              {cr.card.full_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-left md:text-right">
                        <span className="text-[11px] text-muted-foreground uppercase block font-medium">
                          Mazkur karta bo'yicha bog'liq zarar:
                        </span>
                        <span className="font-mono text-base font-extrabold text-rose-500">
                          {formatCurrency(totalLossForCard)}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {cr.linked_applications.length} ta bog'liq ariza
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/10">
                          <TableHead className="w-[140px]">Ariza Raqami</TableHead>
                          <TableHead>Jabrlanuvchi / Arizachi</TableHead>
                          <TableHead>Karta roli</TableHead>
                          <TableHead>Zarar Summasi</TableHead>
                          <TableHead>Holati</TableHead>
                          <TableHead>Sana</TableHead>
                          <TableHead className="text-right w-[80px]">Amallar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cr.linked_applications.map((la: LinkedApplicationInfo) => {
                          const isReceiverInLinked = la.role_in_that_app === 'RECEIVER';
                          return (
                            <TableRow
                              key={la.id}
                              className="hover:bg-muted/30 cursor-pointer transition-colors"
                              onClick={() => navigate(`/applications/${la.id}`)}
                            >
                              <TableCell className="font-mono font-bold text-primary">
                                {la.application_number}
                              </TableCell>
                              <TableCell>
                                {la.citizen_name ? (
                                  <div className="space-y-0.5">
                                    <p className="text-xs font-semibold text-foreground">
                                      {la.citizen_name}
                                    </p>
                                    {la.citizen_phone && (
                                      <p className="text-[11px] text-muted-foreground">
                                        +{la.citizen_phone.replace(/\D/g, '')}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {isReceiverInLinked ? (
                                  <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-[11px]">
                                    Firibgar (Pul olgan)
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[11px]">
                                    Jabrlanuvchi kartasi
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="font-mono font-bold text-rose-500 text-xs">
                                {formatCurrency(la.transfer_amount, la.currency)}
                              </TableCell>
                              <TableCell>
                                {renderStatusBadge(la.status_label, la.status_color)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground font-mono">
                                {formatDate(la.date)}
                              </TableCell>
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/applications/${la.id}`)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="Arizani ochish"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
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
      </div>

      {/* Section 2: Citizen Profiles Relations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span>Fuqarolar Bo'yicha Bog'liqliklar</span>
              <Badge variant="outline" className="text-xs">
                {citizenRelations.length} ta fuqaro
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              JSHSHIR, pasport yoki telefon raqami mos kelgan takroriy arizalar tahlili
            </p>
          </div>
        </div>

        {citizenRelations.length === 0 ? (
          <Card className="border-border/60 bg-muted/20">
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              Ushbu arizadagi fuqaro profillari bo'yicha boshqa arizalarda takrorlanish topilmadi.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {citizenRelations.map((citR: CitizenRelationItem) => (
              <Card key={citR.citizen.id} className="border-border/80 bg-card/60 overflow-hidden">
                <CardHeader className="p-4 sm:p-5 bg-muted/30 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground">
                        {citR.citizen.last_name} {citR.citizen.first_name} {citR.citizen.middle_name || ''}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {citR.citizen.phone_number && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            +{citR.citizen.phone_number.replace(/\D/g, '')}
                          </span>
                        )}
                        {citR.citizen.passport && (
                          <span>Pasport: <strong className="text-foreground">{citR.citizen.passport}</strong></span>
                        )}
                        {citR.citizen.pinfl && (
                          <span>JSHSHIR: <strong className="text-foreground">{citR.citizen.pinfl}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {citR.match_reasons.map((reason: string, rIdx: number) => (
                      <Badge
                        key={rIdx}
                        variant="secondary"
                        className="text-[11px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                      >
                        {reason}
                      </Badge>
                    ))}
                    <Badge variant="outline" className="text-xs">
                      {citR.linked_applications.length} ta ariza
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead className="w-[140px]">Ariza Raqami</TableHead>
                        <TableHead>Tafsilot</TableHead>
                        <TableHead>Zarar Summasi</TableHead>
                        <TableHead>Holati</TableHead>
                        <TableHead>Sana</TableHead>
                        <TableHead className="text-right w-[80px]">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {citR.linked_applications.map((la: LinkedApplicationInfo) => (
                        <TableRow
                          key={la.id}
                          className="hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => navigate(`/applications/${la.id}`)}
                        >
                          <TableCell className="font-mono font-bold text-primary">
                            {la.application_number}
                          </TableCell>
                          <TableCell className="max-w-md truncate text-xs text-foreground">
                            {la.description || 'Tafsilot kiritilmagan'}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-rose-500 text-xs">
                            {formatCurrency(la.transfer_amount, la.currency)}
                          </TableCell>
                          <TableCell>
                            {renderStatusBadge(la.status_label, la.status_color)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {formatDate(la.date)}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/applications/${la.id}`)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Arizani ochish"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
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
      </div>
    </div>
  );
}

export default ApplicationRelationsPage;
