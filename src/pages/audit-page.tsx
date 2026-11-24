import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Archive,
  Ban,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { TableRowsSkeleton } from '@/components/ui/page-skeletons';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebounce } from '@/hooks/use-debounce';
import { auditApi, type AuditLogItem } from '@/lib/api';
import { useAuthStore } from '@/store/use-auth-store';

const ACTION_OPTIONS = [
  { value: '', label: 'Barcha harakatlar' },
  { value: 'LOGIN_SUCCESS', label: 'Tizimga kirish' },
  { value: 'LOGIN_FAILED', label: 'Muvaffaqiyatsiz kirish' },
  { value: 'LOGOUT', label: 'Tizimdan chiqish' },
  { value: 'CREATE', label: 'Yaratish' },
  { value: 'UPDATE', label: 'Tahrirlash' },
  { value: 'DELETE', label: 'O‘chirish' },
  { value: 'EXPORT_EXCEL', label: 'Excel eksport' },
  { value: 'EXPORT_DOCX', label: 'Word eksport' },
  { value: 'VIEW_DOSSIER', label: 'Dosye ko‘rish' },
  { value: 'DOWNLOAD_FILE', label: 'Fayl yuklab olish' },
  { value: 'ACCESS_DENIED', label: 'Ruxsatsiz urinish' },
  { value: 'RATE_LIMIT_BLOCKED', label: 'Limit bloklandi' },
  { value: 'IP_BLOCKED', label: 'IP bloklandi' },
  { value: 'AUDIT_POLICY_UPDATED', label: 'Audit siyosati' },
  { value: 'AUDIT_CLEANUP', label: 'Audit tozalash' },
];

const ENTITY_OPTIONS = [
  { value: '', label: 'Barcha bo‘limlar' },
  { value: 'application', label: 'Arizalar' },
  { value: 'citizen', label: 'Fuqarolar' },
  { value: 'card', label: 'Kartalar' },
  { value: 'transfer', label: 'O‘tkazmalar' },
  { value: 'user', label: 'Hodimlar' },
  { value: 'document', label: 'Hujjatlar' },
  { value: 'file', label: 'Fayllar' },
  { value: 'intelligence', label: 'Dosye / Razvedka' },
  { value: 'reference', label: 'Ma’lumotnomalar' },
  { value: 'auth', label: 'Autentifikatsiya' },
  { value: 'security', label: 'Xavfsizlik' },
];

