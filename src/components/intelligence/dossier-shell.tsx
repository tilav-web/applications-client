import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Info,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

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

export function DossierTopBar({
  breadcrumbs,
  backLabel,
  onBack,
  onBreadcrumbClick,
  actions,
}: DossierTopBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 -ml-2 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="truncate max-w-[260px] sm:max-w-[380px]">Orqaga: {backLabel}</span>
        </Button>

        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {breadcrumbs.length > 1 && (
        <nav
          aria-label="Yo‘l ko‘rsatkich"
          className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground bg-muted/40 border border-border/60 rounded-lg px-3 py-1.5"
        >
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <span key={`${crumb.to}-${idx}`} className="inline-flex items-center gap-1 min-w-0">
                {idx > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-60 shrink-0" />}
                {isLast ? (
                  <span className="font-semibold text-foreground truncate max-w-[220px] sm:max-w-[300px]">
                    {crumb.label}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onBreadcrumbClick(idx)}
                    className="hover:text-primary hover:underline transition-colors cursor-pointer truncate max-w-[180px] sm:max-w-[240px]"
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
  );
}

export interface DossierNavSection {
  id: string;
  step: number;
  label: string;
  count?: number;
  alert?: boolean;
}

interface DossierSectionNavProps {
  sections: DossierNavSection[];
}

export function DossierSectionNav({ sections }: DossierSectionNavProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id || '');

  useEffect(() => {
    if (sections.length === 0) return;
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-90px 0px -60% 0px',
        threshold: 0.05,
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) return null;

  const scrollToSection = (id: string) => {
    setActiveId(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/70">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
        {sections.map((sec) => {
          const isActive = activeId === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => scrollToSection(sec.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : sec.alert
                    ? 'bg-rose-500/8 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/15'
                    : 'bg-card text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <span
                className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {sec.step}
              </span>
              <span>{sec.label}</span>
              {sec.count !== undefined && (
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted/90 text-muted-foreground'
                  }`}
                >
                  {sec.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SectionHeadingProps {
  step: number;
  title: string;
  subtitle?: string;
  count?: number;
  icon?: ReactNode;
  action?: ReactNode;
}

export function SectionHeading({
  step,
  title,
  subtitle,
  count,
  icon,
  action,
}: SectionHeadingProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-1">
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="h-7 w-7 rounded-lg bg-primary/12 border border-primary/25 text-primary font-mono text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
          {step}
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold tracking-tight flex flex-wrap items-center gap-2 text-foreground">
            {icon}
            <span>{title}</span>
            {count !== undefined && (
              <Badge variant="secondary" className="font-mono text-xs">
                {count}
              </Badge>
            )}
          </h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex flex-wrap items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}

interface RoleVerdictBannerProps {
  verdict: RoleVerdict;
  riskScore?: number;
  compact?: boolean;
}

export function RoleVerdictBanner({ verdict, riskScore, compact = false }: RoleVerdictBannerProps) {
  const toneStyles = {
    critical: {
      wrap: 'border-rose-500/50 bg-rose-500/10',
      iconWrap: 'bg-rose-500 text-white',
      title: 'text-rose-700 dark:text-rose-300',
      badge: 'bg-rose-600 text-white border-rose-600',
      Icon: ShieldAlert,
    },
    danger: {
      wrap: 'border-red-500/40 bg-red-500/8',
      iconWrap: 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30',
      title: 'text-red-700 dark:text-red-300',
      badge: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/35',
      Icon: ShieldAlert,
    },
    victim: {
      wrap: 'border-blue-500/35 bg-blue-500/8',
      iconWrap: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30',
      title: 'text-blue-700 dark:text-blue-300',
      badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/35',
      Icon: UserCheck,
    },
    neutral: {
      wrap: 'border-border bg-muted/40',
      iconWrap: 'bg-muted text-muted-foreground border border-border',
      title: 'text-foreground',
      badge: 'bg-muted text-muted-foreground border-border',
      Icon: Info,
    },
  }[verdict.tone];

  const IconComp = verdict.tone === 'victim' ? ShieldCheck : toneStyles.Icon;

  return (
    <div
      className={`rounded-xl border ${toneStyles.wrap} ${compact ? 'p-3' : 'p-4'} flex items-start gap-3 min-w-0`}
    >
      <div
        className={`${compact ? 'h-8 w-8' : 'h-10 w-10'} rounded-xl flex items-center justify-center shrink-0 ${toneStyles.iconWrap}`}
      >
        <IconComp className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </div>

      <div className="space-y-1.5 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`text-[10px] tracking-wider uppercase font-bold ${toneStyles.badge}`}>
            {verdict.badgeText}
          </Badge>
          {riskScore !== undefined && riskScore > 0 && (
            <span className="text-[11px] font-mono text-muted-foreground">
              Xavf indeksi: <strong className="text-foreground">{riskScore}%</strong>
            </span>
          )}
        </div>

        <p
          className={`${compact ? 'text-xs' : 'text-sm'} font-bold leading-snug ${toneStyles.title}`}
        >
          {verdict.headline}
        </p>

        {!compact && verdict.summary && (
          <p className="text-xs text-muted-foreground leading-relaxed">{verdict.summary}</p>
        )}

        {verdict.pills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {verdict.pills.map((pill, i) => (
              <Badge key={i} className={`text-[11px] ${pill.className}`}>
                {pill.label}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SummaryMetricItem {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'danger' | 'success' | 'info';
}

export function DossierMetricStrip({ items }: { items: SummaryMetricItem[] }) {
  const toneText = {
    default: 'text-foreground',
    danger: 'text-rose-600 dark:text-rose-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    info: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-border/80 bg-card/60 px-3.5 py-2.5 min-w-0"
        >
          <p className="text-[11px] font-medium text-muted-foreground truncate">{item.label}</p>
          <p
            className={`text-base sm:text-lg font-extrabold font-mono mt-0.5 break-words ${
              toneText[item.tone || 'default']
            }`}
          >
            {item.value}
          </p>
          {item.sub && <p className="text-[11px] text-muted-foreground truncate">{item.sub}</p>}
        </div>
      ))}
    </div>
  );
}

interface CollapsibleInsightPanelProps {
  title: string;
  subtitle: string;
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
    <Card className="py-0 gap-0 border-border/80 bg-card/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-foreground">{title}</span>
              {badgeText && (
                <Badge variant="outline" className="text-[11px] font-mono">
                  {badgeText}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary shrink-0">
          <span>{open ? 'Yopish' : 'Ochish'}</span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>

      {open && <CardContent className="p-4 pt-2 border-t border-border/60">{children}</CardContent>}
    </Card>
  );
}
