import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Layers,
  Plus,
  Radar,
  Scale,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DistrictSearchSelect } from '@/components/ui/district-search-select';
import { Input } from '@/components/ui/input';
import {
  PageStatsSheet,
  StatsDistributionBar,
  StatsMetricTile,
  StatsSection,
  StatsSheetSkeleton,
  useStatsSheetState,
} from '@/components/ui/page-stats-sheet';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { toast } from '@/components/ui/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebounce } from '@/hooks/use-debounce';
import { usePermissions } from '@/hooks/use-permissions';
import {
  detectedCrimesApi,
  detectedCrimeStatusesApi,
  detectionSourcesApi,
  districtsApi,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { DetectedCrimeQualification } from '@/types/models';

const QUAL_LABELS: Record<DetectedCrimeQualification, { label: string; cls: string }> = {
  CRIMINAL: {
    label: 'Jinoyat (JK)',
    cls: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
  },
  ADMINISTRATIVE: {
    label: 'Ma’muriy (MJTK)',
    cls: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  },
  PRE_INVESTIGATION: {
    label: 'Tekshiruvda',
    cls: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
  },
};

export function DetectedCrimesPage() {
  const navigate = useNavigate();
  const { canWrite } = usePermissions();
  const statsSheet = useStatsSheetState('uvd_stats_sheet_open:detected-crimes', false);

  const [page, setPage] = useState(1);
  const limit = 15;
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [districtId, setDistrictId] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [crimeStatusId, setCrimeStatusId] = useState('');
  const [qualType, setQualType] = useState('');
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: [
      'detected-crimes',
      {
        page,
        limit,
        search: debouncedSearch,
        districtId,
        sourceId,
        crimeStatusId,
        qualType,
      },
    ],
    queryFn: () =>
      detectedCrimesApi.getAll({
        page,
        limit,
        search: debouncedSearch || undefined,
        district_id: districtId || undefined,
        detection_source_id: sourceId || undefined,
        crime_status_id: crimeStatusId || undefined,
        qualification_type: qualType || undefined,
      }),
  });

  const {
    data: stats,
    isLoading: statsLoading,
    isFetching: statsFetching,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['detected-crimes-stats'],
    queryFn: () => detectedCrimesApi.getStats(),
    enabled: statsSheet.isOpen,
    staleTime: 30_000,
  });

  const { data: districtsRes } = useQuery({
    queryKey: ['districts-for-dc'],
    queryFn: () => districtsApi.getAll({ page: 1, limit: 500 }),
  });

  const { data: sources } = useQuery({
    queryKey: ['detection-sources-active'],
    queryFn: () => detectionSourcesApi.getAll(),
  });

  const { data: crimeStatuses } = useQuery({
    queryKey: ['detected-crime-statuses-active'],
    queryFn: () => detectedCrimeStatusesApi.getAll(),
  });

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await detectedCrimesApi.exportExcel({
        search: debouncedSearch || undefined,
        district_id: districtId || undefined,
        detection_source_id: sourceId || undefined,
        status_id: crimeStatusId || undefined,
        qualification_type: qualType || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aniqlangan_jinoyatlar_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Excel hisobot yuklab olindi');
    } catch (err) {
      toast.error('Eksportda xatolik', { description: getErrorMessage(err) });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-500/15 text-rose-600 flex items-center justify-center">
            <Radar className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Aniqlangan Jinoyatlar</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            loading={exporting}
            className="h-9 gap-1.5 text-xs cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Excel
          </Button>
          {canWrite && (
            <Button
              size="sm"
              onClick={() => navigate('/detected-crimes/create')}
              className="h-9 gap-1.5 text-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Yangi aniqlangan holat
            </Button>
          )}
        </div>
      </div>

      {/* Filtrlar */}
      <Card className="border-border/80 bg-card/60">
        <CardContent className="p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <div className="relative">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Kod, sarlavha, bildirgi, Telegram..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <select
              value={qualType}
              onChange={(e) => {
                setQualType(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-2.5 text-xs"
            >
              <option value="">Barcha malakalar (JK / MJTK)</option>
              <option value="PRE_INVESTIGATION">Tekshiruvda</option>
              <option value="CRIMINAL">Jinoyat (JK)</option>
              <option value="ADMINISTRATIVE">Ma’muriy (MJTK)</option>
            </select>

            <select
              value={sourceId}
              onChange={(e) => {
                setSourceId(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-2.5 text-xs"
            >
              <option value="">Barcha aniqlash usullari</option>
              {(sources || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <DistrictSearchSelect
              districts={districtsRes?.items || []}
              value={districtId}
              onChange={(v) => {
                setDistrictId(v || '');
                setPage(1);
              }}
              onlyRegionCode="QASHQADARYO"
              placeholder="Barcha tumanlar"
              size="sm"
            />

            <select
              value={crimeStatusId}
              onChange={(e) => {
                setCrimeStatusId(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-2.5 text-xs"
            >
              <option value="">Barcha holatlar</option>
              {(crimeStatuses || []).map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Jadval */}
      <Card className="py-0 gap-0 border-border/80 bg-card/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-[11px]">№ / Sana</TableHead>
              <TableHead className="text-[11px]">Sarlavha & Platforma</TableHead>
              <TableHead className="text-[11px]">Malaka & Modda</TableHead>
              <TableHead className="text-[11px]">Aniqlash usuli & Hudud</TableHead>
              <TableHead className="text-[11px]">Gumonlanuvchilar</TableHead>
              <TableHead className="text-[11px]">Holat & Choralar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                  Yuklanmoqda...
                </TableCell>
              </TableRow>
            ) : data?.items?.length ? (
              data.items.map((item) => {
                const qMeta = QUAL_LABELS[item.qualification_type] || QUAL_LABELS.PRE_INVESTIGATION;
                return (
                  <TableRow
                    key={item.id}
                    onClick={() => navigate(`/detected-crimes/${item.id}`)}
                    className="cursor-pointer hover:bg-muted/40"
                  >
                    <TableCell className="whitespace-nowrap">
                      <div className="font-mono text-xs font-bold text-primary">
                        {item.case_number || '—'}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(item.detected_at).toLocaleDateString('uz-UZ')}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <div className="text-xs font-semibold truncate">{item.title}</div>
                      {(item.platform || item.channel_or_source_url) && (
                        <div className="text-[11px] text-muted-foreground truncate">
                          {[item.platform, item.channel_or_source_url].filter(Boolean).join(' • ')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant="outline" className={`text-[10px] ${qMeta.cls}`}>
                          {qMeta.label}
                        </Badge>
                        <span className="text-[11px] font-semibold text-foreground">
                          {item.crime?.article || item.mjtk_article || '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{item.district?.name || '—'}</div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                        {item.detection_source?.name || '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.suspects && item.suspects.length > 0 ? (
                        <div className="space-y-0.5">
                          {item.suspects.slice(0, 2).map((s) => (
                            <div
                              key={s.id || s.citizen_id}
                              className="text-xs flex items-center gap-1"
                            >
                              <span className="font-medium">
                                {s.citizen?.full_name?.trim() || 'Shaxs'}
                              </span>
                              {s.is_repeat_offender && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 border-rose-500/40 bg-rose-500/10 text-rose-600"
                                >
                                  Takroriy
                                </Badge>
                              )}
                            </div>
                          ))}
                          {item.suspects.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{item.suspects.length - 2} nafar
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Aniqlanmoqda</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {item.crime_status?.name ||
                            item.application_status?.name ||
                            'Fosh etildi'}
                        </Badge>
                        {Array.isArray(item.measures) && item.measures.length > 0 && (
                          <span className="text-[10px] text-emerald-600 font-medium">
                            {item.measures.length} ta chora ko‘rilgan
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                  Hozircha aniqlangan jinoyatlar kiritilmagan
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {data?.meta && data.meta.totalPages > 1 && (
        <PaginationBar
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          total={data.meta.total}
          limit={data.meta.limit}
          hasNextPage={data.meta.hasNextPage}
          hasPreviousPage={data.meta.hasPreviousPage}
          onPageChange={setPage}
        />
      )}

      {/* O'NG TOMONDAN SLIDE-OVER OCHILADIGAN ANIQLANGAN JINOYATLAR STATISTIKASI */}
      <PageStatsSheet
        isOpen={statsSheet.isOpen}
        onOpen={statsSheet.open}
        onClose={statsSheet.close}
        title="Aniqlangan Jinoyatlar"
        subtitle="Malaka, ijro va protsessual muddat holati"
        icon={<Radar className="h-4 w-4" />}
        isFetching={statsFetching && Boolean(stats)}
        onRefresh={() => void refetchStats()}
      >
        {statsLoading && !stats ? (
          <StatsSheetSkeleton />
        ) : (
          <>
            <StatsSection>
              <div className="grid grid-cols-2 gap-2.5">
                <StatsMetricTile
                  label="Jami Fosh Etilgan"
                  value={stats?.total ?? 0}
                  accent="primary"
                  icon={<Radar className="h-3.5 w-3.5" />}
                  active={!qualType}
                  onClick={() => {
                    if (qualType) {
                      setQualType('');
                      setPage(1);
                    }
                  }}
                  subtext="Barcha aniqlangan holatlar"
                />

                <StatsMetricTile
                  label="Jinoyat (JK)"
                  value={stats?.criminalCount ?? 0}
                  accent="rose"
                  icon={<ShieldAlert className="h-3.5 w-3.5" />}
                  active={qualType === 'CRIMINAL'}
                  onClick={() => {
                    setQualType(qualType === 'CRIMINAL' ? '' : 'CRIMINAL');
                    setPage(1);
                  }}
                  title="Faqat JK jinoyatlarini filtrlash"
                  subtext="Bosib filtrlang"
                />

                <StatsMetricTile
                  label="Ma’muriy (MJTK)"
                  value={stats?.adminCount ?? 0}
                  accent="amber"
                  icon={<Scale className="h-3.5 w-3.5" />}
                  active={qualType === 'ADMINISTRATIVE'}
                  onClick={() => {
                    setQualType(qualType === 'ADMINISTRATIVE' ? '' : 'ADMINISTRATIVE');
                    setPage(1);
                  }}
                  title="Faqat MJTK holatlarini filtrlash"
                  subtext="Bosib filtrlang"
                />

                <StatsMetricTile
                  label="Tekshiruvda"
                  value={stats?.preInvCount ?? 0}
                  accent="blue"
                  icon={<Clock className="h-3.5 w-3.5" />}
                  active={qualType === 'PRE_INVESTIGATION'}
                  onClick={() => {
                    setQualType(qualType === 'PRE_INVESTIGATION' ? '' : 'PRE_INVESTIGATION');
                    setPage(1);
                  }}
                  title="Tekshiruvdagi holatlarni filtrlash"
                  subtext="Bosib filtrlang"
                />
              </div>
            </StatsSection>

            <StatsSection
              title="Malaka taqsimoti"
              icon={<Layers className="h-3.5 w-3.5 text-primary" />}
            >
              <StatsDistributionBar
                total={stats?.total ?? 0}
                segments={[
                  {
                    key: 'criminal',
                    label: 'Jinoyat (JK)',
                    count: stats?.criminalCount ?? 0,
                    colorClass: 'bg-rose-500',
                    dotColorClass: 'bg-rose-500',
                    active: qualType === 'CRIMINAL',
                    onClick: () => {
                      setQualType(qualType === 'CRIMINAL' ? '' : 'CRIMINAL');
                      setPage(1);
                    },
                  },
                  {
                    key: 'admin',
                    label: 'Ma’muriy (MJTK)',
                    count: stats?.adminCount ?? 0,
                    colorClass: 'bg-amber-500',
                    dotColorClass: 'bg-amber-500',
                    active: qualType === 'ADMINISTRATIVE',
                    onClick: () => {
                      setQualType(qualType === 'ADMINISTRATIVE' ? '' : 'ADMINISTRATIVE');
                      setPage(1);
                    },
                  },
                  {
                    key: 'pre',
                    label: 'Tekshiruvda',
                    count: stats?.preInvCount ?? 0,
                    colorClass: 'bg-sky-500',
                    dotColorClass: 'bg-sky-500',
                    active: qualType === 'PRE_INVESTIGATION',
                    onClick: () => {
                      setQualType(qualType === 'PRE_INVESTIGATION' ? '' : 'PRE_INVESTIGATION');
                      setPage(1);
                    },
                  },
                ]}
              />
            </StatsSection>

            <StatsSection
              title="Ijro va muddat holati"
              icon={<CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
            >
              <div className="grid grid-cols-2 gap-2.5">
                <StatsMetricTile
                  label="Yakunlangan"
                  value={stats?.finalCount ?? 0}
                  accent="emerald"
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  pill={
                    stats && stats.total > 0 ? (
                      <span className="text-[10px] font-mono font-bold px-1 py-0.5 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                        {Math.round((stats.finalCount / stats.total) * 100)}%
                      </span>
                    ) : null
                  }
                  subtext="Sud qarori / yakuniy"
                />

                <StatsMetricTile
                  label="Jarayonda"
                  value={stats?.inProgressCount ?? 0}
                  accent="blue"
                  icon={<Clock className="h-3.5 w-3.5" />}
                  subtext="Tergov davom etmoqda"
                />
              </div>

              {(stats?.overdueCount ?? 0) > 0 && (
                <StatsMetricTile
                  label="Muddati o‘tgan (SLA)"
                  value={stats?.overdueCount ?? 0}
                  accent="rose"
                  icon={<AlertTriangle className="h-3.5 w-3.5" />}
                  subtext="Zudlik bilan chora ko‘rish talab etiladi"
                />
              )}
            </StatsSection>
          </>
        )}
      </PageStatsSheet>
    </div>
  );
}
