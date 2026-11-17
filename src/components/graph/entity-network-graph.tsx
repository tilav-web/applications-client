import {
  ArrowUpRight,
  CreditCard,
  FileText,
  Fingerprint,
  LayoutGrid,
  Phone,
  ShieldAlert,
  TrendingUp,
  User,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { GraphCanvas } from '@/components/graph/graph-canvas';
import { NodeDetailsDrawer } from '@/components/graph/node-details-drawer';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { IGraphData, IGraphNode, INetworkGraph, INetworkNode } from '@/types/models';

interface EntityNetworkGraphProps {
  networkGraph?: INetworkGraph;
  financialGraph?: IGraphData;
  defaultMode?: 'network' | 'financial';
  heightClassName?: string;
}

const formatMoney = (val?: number | null) => {
  if (!val || val <= 0) return null;
  return `${new Intl.NumberFormat('uz-UZ').format(Math.round(val))} UZS`;
};

export const EntityNetworkGraph: React.FC<EntityNetworkGraphProps> = ({
  networkGraph,
  financialGraph,
  defaultMode,
  heightClassName = 'h-[480px]',
}) => {
  const navigate = useNavigate();
  const hasFinancialFlow = (financialGraph?.nodes?.length || 0) > 0;

  const [mode, setMode] = useState<'financial' | 'structured'>(
    defaultMode === 'financial' || hasFinancialFlow ? 'financial' : 'structured',
  );
  const [selectedFinNode, setSelectedFinNode] = useState<IGraphNode | null>(null);

  const grouped = useMemo(() => {
    const nodes = (networkGraph?.nodes || []).filter((n) => !n.isCenter);
    const edgeReasons = new Map<string, string[]>();

    for (const e of networkGraph?.edges || []) {
      if (!edgeReasons.has(e.to)) edgeReasons.set(e.to, []);
      if (e.label && !edgeReasons.get(e.to)!.includes(e.label)) {
        edgeReasons.get(e.to)!.push(e.label);
      }
      if (!edgeReasons.has(e.from)) edgeReasons.set(e.from, []);
      if (e.label && !edgeReasons.get(e.from)!.includes(e.label)) {
        edgeReasons.get(e.from)!.push(e.label);
      }
    }

    return {
      citizens: nodes.filter((n) => n.nodeType === 'CITIZEN'),
      cards: nodes.filter((n) => n.nodeType === 'CARD'),
      clues: nodes.filter((n) => n.nodeType === 'PHONE' || n.nodeType === 'IDENTIFIER'),
      applications: nodes.filter((n) => n.nodeType === 'APPLICATION'),
      edgeReasons,
      totalCount: nodes.length,
    };
  }, [networkGraph]);

  const renderRoleBadge = (node: INetworkNode) => {
    if (node.role === 'DROPPER' || node.role === 'SUSPECT' || node.role === 'MIXED') {
      return (
        <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] px-1.5 py-0 gap-1 shrink-0">
          <ShieldAlert className="h-2.5 w-2.5" />
          {node.role === 'DROPPER' ? 'Dropper' : 'Gumonlanuvchi'}
        </Badge>
      );
    }
    if (node.role === 'TRANSIT') {
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0 shrink-0">
          Tranzit / Ehtimoliy
        </Badge>
      );
    }
    if (node.role === 'VICTIM') {
      return (
        <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0 shrink-0">
          Jabrlanuvchi
        </Badge>
      );
    }
    return null;
  };

  const renderItemRow = (node: INetworkNode, icon: React.ReactNode) => {
    const reasons = grouped.edgeReasons.get(node.id) || [];
    const moneyStr = formatMoney(node.amount);

    return (
      <div
        key={node.id}
        onClick={() => navigate(node.targetRoute)}
        className="group flex items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-background/80 hover:border-primary/50 hover:bg-primary/[0.03] transition-all cursor-pointer min-w-0 overflow-hidden"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-9 w-9 rounded-lg bg-muted/70 border border-border/70 flex items-center justify-center shrink-0 text-primary">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-xs sm:text-sm font-bold font-mono text-foreground group-hover:text-primary break-all">
                {node.label}
              </span>
              {renderRoleBadge(node)}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5 break-words">
              {node.sublabel && <span>{node.sublabel}</span>}
              {reasons.length > 0 && (
                <span className="text-primary/80 font-medium">· {reasons.join(', ')}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {moneyStr && (
            <span className="text-xs font-mono font-bold text-rose-500 hidden sm:inline">
              {moneyStr}
            </span>
          )}
          <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card/70 overflow-hidden flex flex-col shadow-2xs min-w-0">
      {/* Yuqori Almashtirgich: Moliyaviy Pul Oqimi va Tizimli Bog'liqliklar Ma'lumotnomasi */}
      <div className="px-4 py-2.5 border-b border-border/70 bg-muted/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-background/80 p-1 rounded-lg border border-border/70 max-w-full">
          <button
            type="button"
            onClick={() => setMode('financial')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer',
              mode === 'financial'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Moliyaviy Pul Oqimi ({financialGraph?.nodes?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('structured')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer',
              mode === 'structured'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Bogʻlangan Maʼlumotlar Jadvali ({grouped.totalCount})</span>
          </button>
        </div>

        <span className="text-[11px] text-muted-foreground hidden sm:inline">
          {mode === 'financial'
            ? 'Kartalar oʻrtasidagi pul oʻtkazmalari harakati'
            : 'Barcha aloqador shaxs, karta, raqam va arizalar jamlanmasi'}
        </span>
      </div>

      {/* Kontent Qismi */}
      {mode === 'financial' ? (
        <div
          className={cn('relative w-full overflow-hidden bg-white select-none', heightClassName)}
        >
          {financialGraph && financialGraph.nodes.length > 0 ? (
            <>
              <GraphCanvas
                nodes={financialGraph.nodes}
                edges={financialGraph.edges}
                selectedNode={selectedFinNode}
                clusteringEnabled={false}
                onSelectNode={(n) => setSelectedFinNode(n)}
              />
              {selectedFinNode && (
                <NodeDetailsDrawer
                  node={selectedFinNode}
                  onClose={() => setSelectedFinNode(null)}
                />
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground text-xs gap-2 bg-card">
              <CreditCard className="h-10 w-10 opacity-30" />
              <p className="font-semibold text-sm text-foreground">
                Kartalararo pul oʻtkazmalari oqimi mavjud emas
              </p>
              <p>Oʻtkazma kiritilganida bu yerda kartalar oqimi chiziladi</p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 sm:p-5 space-y-5">
          {grouped.totalCount === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              Qoʻshimcha bogʻlangan maʼlumotlar topilmadi
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* 1. Shaxslar (Fuqarolar) */}
              {grouped.citizens.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-blue-500" />
                    Aloqador Shaxslar ({grouped.citizens.length})
                  </h4>
                  <div className="space-y-2">
                    {grouped.citizens.map((n) =>
                      renderItemRow(n, <User className="h-4 w-4 text-blue-500" />),
                    )}
                  </div>
                </div>
              )}

              {/* 2. Plastik Kartalar */}
              {grouped.cards.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-amber-500" />
                    Plastik Kartalar ({grouped.cards.length})
                  </h4>
                  <div className="space-y-2">
                    {grouped.cards.map((n) =>
                      renderItemRow(n, <CreditCard className="h-4 w-4 text-amber-500" />),
                    )}
                  </div>
                </div>
              )}

              {/* 3. Telefon va Raqamli Izlar */}
              {grouped.clues.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Fingerprint className="h-3.5 w-3.5 text-purple-500" />
                    Telefon va Raqamli Izlar ({grouped.clues.length})
                  </h4>
                  <div className="space-y-2">
                    {grouped.clues.map((n) =>
                      renderItemRow(
                        n,
                        n.nodeType === 'PHONE' ? (
                          <Phone className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Fingerprint className="h-4 w-4 text-purple-500" />
                        ),
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* 4. Bog'langan Arizalar */}
              {grouped.applications.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Bogʻlangan Arizalar ({grouped.applications.length})
                  </h4>
                  <div className="space-y-2">
                    {grouped.applications.map((n) =>
                      renderItemRow(n, <FileText className="h-4 w-4 text-primary" />),
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
