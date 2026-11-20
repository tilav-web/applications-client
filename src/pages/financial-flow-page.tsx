import { useQuery } from '@tanstack/react-query';
import {
  AlertOctagon,
  ArrowRightLeft,
  CreditCard,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { GraphCanvas } from '@/components/graph/graph-canvas';
import { GraphFilterBar } from '@/components/graph/graph-filter-bar';
import { NodeDetailsDrawer } from '@/components/graph/node-details-drawer';
import { Button } from '@/components/ui/button';
import { financialFlowApi } from '@/lib/api';
import type { IGraphNode } from '@/types/models';

export function FinancialFlowPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [searchCard, setSearchCard] = useState('');
  const [riskLevel, setRiskLevel] = useState('ALL');
  const [minAmount, setMinAmount] = useState(0);
  const [clusteringEnabled, setClusteringEnabled] = useState(true);
  const [selectedNode, setSelectedNode] = useState<IGraphNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      window.dispatchEvent(new Event('resize'));
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen && !document.fullscreenElement) {
        setIsFullscreen(false);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement && !isFullscreen) {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else {
          setIsFullscreen(true);
        }
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen((prev) => !prev);
    } finally {
      setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    }
  }, [isFullscreen]);

  // Butun tizimdagi barcha kartalar va o'tkazmalar grafigi
  const {
    data: graphData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['financial-flow-graph', { searchCard, riskLevel, minAmount }],
    queryFn: () =>
      financialFlowApi.getGraph({
        searchCard: searchCard.trim() || undefined,
        riskLevel: riskLevel !== 'ALL' ? riskLevel : undefined,
        minAmount: minAmount > 0 ? minAmount : undefined,
      }),
  });

  const summary = graphData?.summary || {
    totalCards: 0,
    totalFlowAmount: 0,
    droppersCount: 0,
    transitCount: 0,
    blacklistedCount: 0,
  };

  const formatSum = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val || 0) + ' UZS';
  };

  const handleResetFilters = () => {
    setSearchCard('');
    setRiskLevel('ALL');
    setMinAmount(0);
    setClusteringEnabled(false);
  };

  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 flex flex-col h-screen w-screen overflow-hidden gap-1.5 select-none bg-[#f4f6f9] p-2'
          : 'flex flex-col h-full w-full overflow-hidden gap-1.5 select-none min-h-0'
      }
    >
      {/* 1. Summary Stat Cards (5 ta ixcham blok — to'liq ekranda maksimal joy uchun yashiriladi) */}
      {!isFullscreen && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 shrink-0">
          {/* Total Cards */}
          <div className="bg-white border border-[#d2d6de] p-1.5 shadow-xs flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-[#2874a6] border border-blue-200 shrink-0">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[9.5px] text-gray-500 block leading-tight">Jami Kartalar</span>
              <span className="text-xs sm:text-sm font-bold text-gray-900 font-mono">
                {summary.totalCards}
              </span>
            </div>
          </div>

          {/* Total Flow */}
          <div className="bg-white border border-[#d2d6de] p-1.5 shadow-xs flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[9.5px] text-gray-500 block leading-tight">Umumiy Oqim</span>
              <span className="text-xs sm:text-sm font-bold text-emerald-700 font-mono truncate block">
                {formatSum(summary.totalFlowAmount)}
              </span>
            </div>
          </div>

          {/* Droppers Count */}
          <div className="bg-white border border-[#d2d6de] p-1.5 shadow-xs flex items-center gap-2">
            <div className="p-1.5 bg-red-50 text-red-600 border border-red-200 shrink-0">
              <AlertOctagon className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[9.5px] text-gray-500 block leading-tight">
                Dropper Kartalar
              </span>
              <span className="text-xs sm:text-sm font-bold text-red-600 font-mono">
                {summary.droppersCount}
              </span>
            </div>
          </div>

          {/* Transits Count */}
          <div className="bg-white border border-[#d2d6de] p-1.5 shadow-xs flex items-center gap-2">
            <div className="p-1.5 bg-yellow-50 text-yellow-600 border border-yellow-200 shrink-0">
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[9.5px] text-gray-500 block leading-tight">
                Tranzit Kartalar
              </span>
              <span className="text-xs sm:text-sm font-bold text-yellow-600 font-mono">
                {summary.transitCount}
              </span>
            </div>
          </div>

          {/* Blacklisted / Suspicious Cards */}
          <div className="bg-white border border-[#d2d6de] p-1.5 shadow-xs flex items-center gap-2 col-span-2 sm:col-span-1">
            <div className="p-1.5 bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[9.5px] text-gray-500 block leading-tight">
                Xavfli Kartalar
              </span>
              <span className="text-xs sm:text-sm font-bold text-rose-700 font-mono">
                {summary.blacklistedCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Filter Bar */}
      <div className="shrink-0">
        <GraphFilterBar
          searchCard={searchCard}
          onSearchChange={setSearchCard}
          riskLevel={riskLevel}
          onRiskChange={setRiskLevel}
          minAmount={minAmount}
          onMinAmountChange={setMinAmount}
          clusteringEnabled={clusteringEnabled}
          onToggleClustering={() => setClusteringEnabled((prev) => !prev)}
          onResetFilters={handleResetFilters}
          onRefresh={() => refetch()}
          isFetching={isFetching}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => void toggleFullscreen()}
        />
      </div>

      {/* 3. Main Interactive Graph Canvas (To'liq ekranni egallaydi, scroll yo'q) */}
      <div className="relative flex-1 w-full min-h-0 bg-white border border-[#d2d6de] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-xs text-gray-500">
            <Loader2 className="w-7 h-7 text-[#2874a6] animate-spin" />
            <span className="font-medium">Moliyaviy tarmoq xaritasi shakllantirilmoqda...</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-xs text-red-500 p-6 text-center">
            <ShieldAlert className="w-8 h-8 text-red-500" />
            <span className="font-medium">
              {(error as Error)?.message || 'Graf ma‘lumotlarini yuklashda xatolik yuz berdi'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-2 text-xs border-red-300 text-red-600 hover:bg-red-50"
            >
              Qayta urinish
            </Button>
          </div>
        ) : graphData && graphData.nodes.length > 0 ? (
          <>
            <GraphCanvas
              nodes={graphData.nodes}
              edges={graphData.edges}
              selectedNode={selectedNode}
              clusteringEnabled={clusteringEnabled}
              onSelectNode={(node) => setSelectedNode(node)}
              onToggleClustering={() => setClusteringEnabled((prev) => !prev)}
            />

            {/* Karta bosilganda ochiluvchi Tafsilotlar paneli */}
            {selectedNode && (
              <NodeDetailsDrawer node={selectedNode} onClose={() => setSelectedNode(null)} />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-xs text-gray-400 p-8 text-center">
            <CreditCard className="w-12 h-12 text-gray-300" />
            <span className="text-sm font-semibold text-gray-700">
              Hech qanday karta ma‘lumotlari topilmadi
            </span>
            <p className="text-xs text-gray-500 max-w-sm">
              Filtrlarni tozalab ko‘ring yoki arizalarga to‘lov o‘tkazmalari va kartalar
              kiritilganligini tekshiring.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="mt-2 text-xs border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Filtrlarni tozalash
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FinancialFlowPage;
