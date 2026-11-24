import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Hash,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  Phone,
  RefreshCw,
  Table as TableIcon,
  User,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { toast } from '@/components/ui/sonner';
import { FilterInput, FilterSelect, TableFilterPanel } from '@/components/ui/table-filter-panel';
import { useDebounce } from '@/hooks/use-debounce';
import { crimesApi, districtsApi, reportsApi } from '@/lib/api';
import { formatLocalDateISO } from '@/lib/date';
import { getErrorMessage } from '@/lib/error';

type ReportTab = 'matrix' | 'services' | 'registry';

export function ReportsPage() {
  const [searchParams] = useSearchParams();
  const todayStr = formatLocalDateISO();

  const initialTabParam = searchParams.get('tab');
  const initialDateParam = searchParams.get('date');

  // States
  const [activeTab, setActiveTab] = useState<ReportTab>(
    initialTabParam === 'services' || initialTabParam === 'registry' || initialTabParam === 'matrix'
      ? initialTabParam
      : 'matrix',
  );
  const [date, setDate] = useState<string>(
    initialDateParam && /^\d{4}-\d{2}-\d{2}$/.test(initialDateParam) ? initialDateParam : todayStr,
  );

  useEffect(() => {
    const t = searchParams.get('tab');
    const d = searchParams.get('date');
    if (t === 'matrix' || t === 'services' || t === 'registry') {
      setActiveTab(t);
    }
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setDate(d);
    }
  }, [searchParams]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Batafsil Reestr alohida aniq filtrlari (AND mantiqida)
  const [regAppNum, setRegAppNum] = useState<string>('');
  const debouncedRegAppNum = useDebounce(regAppNum, 300);
  const [regCitizen, setRegCitizen] = useState<string>('');
  const debouncedRegCitizen = useDebounce(regCitizen, 300);
  const [regCard, setRegCard] = useState<string>('');
  const debouncedRegCard = useDebounce(regCard, 300);
  const [regPhone, setRegPhone] = useState<string>('');
  const debouncedRegPhone = useDebounce(regPhone, 300);
  const [regDesc, setRegDesc] = useState<string>('');
  const debouncedRegDesc = useDebounce(regDesc, 300);

  const [districtFilter, setDistrictFilter] = useState<string>('');
  const [crimeFilter, setCrimeFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(50);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const registryActiveFiltersCount = [
    Boolean(regAppNum.trim()),
    Boolean(regCitizen.trim()),
    Boolean(regCard.trim()),
    Boolean(regPhone.trim()),
    Boolean(regDesc.trim()),
    Boolean(districtFilter),
    Boolean(crimeFilter),
  ].filter(Boolean).length;

  const clearRegistryFilters = () => {
    setRegAppNum('');
    setRegCitizen('');
    setRegCard('');
    setRegPhone('');
    setRegDesc('');
    setDistrictFilter('');
    setCrimeFilter('');
    setPage(1);
  };

  // Master references queries
  const { data: districtsData } = useQuery({
    queryKey: ['districts', 'list'],
    queryFn: () => districtsApi.getAll({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });
  const districts = districtsData?.items || [];

  const { data: crimesData } = useQuery({
    queryKey: ['crimes', 'list'],
    queryFn: () => crimesApi.getAll({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });
  const crimes = crimesData?.items || [];

  // 1. Matrix Report Query
  const matrixQuery = useQuery({
    queryKey: ['reports', 'matrix', date, districtFilter],
    queryFn: () =>
      reportsApi.getOperationalMatrix({
        date: date || undefined,
        districtId: districtFilter || undefined,
      }),
    enabled: activeTab === 'matrix',
  });

  // 2. Department Services Query
  const servicesQuery = useQuery({
    queryKey: ['reports', 'services', date, startDate, endDate],
    queryFn: () =>
      reportsApi.getDepartmentServices({
        date: date || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    enabled: activeTab === 'services',
  });

  // 3. Registry Report Query
  const registryQuery = useQuery({
    queryKey: [
      'reports',
      'registry',
      debouncedRegAppNum,
      debouncedRegCitizen,
      debouncedRegCard,
      debouncedRegPhone,
      debouncedRegDesc,
      districtFilter,
      crimeFilter,
      startDate,
      endDate,
      page,
      limit,
    ],
    queryFn: () =>
      reportsApi.getRegistryReport({
        applicationNumber: debouncedRegAppNum.trim() || undefined,
        citizenName: debouncedRegCitizen.trim() || undefined,
        cardNumber: debouncedRegCard.trim() || undefined,
        phoneNumber: debouncedRegPhone.trim() || undefined,
        description: debouncedRegDesc.trim() || undefined,
        districtId: districtFilter || undefined,
        crimeId: crimeFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit,
      }),
    enabled: activeTab === 'registry',
  });

  const isLoading =
    (activeTab === 'matrix' && matrixQuery.isLoading) ||
    (activeTab === 'services' && servicesQuery.isLoading) ||
    (activeTab === 'registry' && registryQuery.isLoading);

  const isFetching =
    (activeTab === 'matrix' && matrixQuery.isFetching) ||
    (activeTab === 'services' && servicesQuery.isFetching) ||
    (activeTab === 'registry' && registryQuery.isFetching);

  // Refresh handler
  const handleRefresh = () => {
    if (activeTab === 'matrix') matrixQuery.refetch();
    if (activeTab === 'services') servicesQuery.refetch();
    if (activeTab === 'registry') registryQuery.refetch();
    toast.info('Hisobot ma’lumotlari yangilandi');
  };

  // Quick Date setters (mahalliy vaqt mintaqasi bo'yicha)
  const setQuickDate = (type: 'today' | 'yesterday' | 'monthStart') => {
    const now = new Date();
    if (type === 'today') {
      setDate(formatLocalDateISO(now));
    } else if (type === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      setDate(formatLocalDateISO(yesterday));
    } else if (type === 'monthStart') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setDate(formatLocalDateISO(start));
    }
  };

  // Excel Export Handler
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      toast.info('Excel hisoboti shakllantirilmoqda, iltimos kuting...');

      let blob: Blob;
      let filename = 'Hisobot.xlsx';

      if (activeTab === 'matrix') {
        blob = await reportsApi.exportOperationalMatrixExcel({
          date: date || undefined,
          districtId: districtFilter || undefined,
        });
        filename = `Viloyat_Tezkor_Svodkasi_${date || todayStr}.xlsx`;
      } else if (activeTab === 'services') {
        blob = await reportsApi.exportDepartmentServicesExcel({
          date: date || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        filename = `Sohaviy_Xizmatlar_Tahlili_${date || todayStr}.xlsx`;
      } else {
        blob = await reportsApi.exportRegistryExcel({
          applicationNumber: debouncedRegAppNum.trim() || undefined,
          citizenName: debouncedRegCitizen.trim() || undefined,
          cardNumber: debouncedRegCard.trim() || undefined,
          phoneNumber: debouncedRegPhone.trim() || undefined,
          description: debouncedRegDesc.trim() || undefined,
          districtId: districtFilter || undefined,
          crimeId: crimeFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        filename = `Batafsil_Analitik_Reestr_${todayStr}.xlsx`;
      }

      const url = window.URL.createObjectURL(
        new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Excel hisoboti muvaffaqiyatli yuklab olindi!');
    } catch (err) {
      toast.error(`Excel faylini yuklab olishda xatolik: ${getErrorMessage(err)}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className={`space-y-5 transition-all duration-200 ${
        isFullscreen ? 'fixed inset-0 z-50 overflow-auto bg-slate-50 p-6 dark:bg-slate-950' : 'p-1'
      }`}
    >
      {/* 1. Header Toolbar */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Statistika & Rasmiy Hisobotlar
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Yig‘ma operativ hisobotlar, sohaviy tahlillar va Excel eksport
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls: Date, Refresh & Excel Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Date Shortcuts (for matrix and services) */}
          {activeTab !== 'registry' && (
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/70 p-1 dark:border-slate-800 dark:bg-slate-800/50">
              <Button
                type="button"
                variant={date === todayStr ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs font-medium"
                onClick={() => setQuickDate('today')}
              >
                Bugun
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-medium"
                onClick={() => setQuickDate('yesterday')}
              >
                Kecha
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-medium"
                onClick={() => setQuickDate('monthStart')}
              >
                Oy boshi
              </Button>
            </div>
          )}

          {/* Date Picker */}
          {activeTab !== 'registry' ? (
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 w-38 pl-8 text-xs font-medium"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Boshlanish"
                className="h-9 w-34 text-xs font-medium"
              />
              <span className="text-xs text-slate-400">—</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="Tugash"
                className="h-9 w-34 text-xs font-medium"
              />
            </div>
          )}

          {/* Refresh */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isFetching}
            className="h-9 gap-1.5 px-3 text-xs"
            title="Ma’lumotlarni yangilash"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-slate-600 ${
                isFetching ? 'animate-spin text-emerald-600' : ''
              }`}
            />
            <span className="hidden sm:inline">Yangilash</span>
          </Button>

          {/* Excel Export Button */}
          <Button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting || isLoading}
            className="h-9 gap-1.5 bg-emerald-600 px-3.5 text-xs font-medium text-white shadow-xs hover:bg-emerald-700 active:scale-98 dark:bg-emerald-700 dark:hover:bg-emerald-600"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 text-white" />
            )}
            <span>Excel (.xlsx) yuklab olish</span>
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-9 w-9 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            title={isFullscreen ? 'Odatdagi rejim' : 'To‘liq ekran'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* 2. Report Type Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`relative flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'matrix'
              ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>1. Viloyat Tezkor Svodkasi</span>
          <Badge
            variant="outline"
            className="ml-1 border-slate-200 bg-slate-100 text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            17 hudud
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('services')}
          className={`relative flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'services'
              ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>2. Sohaviy Xizmatlar Tahlili</span>
          <Badge
            variant="outline"
            className="ml-1 border-slate-200 bg-slate-100 text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            8 xizmat
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('registry')}
          className={`relative flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'registry'
              ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <TableIcon className="h-4 w-4" />
          <span>3. Batafsil Analitik Reestr</span>
          <Badge
            variant="outline"
            className="ml-1 border-slate-200 bg-slate-100 text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            Jurnal
          </Badge>
        </button>
      </div>

      {/* 3. Main Report Content */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-xs dark:bg-slate-900/70">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Hisobot hisoblanmoqda...
              </p>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: VILOYAT TEZKOR SVODKASI (Image 1 replica)          */}
        {/* ========================================================= */}
        {activeTab === 'matrix' && (
          <Card className="overflow-hidden border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            {/* Table Information banner */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
              <div className="flex items-center gap-2 font-medium">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                <span>
                  Viloyat bo‘yicha hisobot sanasi:{' '}
                  <strong className="text-slate-900 dark:text-slate-100">
                    {matrixQuery.data?.date || date}
                  </strong>
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span>
                  Oylik davr:{' '}
                  <strong className="text-slate-900 dark:text-slate-100">
                    {(matrixQuery.data?.date || date).substring(0, 7)}
                  </strong>
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Jadvalni gorizontal surish orqali barcha ko‘rsatkichlarni ko‘rishingiz mumkin
              </div>
            </div>

            {/* Scrollable multi-header operational table */}
            <div className="relative max-h-[75vh] overflow-x-auto overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full min-w-[2400px] border-collapse text-center text-xs">
                <thead className="sticky top-0 z-30 shadow-xs">
                  {/* Header Row 1 */}
                  <tr className="border-b border-slate-300 font-bold text-slate-800 dark:border-slate-700 dark:text-slate-200">
                    <th
                      rowSpan={2}
                      className="w-12 whitespace-nowrap border-r border-slate-300 bg-slate-100 px-2 py-2 text-center text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      №
                    </th>
                    <th
                      rowSpan={2}
                      className="w-44 whitespace-nowrap border-r border-slate-300 bg-slate-100 px-3 py-2 text-left font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      Shahar / tumanlar
                    </th>
                    <th
                      colSpan={7}
                      className="whitespace-nowrap border-r border-rose-300 bg-rose-100 py-2 text-rose-950 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
                    >
                      1 kunda, shundan
                    </th>
                    <th
                      colSpan={2}
                      className="whitespace-nowrap border-r border-sky-300 bg-sky-100 py-2 text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200"
                    >
                      168-m
                    </th>
                    <th
                      colSpan={2}
                      className="whitespace-nowrap border-r border-blue-300 bg-blue-100 py-2 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200"
                    >
                      169-m
                    </th>
                    <th
                      colSpan={2}
                      className="whitespace-nowrap border-r border-slate-300 bg-slate-200 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      boshqa
                    </th>
                    <th
                      colSpan={6}
                      className="whitespace-nowrap border-r border-amber-300 bg-amber-100 py-2 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
                    >
                      Murojaatlar
                    </th>
                    <th
                      colSpan={3}
                      className="whitespace-nowrap border-r border-teal-300 bg-teal-100 py-2 text-teal-950 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-200"
                    >
                      Jarayonda
                    </th>
                    <th
                      colSpan={7}
                      className="whitespace-nowrap border-r border-emerald-300 bg-emerald-100 py-2 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                    >
                      JI qo‘zg‘atish rad etilgan
                    </th>
                    <th
                      rowSpan={2}
                      className="w-28 whitespace-nowrap border-r border-amber-300 bg-amber-200 px-2 py-2 text-center font-bold text-amber-950 dark:border-amber-800 dark:bg-amber-900 dark:text-amber-100"
                    >
                      Jinoyat ishi qo‘zg‘atilgan (Х/Й)
                    </th>
                    <th
                      colSpan={3}
                      className="whitespace-nowrap border-slate-300 bg-orange-100 py-2 text-orange-950 dark:border-slate-700 dark:bg-orange-950 dark:text-orange-200"
                    >
                      Boshqa
                    </th>
                  </tr>

                  {/* Header Row 2 */}
                  <tr className="border-b border-slate-300 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300">
                    {/* 1 kunda */}
                    <th className="w-24 whitespace-nowrap border-b border-r border-rose-200 bg-rose-50 px-2 py-1.5 text-rose-900 dark:border-rose-900 dark:bg-rose-900/40 dark:text-rose-200">
                      {date ? `${date} кунидаги` : 'Кунидаги'}
                    </th>
                    <th className="w-20 whitespace-nowrap border-b border-r border-rose-200 bg-rose-50 px-2 py-1.5 text-rose-900 dark:border-rose-900 dark:bg-rose-900/40 dark:text-rose-200">
                      Firibgarlik
                    </th>
                    <th className="w-18 whitespace-nowrap border-b border-r border-rose-200 bg-rose-50 px-2 py-1.5 text-rose-900 dark:border-rose-900 dark:bg-rose-900/40 dark:text-rose-200">
                      O‘g‘rilik
                    </th>
                    <th className="w-20 whitespace-nowrap border-b border-r border-rose-200 bg-rose-50 px-2 py-1.5 text-rose-900 dark:border-rose-900 dark:bg-rose-900/40 dark:text-rose-200">
                      Haqorat qilish
                    </th>
                    <th className="w-20 whitespace-nowrap border-b border-r border-rose-200 bg-rose-50 px-2 py-1.5 text-rose-900 dark:border-rose-900 dark:bg-rose-900/40 dark:text-rose-200">
                      Rasm tarqatish
                    </th>
                    <th className="w-24 whitespace-nowrap border-b border-r border-rose-200 bg-rose-50 px-2 py-1.5 text-rose-900 dark:border-rose-900 dark:bg-rose-900/40 dark:text-rose-200">
                      Adashib tashlagan
                    </th>
                    <th className="w-18 whitespace-nowrap border-b border-r border-rose-200 bg-rose-50 px-2 py-1.5 text-rose-900 dark:border-rose-900 dark:bg-rose-900/40 dark:text-rose-200">
                      Boshqa
                    </th>

                    {/* 168-m */}
                    <th className="w-20 whitespace-nowrap border-b border-r border-sky-200 bg-sky-50 px-2 py-1.5 text-sky-900 dark:border-sky-900 dark:bg-sky-900/40 dark:text-sky-200">
                      Oy boshidan
                    </th>
                    <th className="w-20 whitespace-nowrap border-b border-r border-sky-200 bg-sky-50 px-2 py-1.5 text-sky-900 dark:border-sky-900 dark:bg-sky-900/40 dark:text-sky-200">
                      Yil boshidan
                    </th>

                    {/* 169-m */}
                    <th className="w-20 whitespace-nowrap border-b border-r border-blue-200 bg-blue-50 px-2 py-1.5 text-blue-900 dark:border-blue-900 dark:bg-blue-900/40 dark:text-blue-200">
                      Oy boshidan
                    </th>
                    <th className="w-20 whitespace-nowrap border-b border-r border-blue-200 bg-blue-50 px-2 py-1.5 text-blue-900 dark:border-blue-900 dark:bg-blue-900/40 dark:text-blue-200">
                      Yil boshidan
                    </th>

                    {/* boshqa */}
                    <th className="w-20 whitespace-nowrap border-b border-r border-slate-300 bg-slate-100 px-2 py-1.5 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Oy boshidan
                    </th>
                    <th className="w-20 whitespace-nowrap border-b border-r border-slate-300 bg-slate-100 px-2 py-1.5 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Yil boshidan
                    </th>

                    {/* Murojaatlar */}
                    <th className="w-20 whitespace-nowrap border-b border-r border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-900 dark:border-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                      Oy boshidan
                    </th>
                    <th className="w-20 whitespace-nowrap border-b border-r border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-900 dark:border-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                      Yil boshidan
                    </th>
                    <th className="w-22 whitespace-nowrap border-b border-r border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-900 dark:border-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                      168/169-m
                    </th>
                    <th className="w-18 whitespace-nowrap border-b border-r border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-900 dark:border-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                      Takroriy
                    </th>
                    <th className="w-24 whitespace-nowrap border-b border-r border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-900 dark:border-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                      Card Block %
                    </th>
                    <th className="w-22 whitespace-nowrap border-b border-r border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-900 dark:border-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                      Sanksiya
                    </th>

                    {/* Jarayonda */}
                    <th className="w-18 whitespace-nowrap border-b border-r border-teal-200 bg-teal-50 px-2 py-1.5 font-bold text-teal-900 dark:border-teal-900 dark:bg-teal-900/40 dark:text-teal-200">
                      ЖАМИ
                    </th>
                    <th className="w-20 whitespace-nowrap border-b border-r border-teal-200 bg-teal-50 px-2 py-1.5 text-teal-900 dark:border-teal-900 dark:bg-teal-900/40 dark:text-teal-200">
                      qo‘zg‘atiladi
                    </th>
                    <th className="w-18 whitespace-nowrap border-b border-r border-teal-200 bg-teal-50 px-2 py-1.5 text-teal-900 dark:border-teal-900 dark:bg-teal-900/40 dark:text-teal-200">
                      boshqa
                    </th>

                    {/* JI rad etilgan */}
                    <th className="w-18 whitespace-nowrap border-b border-r border-emerald-200 bg-emerald-50 px-2 py-1.5 font-bold text-emerald-900 dark:border-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                      ЖАМИ
                    </th>
                    <th className="w-18 whitespace-nowrap border-b border-r border-emerald-200 bg-emerald-50 px-2 py-1.5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                      aldangan
                    </th>
                    <th className="w-18 whitespace-nowrap border-b border-r border-emerald-200 bg-emerald-50 px-2 py-1.5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                      kreditiga
                    </th>
                    <th className="w-20 whitespace-nowrap border-b border-r border-emerald-200 bg-emerald-50 px-2 py-1.5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                      rasm tarqatish
                    </th>
                    <th className="w-18 whitespace-nowrap border-b border-r border-emerald-200 bg-emerald-50 px-2 py-1.5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                      haqorat
                    </th>
                    <th className="w-20 whitespace-nowrap border-b border-r border-emerald-200 bg-emerald-50 px-2 py-1.5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                      pul bilan
                    </th>
                    <th className="w-18 whitespace-nowrap border-b border-r border-emerald-200 bg-emerald-50 px-2 py-1.5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                      boshqa
                    </th>

                    {/* Boshqa */}
                    <th className="w-24 whitespace-nowrap border-b border-r border-slate-300 bg-orange-50 px-2 py-1.5 text-orange-900 dark:border-slate-700 dark:bg-orange-900/40 dark:text-orange-200">
                      ishlarga qo‘shilgan
                    </th>
                    <th className="w-24 whitespace-nowrap border-b border-r border-slate-300 bg-orange-50 px-2 py-1.5 text-orange-900 dark:border-slate-700 dark:bg-orange-900/40 dark:text-orange-200">
                      hududga yuborilgan
                    </th>
                    <th className="w-24 whitespace-nowrap border-b border-slate-300 bg-orange-50 px-2 py-1.5 text-orange-900 dark:border-slate-700 dark:bg-orange-900/40 dark:text-orange-200">
                      materiallarga birlash.
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white font-medium text-slate-700 dark:divide-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  {matrixQuery.data?.rows?.map((r, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={r.district_name}
                        className={`hover:bg-slate-100/80 dark:hover:bg-slate-800 ${
                          isEven
                            ? 'bg-white dark:bg-slate-900'
                            : 'bg-slate-50/60 dark:bg-slate-800/40'
                        }`}
                      >
                        {/* № & District */}
                        <td className="whitespace-nowrap border-b border-r border-slate-200 px-2 py-2 text-center text-slate-500 dark:border-slate-800 dark:text-slate-400">
                          {r.index}
                        </td>
                        <td className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 text-left font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                          {r.district_name}
                        </td>

                        {/* 1 kunda */}
                        <td className="border-r border-slate-200 px-2 py-2 font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                          {r.daily_total || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 text-amber-700 dark:border-slate-800 dark:text-amber-400">
                          {r.daily_fraud || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.daily_theft || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.daily_insult || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.daily_photo_distribution || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.daily_mistake_transfer || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.daily_other || ''}
                        </td>

                        {/* 168-m */}
                        <td className="border-r border-slate-200 px-2 py-2 text-sky-800 dark:border-slate-800 dark:text-sky-300">
                          {r.m168_month || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 font-semibold text-sky-900 dark:border-slate-800 dark:text-sky-200">
                          {r.m168_year || ''}
                        </td>

                        {/* 169-m */}
                        <td className="border-r border-slate-200 px-2 py-2 text-blue-800 dark:border-slate-800 dark:text-blue-300">
                          {r.m169_month || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 font-semibold text-blue-900 dark:border-slate-800 dark:text-blue-200">
                          {r.m169_year || ''}
                        </td>

                        {/* Boshqa */}
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.other_month || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.other_year || ''}
                        </td>

                        {/* Murojaatlar */}
                        <td className="border-r border-slate-200 px-2 py-2 font-semibold dark:border-slate-800">
                          {r.month_total || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                          {r.year_total || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 text-amber-800 dark:border-slate-800 dark:text-amber-300">
                          {r.total_168_169 || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 text-rose-700 dark:border-slate-800 dark:text-rose-400">
                          {r.repeated_count || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 font-semibold text-emerald-700 dark:border-slate-800 dark:text-emerald-400">
                          {r.card_blocked || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.sanction_taken || ''}
                        </td>

                        {/* Jarayonda */}
                        <td className="border-r border-slate-200 bg-teal-50/20 px-2 py-2 font-bold text-teal-800 dark:border-slate-800 dark:bg-teal-950/10 dark:text-teal-300">
                          {r.in_progress_total || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.in_progress_initiate || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.in_progress_other || ''}
                        </td>

                        {/* Rad etilgan */}
                        <td className="border-r border-slate-200 bg-emerald-50/20 px-2 py-2 font-bold text-emerald-800 dark:border-slate-800 dark:bg-emerald-950/10 dark:text-emerald-300">
                          {r.rejected_total || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.rejected_deceived || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.rejected_credit || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.rejected_photo || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.rejected_insult || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.rejected_money || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.rejected_other || ''}
                        </td>

                        {/* JI qo‘zg‘atilgan */}
                        <td className="border-r border-amber-200 bg-amber-50/40 px-2 py-2 font-bold text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
                          {r.initiated_total || ''}
                        </td>

                        {/* Boshqa */}
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.other_crime_case || ''}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.transferred_territory || ''}
                        </td>
                        <td className="px-2 py-2 dark:border-slate-800">{r.combined_case || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Footer ЖАМИ row */}
                {matrixQuery.data?.total && (
                  <tfoot className="sticky bottom-0 z-20 border-t-2 border-slate-400 bg-amber-100 font-bold text-slate-900 shadow-sm dark:border-slate-600 dark:bg-amber-950 dark:text-amber-100">
                    <tr>
                      <td
                        colSpan={2}
                        className="whitespace-nowrap border-r border-slate-300 bg-amber-100 px-3 py-2.5 text-center text-sm font-black tracking-wider text-amber-950 dark:border-slate-700 dark:bg-amber-950 dark:text-amber-200"
                      >
                        ЖАМИ
                      </td>

                      {/* 1 kunda */}
                      <td className="border-r border-slate-300 px-2 py-2.5 text-slate-950 dark:border-slate-700 dark:text-white">
                        {matrixQuery.data.total.daily_total}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 text-amber-950 dark:border-slate-700 dark:text-amber-200">
                        {matrixQuery.data.total.daily_fraud}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.daily_theft}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.daily_insult}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.daily_photo_distribution}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.daily_mistake_transfer}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.daily_other}
                      </td>

                      {/* 168-m */}
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.m168_month}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.m168_year}
                      </td>

                      {/* 169-m */}
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.m169_month}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.m169_year}
                      </td>

                      {/* boshqa */}
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.other_month}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.other_year}
                      </td>

                      {/* Murojaatlar */}
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.month_total}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 text-slate-950 dark:border-slate-700 dark:text-white">
                        {matrixQuery.data.total.year_total}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 text-amber-950 dark:border-slate-700 dark:text-amber-200">
                        {matrixQuery.data.total.total_168_169}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 text-rose-800 dark:border-slate-700 dark:text-rose-300">
                        {matrixQuery.data.total.repeated_count}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 text-emerald-800 dark:border-slate-700 dark:text-emerald-300">
                        {matrixQuery.data.total.card_blocked}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.sanction_taken}
                      </td>

                      {/* Jarayonda */}
                      <td className="border-r border-slate-300 px-2 py-2.5 text-teal-950 dark:border-slate-700 dark:text-teal-200">
                        {matrixQuery.data.total.in_progress_total}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.in_progress_initiate}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.in_progress_other}
                      </td>

                      {/* Rad etilgan */}
                      <td className="border-r border-slate-300 px-2 py-2.5 text-emerald-950 dark:border-slate-700 dark:text-emerald-200">
                        {matrixQuery.data.total.rejected_total}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.rejected_deceived}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.rejected_credit}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.rejected_photo}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.rejected_insult}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.rejected_money}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.rejected_other}
                      </td>

                      {/* JI qo‘zg‘atilgan */}
                      <td className="border-r border-amber-300 px-2 py-2.5 text-amber-950 dark:border-amber-800 dark:text-amber-200">
                        {matrixQuery.data.total.initiated_total}
                      </td>

                      {/* Boshqa */}
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.other_crime_case}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.transferred_territory}
                      </td>
                      <td className="px-2 py-2.5 dark:border-slate-700">
                        {matrixQuery.data.total.combined_case}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        )}

        {/* ========================================================= */}
        {/* TAB 2: SOHAVIY XIZMATLAR TAHLILI (Image 3 replica)        */}
        {/* ========================================================= */}
        {activeTab === 'services' && (
          <Card className="overflow-hidden border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
              <div className="flex items-center gap-2 font-medium">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                <span>
                  Sana:{' '}
                  <strong className="text-slate-900 dark:text-slate-100">
                    {servicesQuery.data?.date || date}
                  </strong>
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span>
                  Davr:{' '}
                  <strong className="text-slate-900 dark:text-slate-100">
                    {servicesQuery.data?.startDate} — {servicesQuery.data?.endDate}
                  </strong>
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                17 ta tuman va 8 ta sohaviy xizmatlar kesimidagi ko‘rsatkichlar
              </div>
            </div>

            <div className="relative max-h-[75vh] overflow-x-auto overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full min-w-[1800px] border-collapse text-center text-xs">
                <thead className="sticky top-0 z-30 shadow-xs">
                  {/* Row 1 */}
                  <tr className="border-b border-slate-300 font-bold text-slate-800 dark:border-slate-700 dark:text-slate-200">
                    <th
                      rowSpan={2}
                      className="w-12 whitespace-nowrap border-r border-slate-300 bg-slate-100 px-2 py-2 text-center text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      №
                    </th>
                    <th
                      rowSpan={2}
                      className="w-44 whitespace-nowrap border-r border-slate-300 bg-slate-100 px-3 py-2 text-left font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      Tuman (shahar)
                    </th>
                    <th
                      colSpan={2}
                      className="whitespace-nowrap border-r border-slate-300 bg-sky-100 py-2 text-sky-950 dark:border-slate-700 dark:bg-sky-950 dark:text-sky-200"
                    >
                      Uyushgan jinoyatchilikka qarshi kurashish xizmati
                    </th>
                    <th
                      colSpan={2}
                      className="whitespace-nowrap border-r border-slate-300 bg-emerald-100 py-2 text-emerald-950 dark:border-slate-700 dark:bg-emerald-950 dark:text-emerald-200"
                    >
                      Jinoyat qidiruv xizmati
                    </th>
                    <th
                      colSpan={2}
                      className="whitespace-nowrap border-r border-slate-300 bg-purple-100 py-2 text-purple-950 dark:border-slate-700 dark:bg-purple-950 dark:text-purple-200"
                    >
                      Terrorizmga qarshi kurashish xizmati
                    </th>
                    <th
                      colSpan={2}
                      className="whitespace-nowrap border-r border-slate-300 bg-amber-100 py-2 text-amber-950 dark:border-slate-700 dark:bg-amber-950 dark:text-amber-200"
                    >
                      Huquqbuzarliklar profilaktikasi xizmati
                    </th>
                    <th
                      colSpan={2}
                      className="whitespace-nowrap border-r border-slate-300 bg-teal-100 py-2 text-teal-950 dark:border-slate-700 dark:bg-teal-950 dark:text-teal-200"
                    >
                      Yo‘l harakati xavfsizligi xizmati
                    </th>
                    <th
                      colSpan={2}
                      className="whitespace-nowrap border-r border-slate-300 bg-indigo-100 py-2 text-indigo-950 dark:border-slate-700 dark:bg-indigo-950 dark:text-indigo-200"
                    >
                      Jamoat tartibini saqlash xizmati
                    </th>
                    <th
                      colSpan={2}
                      className="whitespace-nowrap border-r border-slate-300 bg-rose-100 py-2 text-rose-950 dark:border-slate-700 dark:bg-rose-950 dark:text-rose-200"
                    >
                      Probatsiya xizmati
                    </th>
                    <th
                      colSpan={2}
                      className="whitespace-nowrap border-slate-300 bg-slate-200 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      Ma’naviy-ma’rifiy ishlar xizmati
                    </th>
                  </tr>

                  {/* Row 2 */}
                  <tr className="border-b border-slate-300 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <React.Fragment key={i}>
                        <th className="w-20 whitespace-nowrap border-b border-r border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                          bir kunda
                        </th>
                        <th
                          className={`w-24 whitespace-nowrap border-b px-2 py-1.5 text-slate-800 dark:bg-slate-800 dark:text-slate-300 ${
                            i === 7 ? '' : 'border-r border-slate-300 dark:border-slate-700'
                          } bg-slate-50`}
                        >
                          tadbir boshidan
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white font-medium text-slate-700 dark:divide-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  {servicesQuery.data?.rows?.map((r, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={r.district_name}
                        className={`hover:bg-slate-100/80 dark:hover:bg-slate-800 ${
                          isEven
                            ? 'bg-white dark:bg-slate-900'
                            : 'bg-slate-50/60 dark:bg-slate-800/40'
                        }`}
                      >
                        <td className="whitespace-nowrap border-b border-r border-slate-200 px-2 py-2 text-center text-slate-500 dark:border-slate-800 dark:text-slate-400">
                          {r.index}
                        </td>
                        <td className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 text-left font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                          {r.district_name}
                        </td>

                        {/* 1. UYOKK */}
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.organized_crime.daily || ''}
                        </td>
                        <td className="border-r border-slate-300 px-2 py-2 font-semibold text-sky-800 dark:border-slate-700 dark:text-sky-300">
                          {r.organized_crime.period
                            ? r.organized_crime.period.toLocaleString()
                            : ''}
                        </td>

                        {/* 2. JQK */}
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.criminal_investigation.daily || ''}
                        </td>
                        <td className="border-r border-slate-300 px-2 py-2 font-semibold text-emerald-800 dark:border-slate-700 dark:text-emerald-300">
                          {r.criminal_investigation.period
                            ? r.criminal_investigation.period.toLocaleString()
                            : ''}
                        </td>

                        {/* 3. TQK */}
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.cyber_security.daily || ''}
                        </td>
                        <td className="border-r border-slate-300 px-2 py-2 font-semibold text-purple-800 dark:border-slate-700 dark:text-purple-300">
                          {r.cyber_security.period ? r.cyber_security.period.toLocaleString() : ''}
                        </td>

                        {/* 4. HQPX */}
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.crime_prevention.daily || ''}
                        </td>
                        <td className="border-r border-slate-300 px-2 py-2 font-semibold text-amber-800 dark:border-slate-700 dark:text-amber-300">
                          {r.crime_prevention.period
                            ? r.crime_prevention.period.toLocaleString()
                            : ''}
                        </td>

                        {/* 5. YHX */}
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.traffic_safety.daily || ''}
                        </td>
                        <td className="border-r border-slate-300 px-2 py-2 font-semibold text-teal-800 dark:border-slate-700 dark:text-teal-300">
                          {r.traffic_safety.period ? r.traffic_safety.period.toLocaleString() : ''}
                        </td>

                        {/* 6. JTSX */}
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.public_order.daily || ''}
                        </td>
                        <td className="border-r border-slate-300 px-2 py-2 font-semibold text-indigo-800 dark:border-slate-700 dark:text-indigo-300">
                          {r.public_order.period ? r.public_order.period.toLocaleString() : ''}
                        </td>

                        {/* 7. Probatsiya */}
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.probation.daily || ''}
                        </td>
                        <td className="border-r border-slate-300 px-2 py-2 font-semibold text-rose-800 dark:border-slate-700 dark:text-rose-300">
                          {r.probation.period ? r.probation.period.toLocaleString() : ''}
                        </td>

                        {/* 8. Ma’naviy */}
                        <td className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                          {r.spiritual_educational.daily || ''}
                        </td>
                        <td className="px-2 py-2 font-semibold text-slate-800 dark:text-slate-200">
                          {r.spiritual_educational.period
                            ? r.spiritual_educational.period.toLocaleString()
                            : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Footer ЖАМИ */}
                {servicesQuery.data?.total && (
                  <tfoot className="sticky bottom-0 z-20 border-t-2 border-slate-400 bg-amber-100 font-bold text-slate-900 shadow-sm dark:border-slate-600 dark:bg-amber-950 dark:text-amber-100">
                    <tr>
                      <td
                        colSpan={2}
                        className="whitespace-nowrap border-r border-slate-300 bg-amber-100 px-3 py-2.5 text-center text-sm font-black tracking-wider text-amber-950 dark:border-slate-700 dark:bg-amber-950 dark:text-amber-200"
                      >
                        ЖАМИ
                      </td>

                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {servicesQuery.data.total.organized_crime.daily}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 font-bold dark:border-slate-700">
                        {servicesQuery.data.total.organized_crime.period.toLocaleString()}
                      </td>

                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {servicesQuery.data.total.criminal_investigation.daily}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 font-bold dark:border-slate-700">
                        {servicesQuery.data.total.criminal_investigation.period.toLocaleString()}
                      </td>

                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {servicesQuery.data.total.cyber_security.daily}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 font-bold dark:border-slate-700">
                        {servicesQuery.data.total.cyber_security.period.toLocaleString()}
                      </td>

                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {servicesQuery.data.total.crime_prevention.daily}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 font-bold dark:border-slate-700">
                        {servicesQuery.data.total.crime_prevention.period.toLocaleString()}
                      </td>

                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {servicesQuery.data.total.traffic_safety.daily}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 font-bold dark:border-slate-700">
                        {servicesQuery.data.total.traffic_safety.period.toLocaleString()}
                      </td>

                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {servicesQuery.data.total.public_order.daily}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 font-bold dark:border-slate-700">
                        {servicesQuery.data.total.public_order.period.toLocaleString()}
                      </td>

                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {servicesQuery.data.total.probation.daily}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 font-bold dark:border-slate-700">
                        {servicesQuery.data.total.probation.period.toLocaleString()}
                      </td>

                      <td className="border-r border-slate-300 px-2 py-2.5 dark:border-slate-700">
                        {servicesQuery.data.total.spiritual_educational.daily}
                      </td>
                      <td className="px-2 py-2.5 font-bold dark:border-slate-700">
                        {servicesQuery.data.total.spiritual_educational.period.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        )}

        {/* ========================================================= */}
        {/* TAB 3: BATAFSIL ANALITIK REESTR (Image 2 replica)         */}
        {/* ========================================================= */}
        {activeTab === 'registry' && (
          <div className="space-y-4">
            {/* Alohida Aniq Filtrlar Paneli */}
            <TableFilterPanel
              title="Reestr bo‘yicha aniq filtrlash"
              activeFiltersCount={registryActiveFiltersCount}
              onClearAll={clearRegistryFilters}
              onRefresh={() => registryQuery.refetch()}
              isRefreshing={registryQuery.isFetching}
              gridClassName="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8"
              rightExtraSlot={
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mr-1">
                  <span>
                    Topildi:{' '}
                    <strong className="text-foreground">{registryQuery.data?.total || 0} ta</strong>
                  </span>
                  <span>
                    Sahifadagi zarar:{' '}
                    <strong className="text-rose-500 font-mono">
                      {(
                        registryQuery.data?.items?.reduce(
                          (sum, it) => sum + (Number(it.loss_amount) || 0),
                          0,
                        ) || 0
                      ).toLocaleString()}{' '}
                      UZS
                    </strong>
                  </span>
                </div>
              }
            >
              <FilterInput
                label="E-material / Ariza №"
                value={regAppNum}
                onChange={(v) => {
                  setRegAppNum(v);
                  setPage(1);
                }}
                placeholder="M0110224..."
                icon={<Hash className="h-3.5 w-3.5" />}
                mono
              />

              <FilterInput
                label="Arizachi F.I.SH"
                value={regCitizen}
                onChange={(v) => {
                  setRegCitizen(v);
                  setPage(1);
                }}
                placeholder="Familiya yoki ism..."
                icon={<User className="h-3.5 w-3.5" />}
              />

              <FilterInput
                label="Karta raqami"
                value={regCard}
                onChange={(v) => {
                  setRegCard(v);
                  setPage(1);
                }}
                placeholder="8600 / 9860..."
                icon={<CreditCard className="h-3.5 w-3.5" />}
                mono
              />

              <FilterInput
                label="Telefon raqami"
                value={regPhone}
                onChange={(v) => {
                  setRegPhone(v);
                  setPage(1);
                }}
                placeholder="90 123 45 67..."
                icon={<Phone className="h-3.5 w-3.5" />}
                mono
              />

              <FilterInput
                label="Fabula / Mazmuni"
                value={regDesc}
                onChange={(v) => {
                  setRegDesc(v);
                  setPage(1);
                }}
                placeholder="Murojaat mazmuni..."
                icon={<FileText className="h-3.5 w-3.5" />}
              />

              <FilterSelect
                label="Hudud (Tuman)"
                value={districtFilter}
                onChange={(v) => {
                  setDistrictFilter(v);
                  setPage(1);
                }}
              >
                <option value="">Barcha tumanlar</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label="Jinoyat turi"
                value={crimeFilter}
                onChange={(v) => {
                  setCrimeFilter(v);
                  setPage(1);
                }}
              >
                <option value="">Barcha jinoyat turlari</option>
                {crimes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title
                      ? `${c.article ? `${c.article} - ` : ''}${c.title}`
                      : c.article || 'Noma’lum'}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label="Sahifada ko‘rsatish"
                value={String(limit)}
                onChange={(v) => {
                  setLimit(Number(v));
                  setPage(1);
                }}
              >
                <option value="25">25 tadan</option>
                <option value="50">50 tadan</option>
                <option value="100">100 tadan</option>
              </FilterSelect>
            </TableFilterPanel>

            {/* Registry Table */}
            <Card className="py-0 gap-0 overflow-hidden border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="relative max-h-[72vh] overflow-x-auto overflow-y-auto">
                <table className="w-full min-w-[2400px] border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-30 shadow-xs">
                    <tr className="border-b border-emerald-300 bg-emerald-100 font-bold text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                      <th className="w-12 whitespace-nowrap border-r border-emerald-300 bg-emerald-100 px-2 py-3 text-center dark:border-emerald-900 dark:bg-emerald-950">
                        Д
                      </th>
                      <th className="w-28 whitespace-nowrap border-r border-emerald-300 px-3 py-3 text-center dark:border-emerald-900">
                        МУРОЖААТ МАНБАСИ
                      </th>
                      <th className="w-40 whitespace-nowrap border-r border-emerald-300 px-3 py-3 dark:border-emerald-900">
                        Э-материалдаги ижрочи
                      </th>
                      <th className="w-24 whitespace-nowrap border-r border-emerald-300 px-3 py-3 text-center dark:border-emerald-900">
                        Сана
                      </th>
                      <th className="w-36 whitespace-nowrap border-r border-emerald-300 px-3 py-3 dark:border-emerald-900">
                        Хабар тушган ҳудуд
                      </th>
                      <th className="w-32 whitespace-nowrap border-r border-emerald-300 px-3 py-3 dark:border-emerald-900">
                        Э-материал рақами
                      </th>
                      <th className="w-48 whitespace-nowrap border-r border-emerald-300 px-3 py-3 dark:border-emerald-900">
                        Мурожаат муаллифи (Ф.И.Ш)
                      </th>
                      <th className="min-w-[340px] max-w-[420px] whitespace-nowrap border-r border-emerald-300 px-3 py-3 dark:border-emerald-900">
                        Ҳолатнинг қисқача мазмуни (Фабула)
                      </th>
                      <th className="w-32 whitespace-nowrap border-r border-sky-300 bg-sky-100 px-3 py-3 text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
                        Мурожаат тури
                      </th>
                      <th className="w-32 whitespace-nowrap border-r border-sky-300 bg-sky-100 px-3 py-3 text-right text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
                        Моддий зарар миқдори (сўмда)
                      </th>
                      <th className="w-48 whitespace-nowrap border-r border-sky-300 bg-sky-100 px-3 py-3 text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
                        Содир этиш усули
                      </th>
                      <th className="w-44 whitespace-nowrap border-r border-rose-300 bg-rose-100 px-3 py-3 text-rose-950 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
                        Қўшимча изоҳ
                      </th>
                      <th className="w-44 whitespace-nowrap border-r border-sky-300 bg-sky-100 px-3 py-3 text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
                        Пул ўтказилган банк карталари
                      </th>
                      <th className="w-32 whitespace-nowrap border-r border-sky-300 bg-sky-100 px-3 py-3 text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
                        Қайси банк картаси
                      </th>
                      <th className="w-32 whitespace-nowrap border-r border-sky-300 bg-sky-100 px-3 py-3 text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
                        Қайси мобил иловадан
                      </th>
                      <th className="w-36 whitespace-nowrap border-r border-emerald-300 bg-emerald-100 px-3 py-3 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                        Аризачининг телефон рақами
                      </th>
                      <th className="w-28 whitespace-nowrap bg-emerald-100 px-3 py-3 text-center text-emerald-950 dark:bg-emerald-950 dark:text-emerald-200">
                        Туғилган куни
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 bg-white font-medium text-slate-700 dark:divide-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    {registryQuery.data?.items?.length === 0 ? (
                      <tr>
                        <td colSpan={17} className="py-12 text-center text-slate-400">
                          Hech qanday ariza yoki material topilmadi
                        </td>
                      </tr>
                    ) : (
                      registryQuery.data?.items?.map((item, idx) => {
                        const isEven = idx % 2 === 0;
                        return (
                          <tr
                            key={item.index + (item.application_number || String(idx))}
                            className={`hover:bg-slate-50/90 dark:hover:bg-slate-800/60 ${
                              isEven
                                ? 'bg-white dark:bg-slate-900'
                                : 'bg-slate-50/40 dark:bg-slate-800/20'
                            }`}
                          >
                            <td className="border-r border-slate-200 bg-inherit px-2 py-2.5 text-center font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                              {item.index}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2.5 text-center text-slate-600 dark:border-slate-800 dark:text-slate-400">
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-emerald-50/70 text-[10px] font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              >
                                {item.source}
                              </Badge>
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2.5 font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-200">
                              {item.officer}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2.5 text-center text-slate-600 dark:border-slate-800 dark:text-slate-400">
                              {item.date}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2.5 font-medium text-slate-800 dark:border-slate-800 dark:text-slate-200">
                              {item.district}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2.5 font-mono text-[11px] font-bold text-sky-700 dark:border-slate-800 dark:text-sky-300">
                              {item.application_number}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2.5 font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                              {item.author_name}
                            </td>
                            <td
                              className="border-r border-slate-200 px-3 py-2.5 text-[11px] leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-400"
                              title={item.description}
                            >
                              <div className="line-clamp-3">{item.description}</div>
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2.5 dark:border-slate-800">
                              <Badge
                                variant="outline"
                                className="border-amber-200 bg-amber-50/70 text-[10px] text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                              >
                                {item.crime_type}
                              </Badge>
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2.5 text-right font-mono font-bold text-rose-600 dark:border-slate-800 dark:text-rose-400">
                              {item.loss_amount
                                ? `${Number(item.loss_amount).toLocaleString()} UZS`
                                : '—'}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2.5 text-xs text-slate-700 dark:border-slate-800 dark:text-slate-300">
                              {item.crime_method || '—'}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2.5 text-[11px] text-rose-800 dark:border-slate-800 dark:text-rose-300">
                              {item.additional_notes || '—'}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2.5 font-mono text-[11px] text-slate-800 dark:border-slate-800 dark:text-slate-200">
                              {item.card_numbers || '—'}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2.5 text-xs text-slate-700 dark:border-slate-800 dark:text-slate-300">
                              {item.banks || '—'}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2.5 text-xs text-slate-700 dark:border-slate-800 dark:text-slate-300">
                              {item.providers || '—'}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2.5 font-mono text-xs text-slate-800 dark:border-slate-800 dark:text-slate-200">
                              {item.phone_number || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-center text-xs text-slate-600 dark:text-slate-400">
                              {item.birth_date || '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {registryQuery.data && registryQuery.data.totalPages > 1 && (
                <div className="border-t border-slate-200 dark:border-slate-800">
                  <PaginationBar
                    page={page}
                    totalPages={registryQuery.data.totalPages}
                    total={registryQuery.data.total}
                    limit={limit}
                    hasNextPage={page < registryQuery.data.totalPages}
                    hasPreviousPage={page > 1}
                    onPageChange={(p) => setPage(p)}
                    onLimitChange={(l) => {
                      setLimit(l);
                      setPage(1);
                    }}
                    isLoading={registryQuery.isFetching}
                  />
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
export default ReportsPage;
