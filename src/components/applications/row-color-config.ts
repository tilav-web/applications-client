import type { Application, ApplicationRowColor } from '@/types/models';

export interface RowColorOption {
  key: ApplicationRowColor;
  label: string;
  dotClass: string;
  swatchClass: string;
  rowClass: string;
  stickyCellClass: string;
}

export const ROW_COLOR_OPTIONS: RowColorOption[] = [
  {
    key: 'yellow',
    label: 'Sariq',
    dotClass: 'bg-amber-400 ring-amber-500/40',
    swatchClass: 'bg-amber-400 hover:bg-amber-500 border-amber-500/70 text-amber-950',
    rowClass:
      'bg-amber-100/85 hover:bg-amber-200/75 dark:bg-amber-500/[0.16] dark:hover:bg-amber-500/[0.24]',
    stickyCellClass:
      'bg-amber-100/95 group-hover:bg-amber-200/85 dark:bg-amber-950/90 dark:group-hover:bg-amber-900/80 border-l-[3px] border-l-amber-400',
  },
  {
    key: 'red',
    label: 'Qizil',
    dotClass: 'bg-rose-500 ring-rose-500/40',
    swatchClass: 'bg-rose-500 hover:bg-rose-600 border-rose-600/70 text-white',
    rowClass:
      'bg-rose-100/80 hover:bg-rose-200/70 dark:bg-rose-500/[0.16] dark:hover:bg-rose-500/[0.24]',
    stickyCellClass:
      'bg-rose-100/95 group-hover:bg-rose-200/85 dark:bg-rose-950/90 dark:group-hover:bg-rose-900/80 border-l-[3px] border-l-rose-500',
  },
  {
    key: 'green',
    label: 'Yashil',
    dotClass: 'bg-emerald-500 ring-emerald-500/40',
    swatchClass: 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600/70 text-white',
    rowClass:
      'bg-emerald-100/80 hover:bg-emerald-200/70 dark:bg-emerald-500/[0.15] dark:hover:bg-emerald-500/[0.23]',
    stickyCellClass:
      'bg-emerald-100/95 group-hover:bg-emerald-200/85 dark:bg-emerald-950/90 dark:group-hover:bg-emerald-900/80 border-l-[3px] border-l-emerald-500',
  },
  {
    key: 'blue',
    label: 'Ko‘k',
    dotClass: 'bg-sky-500 ring-sky-500/40',
    swatchClass: 'bg-sky-500 hover:bg-sky-600 border-sky-600/70 text-white',
    rowClass:
      'bg-sky-100/80 hover:bg-sky-200/70 dark:bg-sky-500/[0.15] dark:hover:bg-sky-500/[0.23]',
    stickyCellClass:
      'bg-sky-100/95 group-hover:bg-sky-200/85 dark:bg-sky-950/90 dark:group-hover:bg-sky-900/80 border-l-[3px] border-l-sky-500',
  },
  {
    key: 'purple',
    label: 'Binafsha',
    dotClass: 'bg-purple-500 ring-purple-500/40',
    swatchClass: 'bg-purple-500 hover:bg-purple-600 border-purple-600/70 text-white',
    rowClass:
      'bg-purple-100/80 hover:bg-purple-200/70 dark:bg-purple-500/[0.16] dark:hover:bg-purple-500/[0.24]',
    stickyCellClass:
      'bg-purple-100/95 group-hover:bg-purple-200/85 dark:bg-purple-950/90 dark:group-hover:bg-purple-900/80 border-l-[3px] border-l-purple-500',
  },
  {
    key: 'orange',
    label: 'To‘q sariq',
    dotClass: 'bg-orange-500 ring-orange-500/40',
    swatchClass: 'bg-orange-500 hover:bg-orange-600 border-orange-600/70 text-white',
    rowClass:
      'bg-orange-100/80 hover:bg-orange-200/70 dark:bg-orange-500/[0.16] dark:hover:bg-orange-500/[0.24]',
    stickyCellClass:
      'bg-orange-100/95 group-hover:bg-orange-200/85 dark:bg-orange-950/90 dark:group-hover:bg-orange-900/80 border-l-[3px] border-l-orange-500',
  },
];

const ROW_COLOR_MAP = new Map<ApplicationRowColor, RowColorOption>(
  ROW_COLOR_OPTIONS.map((opt) => [opt.key, opt]),
);

export function getRowColorMeta(color?: ApplicationRowColor | null): RowColorOption | null {
  if (!color) return null;
  return ROW_COLOR_MAP.get(color) || null;
}

export function formatRowColorTime(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isSameDay) {
    return date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRowColorTooltip(
  app: Pick<Application, 'row_color' | 'row_color_by' | 'row_color_updated_at'>,
  canWrite: boolean,
): string {
  const meta = getRowColorMeta(app.row_color);
  if (!meta) {
    return canWrite ? 'Qator rangini belgilash (yoki qatorga o‘ng tugma bosing)' : 'Rangsiz';
  }
  const parts: string[] = [meta.label];
  if (app.row_color_by) parts.push(app.row_color_by);
  const formattedTime = formatRowColorTime(app.row_color_updated_at);
  if (formattedTime) parts.push(formattedTime);
  if (canWrite) parts.push('(o‘zgartirish uchun bosing)');
  return parts.join(' • ');
}
