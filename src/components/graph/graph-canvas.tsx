import { Compass, Users, ZoomIn, ZoomOut } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { IGraphEdge, IGraphNode } from '@/types/models';

import { GraphMinimap } from './graph-minimap';

interface Props {
  nodes: IGraphNode[];
  edges: IGraphEdge[];
  selectedNode: IGraphNode | null;
  clusteringEnabled?: boolean;
  onSelectNode: (node: IGraphNode | null) => void;
  onToggleClustering?: () => void;
}

interface SimNode extends IGraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isCluster?: boolean;
  clusterCount?: number;
  clusterVictimIds?: string[];
}

export const getProviderDisplayName = (provider?: string): string => {
  if (!provider) return "Noma'lum";
  const p = provider.trim();
  const upper = p.toUpperCase();
  if (upper === 'CLICK') return 'Click';
  if (upper === 'PAYME') return 'Payme';
  if (upper === 'UZUM_PAY' || upper === 'UZUM') return 'Uzum Pay';
  if (upper === 'OSON') return 'Oson';
  if (upper === 'PAYNET') return 'Paynet';
  if (upper === 'PLUM') return 'Plum';
  if (upper === 'ANORBANK' || upper === 'ANOR') return 'Anorbank';
  if (upper === 'BANK_MOBILE') return 'Bank Ilova';
  if (upper === 'ATM') return 'Bankomat';
  if (upper === 'BEEPUL') return 'Beepul';
  return p;
};

/**
 * Tezyurar fizik simulyatsiya qadami (Headless Physics Step)
 * DOM / Canvas renderisiz toza matematik hisoblash — 100-150 ta qadam 8-10ms da bajariladi.
 */
function stepPhysics(
  nodes: SimNode[],
  edges: IGraphEdge[],
  centerX: number,
  centerY: number,
  dragged: SimNode | null,
  damping = 0.86,
): void {
  const nodeCount = nodes.length;
  if (nodeCount === 0) return;

  // 1. Markazga tortish kuchi (Centering gravity)
  for (let i = 0; i < nodeCount; i++) {
    const n1 = nodes[i];
    if (dragged === n1) continue;

    n1.vx += (centerX - n1.x) * 0.00004;
    n1.vy += (centerY - n1.y) * 0.00004;

    // 2. Kulon itarish kuchi va to'qnashuvni bartaraf qilish (Coulomb repulsion & anti-overlap)
    for (let j = i + 1; j < nodeCount; j++) {
      const n2 = nodes[j];
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const distSq = dx * dx + dy * dy + 1;
      const dist = Math.sqrt(distSq);

      const massFactor = Math.max(1, (n1.radius * n2.radius) / 360);
      const repelForce = (34000 * massFactor) / (distSq + 1200);
      const rfx = (dx / dist) * repelForce;
      const rfy = (dy / dist) * repelForce;

      if (dragged !== n1) {
        n1.vx -= rfx;
        n1.vy -= rfy;
      }
      if (dragged !== n2) {
        n2.vx += rfx;
        n2.vy += rfy;
      }

      const minClearance = n1.radius + n2.radius + 110;
      if (dist < minClearance) {
        const overlap = minClearance - dist;
        const push = (overlap / minClearance) * 3.5;
        const cfx = (dx / dist) * push;
        const cfy = (dy / dist) * push;

        if (dragged !== n1) {
          n1.vx -= cfx;
          n1.vy -= cfy;
        }
        if (dragged !== n2) {
          n2.vx += cfx;
          n2.vy += cfy;
        }
      }
    }
  }

  // 3. Bog'langan qirralar (Tranzaksiyalar) bo'ylab tortish prujinasi (Spring force)
  const nodeById = new Map<string, SimNode>();
  for (let i = 0; i < nodeCount; i++) {
    nodeById.set(nodes[i].id, nodes[i]);
  }

  edges.forEach((edge) => {
    const source = nodeById.get(edge.from);
    const target = nodeById.get(edge.to);
    if (!source || !target) return;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const TARGET_ARROW_SPAN = 140;
    const idealDist = source.radius + target.radius + TARGET_ARROW_SPAN;
    const delta = dist - idealDist;

    const stiffness = 0.009;
    const nonLinear = delta > 0 ? delta * 0.00012 : -delta * 0.00012;
    const force = delta * (stiffness + Math.min(0.03, Math.abs(nonLinear)));
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    if (dragged !== source) {
      source.vx += fx;
      source.vy += fy;
    }
    if (dragged !== target) {
      target.vx -= fx;
      target.vy -= fy;
    }
  });

  // 4. Tezlik va koordinatalarni yangilash (Velocity & position update)
  for (let i = 0; i < nodeCount; i++) {
    const n = nodes[i];
    if (dragged === n) continue;
    const speed = Math.hypot(n.vx, n.vy);
    if (speed > 12) {
      n.vx = (n.vx / speed) * 12;
      n.vy = (n.vy / speed) * 12;
    }
    n.x += n.vx;
    n.y += n.vy;
    n.vx *= damping;
    n.vy *= damping;
  }
}

