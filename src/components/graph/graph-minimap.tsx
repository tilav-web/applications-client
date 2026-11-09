import { ChevronDown, ChevronUp, Map as MapIcon } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { IGraphEdge } from '@/types/models';

export interface MinimapNode {
  id: string;
  x: number;
  y: number;
  role?: string;
  riskScore?: number;
  isUnknownDestination?: boolean;
  isCluster?: boolean;
}

interface Props {
  nodes: MinimapNode[];
  edges: IGraphEdge[];
  transform: { x: number; y: number; k: number };
  containerWidth: number;
  containerHeight: number;
  onPanTo: (graphX: number, graphY: number) => void;
  title?: string;
}

const MAP_WIDTH = 190;
const MAP_HEIGHT = 125;

export const GraphMinimap: React.FC<Props> = ({
  nodes,
  edges,
  transform,
  containerWidth,
  containerHeight,
  onPanTo,
  title = 'Mini-xarita',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDragging = useRef(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const viewX0 = (0 - transform.x) / transform.k;
  const viewY0 = (0 - transform.y) / transform.k;
  const viewX1 = (containerWidth - transform.x) / transform.k;
  const viewY1 = (containerHeight - transform.y) / transform.k;

  let minX = viewX0;
  let maxX = viewX1;
  let minY = viewY0;
  let maxY = viewY1;

  nodes.forEach((n) => {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  });

  const pad = 90;
  minX -= pad;
  maxX += pad;
  minY -= pad;
  maxY += pad;

  const spanX = Math.max(maxX - minX, 100);
  const spanY = Math.max(maxY - minY, 100);

  const scale = Math.min(MAP_WIDTH / spanX, MAP_HEIGHT / spanY);
  const offsetX = (MAP_WIDTH - spanX * scale) / 2 - minX * scale;
  const offsetY = (MAP_HEIGHT - spanY * scale) / 2 - minY * scale;

  const toMapX = useCallback((gx: number) => gx * scale + offsetX, [scale, offsetX]);
  const toMapY = useCallback((gy: number) => gy * scale + offsetY, [scale, offsetY]);
  const fromMapX = useCallback((mx: number) => (mx - offsetX) / scale, [scale, offsetX]);
  const fromMapY = useCallback((my: number) => (my - offsetY) / scale, [scale, offsetY]);

  useEffect(() => {
    if (isCollapsed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Edges
    const nodeMap = new Map<string, MinimapNode>();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 0.8;
    edges.forEach((e) => {
      const src = nodeMap.get(e.from);
      const tgt = nodeMap.get(e.to);
      if (!src || !tgt) return;
      ctx.beginPath();
      ctx.moveTo(toMapX(src.x), toMapY(src.y));
      ctx.lineTo(toMapX(tgt.x), toMapY(tgt.y));
      ctx.stroke();
    });

    // Nodes
    nodes.forEach((n) => {
      const mx = toMapX(n.x);
      const my = toMapY(n.y);

      let fill = '#3b82f6';
      if (n.role === 'MULE_DROPPER' || (n.riskScore && n.riskScore >= 70)) {
        fill = '#ef4444';
      } else if (n.role === 'TRANSIT') {
        fill = '#f59e0b';
      } else if (n.isUnknownDestination) {
        fill = '#d97706';
      } else if (n.isCluster) {
        fill = '#6366f1';
      }

      ctx.beginPath();
      ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
    });

    // Viewport box
    const vx = toMapX(viewX0);
    const vy = toMapY(viewY0);
    const vw = (viewX1 - viewX0) * scale;
    const vh = (viewY1 - viewY0) * scale;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vx, vy, vw, vh);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.fillRect(vx, vy, vw, vh);
  }, [nodes, edges, viewX0, viewY0, viewX1, viewY1, scale, toMapX, toMapY, isCollapsed]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    onPanTo(fromMapX(mx), fromMapY(my));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    onPanTo(fromMapX(mx), fromMapY(my));
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  return (
    <div className="absolute bottom-4 right-4 z-20 overflow-hidden border border-[#d2d6de] bg-white shadow-md select-none">
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#f8fafc] border-b border-[#d2d6de] text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-[11px] text-gray-700">
          <MapIcon className="h-3.5 w-3.5 text-[#2874a6]" />
          {title}
        </span>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-500 hover:text-gray-900 cursor-pointer p-0.5 rounded"
          title={isCollapsed ? 'Kattalashtirish' : 'Kichraytirish'}
        >
          {isCollapsed ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <canvas
          ref={canvasRef}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="cursor-crosshair block"
        />
      )}
    </div>
  );
};
