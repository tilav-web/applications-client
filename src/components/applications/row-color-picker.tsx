import { Check, Eraser, Palette } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';
import type { Application, ApplicationRowColor } from '@/types/models';

import { formatRowColorTime, getRowColorMeta, ROW_COLOR_OPTIONS } from './row-color-config';

interface RowColorSwatchRowProps {
  activeColor?: ApplicationRowColor | null;
  onSelect: (color: ApplicationRowColor | null) => void;
  disabled?: boolean;
  showClearWhenUnset?: boolean;
  size?: 'sm' | 'md';
}

export function RowColorSwatchRow({
  activeColor,
  onSelect,
  disabled = false,
  showClearWhenUnset = false,
  size = 'md',
}: RowColorSwatchRowProps) {
  const btnSize = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <div className="flex items-center gap-1.5">
      {ROW_COLOR_OPTIONS.map((opt) => {
        const isActive = activeColor === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(isActive ? null : opt.key);
            }}
            title={isActive ? `${opt.label} (olib tashlash)` : opt.label}
            aria-label={opt.label}
            className={cn(
              btnSize,
              'rounded-full border flex items-center justify-center transition-all cursor-pointer shrink-0',
              'hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
              'disabled:opacity-50 disabled:pointer-events-none',
              opt.swatchClass,
              isActive && 'ring-2 ring-offset-2 ring-offset-popover ring-foreground/70 scale-105',
            )}
          >
            {isActive && <Check className={cn(iconSize, 'stroke-[3]')} />}
          </button>
        );
      })}

      {(activeColor || showClearWhenUnset) && (
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(null);
          }}
          title="Rangni tozalash"
          aria-label="Rangni tozalash"
          className={cn(
            btnSize,
            'rounded-full border border-border bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground',
            'flex items-center justify-center transition-all cursor-pointer shrink-0',
            'hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
          )}
        >
          <Eraser className={iconSize} />
        </button>
      )}
    </div>
  );
}

interface RowColorFloatingMenuProps {
  app: Application;
  x: number;
  y: number;
  isUpdating?: boolean;
  onSelect: (color: ApplicationRowColor | null) => void;
  onClose: () => void;
}

export function RowColorFloatingMenu({
  app,
  x,
  y,
  isUpdating = false,
  onSelect,
  onClose,
}: RowColorFloatingMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: x, top: y });

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 12;
    const clampedLeft = Math.max(pad, Math.min(x, window.innerWidth - rect.width - pad));
    const clampedTop = Math.max(pad, Math.min(y, window.innerHeight - rect.height - pad));
    setPos({ left: clampedLeft, top: clampedTop });
  }, [x, y]);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    const handleDismiss = () => onClose();

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [onClose]);

  const currentMeta = getRowColorMeta(app.row_color);
  const formattedTime = formatRowColorTime(app.row_color_updated_at);

  const content = (
    <div
      ref={menuRef}
      style={{ left: pos.left, top: pos.top }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-50 min-w-[238px] rounded-xl border border-border/90 bg-popover/98 text-popover-foreground shadow-xl backdrop-blur-md p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
          <Palette className="h-3.5 w-3.5 text-primary" />
          <span>Qator rangi</span>
        </span>
        <span className="font-mono text-[10px] truncate max-w-[125px]">
          {app.application_number ? `№ ${app.application_number}` : 'Raqamsiz'}
        </span>
      </div>

      <RowColorSwatchRow
        activeColor={app.row_color}
        disabled={isUpdating}
        onSelect={(color) => {
          onSelect(color);
          onClose();
        }}
      />

      {currentMeta && (app.row_color_by || formattedTime) ? (
        <div className="pt-1.5 border-t border-border/70 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <span className="truncate">
            Belgilagan: <strong className="text-foreground">{app.row_color_by || 'Hodim'}</strong>
          </span>
          {formattedTime && <span className="font-mono shrink-0">{formattedTime}</span>}
        </div>
      ) : (
        <div className="pt-1 border-t border-border/60 text-[10px] text-muted-foreground">
          Barcha online hodimlarda darhol yangilanadi
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