const RETENTION_OPTIONS = [
  { value: 30, label: '30 kun (1 oy)' },
  { value: 60, label: '60 kun (2 oy)' },
  { value: 90, label: '90 kun (3 oy)' },
  { value: 180, label: '180 kun (6 oy)' },
  { value: 365, label: '365 kun (1 yil)' },
  { value: 0, label: 'Cheksiz (o‘chirmaslik)' },
];

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('uz-UZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getSeverityBadge(severity: AuditLogItem['severity']) {
  if (severity === 'CRITICAL') {
    return (
      <Badge
        variant="outline"
        className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-[11px]"
      >
        Kritik
      </Badge>
    );
  }
  if (severity === 'WARNING') {
    return (
      <Badge
        variant="outline"
        className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[11px]"
      >
        Diqqat
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[11px]"
    >
      Oddiy
    </Badge>
  );
}

export function AuditPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'logs' | 'traffic'>('logs');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [severity, setSeverity] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [blockTargetIp, setBlockTargetIp] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockHours, setBlockHours] = useState(24);

  const debouncedSearch = useDebounce(search, 250);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const { data: stats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: () => auditApi.getStats(),
    enabled: isSuperAdmin,
    refetchInterval: 30_000,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: [
      'audit-logs',
      { page, limit, search: debouncedSearch, action, entityType, severity, dateFrom, dateTo },
    ],
    queryFn: () =>
      auditApi.getLogs({
        page,
        limit,
        search: debouncedSearch || undefined,
        action: action || undefined,
        entity_type: entityType || undefined,
        severity: severity || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
    enabled: isSuperAdmin && activeTab === 'logs',
  });

  const { data: settings } = useQuery({
    queryKey: ['audit-settings'],
    queryFn: () => auditApi.getSettings(),
    enabled: isSuperAdmin,
  });

  const {
    data: traffic,
    isLoading: trafficLoading,
    refetch: refetchTraffic,
  } = useQuery({
    queryKey: ['audit-traffic'],
    queryFn: () => auditApi.getTraffic(),
    enabled: isSuperAdmin && activeTab === 'traffic',
    refetchInterval: 15_000,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (payload: { audit_retention_days?: number; audit_archive_to_minio?: boolean }) =>
      auditApi.updateSettings(payload),
    onSuccess: () => {
      toast.success('Audit saqlash siyosati yangilandi');
      void queryClient.invalidateQueries({ queryKey: ['audit-settings'] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: () => toast.error('Sozlamani saqlashda xatolik'),
  });

  const cleanupMutation = useMutation({
    mutationFn: () => auditApi.runCleanup(),
    onSuccess: (res) => {
      if (res.deleted_count === 0) {
        toast.info('Muddati o‘tgan eski audit loglar topilmadi');
      } else {
        toast.success(
          `${res.deleted_count} ta eski yozuv tozalandi${res.archived_key ? ' va MinIO ga arxivlandi' : ''}`,
        );
      }
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      void queryClient.invalidateQueries({ queryKey: ['audit-stats'] });
    },
    onError: () => toast.error('Tozalashda xatolik yuz berdi'),
  });

  const blockIpMutation = useMutation({
    mutationFn: (payload: { ip: string; reason?: string; duration_hours?: number }) =>
      auditApi.blockIp(payload),
    onSuccess: (_res, vars) => {
      toast.success(`${vars.ip} IP manzili bloklandi`);
      setBlockTargetIp('');
      setBlockReason('');
      void queryClient.invalidateQueries({ queryKey: ['audit-traffic'] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: () => toast.error('IP manzilni bloklashda xatolik'),
  });

  const unblockIpMutation = useMutation({
    mutationFn: (ip: string) => auditApi.unblockIp(ip),
    onSuccess: (_res, ip) => {
      toast.success(`${ip} blokdan chiqarildi`);
      void queryClient.invalidateQueries({ queryKey: ['audit-traffic'] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: () => toast.error('IP manzilni blokdan chiqarishda xatolik'),
  });

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center space-y-2">
        <ShieldAlert className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold">Kirish taqiqlangan</h2>
        <p className="text-sm text-muted-foreground">
          Ushbu bo‘lim faqat Super Admin uchun mo‘ljallangan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Sarlavha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Audit Jurnali & Xavfsizlik Monitoringi
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Xodimlar harakatlari, trafik anomaliyalari, IP bloklash va CrowdSec himoyasi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void auditApi.exportExcel({
                search: debouncedSearch || undefined,
                action: action || undefined,
                entity_type: entityType || undefined,
                severity: severity || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
              })
            }
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
            Excel eksport
          </Button>
        </div>
      </div>

      {/* Statistika kartalari */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Bugungi amallar</p>
              <p className="text-2xl font-bold mt-1">{stats?.today_count ?? 0}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Jami bazada: {stats?.total_logs ?? 0}
              </p>
            </div>
            <Activity className="h-8 w-8 text-primary/70" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Xato / Ruxsatsiz (24s)</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">
                {stats?.failed_auth_24h ?? 0}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">401, 403, 429, login xato</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-500/80" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Eksportlar (24s)</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{stats?.exports_24h ?? 0}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Excel va Word yuklashlar</p>
            </div>
            <Download className="h-8 w-8 text-blue-500/80" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Kritik / O‘chirish (24s)</p>
              <p className="text-2xl font-bold mt-1 text-rose-600">
                {(stats?.critical_24h ?? 0) + (stats?.deletes_24h ?? 0)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                O‘chirish: {stats?.deletes_24h ?? 0}
              </p>
            </div>
            <ShieldAlert className="h-8 w-8 text-rose-500/80" />
          </CardContent>
        </Card>
      </div>

      {/* Tablar */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'logs' | 'traffic')}>
        <TabsList>
          <TabsTrigger value="logs" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Audit Jurnali
          </TabsTrigger>
          <TabsTrigger value="traffic" className="gap-1.5">
            <Shield className="h-4 w-4" />
            Trafik & CrowdSec Monitoringi
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: AUDIT JURNALI */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          {/* Avtomatik tozalash (Retention Policy) paneli */}
          <Card className="border-primary/20 bg-primary/[0.02]">
            <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <Archive className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold">Avtomatik saqlash muddati:</span>
                <select
                  value={settings?.audit_retention_days ?? 90}
                  onChange={(e) =>
                    updateSettingsMutation.mutate({
                      audit_retention_days: Number(e.target.value),
                    })
                  }
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium"
                >
                  {RETENTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings?.audit_archive_to_minio ?? true}
                    onChange={(e) =>
                      updateSettingsMutation.mutate({
                        audit_archive_to_minio: e.target.checked,
                      })
                    }
                    className="rounded border-input"
                  />
                  <span>O‘chirishdan oldin MinIO ga arxivlash (.json.gz)</span>
                </label>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    cleanupMutation.isPending || (settings?.audit_retention_days ?? 0) === 0
                  }
                  onClick={() => cleanupMutation.mutate()}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Hozir tozalash
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Filtrlar */}
          <Card>
            <CardContent className="p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
              <div className="relative lg:col-span-2">
                <Search className="h-4 w-4 text-muted-foreground absolute left-2.5 top-2.5" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Xodim, IP, tavsif, path bo‘yicha qidirish..."
                  className="pl-8 h-9 text-xs"
                />
              </div>

              <select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              >
                {ACTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <select
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              >
                {ENTITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <select
                value={severity}
                onChange={(e) => {
                  setSeverity(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="">Barcha darajalar</option>
                <option value="INFO">Oddiy (INFO)</option>
                <option value="WARNING">Diqqat (WARNING)</option>
                <option value="CRITICAL">Kritik (CRITICAL)</option>
              </select>

              <div className="flex gap-1.5">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 text-xs px-2"
                  title="Boshlanish sanasi"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 text-xs px-2"
                  title="Tugash sanasi"
                />
              </div>
            </CardContent>
          </Card>

          {/* Jadval */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-semibold">Vaqt</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Xodim</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Harakat</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Tavsif</th>
                    <th className="text-left px-3 py-2.5 font-semibold">IP Manzil</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                    <th className="text-right px-3 py-2.5 font-semibold">Batafsil</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logsLoading ? (
                    <TableRowsSkeleton rows={8} columns={7} nativeTr />
                  ) : !logsData?.items.length ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        Audit yozuvlari topilmadi
                      </td>
                    </tr>
                  ) : (
                    logsData.items.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                          {formatDateTime(item.created_at)}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="font-semibold text-foreground">
                            {item.username || 'Anonim'}
                          </div>
                          {item.role && (
                            <div className="text-[10px] text-muted-foreground">{item.role}</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {getSeverityBadge(item.severity)}
                            <span className="font-mono text-[11px]">{item.action}</span>
                          </div>
                        </td>
                        <td
                          className="px-3 py-2.5 max-w-[320px] truncate"
                          title={item.summary || item.path}
                        >
                          <div className="font-medium text-foreground truncate">
                            {item.summary || `${item.method} ${item.path}`}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground truncate">
                            {item.method} {item.path}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] whitespace-nowrap">
                          {item.ip || '-'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span
                            className={
                              item.status_code >= 400
                                ? 'font-mono font-bold text-rose-600'
                                : 'font-mono font-semibold text-emerald-600'
                            }
                          >
                            {item.status_code}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({item.duration_ms}ms)
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => setSelectedLog(item)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {logsData?.meta && (
              <div className="p-3 border-t">
                <PaginationBar
                  page={logsData.meta.page}
                  totalPages={logsData.meta.totalPages}
                  total={logsData.meta.total}
                  limit={logsData.meta.limit}
                  hasNextPage={logsData.meta.hasNextPage}
                  hasPreviousPage={logsData.meta.hasPreviousPage}
                  onPageChange={setPage}
                  onLimitChange={(newLimit) => {
                    setLimit(newLimit);
                    setPage(1);
                  }}
                />
              </div>
            )}
          </Card>
        </TabsContent>

        {/* TAB 2: TRAFIK & CROWDSEC MONITORINGI */}
        <TabsContent value="traffic" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Redis real-vaqt trafik ko‘rsatkichlari (oxirgi 60 daqiqa) va CrowdSec avtomatik
              himoyasi
            </p>
            <Button size="sm" variant="outline" onClick={() => void refetchTraffic()}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${trafficLoading ? 'animate-spin' : ''}`} />
              Yangilash
            </Button>
          </div>

          {/* Status statistikasi */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <Card>
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground">Jami (24s)</p>
                <p className="text-lg font-bold">{traffic?.status_breakdown.total ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[11px] text-emerald-600">Muvaffaqiyatli (2xx)</p>
                <p className="text-lg font-bold text-emerald-600">
                  {traffic?.status_breakdown['2xx'] ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[11px] text-amber-600">Auth xato (401)</p>
                <p className="text-lg font-bold text-amber-600">
                  {traffic?.status_breakdown['401'] ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[11px] text-rose-600">Taqiqlangan (403)</p>
                <p className="text-lg font-bold text-rose-600">
                  {traffic?.status_breakdown['403'] ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[11px] text-purple-600">Rate Limit (429)</p>
                <p className="text-lg font-bold text-purple-600">
                  {traffic?.status_breakdown['429'] ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[11px] text-rose-700">Server xato (5xx)</p>
                <p className="text-lg font-bold text-rose-700">
                  {traffic?.status_breakdown['5xx'] ?? 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Real-vaqt trafik grafigi */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                So‘rovlar dinamikasi (oxirgi 60 daqiqa, daqiqasiga)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={traffic?.timeline || []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={5} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    name="So‘rovlar"
                    stroke="#2563eb"
                    fill="#3b82f6"
                    fillOpacity={0.18}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* CrowdSec + Top IPs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CrowdSec paneli */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  CrowdSec Avtomatik Himoya (IDS/IPS)
                </CardTitle>
                {traffic?.crowdsec.connected ? (
                  <Badge
                    className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                    variant="outline"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Faol
                  </Badge>
                ) : (
                  <Badge
                    className="bg-amber-500/15 text-amber-600 border-amber-500/30"
                    variant="outline"
                  >
                    Ulanmagan
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {!traffic?.crowdsec.connected ? (
                  <p className="text-muted-foreground">
                    CrowdSec LAPI holati: {traffic?.crowdsec.error || 'ulanish kutilmoqda'}
                  </p>
                ) : traffic.crowdsec.decisions.length === 0 ? (
                  <p className="text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Hozircha CrowdSec tomonidan bloklangan hujumchi IP lar yo‘q — trafik tinch.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {traffic.crowdsec.decisions.map((d, idx) => (
                      <div
                        key={d.id ?? idx}
                        className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/5 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-mono font-bold text-rose-600">{d.value}</p>
                          <p className="text-[11px] text-muted-foreground">{d.scenario}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {d.type} • {d.duration}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Qo'lda bloklangan IP lar */}
                <div className="pt-3 border-t space-y-2">
                  <p className="font-semibold text-xs">
                    Qo‘lda bloklangan IP lar ({traffic?.blocked_ips.length ?? 0})
                  </p>
                  <div className="flex gap-1.5">
                    <Input
                      value={blockTargetIp}
                      onChange={(e) => setBlockTargetIp(e.target.value)}
                      placeholder="IP manzil (masalan: 10.106.0.55)"
                      className="h-8 text-xs font-mono"
                    />
                    <Input
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="Sabab"
                      className="h-8 text-xs"
                    />
                    <select
                      value={blockHours}
                      onChange={(e) => setBlockHours(Number(e.target.value))}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value={1}>1 soat</option>
                      <option value={24}>24 soat</option>
                      <option value={168}>7 kun</option>
                    </select>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 shrink-0"
                      disabled={!blockTargetIp.trim() || blockIpMutation.isPending}
                      onClick={() =>
                        blockIpMutation.mutate({
                          ip: blockTargetIp.trim(),
                          reason: blockReason.trim() || undefined,
                          duration_hours: blockHours,
                        })
                      }
                    >
                      <Ban className="h-3.5 w-3.5 mr-1" /> Bloklash
                    </Button>
                  </div>

                  {traffic?.blocked_ips.map((b) => (
                    <div
                      key={b.ip}
                      className="p-2 rounded-md border bg-muted/30 flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-mono font-bold text-rose-600">{b.ip}</span>
                        <span className="text-muted-foreground ml-2">{b.reason}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => unblockIpMutation.mutate(b.ip)}
                      >
                        <Unlock className="h-3 w-3 mr-1" /> Ochish
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top IP lar */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Eng faol va shubhali IP manzillar (24s)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2">IP Manzil</th>
                      <th className="text-right px-3 py-2">So‘rovlar</th>
                      <th className="text-right px-3 py-2">Xatolar</th>
                      <th className="text-right px-3 py-2">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {!traffic?.top_ips.length ? (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-muted-foreground">
                          Ma’lumot yig‘ilmoqda...
                        </td>
                      </tr>
                    ) : (
                      traffic.top_ips.map((row) => (
                        <tr key={row.ip}>
                          <td className="px-3 py-2 font-mono">{row.ip}</td>
                          <td className="px-3 py-2 text-right font-semibold">{row.requests}</td>
                          <td className="px-3 py-2 text-right font-mono text-rose-600">
                            {row.errors}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {row.ip === '127.0.0.1' || row.ip === '::1' ? (
                              <span className="text-[10px] text-muted-foreground">Localhost</span>
                            ) : row.is_blocked ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[11px]"
                                onClick={() => unblockIpMutation.mutate(row.ip)}
                              >
                                Ochish
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[11px] text-rose-600 hover:text-rose-700"
                                onClick={() =>
                                  blockIpMutation.mutate({
                                    ip: row.ip,
                                    reason: 'Shubhali faollik',
                                    duration_hours: 24,
                                  })
                                }
                              >
                                Bloklash
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Top Endpointlar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Eng ko‘p chaqirilgan endpointlar (24s)
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {traffic?.top_endpoints.map((ep) => (
                <div
                  key={ep.endpoint}
                  className="px-3 py-2 rounded-lg border bg-muted/20 flex items-center justify-between text-xs gap-2"
                >
                  <span className="font-mono truncate" title={ep.endpoint}>
                    {ep.endpoint}
                  </span>
                  <Badge variant="secondary" className="font-mono shrink-0">
                    {ep.requests}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tafsilotlar oynasi */}
      <Dialog open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base">Audit yozuvi tafsilotlari</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/40 border">
                <div>
                  <span className="text-muted-foreground block">Vaqt</span>
                  <span className="font-mono font-medium">
                    {formatDateTime(selectedLog.created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Xodim / Rol</span>
                  <span className="font-semibold">
                    {selectedLog.username || 'Anonim'} ({selectedLog.role || '-'})
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Harakat / Bo‘lim</span>
                  <span className="font-mono">
                    {selectedLog.action} / {selectedLog.entity_type || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">IP Manzil / Status</span>
                  <span className="font-mono">
                    {selectedLog.ip || '-'} • HTTP {selectedLog.status_code} (
                    {selectedLog.duration_ms}ms)
                  </span>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground block mb-1">Tavsif va Yo‘l</span>
                <p className="font-medium">{selectedLog.summary}</p>
                <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                  {selectedLog.method} {selectedLog.path}
                </p>
              </div>

              {selectedLog.user_agent && (
                <div>
                  <span className="text-muted-foreground block mb-1">Qurilma / Brauzer</span>
                  <p className="font-mono text-[11px] break-all text-muted-foreground">
                    {selectedLog.user_agent}
                  </p>
                </div>
              )}

              {selectedLog.details && (
                <div>
                  <span className="text-muted-foreground block mb-1">
                    Yuborilgan ma’lumotlar (maxfiy maydonlar yashirilgan)
                  </span>
                  <pre className="p-3 rounded-lg bg-muted/60 border text-[11px] font-mono overflow-x-auto max-h-60">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