export const GraphCanvas: React.FC<Props> = ({
  nodes,
  edges,
  selectedNode,
  clusteringEnabled = true,
  onSelectNode,
  onToggleClustering,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const transformRef = useRef(transform);
  const selectedNodeRef = useRef(selectedNode);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [containerSize, setContainerSize] = useState({ width: 900, height: 600 });
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());

  const isDraggingCanvas = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const draggedNode = useRef<SimNode | null>(null);
  const hoveredNode = useRef<SimNode | null>(null);
  const animFrameId = useRef<number | null>(null);
  const pulsePhase = useRef(0);
  const simEnergy = useRef(1.0);
  const mouseDownClientPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isNodeHitOnDown = useRef(false);
  const wakeFrames = useRef(0);
  const isLoopRunning = useRef(false);
  const runSimulationStepRef = useRef<() => void>(() => {});

  const requestRender = useCallback((frames = 20) => {
    wakeFrames.current = Math.max(wakeFrames.current, frames);
    if (!isLoopRunning.current) {
      isLoopRunning.current = true;
      animFrameId.current = requestAnimationFrame(() => {
        runSimulationStepRef.current();
      });
    }
  }, []);

  const formatUZS = useCallback((val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
    return `${val}`;
  }, []);

  const calcNodeRadius = useCallback((node: IGraphNode & { isCluster?: boolean }): number => {
    if (node.isCluster) {
      return 32;
    }
    const degree = (node.inDegree || 0) + (node.reportsCount || 0);
    const volume = node.totalIn || 0;

    const degreeScore = Math.min(degree * 3.5, 15);
    const volumeScore = Math.min((volume / 25000000) * 15, 15);

    const baseRadius = node.role === 'MULE_DROPPER' ? 22 : node.role === 'TRANSIT' ? 18 : 16;
    return Math.min(Math.max(baseRadius + degreeScore + volumeScore, 16), 46);
  }, []);

  // Smart Clustering
  const { displayNodes, displayEdges } = useMemo(() => {
    if (!clusteringEnabled || !nodes || nodes.length === 0) {
      return { displayNodes: nodes, displayEdges: edges };
    }

    const outgoingMap = new Map<string, string[]>();
    edges.forEach((e) => {
      if (!outgoingMap.has(e.from)) outgoingMap.set(e.from, []);
      outgoingMap.get(e.from)!.push(e.to);
    });

    const targetToVictims = new Map<string, IGraphNode[]>();
    const clusteredVictimIds = new Set<string>();

    nodes.forEach((n) => {
      if (n.role === 'VICTIM_SOURCE' && n.inDegree === 0) {
        const targets = outgoingMap.get(n.id);
        if (targets && targets.length === 1) {
          const targetId = targets[0];
          if (!targetToVictims.has(targetId)) targetToVictims.set(targetId, []);
          targetToVictims.get(targetId)!.push(n);
        }
      }
    });

    const finalNodes: (IGraphNode & {
      isCluster?: boolean;
      clusterCount?: number;
      clusterVictimIds?: string[];
    })[] = [];
    const finalEdges: IGraphEdge[] = [];

    targetToVictims.forEach((victims, targetId) => {
      const clusterId = `cluster__${targetId}`;
      if (victims.length >= 3 && !expandedClusters.has(clusterId)) {
        victims.forEach((v) => clusteredVictimIds.add(v.id));

        const totalAmt = victims.reduce((acc, v) => acc + (v.totalOut || 0), 0);
        const clusterNode: IGraphNode & {
          isCluster: boolean;
          clusterCount: number;
          clusterVictimIds: string[];
        } = {
          id: clusterId,
          cardNumber: `👥 ${victims.length} ta jabrlanuvchi`,
          maskedCard: `👥 ${victims.length} ta jabrlanuvchi`,
          bankName: `Jami: ${formatUZS(totalAmt)} UZS`,
          role: 'VICTIM_SOURCE',
          totalIn: 0,
          totalOut: totalAmt,
          netFlow: -totalAmt,
          inDegree: 0,
          outDegree: 1,
          reportsCount: victims.reduce((acc, v) => acc + v.reportsCount, 0),
          reportIds: victims.flatMap((v) => v.reportIds),
          riskScore: 5,
          isBlacklisted: false,
          isCluster: true,
          clusterCount: victims.length,
          clusterVictimIds: victims.map((v) => v.id),
        };

        finalNodes.push(clusterNode);

        finalEdges.push({
          id: `${clusterId}__to__${targetId}`,
          from: clusterId,
          to: targetId,
          amount: totalAmt,
          transactionsCount: victims.length,
          lastDate: new Date().toISOString(),
          isUnknownDestination: false,
        });
      }
    });

    nodes.forEach((n) => {
      if (!clusteredVictimIds.has(n.id)) {
        finalNodes.push(n);
      }
    });

    edges.forEach((e) => {
      if (!clusteredVictimIds.has(e.from)) {
        finalEdges.push(e);
      }
    });

    return { displayNodes: finalNodes, displayEdges: finalEdges };
  }, [nodes, edges, clusteringEnabled, expandedClusters, formatUZS]);

  // Track container size
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width || 900,
          height: entry.contentRect.height || 600,
        });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const textWidthCache = useRef<Map<string, number>>(new Map());

  const getTextWidth = (ctx: CanvasRenderingContext2D, text: string, font: string): number => {
    const key = `${font}|${text}`;
    let w = textWidthCache.current.get(key);
    if (w === undefined) {
      ctx.font = font;
      w = ctx.measureText(text).width;
      if (textWidthCache.current.size >= 500) {
        const firstKey = textWidthCache.current.keys().next().value;
        if (firstKey !== undefined) {
          textWidthCache.current.delete(firstKey);
        }
      }
      textWidthCache.current.set(key, w);
    }
    return w;
  };

  useEffect(() => {
    transformRef.current = transform;
    requestRender(10);
  }, [transform, requestRender]);

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
    requestRender(20);
  }, [selectedNode, requestRender]);

  // Initialize nodes simulation positions with Smart Topology & Pre-warming
  useEffect(() => {
    if (!displayNodes || displayNodes.length === 0) {
      setSimNodes([]);
      return;
    }

    const width = containerSize.width;
    const height = containerSize.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const existingPosMap = new Map<string, { x: number; y: number }>();
    simNodes.forEach((n) => existingPosMap.set(n.id, { x: n.x, y: n.y }));

    // 1. Alohida Hub (Dropper / Tranzit / Kassa) va Jabrlanuvchi kartalarini ajratish
    const hubNodes: IGraphNode[] = [];
    const victimNodes: IGraphNode[] = [];
    const incomingToTarget = new Map<string, IGraphNode[]>();

    displayNodes.forEach((n) => {
      const isHub =
        n.role === 'MULE_DROPPER' ||
        n.role === 'TRANSIT' ||
        n.role === 'ATM_TERMINAL' ||
        n.role === 'CRYPTO_CASHOUT' ||
        n.role === 'PLATFORM_CASHOUT' ||
        n.role === 'BANK_ACCOUNT_OUT' ||
        (n.riskScore && n.riskScore >= 70);
      if (isHub) {
        hubNodes.push(n);
      } else {
        victimNodes.push(n);
      }
    });

    const targetMap = new Map<string, string>();
    displayEdges.forEach((e) => targetMap.set(e.from, e.to));

    victimNodes.forEach((v) => {
      const tgt = targetMap.get(v.id);
      if (tgt) {
        if (!incomingToTarget.has(tgt)) incomingToTarget.set(tgt, []);
        incomingToTarget.get(tgt)!.push(v);
      }
    });

    // Markaz atrofida hub kartalarni keng radiusda tarqatish
    const hubCount = Math.max(hubNodes.length, 1);
    const hubRadius = Math.max(260, 48 * Math.sqrt(hubCount));
    const hubPosMap = new Map<string, { x: number; y: number }>();

    hubNodes.forEach((hub, idx) => {
      const angle = (idx / hubCount) * 2 * Math.PI - Math.PI / 2;
      const hx = centerX + Math.cos(angle) * hubRadius;
      const hy = centerY + Math.sin(angle) * hubRadius;
      hubPosMap.set(hub.id, { x: hx, y: hy });
    });

    const initialNodes: SimNode[] = [];
    const createdMap = new Map<string, SimNode>();

    hubNodes.forEach((hub) => {
      const pos = hubPosMap.get(hub.id)!;
      const existing = existingPosMap.get(hub.id);
      const sn: SimNode = {
        ...hub,
        x: existing ? existing.x : pos.x,
        y: existing ? existing.y : pos.y,
        vx: 0,
        vy: 0,
        radius: calcNodeRadius(hub),
      };
      createdMap.set(hub.id, sn);
      initialNodes.push(sn);

      const connectedVictims = incomingToTarget.get(hub.id) || [];
      const vicCount = connectedVictims.length;
      const hubAngle = Math.atan2(pos.y - centerY, pos.x - centerX);

      connectedVictims.forEach((v, vIdx) => {
        const existingV = existingPosMap.get(v.id);
        const arcSpread = Math.min(Math.PI * 0.9, vicCount * 0.35);
        const startArc = hubAngle - arcSpread / 2;
        const vAngle =
          vicCount === 1 ? hubAngle : startArc + (vIdx / Math.max(vicCount - 1, 1)) * arcSpread;
        const vDist = sn.radius + 140 + (vIdx % 2) * 30;
        const vx = pos.x + Math.cos(vAngle) * vDist;
        const vy = pos.y + Math.sin(vAngle) * vDist;

        const vsn: SimNode = {
          ...v,
          x: existingV ? existingV.x : vx,
          y: existingV ? existingV.y : vy,
          vx: 0,
          vy: 0,
          radius: calcNodeRadius(v),
        };
        createdMap.set(v.id, vsn);
        initialNodes.push(vsn);
      });
    });

    // Qolgan alohida kartalarni tashqi aylana bo'ylab joylash
    displayNodes.forEach((n, idx) => {
      if (!createdMap.has(n.id)) {
        const existing = existingPosMap.get(n.id);
        const angle = (idx / displayNodes.length) * 2 * Math.PI;
        const sn: SimNode = {
          ...n,
          x: existing ? existing.x : centerX + Math.cos(angle) * (hubRadius + 160),
          y: existing ? existing.y : centerY + Math.sin(angle) * (hubRadius + 160),
          vx: 0,
          vy: 0,
          radius: calcNodeRadius(n),
        };
        createdMap.set(n.id, sn);
        initialNodes.push(sn);
      }
    });

    // 2. TEZYURAR PRE-WARM (Xotirada 200 ta matematik qadam — 12-15ms)
    // Foydalanuvchi qotish yoki to'qnashuvni ko'rmasdan, darhol tarqalgan muvozanatli ko'rinishga ega bo'ladi
    const warmUpSteps = existingPosMap.size === 0 ? 200 : 30;
    for (let step = 0; step < warmUpSteps; step++) {
      stepPhysics(initialNodes, displayEdges, centerX, centerY, null, 0.84);
    }

    // Butun tarmoqni oynaga to'liq sig'adigan qilib avtomatik moslash (Auto-fit)
    if (existingPosMap.size === 0 && initialNodes.length > 0) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      initialNodes.forEach((n) => {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
      });
      const graphW = Math.max(maxX - minX + 160, 400);
      const graphH = Math.max(maxY - minY + 160, 400);
      const fitK = Math.min(Math.max(Math.min(width / graphW, height / graphH) * 0.92, 0.35), 1.0);
      const graphMidX = (minX + maxX) / 2;
      const graphMidY = (minY + maxY) / 2;
      setTransform({
        x: width / 2 - graphMidX * fitK,
        y: height / 2 - graphMidY * fitK,
        k: fitK,
      });
    }

    simEnergy.current = 0.45;
    setSimNodes(initialNodes);
    requestRender(120);
  }, [displayNodes, displayEdges, calcNodeRadius, containerSize, requestRender]);

  // Main simulation & render loop (Adaptive / On-Demand: 60 FPS under action -> 0% CPU Sleep)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let active = true;

    const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const curTransform = transformRef.current;
      ctx.save();
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      const gridSize = 50;
      const startX = -curTransform.x / curTransform.k;
      const endX = startX + width / curTransform.k;
      const startY = -curTransform.y / curTransform.k;
      const endY = startY + height / curTransform.k;

      ctx.beginPath();
      for (let x = Math.floor(startX / gridSize) * gridSize; x < endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = Math.floor(startY / gridSize) * gridSize; y < endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();
      ctx.restore();
    };

    const renderGraph = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const curTransform = transformRef.current;
      const curSelected = selectedNodeRef.current;
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 1. Oq fon bilan tozalash
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(curTransform.x, curTransform.y);
      ctx.scale(curTransform.k, curTransform.k);

      const nodeById = new Map<string, SimNode>();
      simNodes.forEach((n) => nodeById.set(n.id, n));

      // 2. Chiroyli nozik katakchali to'r (Grid)
      drawGrid(ctx, width, height);

      // Viewport Frustum Culling (ekrandan tashqaridagi ob'ektlarni chizishdan saqlash)
      const viewMinX = -curTransform.x / curTransform.k - 120;
      const viewMaxX = (width - curTransform.x) / curTransform.k + 120;
      const viewMinY = -curTransform.y / curTransform.k - 120;
      const viewMaxY = (height - curTransform.y) / curTransform.k + 120;

      const connectedNodeIds = new Set<string>();
      if (curSelected) {
        connectedNodeIds.add(curSelected.id);
        displayEdges.forEach((e) => {
          if (e.from === curSelected.id) connectedNodeIds.add(e.to);
          if (e.to === curSelected.id) connectedNodeIds.add(e.from);
        });
      }

      // 2. Draw Edges
      displayEdges.forEach((edge) => {
        const src = nodeById.get(edge.from);
        const tgt = nodeById.get(edge.to);
        if (!src || !tgt) return;

        // Frustum culling
        if (
          (src.x < viewMinX && tgt.x < viewMinX) ||
          (src.x > viewMaxX && tgt.x > viewMaxX) ||
          (src.y < viewMinY && tgt.y < viewMinY) ||
          (src.y > viewMaxY && tgt.y > viewMaxY)
        ) {
          return;
        }

        const isHighlighted = curSelected
          ? edge.from === curSelected.id || edge.to === curSelected.id
          : true;
        const alpha = curSelected ? (isHighlighted ? 0.95 : 0.2) : 0.85;

        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;

        const normX = dx / dist;
        const normY = dy / dist;

        const startX = src.x + normX * (src.radius + 1);
        const startY = src.y + normY * (src.radius + 1);

        const availableSpan = dist - src.radius - tgt.radius;
        if (availableSpan <= 10) return;

        const arrowLen = Math.min(13, Math.max(9, availableSpan * 0.16));
        const arrowHalfWidth = arrowLen * 0.44;
        const arrowTipDist = tgt.radius + 4;
        const arrowTipX = tgt.x - normX * arrowTipDist;
        const arrowTipY = tgt.y - normY * arrowTipDist;

        const lineEndDist = arrowTipDist + arrowLen - 1.5;
        const lineEndX = tgt.x - normX * lineEndDist;
        const lineEndY = tgt.y - normY * lineEndDist;

        const lineWidth = isHighlighted ? 2.0 : 1.3;

        let edgeColor: string;
        let arrowFillColor: string;

        if (edge.isUnknownDestination || tgt.isUnknownDestination) {
          edgeColor = isHighlighted
            ? 'rgba(217, 119, 6, 0.95)'
            : 'rgba(217, 119, 6, ' + alpha * 0.75 + ')';
          arrowFillColor = isHighlighted ? '#b45309' : '#d97706';
        } else if (tgt.role === 'MULE_DROPPER' || (tgt.riskScore && tgt.riskScore >= 70)) {
          edgeColor = isHighlighted
            ? 'rgba(239, 68, 68, 0.95)'
            : 'rgba(239, 68, 68, ' + alpha * 0.75 + ')';
          arrowFillColor = isHighlighted ? '#b91c1c' : '#ef4444';
        } else if (tgt.role === 'TRANSIT') {
          edgeColor = isHighlighted
            ? 'rgba(245, 158, 11, 0.95)'
            : 'rgba(245, 158, 11, ' + alpha * 0.75 + ')';
          arrowFillColor = isHighlighted ? '#b45309' : '#f59e0b';
        } else {
          edgeColor = isHighlighted
            ? 'rgba(59, 130, 246, 0.95)'
            : 'rgba(59, 130, 246, ' + alpha * 0.75 + ')';
          arrowFillColor = isHighlighted ? '#1d4ed8' : '#3b82f6';
        }

        // Draw line
        if (availableSpan > arrowLen + 3) {
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(lineEndX, lineEndY);
          ctx.strokeStyle = edgeColor;
          ctx.lineWidth = lineWidth;
          if (edge.isUnknownDestination || tgt.isUnknownDestination) {
            ctx.setLineDash([5, 4]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Arrow head
        const arrowAngle = Math.atan2(dy, dx);
        const baseLeftX =
          arrowTipX - arrowLen * Math.cos(arrowAngle) + arrowHalfWidth * Math.sin(arrowAngle);
        const baseLeftY =
          arrowTipY - arrowLen * Math.sin(arrowAngle) - arrowHalfWidth * Math.cos(arrowAngle);
        const baseRightX =
          arrowTipX - arrowLen * Math.cos(arrowAngle) - arrowHalfWidth * Math.sin(arrowAngle);
        const baseRightY =
          arrowTipY - arrowLen * Math.sin(arrowAngle) + arrowHalfWidth * Math.cos(arrowAngle);

        ctx.beginPath();
        ctx.moveTo(arrowTipX, arrowTipY);
        ctx.lineTo(baseLeftX, baseLeftY);
        ctx.lineTo(baseRightX, baseRightY);
        ctx.closePath();
        ctx.fillStyle = arrowFillColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Animated pulse particle (faqat diqqat markazidagi kartalar qirralarida nurlanadi)
        const isFocusedEdge =
          (curSelected && (edge.from === curSelected.id || edge.to === curSelected.id)) ||
          (hoveredNode.current &&
            (edge.from === hoveredNode.current.id || edge.to === hoveredNode.current.id));

        if (isFocusedEdge) {
          const pulseOffset = (pulsePhase.current / (Math.PI * 2) + (edge.amount % 10) * 0.1) % 1;
          const px = startX + (lineEndX - startX) * pulseOffset;
          const py = startY + (lineEndY - startY) * pulseOffset;
          ctx.beginPath();
          ctx.arc(px, py, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = `${arrowFillColor}40`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = arrowFillColor;
          ctx.fill();
        }

        // Amount label & provider badge on edge
        const midX = (startX + lineEndX) / 2;
        const midY = (startY + lineEndY) / 2;

        const providerName = getProviderDisplayName(edge.paymentProvider);
        const formattedAmount = `${formatUZS(edge.amount)} UZS`;
        const fullLabel = `[${providerName}] ${formattedAmount}`;

        const edgeFont = 'bold 9.5px "JetBrains Mono", Consolas, monospace';
        const textWidth = getTextWidth(ctx, fullLabel, edgeFont);
        const boxPaddingX = 6;
        const boxHeight = 16;
        const boxWidth = textWidth + boxPaddingX * 2;
        const boxX = midX - boxWidth / 2;
        const boxY = midY - boxHeight / 2;

        const isEdgeActive = curSelected
          ? edge.from === curSelected.id || edge.to === curSelected.id
          : false;

        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
        } else {
          ctx.rect(boxX, boxY, boxWidth, boxHeight);
        }
        ctx.fillStyle = isEdgeActive ? '#0f172a' : 'rgba(255, 255, 255, 0.96)';
        ctx.fill();

        ctx.strokeStyle = isEdgeActive ? arrowFillColor : '#cbd5e1';
        ctx.lineWidth = isEdgeActive ? 1.4 : 1;
        ctx.stroke();

        ctx.font = edgeFont;
        ctx.fillStyle = isEdgeActive ? '#38bdf8' : '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fullLabel, midX, midY);
      });

      // 3. Draw Nodes
      simNodes.forEach((node) => {
        // Frustum culling
        if (
          node.x + node.radius + 60 < viewMinX ||
          node.x - node.radius - 60 > viewMaxX ||
          node.y + node.radius + 60 < viewMinY ||
          node.y - node.radius - 60 > viewMaxY
        ) {
          return;
        }
        const isSelected = curSelected?.id === node.id;
        const isHovered = hoveredNode.current?.id === node.id;
        const isConnected = curSelected ? connectedNodeIds.has(node.id) : true;
        const alpha = curSelected ? (isConnected ? 1 : 0.2) : 1;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Cluster node
        if (node.isCluster) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = '#6366f1';
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.fillStyle = isHovered ? '#4f46e5' : '#6366f1';
          ctx.strokeStyle = '#3730a3';
          ctx.lineWidth = 2.5;
          ctx.fill();
          ctx.stroke();

          ctx.font = 'bold 12px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`👥 ${node.clusterCount}`, node.x, node.y);

          const labelY = node.y + node.radius + 15;
          const clusterTitle = `👥 ${node.clusterCount} ta jabrlanuvchi`;
          const clusterFont = 'bold 11px sans-serif';
          const tWidth = getTextWidth(ctx, clusterTitle, clusterFont);
          const badgeW = tWidth + 16;
          const badgeH = 26;
          const badgeX = node.x - badgeW / 2;
          const badgeY = labelY - 11;

          ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
          } else {
            ctx.rect(badgeX, badgeY, badgeW, badgeH);
          }
          ctx.fill();
          ctx.strokeStyle = '#c7d2fe';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = '#4f46e5';
          ctx.textAlign = 'center';
          ctx.fillText(clusterTitle, node.x, labelY);

          ctx.restore();
          return;
        }

        // Unknown destination node
        if (node.isUnknownDestination) {
          if (isSelected) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 3;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = isHovered ? '#b45309' : '#d97706';
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.fillStyle = isHovered ? '#fef3c7' : '#fffbeb';
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1.8;
          ctx.fill();
          ctx.stroke();

          const qSize = Math.max(12, Math.floor(node.radius * 0.9));
          ctx.font = `bold ${qSize}px sans-serif`;
          ctx.fillStyle = '#b45309';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('❓', node.x, node.y);

          ctx.restore();
          return;
        }

        // Pulsing glow for MULE_DROPPER (high risk red)
        if (node.role === 'MULE_DROPPER' || (node.riskScore && node.riskScore >= 70)) {
          const pulseR = node.radius + 6 + Math.sin(pulsePhase.current * 2) * 4;
          ctx.beginPath();
          ctx.arc(node.x, node.y, pulseR, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(231, 76, 60, 0.18)';
          ctx.fill();
        }

        // Selected halo ring
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
          ctx.strokeStyle = '#2874a6';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        // Color based on role (Kiber yordamchi bot bilan 100% bir xil + yangi chiqish kanallari)
        if (node.role === 'ATM_TERMINAL') {
          ctx.fillStyle = isHovered ? '#047857' : '#059669';
          ctx.strokeStyle = '#064e3b';
        } else if (node.role === 'CRYPTO_CASHOUT') {
          ctx.fillStyle = isHovered ? '#6d28d9' : '#8b5cf6';
          ctx.strokeStyle = '#4c1d95';
        } else if (node.role === 'PLATFORM_CASHOUT') {
          ctx.fillStyle = isHovered ? '#0e7490' : '#0891b2';
          ctx.strokeStyle = '#164e63';
        } else if (node.role === 'BANK_ACCOUNT_OUT') {
          ctx.fillStyle = isHovered ? '#334155' : '#475569';
          ctx.strokeStyle = '#1e293b';
        } else if (
          node.role === 'MULE_DROPPER' ||
          node.isBlacklisted ||
          (node.riskScore && node.riskScore >= 70)
        ) {
          ctx.fillStyle = isHovered ? '#c0392b' : '#e74c3c';
          ctx.strokeStyle = '#922b21';
        } else if (node.role === 'COMPROMISED_VICTIM') {
          ctx.fillStyle = isHovered ? '#0284c7' : '#0ea5e9';
          ctx.strokeStyle = '#d97706';
        } else if (node.role === 'TRANSIT') {
          ctx.fillStyle = isHovered ? '#d68910' : '#f39c12';
          ctx.strokeStyle = '#b9770e';
        } else {
          ctx.fillStyle = isHovered ? '#2471a3' : '#3498db';
          ctx.strokeStyle = '#1b4f72';
        }
        ctx.lineWidth = 2.5;
        ctx.fill();
        ctx.stroke();

        // Node center text (Icon or Risk score percentage & transfer count)
        if (node.role === 'ATM_TERMINAL') {
          ctx.font = '16px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🏧', node.x, node.y);
        } else if (node.role === 'CRYPTO_CASHOUT') {
          ctx.font = '16px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🪙', node.x, node.y);
        } else if (node.role === 'PLATFORM_CASHOUT') {
          ctx.font = '16px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🌐', node.x, node.y);
        } else if (node.role === 'BANK_ACCOUNT_OUT') {
          ctx.font = '16px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🏦', node.x, node.y);
        } else {
          const riskVal = typeof node.riskScore === 'number' ? node.riskScore : 0;
          const scoreFontSize = Math.min(Math.max(10, Math.floor(node.radius * 0.42)), 15);
          ctx.font = `bold ${scoreFontSize}px sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${riskVal}%`, node.x, node.y);

          // Subtitle inside larger nodes (transfer count)
          if (node.radius >= 32) {
            ctx.font = '8px sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.fillText(`${node.inDegree || 0} o‘tkazma`, node.x, node.y + scoreFontSize + 2);
          }
        }

        // Card number & bank label below node with clean backdrop
        const cleanCardDigits = (node.cardNumber || node.maskedCard || '').replace(/\D/g, '');
        const fullCardDisplay =
          cleanCardDigits.length === 16
            ? `${cleanCardDigits.substring(0, 4)} ${cleanCardDigits.substring(4, 8)} ${cleanCardDigits.substring(8, 12)} ${cleanCardDigits.substring(12, 16)}`
            : node.cardNumber || node.maskedCard;

        const labelY = node.y + node.radius + 15;
        const cardFont = 'bold 11px monospace';
        const bankFont = '9px sans-serif';
        const cardWidth = getTextWidth(ctx, fullCardDisplay, cardFont);
        const bankDisplay = (node.bankName || '').substring(0, 24);
        const bankWidth = getTextWidth(ctx, bankDisplay, bankFont);
        const badgeW = Math.max(cardWidth, bankWidth) + 16;
        const badgeH = 28;
        const badgeX = node.x - badgeW / 2;
        const badgeY = labelY - 11;

        // Clean backdrop badge so edge lines behind don't collide with text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 5);
        } else {
          ctx.rect(badgeX, badgeY, badgeW, badgeH);
        }
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#2874a6' : '#e2e8f0';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Card number (to'q qora)
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText(fullCardDisplay, node.x, labelY);

        // Bank name (kulrang)
        ctx.font = '9px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(bankDisplay, node.x, labelY + 12);

        ctx.restore();
      });

      ctx.restore();
    };

    const runSimulationStep = () => {
      if (!active) {
        isLoopRunning.current = false;
        return;
      }

      // Brauzer vkladkasi minimallashgan yoki orqa fonda bo'lsa darhol to'xtatish (0% CPU)
      if (typeof document !== 'undefined' && document.hidden) {
        isLoopRunning.current = false;
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const centerX = width / 2;
      const centerY = height / 2;

      // Faqat energiya mavjud bo'lganda yoki biror karta sichqoncha bilan surilayotganda fizika ishlaydi
      const isPhysicsActive = simEnergy.current > 0.005 || draggedNode.current !== null;

      if (isPhysicsActive) {
        stepPhysics(simNodes, displayEdges, centerX, centerY, draggedNode.current, 0.86);

        if (!draggedNode.current) {
          simEnergy.current *= 0.982;
          if (simEnergy.current <= 0.005) {
            simEnergy.current = 0;
          }
        }
      }

      if (isPhysicsActive || wakeFrames.current > 0 || draggedNode.current !== null) {
        pulsePhase.current = (pulsePhase.current + 0.04) % (Math.PI * 2);
      }

      renderGraph(ctx, width, height);

      if (wakeFrames.current > 0) {
        wakeFrames.current--;
      }

      const shouldContinue =
        isPhysicsActive ||
        draggedNode.current !== null ||
        isDraggingCanvas.current ||
        wakeFrames.current > 0;

      if (shouldContinue) {
        animFrameId.current = requestAnimationFrame(runSimulationStep);
      } else {
        isLoopRunning.current = false;
      }
    };

    runSimulationStepRef.current = runSimulationStep;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        requestRender(60);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Dastlabki render
    requestRender(100);

    return () => {
      active = false;
      isLoopRunning.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [simNodes, displayEdges, calcNodeRadius, formatUZS, requestRender]);

  // Native non-passive wheel listener (Chrome passive-listener preventDefault ogohlantirishini yo'qotadi)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const cur = transformRef.current;
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
      const newK = Math.min(Math.max(cur.k * zoomFactor, 0.3), 3.0);

      const newX = mouseX - (mouseX - cur.x) * (newK / cur.k);
      const newY = mouseY - (mouseY - cur.y) * (newK / cur.k);

      const next = { x: newX, y: newY, k: newK };
      transformRef.current = next;
      setTransform(next);
      requestRender(20);
    };
    canvas.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onNativeWheel);
    };
  }, [requestRender]);

  // Screen coordinate to graph coordinate
  const screenToGraph = useCallback(
    (screenX: number, screenY: number) => {
      return {
        x: (screenX - transform.x) / transform.k,
        y: (screenY - transform.y) / transform.k,
      };
    },
    [transform],
  );

  // Hit test
  const getNodeAtPos = useCallback(
    (gx: number, gy: number): SimNode | null => {
      for (let i = simNodes.length - 1; i >= 0; i--) {
        const n = simNodes[i];
        const dx = gx - n.x;
        const dy = gy - n.y;
        if (dx * dx + dy * dy <= (n.radius + 6) * (n.radius + 6)) {
          return n;
        }
      }
      return null;
    },
    [simNodes],
  );

  // Mouse / Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    mouseDownClientPos.current = { x: e.clientX, y: e.clientY };
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: gx, y: gy } = screenToGraph(sx, sy);

    const hit = getNodeAtPos(gx, gy);
    if (hit) {
      isNodeHitOnDown.current = true;
      draggedNode.current = hit;
      simEnergy.current = 0.5;
    } else {
      isNodeHitOnDown.current = false;
      isDraggingCanvas.current = true;
      dragStart.current = {
        x: e.clientX - transformRef.current.x,
        y: e.clientY - transformRef.current.y,
      };
    }
    requestRender(45);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: gx, y: gy } = screenToGraph(sx, sy);

    if (draggedNode.current) {
      draggedNode.current.x = gx;
      draggedNode.current.y = gy;
      draggedNode.current.vx = 0;
      draggedNode.current.vy = 0;
      simEnergy.current = 0.4;
      requestRender(30);
      return;
    }

    if (isDraggingCanvas.current) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      }));
      requestRender(10);
      return;
    }

    const hit = getNodeAtPos(gx, gy);
    if (hit !== hoveredNode.current) {
      hoveredNode.current = hit;
      requestRender(25);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore */
    }
    const distMoved = Math.hypot(
      e.clientX - mouseDownClientPos.current.x,
      e.clientY - mouseDownClientPos.current.y,
    );

    if (distMoved < 6 && isNodeHitOnDown.current && draggedNode.current) {
      const clicked = draggedNode.current;
      if (clicked.isCluster) {
        setExpandedClusters((prev) => {
          const next = new Set(prev);
          next.add(clicked.id);
          return next;
        });
      } else {
        onSelectNode(clicked);
      }
    } else if (distMoved < 6 && !isNodeHitOnDown.current) {
      onSelectNode(null);
    }

    draggedNode.current = null;
    isDraggingCanvas.current = false;
    requestRender(40);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore */
    }
    draggedNode.current = null;
    isDraggingCanvas.current = false;
    requestRender(10);
  };

  const handleZoom = (factor: number) => {
    const width = containerSize.width;
    const height = containerSize.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const newK = Math.min(Math.max(transform.k * factor, 0.3), 3.0);
    const newX = centerX - (centerX - transform.x) * (newK / transform.k);
    const newY = centerY - (centerY - transform.y) * (newK / transform.k);

    setTransform({ x: newX, y: newY, k: newK });
    requestRender(30);
  };

  const handleResetCenter = () => {
    const width = containerSize.width;
    const height = containerSize.height;
    if (simNodes.length > 0) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      simNodes.forEach((n) => {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
      });
      const graphW = Math.max(maxX - minX + 160, 400);
      const graphH = Math.max(maxY - minY + 160, 400);
      const fitK = Math.min(Math.max(Math.min(width / graphW, height / graphH) * 0.92, 0.35), 1.0);
      const graphMidX = (minX + maxX) / 2;
      const graphMidY = (minY + maxY) / 2;
      setTransform({
        x: width / 2 - graphMidX * fitK,
        y: height / 2 - graphMidY * fitK,
        k: fitK,
      });
    } else {
      setTransform({ x: 0, y: 0, k: 1 });
    }
    simEnergy.current = 0.35;
    requestRender(70);
  };

  const handlePanTo = (gx: number, gy: number) => {
    const width = containerSize.width;
    const height = containerSize.height;
    setTransform({
      x: width / 2 - gx * transform.k,
      y: height / 2 - gy * transform.k,
      k: transform.k,
    });
    requestRender(25);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[400px] overflow-hidden border border-[#d2d6de] bg-white select-none shadow-sm"
    >
      <canvas
        ref={canvasRef}
        width={containerSize.width * (window.devicePixelRatio || 1)}
        height={containerSize.height * (window.devicePixelRatio || 1)}
        style={{
          width: containerSize.width,
          height: containerSize.height,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="block cursor-grab active:cursor-grabbing w-full h-full"
      />

      {/* Floating Canvas Controls */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-white border border-[#d2d6de] p-1.5 shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleZoom(1.15)}
          className="h-8 w-8 p-0 cursor-pointer hover:bg-gray-100 text-gray-700"
          title="Yaqinlashtirish"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleZoom(0.85)}
          className="h-8 w-8 p-0 cursor-pointer hover:bg-gray-100 text-gray-700"
          title="Uzoqlashtirish"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetCenter}
          className="h-8 w-8 p-0 cursor-pointer hover:bg-gray-100 text-gray-700"
          title="Markazlashtirish"
        >
          <Compass className="h-4 w-4" />
        </Button>
        {onToggleClustering && (
          <Button
            variant={clusteringEnabled ? 'default' : 'ghost'}
            size="sm"
            onClick={onToggleClustering}
            className={`h-8 px-2.5 gap-1.5 text-xs cursor-pointer font-medium ${
              clusteringEnabled
                ? 'bg-[#2874a6] text-white hover:bg-[#236895]'
                : 'bg-gray-50 border border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
            title="Guruhlash (Clustering)"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Guruhlash</span>
          </Button>
        )}
      </div>

      {/* Legend Badge Bar */}
      <div className="absolute top-4 right-4 z-20 hidden md:flex flex-wrap items-center gap-3 bg-white border border-[#d2d6de] px-3.5 py-1.5 text-[11px] shadow-sm font-medium text-gray-700">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-red-500/30"></span>
          Firibgar / Dropper
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
          Tranzit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
          Jabrlanuvchi
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-500"></span>
          Kripto / Birja
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
          Naqd (ATM)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-600"></span>
          Onlayn Servis
        </span>
      </div>

      {/* Mini-map */}
      <GraphMinimap
        nodes={simNodes}
        edges={displayEdges}
        transform={transform}
        containerWidth={containerSize.width}
        containerHeight={containerSize.height}
        onPanTo={handlePanTo}
      />
    </div>
  );
};
export default GraphCanvas;
