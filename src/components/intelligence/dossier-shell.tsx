import { ArrowLeft, ChevronDown, ChevronRight, ShieldAlert } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { DossierTrailItem, RoleVerdict } from '@/lib/dossier-navigation';

interface DossierTopBarProps {
  breadcrumbs: DossierTrailItem[];
  backLabel: string;
  onBack: () => void;
  onBreadcrumbClick: (index: number) => void;
  actions?: ReactNode;
}

/**
 * Yagona ixcham qatorli navigatsiya: Orqaga + inline Breadcrumb + o'ngda amallar
 */
export function DossierTopBar({
  breadcrumbs,
  backLabel,
  onBack,
  onBreadcrumbClick,
  actions,
}: DossierTopBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/70">
      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer -ml-2 shrink-0"
          title={`Orqaga: ${backLabel}`}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="text-xs font-medium">Orqaga</span>
        </Button>

        {breadcrumbs.length > 1 && (
          <nav
            aria-label="Yo‘l ko‘rsatkich"
            className="hidden sm:flex flex-wrap items-center gap-1 text-xs text-muted-foreground min-w-0 pl-1 border-l border-border/70"
          >
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <span key={`${crumb.to}-${idx}`} className="inline-flex items-center gap-1 min-w-0">
                  {idx > 0 && <ChevronRight className="h-3 w-3 opacity-50 shrink-0" />}
                  {isLast ? (
                    <span className="font-semibold text-foreground truncate max-w-[240px]">
                      {crumb.label}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onBreadcrumbClick(idx)}
                      className="hover:text-primary hover:underline transition-colors cursor-pointer truncate max-w-[180px]"
                    >
                      {crumb.label}
                    </button>
                  )}
                </span>
              );
            })}
          </nav>
        )}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

interface SectionTitleProps {
  title: string;
  count?: number;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

/**
 * Sokin, ortiqcha ramkasiz va raqamsiz bo'lim sarlavhasi
 */
export function SectionTitle({ title, count, subtitle, icon, action }: SectionTitleProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground flex items-center gap-2">
          {icon}
          <span>{title}</span>
          {count !== undefined && (
            <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}

/**
 * F.I.SH yoki karta raqami yonida chiqadigan bitta aniq rol tegi
 */
export function InlineRoleBadge({ verdict }: { verdict: RoleVerdict }) {
  const styles = {
    critical: 'bg-rose-600 text-white border-rose-600 font-bold',
    danger: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35 font-bold',
    victim: 'bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/30 font-semibold',
    neutral: 'bg-muted text-muted-foreground border-border font-medium',
  }[verdict.tone];

  return (
    <Badge className={`text-xs ${styles}`}>
      {verdict.tone === 'critical' ? '⚠ ' : ''}
      {verdict.headline}
    </Badge>
  );
}

/**
 * Faqat haqiqiy xavf (takroriy firibgar kartasi yoki ikki tomonlama rol) bo'lganda chiqadigan ixcham qizil chiziq
 */
export function CompactDangerAlert({ title, message }: { title: string; message?: string }) {
  return (
    <div className="rounded-lg border border-rose-500/40 bg-rose-500/8 px-3.5 py-2.5 flex items-start gap-2.5 text-xs">
      <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <span className="font-bold text-rose-700 dark:text-rose-300">{title}</span>
        {message && <span className="text-rose-700/85 dark:text-rose-300/85"> — {message}</span>}
      </div>
    </div>
  );
}

interface CollapsibleInsightPanelProps {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  badgeText?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleInsightPanel({
  title,
  subtitle,
  icon,
  badgeText,
  defaultOpen = false,
  children,
}: CollapsibleInsightPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="py-0 gap-0 border-border/80 bg-card/70 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-primary shrink-0">{icon}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-foreground">{title}</span>
              {badgeText && (
                <span className="text-[11px] font-mono text-muted-foreground">{badgeText}</span>
              )}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary shrink-0">
          <span>{open ? 'Yopish' : 'Ochish'}</span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>

      {open && <CardContent className="p-4 pt-3 border-t border-border/60">{children}</CardContent>}
    </Card>
  );
}
