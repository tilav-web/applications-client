import { CreditCard, Maximize2, Minimize2, TrendingUp } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { GraphCanvas } from '@/components/graph/graph-canvas';
import { NodeDetailsDrawer } from '@/components/graph/node-details-drawer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { IGraphData, IGraphNode, INetworkGraph } from '@/types/models';

interface EntityNetworkGraphProps {
  networkGraph?: INetworkGraph;
  financialGraph?: IGraphData;
  defaultMode?: 'network' | 'financial';
  heightClassName?: string;
  title?: string;
}

const formatMoney = (val?: number | null) => {
  if (!val || val <= 0) return null;
  return `${new Intl.NumberFormat('uz-UZ').format(Math.round(val))} UZS`;
};

export const EntityNetworkGraph: React.FC<EntityNetworkGraphProps> = ({
  financialGraph,
  heightClassName = 'h-[460px]',
  title = 'Moliyaviy Pul Oqimi',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedFinNode, setSelectedFinNode] = useState<IGraphNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const nodes = financialGraph?.nodes || [];
  const edges = financialGraph?.edges || [];
  const hasFinancialFlow = nodes.length > 0;
  const totalFlowAmount =
    financialGraph?.summary?.totalFlowAmount ??
    edges.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen && !document.fullscreenElement) {
        setIsFullscreen(false);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
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

  if (!hasFinancialFlow) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-5 flex items-center justify-center gap-2.5 text-xs text-muted-foreground">
        <CreditCard className="h-4 w-4 opacity-50 shrink-0" />
        <span>Kartalararo moliyaviy pul oʻtkazmalari oqimi mavjud emas.</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'border border-border/80 bg-card overflow-hidden flex flex-col min-w-0',
        isFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen rounded-none'
          : 'rounded-xl shadow-2xs',
      )}
    >
      {/* Yagona ixcham sarlavha: faqat Moliyaviy Pul Oqimi + Katta ekranda ko'rish */}
      <div className="px-4 py-2.5 border-b border-border/70 bg-muted/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-foreground">
            <TrendingUp className="h-4 w-4 text-primary shrink-0" />
            <span>{title}</span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {nodes.length} ta tugun · {edges.length} ta oʻtkazma
            {formatMoney(totalFlowAmount) ? ` · ${formatMoney(totalFlowAmount)}` : ''}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void toggleFullscreen()}
          className="h-7 px-2.5 text-xs gap-1.5 cursor-pointer bg-background"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="h-3.5 w-3.5" />
              <span>Kichraytirish</span>
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Katta ekranda koʻrish</span>
            </>
          )}
        </Button>
      </div>

      {/* Interaktiv Moliyaviy Pul Oqimi Canvas */}
      <div
        className={cn(
          'relative w-full overflow-hidden bg-white select-none',
          isFullscreen ? 'flex-1 h-full' : heightClassName,
        )}
      >
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          selectedNode={selectedFinNode}
          clusteringEnabled={false}
          onSelectNode={(n) => setSelectedFinNode(n)}
        />
        {selectedFinNode && (
          <NodeDetailsDrawer node={selectedFinNode} onClose={() => setSelectedFinNode(null)} />
        )}
      </div>
    </div>
  );
};
