import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  Edit2,
  Eye,
  FileCheck2,
  FileText,
  MapPin,
  Printer,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { applicationsApi, type UploadedFile } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { cn } from '@/lib/utils';
import type { ApplicationStatus } from '@/types/models';

const formatCurrency = (amount?: number | string | null, currency = 'UZS') => {
  if (amount === undefined || amount === null || amount === '') return '0 UZS';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return `0 ${currency}`;
  return `${new Intl.NumberFormat('uz-UZ').format(Math.round(num))} ${currency}`;
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

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 1. Fetch Application Detail Query
  const {
    data: app,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['application-detail', id],
    queryFn: () => applicationsApi.getOne(id as string),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // 2. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      return applicationsApi.delete(id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['applications'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'], refetchType: 'all' }),
      ]);
      toast.success('Ariza muvaffaqiyatli o‘chirildi');
      navigate('/applications');
    },
    onError: (err: unknown) => {
      toast.error('Arizani o‘chirishda xatolik yuz berdi', {
        description: getErrorMessage(err),
      });
    },
  });

  // 3. Quick Status Update Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: ApplicationStatus) => {
      if (!id) return;
      return applicationsApi.update(id, { status: newStatus });
    },
    onSuccess: async (_, newStatus) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['application-detail', id], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['applications'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'], refetchType: 'all' }),
      ]);
      toast.success(`Ariza holati "${newStatus}" ga o‘zgartirildi`);
    },
    onError: (err: unknown) => {
      toast.error('Holatni o‘zgartirishda xatolik', {
        description: getErrorMessage(err),
      });
    },
  });

  const getStatusBadge = (status: ApplicationStatus | null | undefined) => {
    switch (status) {
      case 'YANGI':
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30 gap-1 text-xs py-1 px-3">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
            Yangi (Qabul qilindi)
          </Badge>
        );
      case 'JARAYONDA':
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1 text-xs py-1 px-3">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
            Jarayonda (Surishtiruvda)
          </Badge>
        );
      case 'HAL_QILINDI':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1 text-xs py-1 px-3">
            <CheckCircle2 className="h-3 w-3" />
            Hal qilindi (Tugatildi)
          </Badge>
        );
      case 'RAD_ETILDI':
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/30 gap-1 text-xs py-1 px-3">
            <X className="h-3 w-3" />
            Rad etildi
          </Badge>
        );
      default:
        return <Badge variant="outline">—</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-xs text-muted-foreground font-mono">Ariza hujjati yuklanmoqda...</p>
      </div>
    );
  }

  if (isError || !app) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Ariza hujjati topilmadi</h2>
          <p className="text-xs text-muted-foreground max-w-sm">
            {getErrorMessage(error, 'Ariza o‘chirilgan yoki tizimda mavjud emas')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/applications')}
          className="gap-2 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Arizalar ro‘yxatiga qaytish
        </Button>
      </div>
    );
  }

  // Dalillar va fayllarni ajratib olish
  const evidenceFiles: UploadedFile[] = [];
  const otherCustomFields: typeof app.custom_fields = [];

  if (app.custom_fields) {
    app.custom_fields.forEach((cf) => {
      if (
        cf.key === 'evidence_attachments' ||
        cf.label?.toLowerCase().includes('isbot') ||
        cf.label?.toLowerCase().includes('dalil') ||
        cf.label?.toLowerCase().includes('hujjat')
      ) {
        if (Array.isArray(cf.value)) {
          cf.value.forEach((v) => {
            if (typeof v === 'string') {
              const fname = v.split('/').pop() || 'fayl';
              evidenceFiles.push({
                url: v,
                proxy_url: v,
                key: fname,
                filename: fname,
                original_name: fname,
                size: 0,
                mimetype: 'application/octet-stream',
              });
            } else if (v && typeof v === 'object' && 'url' in v) {
              evidenceFiles.push(v as UploadedFile);
            }
          });
        }
      } else {
        otherCustomFields.push(cf);
      }
    });
  }

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ===================================================================== */}
      {/* 1. TOP ACTION TOOLBAR (EKRAN UCHUN, CHOP ETILGANDA KO'RINMAYDI) */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/applications')}
            className="h-9 px-3 text-xs gap-1.5 font-medium border-border/80 hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Arizalarga qaytish</span>
          </Button>

          <div className="h-4 w-px bg-border/60" />

          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-foreground">
              {app.application_number ? `№ ${app.application_number}` : 'Raqamsiz Ariza'}
            </span>
            {getStatusBadge(app.status)}
            {isFetching && (
              <span title="Yangilanmoqda">
                <RefreshCw className="h-3 w-3 animate-spin text-primary" />
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Holatni tezkor o'zgartirish */}
          <select
            value={app.status || 'YANGI'}
            onChange={(e) => updateStatusMutation.mutate(e.target.value as ApplicationStatus)}
            disabled={updateStatusMutation.isPending}
            className="h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
          >
            <option value="YANGI">Yangi</option>
            <option value="JARAYONDA">Jarayonda</option>
            <option value="HAL_QILINDI">Hal qilindi</option>
            <option value="RAD_ETILDI">Rad etildi</option>
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 px-3 text-xs gap-1.5 border-border/80 hover:bg-muted"
            title="Qayta yuklash"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin text-primary')} />
            <span className="hidden sm:inline">Yangilash</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-9 px-3 text-xs gap-1.5 border-border/80 hover:bg-muted font-medium"
          >
            <Printer className="h-3.5 w-3.5 text-primary" />
            <span>Chop etish / PDF</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => navigate(`/applications/create/${app.id}`)}
            className="h-9 px-3.5 text-xs gap-1.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Tahrirlash</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className="h-9 w-9 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            title="O‘chirish"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. ASOSIY RASMIY HUJJAT / DOSYE (OFFICIAL DOCUMENT DOSSIER) */}
      {/* ===================================================================== */}
      <div className="bg-card border border-border/80 shadow-2xl rounded-2xl p-6 sm:p-10 max-w-5xl mx-auto space-y-8 print:p-0 print:border-none print:shadow-none print:bg-white print:text-black">
        {/* ================================================================= */}
        {/* RASMIY BLANK SHAPKA (OFFICIAL EMBLEM & HEADER) */}
        {/* ================================================================= */}
        <div className="border-b-2 border-border/80 pb-6 space-y-4 text-center print:border-black">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 print:border-black print:text-black">
              <Shield className="h-7 w-7" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xs sm:text-sm font-bold tracking-widest uppercase text-muted-foreground print:text-black">
              O‘zbekiston Respublikasi Ichki Ishlar Vazirligi
            </h3>
            <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-foreground print:text-black">
              Tezkor-Qidiruv Departamenti Kiberxavfsizlik Xizmati
            </h2>
            <h1 className="text-base sm:text-xl font-black uppercase tracking-tight text-primary pt-2 print:text-black">
              Fuqaro Murojaati va Tergov-Surishtiruv Bayonnomasi
            </h1>
          </div>

          {/* Hujjatning rasmiy rekvizitlar chizig'i */}
          <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 p-3.5 rounded-xl border border-border/60 print:bg-gray-100 print:border-black">
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Qayd Raqami:
              </span>
              <span className="font-mono font-bold text-foreground text-sm">
                {app.application_number ? `№ ${app.application_number}` : 'Raqamsiz'}
              </span>
            </div>

            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Qayd Sanasi:
              </span>
              <span className="font-mono font-medium text-foreground text-xs">
                {formatDate(app.date)}
              </span>
            </div>

            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Murojaat Holati:
              </span>
              <span className="inline-block mt-0.5">{getStatusBadge(app.status)}</span>
            </div>

            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Tizim ID Kodi:
              </span>
              <span className="font-mono text-[11px] text-muted-foreground truncate block">
                {app.id}
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* I-BO'LIM: ARIZACHI (JABRLANUVCHI FUQARO) SHAXSI */}
        {/* ================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2 text-primary print:text-black print:border-black">
            <User className="h-4 w-4" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground print:text-black">
              I. Arizachi (Jabrlanuvchi Fuqaro) Shaxsiy Ma‘lumotlari
            </h3>
          </div>

          {app.citizen ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  To‘liq F.I.SH:
                </span>
                <p className="font-bold text-sm text-foreground print:text-black">
                  {app.citizen.last_name} {app.citizen.first_name} {app.citizen.middle_name || ''}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Pasport Seriya & Raqam:
                </span>
                <p className="font-mono font-bold text-foreground text-sm print:text-black">
                  {app.citizen.passport || '— (Kiritilmagan)'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  JSHSHIR (PINFL - 14 ta raqam):
                </span>
                <p className="font-mono font-bold text-foreground text-sm print:text-black">
                  {app.citizen.pinfl || '— (Kiritilmagan)'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Telefon Raqami:
                </span>
                <p className="font-mono font-semibold text-foreground text-xs print:text-black">
                  {app.citizen.phone_number || '— (Kiritilmagan)'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-1 sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Doimiy Yashash Manzili:
                </span>
                <p className="text-foreground text-xs font-medium print:text-black">
                  {app.citizen.address || '— (Kiritilmagan)'}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-xs text-muted-foreground italic">
              Ushbu arizaga alohida fuqaro anketasi biriktirilmagan
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* II-BO'LIM: SODIR BO'LGAN HODISA TAFSILOTLARI VA MALAKALANISHI */}
        {/* ================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2 text-primary print:text-black print:border-black">
            <Scale className="h-4 w-4" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground print:text-black">
              II. Hodisa Tafsilotlari va Jinoyat Malakalanishi
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Hudud */}
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3 text-primary print:text-black" />
                Hodisa Sodir Bo‘lgan Hudud / Bo‘lim:
              </span>
              <p className="font-bold text-foreground text-sm print:text-black">
                {app.district ? app.district.name : '—'}
              </p>
              {app.district?.code && (
                <span className="font-mono text-[10px] text-muted-foreground block">
                  Hudud kodi: {app.district.code}
                </span>
              )}
            </div>

            {/* Jinoyat Moddasi */}
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <ShieldAlert className="h-3 w-3 text-primary print:text-black" />
                Jinoyat Kodeksi Moddasi:
              </span>
              {app.crime ? (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-primary text-sm print:text-black">
                      {app.crime.article}
                    </span>
                    <span className="font-bold text-foreground">{app.crime.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    {app.crime.part && <span>Qismi: {app.crime.part}</span>}
                    {app.crime.category && <span>Toifa: {app.crime.category}</span>}
                    {app.crime.gravity && (
                      <Badge
                        variant="outline"
                        className="text-[9px] py-0 px-1.5 uppercase font-mono"
                      >
                        {app.crime.gravity}
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </div>
          </div>

          {/* Ariza Mazmuni va Arizachi ko'rsatmasi */}
          <div className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-2 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Murojaat Sarlavhasi:
              </span>
              <h4 className="font-bold text-foreground text-sm mt-0.5 print:text-black">
                {app.title || 'Sarlavhasiz murojaat'}
              </h4>
            </div>

            <div className="pt-2 border-t border-border/40">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                Arizachi Ko‘rsatmasi & Hodisa To‘liq Bayoni:
              </span>
              <div className="p-3.5 rounded-lg bg-background border border-border/60 text-foreground whitespace-pre-wrap leading-relaxed font-sans text-xs print:bg-white print:border-black print:text-black">
                {app.description || 'Ariza bo‘yicha to‘liq tafsilot kiritilmagan.'}
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* III-BO'LIM: MOLIYAVIY ZARAR VA NOQONUNIY PUL O'TKAZMASI */}
        {/* ================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2 text-primary print:text-black print:border-black">
            <CreditCard className="h-4 w-4" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground print:text-black">
              III. Moddiy Zarar va Bank Plastik Kartalari (Pul O‘tkazmasi)
            </h3>
          </div>

          {app.transfer || app.card ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {/* Moddiy zarar summasi */}
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1 sm:col-span-2 md:col-span-1 print:border-black">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Yetkazilgan Moddiy Zarar:
                </span>
                <p className="font-mono font-black text-lg text-primary print:text-black">
                  {formatCurrency(app.transfer?.amount, app.transfer?.currency || 'UZS')}
                </p>
                <span className="text-[10px] text-muted-foreground font-medium block">
                  Holati: {app.transfer?.status || 'AMALGA_OSHIRILDI'}
                </span>
              </div>

              {/* To'lov provayderi */}
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  To‘lov Tizimi (Provayder):
                </span>
                <p className="font-bold text-foreground text-sm print:text-black">
                  {app.transfer?.payment_provider?.name || '—'}
                </p>
                {app.transfer?.payment_provider?.code && (
                  <span className="font-mono text-[10px] text-muted-foreground block">
                    Kodi: {app.transfer.payment_provider.code}
                  </span>
                )}
              </div>

              {/* Pul tushgan karta */}
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Qabul Qiluvchi Karta:
                </span>
                <p className="font-mono font-bold text-foreground text-sm tracking-wide print:text-black">
                  {app.transfer?.receiver_card?.card_number || app.card?.card_number || '—'}
                </p>
                <span className="text-[10px] text-muted-foreground block">
                  Muddati:{' '}
                  {app.transfer?.receiver_card?.expire_date || app.card?.expire_date || '—'}
                </span>
              </div>

              {/* Bank nomi va MFO */}
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-1 sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Xizmat Ko‘rsatuvchi Bank & MFO:
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-xs print:text-black">
                    {app.transfer?.receiver_card?.bank?.name || app.card?.bank?.name || '—'}
                  </span>
                  {(app.transfer?.receiver_card?.bank?.mfo || app.card?.bank?.mfo) && (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      MFO: {app.transfer?.receiver_card?.bank?.mfo || app.card?.bank?.mfo}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-xs text-muted-foreground italic">
              Ushbu murojaat bo‘yicha to‘g‘ridan-to‘g‘ri moddiy zarar yoki bank plastik kartasi qayd
              etilmagan.
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* IV-BO'LIM: DALILIY ASHYOLAR VA BIRIKTIRILGAN FAYLLAR (ISBOTLAR) */}
        {/* ================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2 text-primary print:text-black print:border-black">
            <FileCheck2 className="h-4 w-4" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground print:text-black">
              IV. Daliliy Ashyolar, Skrinshotlar va Hujjatlar ({evidenceFiles.length} ta)
            </h3>
          </div>

          {evidenceFiles.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
              {evidenceFiles.map((file, idx) => {
                const isImage =
                  file.mimetype?.startsWith('image/') ||
                  /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.url || '');

                return (
                  <div
                    key={idx}
                    className="group relative rounded-xl border border-border/60 bg-muted/30 overflow-hidden hover:border-primary/50 transition-all flex flex-col"
                  >
                    {isImage ? (
                      <div
                        onClick={() => setPreviewImage(file.url)}
                        className="h-28 w-full bg-black/20 flex items-center justify-center overflow-hidden cursor-pointer relative"
                      >
                        <img
                          src={file.url}
                          alt={file.original_name || 'Dalil rasmi'}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                          <Eye className="h-4 w-4" />
                          <span className="text-[11px] font-medium">Ko‘rish</span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 w-full bg-muted/50 flex flex-col items-center justify-center gap-1.5 p-2 text-muted-foreground">
                        <FileText className="h-8 w-8 text-primary/70" />
                        <span className="text-[10px] font-mono text-center truncate max-w-full px-2">
                          {file.original_name || 'Hujjat'}
                        </span>
                      </div>
                    )}

                    <div className="p-2 flex items-center justify-between gap-1 text-[11px] bg-card border-t border-border/40">
                      <span
                        className="truncate text-foreground font-medium"
                        title={file.original_name}
                      >
                        {file.original_name || `Fayl-${idx + 1}`}
                      </span>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="p-1 rounded text-muted-foreground hover:text-primary transition shrink-0"
                        title="Yuklab olish"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-xs text-muted-foreground italic">
              Hech qanday daliliy fayl yoki skrinshot biriktirilmagan.
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* V-BO'LIM: QO'SHIMCHA MAYDONLAR VA PARAMETRLAR */}
        {/* ================================================================= */}
        {otherCustomFields.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2 text-primary print:text-black print:border-black">
              <Building2 className="h-4 w-4" />
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground print:text-black">
                V. Qo‘shimcha Maxsus Maydonlar ({otherCustomFields.length} ta)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {otherCustomFields.map((field, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      {field.label || field.key || 'Parametr'}
                    </span>
                    <Badge variant="outline" className="text-[9px] font-mono uppercase">
                      {field.type}
                    </Badge>
                  </div>
                  <p className="font-semibold text-foreground text-xs break-words">
                    {typeof field.value === 'object'
                      ? JSON.stringify(field.value)
                      : String(field.value ?? '—')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VI-BO'LIM: RASMIY IMZOLAR VA TASDIQLASH (PRINT UCHUN SHART) */}
        {/* ================================================================= */}
        <div className="pt-8 border-t-2 border-border/80 space-y-6 text-xs print:border-black">
          <div className="grid grid-cols-2 gap-8 pt-4">
            <div className="space-y-6">
              <span className="font-bold text-foreground uppercase tracking-wide block print:text-black">
                Murojaatni qabul qilgan mas‘ul xodim:
              </span>
              <div className="border-b border-foreground/40 pb-1 text-[11px] text-muted-foreground font-mono flex items-end justify-between print:border-black">
                <span>Imzo: _________________________</span>
                <span>F.I.SH: _________________</span>
              </div>
            </div>

            <div className="space-y-6">
              <span className="font-bold text-foreground uppercase tracking-wide block print:text-black">
                Arizachi (jabrlanuvchi fuqaro):
              </span>
              <div className="border-b border-foreground/40 pb-1 text-[11px] text-muted-foreground font-mono flex items-end justify-between print:border-black">
                <span>Imzo: _________________________</span>
                <span>
                  F.I.SH:{' '}
                  {app.citizen?.first_name
                    ? `${app.citizen.last_name || ''} ${app.citizen.first_name[0]}.`
                    : '_________'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-4 border-t border-border/40 font-mono print:text-black">
            <span>Tizimda yaratilgan sana: {formatDateTime(app.created_at)}</span>
            <span>M.O‘. (Muhr o‘rni)</span>
            <span>Oxirgi o‘zgartirilgan: {formatDateTime(app.updated_at)}</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. DIALOGLAR (O'CHIRISH VA RASMNI KATTALASHTIRIB KO'RISH) */}
      {/* ===================================================================== */}
      {/* O'chirish dialogi */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Arizani tizimdan butunlay o‘chirish</DialogTitle>
            <DialogDescription className="text-xs">
              Ushbu arizani va unga biriktirilgan barcha ma‘lumotlarni o‘chirmoqchimisiz? Ushbu amal
              qaytarilmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              className="text-xs"
            >
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="text-xs gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleteMutation.isPending ? 'O‘chirilmoqda...' : 'Ha, o‘chirish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rasm Preview (Lightbox) modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-2 bg-black/90 border-0">
          {previewImage && (
            <div className="relative flex flex-col items-center justify-center max-h-[85vh]">
              <img
                src={previewImage}
                alt="Dalil kattalashtirilgan ko‘rinishi"
                className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl"
              />
              <div className="mt-2 flex items-center justify-between w-full px-4 text-xs text-white/80">
                <span>Dalil hujjati / Skrinshot</span>
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Download className="h-3.5 w-3.5" />
                  To‘liq hajmda yuklab olish
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
