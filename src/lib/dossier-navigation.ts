import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import type { DossierApplicationItem, DossierMicroStats } from '@/types/models';

export type TrailKind =
  | 'applications'
  | 'citizens'
  | 'cards'
  | 'application'
  | 'relations'
  | 'citizen'
  | 'card'
  | 'phone'
  | 'identifier';

export interface DossierTrailItem {
  label: string;
  to: string;
  kind: TrailKind;
}

export interface DossierLocationState {
  trail?: DossierTrailItem[];
}

export const formatDossierMoney = (val?: number | null, cur = 'UZS') => {
  if (val === undefined || val === null) return '—';
  return `${new Intl.NumberFormat('uz-UZ').format(Math.round(Number(val)))} ${cur}`;
};

export const formatDossierDate = (d?: string | null) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return d;
  }
};

export const formatDossierCard = (num?: string | null, masked?: string | null) => {
  const clean = (num || '').replace(/\D/g, '');
  if (clean.length === 16) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)} ${clean.slice(12, 16)}`;
  }
  return masked || num || 'Raqamsiz';
};

export const formatDossierPhone = (phone?: string | null) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('998')) {
    return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
  }
  if (digits.length === 9) {
    return `+998 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  }
  return phone.startsWith('+') ? phone : `+${digits || phone}`;
};

export type UzbekRoleTone = 'victim' | 'suspect' | 'dropper' | 'transit' | 'witness' | 'neutral';

export interface UzbekRoleMeta {
  label: string;
  shortLabel: string;
  tone: UzbekRoleTone;
  badgeClass: string;
  isDanger: boolean;
}

export function getRoleMeta(role?: string | null): UzbekRoleMeta {
  const key = (role || '').toUpperCase().trim();
  switch (key) {
    case 'VICTIM':
    case 'SENDER':
    case 'VICTIM_SOURCE':
      return {
        label: 'Jabrlanuvchi',
        shortLabel: 'Jabrlanuvchi',
        tone: 'victim',
        badgeClass:
          'bg-blue-500/12 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-semibold',
        isDanger: false,
      };
    case 'SUSPECT':
      return {
        label: 'Firibgar / Gumonlanuvchi',
        shortLabel: 'Firibgar',
        tone: 'suspect',
        badgeClass:
          'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/35 font-bold',
        isDanger: true,
      };
    case 'DROPPER':
    case 'RECEIVER':
    case 'MULE_DROPPER':
      return {
        label: 'Dropper (Pul olgan)',
        shortLabel: 'Dropper',
        tone: 'dropper',
        badgeClass:
          'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/35 font-bold',
        isDanger: true,
      };
    case 'TRANSIT':
      return {
        label: 'Tranzit vositachi',
        shortLabel: 'Tranzit',
        tone: 'transit',
        badgeClass:
          'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35 font-semibold',
        isDanger: true,
      };
    case 'WITNESS':
      return {
        label: 'Guvoh',
        shortLabel: 'Guvoh',
        tone: 'witness',
        badgeClass:
          'bg-slate-500/12 text-slate-700 dark:text-slate-300 border border-slate-500/30 font-medium',
        isDanger: false,
      };
    default:
      return {
        label: 'Aloqador shaxs',
        shortLabel: 'Aloqador',
        tone: 'neutral',
        badgeClass: 'bg-muted text-muted-foreground border border-border font-medium',
        isDanger: false,
      };
  }
}

export function isDangerRole(role?: string | null): boolean {
  return getRoleMeta(role).isDanger;
}

export type VerdictTone = 'critical' | 'danger' | 'victim' | 'neutral';

export interface RoleVerdict {
  tone: VerdictTone;
  badgeText: string;
  headline: string;
  summary: string;
  pills: { label: string; className: string }[];
}

export function buildCitizenVerdict(stats?: DossierMicroStats | null): RoleVerdict {
  if (!stats) {
    return {
      tone: 'neutral',
      badgeText: 'Tahlil qilinmoqda',
      headline: 'Rol maʼlumoti mavjud emas',
      summary: 'Ushbu fuqaro boʻyicha bogʻliq arizalar topilmadi.',
      pills: [],
    };
  }

  const pills: { label: string; className: string }[] = [];
  if (stats.victimAppsCount > 0) {
    pills.push({
      label: `Jabrlanuvchi: ${stats.victimAppsCount} ta ariza`,
      className:
        'bg-blue-500/12 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-semibold',
    });
  }
  if (stats.suspectOrDropperAppsCount > 0) {
    pills.push({
      label: `Firibgar / Dropper: ${stats.suspectOrDropperAppsCount} ta ariza`,
      className:
        'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/35 font-bold',
    });
  }
  if (stats.witnessAppsCount > 0) {
    pills.push({
      label: `Guvoh: ${stats.witnessAppsCount} ta ariza`,
      className:
        'bg-slate-500/12 text-slate-700 dark:text-slate-300 border border-slate-500/30 font-medium',
    });
  }

  if (stats.isCrossRoleCollision) {
    return {
      tone: 'critical',
      badgeText: 'IKKI TOMONLAMA ROL',
      headline: 'Ham Jabrlanuvchi, ham Firibgar / Dropper sifatida qayd etilgan!',
      summary: `Bu fuqaro ${stats.victimAppsCount} ta arizada jabrlanuvchi, ammo boshqa ${stats.suspectOrDropperAppsCount} ta arizada firibgar yoki pul tushgan karta egasi (dropper) sifatida qatnashgan.`,
      pills,
    };
  }

  if (stats.suspectOrDropperAppsCount > 0) {
    return {
      tone: 'danger',
      badgeText: 'FIRIBGAR / DROPPER',
      headline: `Firibgar / Dropper (${stats.suspectOrDropperAppsCount} ta arizada)`,
      summary:
        stats.suspectOrDropperAppsCount > 1
          ? `Ushbu shaxs bir nechta (${stats.suspectOrDropperAppsCount} ta) arizada gumonlanuvchi yoki pul qabul qilgan karta egasi sifatida takrorlangan.`
          : 'Ushbu shaxs arizada gumonlanuvchi yoki pul qabul qilgan karta egasi sifatida qayd etilgan.',
      pills,
    };
  }

  if (stats.victimAppsCount > 0) {
    return {
      tone: 'victim',
      badgeText: 'JABRLANUVCHI',
      headline: `Jabrlanuvchi (${stats.victimAppsCount} ta arizada)`,
      summary:
        stats.victimAppsCount > 1
          ? `Ushbu fuqaro ${stats.victimAppsCount} marta jabrlanuvchi sifatida murojaat qilgan. Gumonlanuvchi sifatida qayd etilmagan.`
          : 'Ushbu fuqaro faqat jabrlanuvchi sifatida murojaat qilgan. Boshqa ishlarda firibgar sifatida uchramagan.',
      pills,
    };
  }

  if (stats.witnessAppsCount > 0) {
    return {
      tone: 'neutral',
      badgeText: 'GUVOH',
      headline: `Guvoh (${stats.witnessAppsCount} ta arizada)`,
      summary: 'Ushbu fuqaro arizalarda guvoh sifatida qayd etilgan.',
      pills,
    };
  }

  return {
    tone: 'neutral',
    badgeText: 'ROL ANIQLANMAGAN',
    headline: 'Arizalardagi roli hali belgilanmagan',
    summary: 'Hozircha bu fuqaro boʻyicha bogʻlangan arizalar yoki oʻtkazmalar topilmadi.',
    pills,
  };
}

export function buildCardVerdict(
  stats?: DossierMicroStats | null,
  directApps: DossierApplicationItem[] = [],
): RoleVerdict {
  const dropperCount = directApps.filter((a) => isDangerRole(a.role_in_app)).length;
  const victimCount = directApps.filter((a) => !isDangerRole(a.role_in_app)).length;
  const hasIncoming = (stats?.totalIncomingAmount || 0) > 0;
  const hasOutgoing = (stats?.totalOutgoingAmount || 0) > 0;

  const pills: { label: string; className: string }[] = [];
  if (dropperCount > 0) {
    pills.push({
      label: `Firibgar / Pul olgan: ${dropperCount} ta ariza`,
      className:
        'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/35 font-bold',
    });
  }
  if (victimCount > 0) {
    pills.push({
      label: `Jabrlanuvchi kartasi: ${victimCount} ta ariza`,
      className:
        'bg-blue-500/12 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-semibold',
    });
  }

  if (dropperCount > 0 && victimCount > 0) {
    return {
      tone: 'critical',
      badgeText: 'TRANZIT / ARALASH KARTA',
      headline: 'Ham jabrlanuvchi, ham pul qabul qiluvchi karta sifatida qatnashgan',
      summary: `Ushbu karta ${dropperCount} ta arizada pul tushgan (firibgar/dropper), ${victimCount} ta arizada esa joʻnatuvchi karta sifatida uchragan.`,
      pills,
    };
  }

  if (dropperCount > 0 || (hasIncoming && !hasOutgoing)) {
    return {
      tone: 'danger',
      badgeText: 'FIRIBGAR / DROPPER KARTASI',
      headline:
        dropperCount > 1
          ? `Xavfli karta: ${dropperCount} ta arizada pul tushgan!`
          : 'Pul qabul qiluvchi (Firibgar / Dropper) kartasi',
      summary:
        dropperCount > 1
          ? `Mazkur kartaga ${dropperCount} ta turli arizadan pul oʻtkazilgan — guruhli firibgarlik belgisi.`
          : 'Mazkur karta jabrlanuvchidan pul qabul qiluvchi karta sifatida qayd etilgan.',
      pills,
    };
  }

  if (victimCount > 0 || hasOutgoing) {
    return {
      tone: 'victim',
      badgeText: 'JABRLANUVCHI KARTASI',
      headline: 'Jabrlanuvchining (pul chiqqan) kartasi',
      summary:
        'Ushbu kartadan firibgarlarga pul oʻtkazilgan; boshqa ishlarda qabul qiluvchi sifatida uchramagan.',
      pills,
    };
  }

  return {
    tone: 'neutral',
    badgeText: 'KARTA',
    headline: 'Oʻtkazma roli aniqlanmagan',
    summary: 'Hozircha bu karta boʻyicha bogʻlangan pul oʻtkazmalari topilmadi.',
    pills,
  };
}

export function buildClueVerdict(
  stats?: DossierMicroStats | null,
  entityLabel = 'Rekvizit',
): RoleVerdict {
  if (!stats) {
    return {
      tone: 'neutral',
      badgeText: entityLabel.toUpperCase(),
      headline: 'Maʼlumot topilmadi',
      summary: '',
      pills: [],
    };
  }

  const pills: { label: string; className: string }[] = [];
  if (stats.suspectOrDropperAppsCount > 0) {
    pills.push({
      label: `Gumonlanuvchi belgisi: ${stats.suspectOrDropperAppsCount} ta ariza`,
      className:
        'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/35 font-bold',
    });
  }
  if (stats.victimAppsCount > 0) {
    pills.push({
      label: `Jabrlanuvchi tomoni: ${stats.victimAppsCount} ta ariza`,
      className:
        'bg-blue-500/12 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-semibold',
    });
  }

  if (stats.suspectOrDropperAppsCount > 0) {
    return {
      tone: stats.suspectOrDropperAppsCount > 1 ? 'critical' : 'danger',
      badgeText: 'FIRIBGAR BELGISI',
      headline: `${entityLabel} ${stats.suspectOrDropperAppsCount} ta arizada gumonlanuvchi sifatida uchragan`,
      summary:
        stats.suspectOrDropperAppsCount > 1
          ? 'Bir xil raqamli iz bir nechta jabrlanuvchining arizasida takrorlanmoqda.'
          : 'Arizada gumonlanuvchi rekviziti sifatida kiritilgan.',
      pills,
    };
  }

  if (stats.victimAppsCount > 0) {
    return {
      tone: 'victim',
      badgeText: 'JABRLANUVCHI TOMONI',
      headline: `${entityLabel} jabrlanuvchi bilan bogʻlangan (${stats.victimAppsCount} ta ariza)`,
      summary: 'Gumonlanuvchi belgisi sifatida qayd etilmagan.',
      pills,
    };
  }

  return {
    tone: 'neutral',
    badgeText: entityLabel.toUpperCase(),
    headline: 'Arizalarda takrorlanmagan',
    summary: 'Hozircha bu rekvizit boʻyicha bogʻliq arizalar mavjud emas.',
    pills,
  };
}

function sanitizeTrail(raw: unknown): DossierTrailItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is DossierTrailItem =>
      Boolean(item) &&
      typeof item === 'object' &&
      typeof (item as DossierTrailItem).label === 'string' &&
      typeof (item as DossierTrailItem).to === 'string',
  );
}

/**
 * Sahifalararo Breadcrumb (iz yo'li) va aqlli "Orqaga" navigatsiyasi.
 * Qaysi arizadan yoki dosye sahifasidan kelgan bo'lsa, o'sha izni saqlaydi.
 */
export function useDossierTrail(fallbackRoot: DossierTrailItem, current: DossierTrailItem) {
  const location = useLocation();
  const navigate = useNavigate();

  const incomingTrail = useMemo(() => {
    const state = location.state as DossierLocationState | null;
    return sanitizeTrail(state?.trail);
  }, [location.state]);

  // Joriy sahifagacha bo'lgan toza Breadcrumb ro'yxati (takrorlanmasdan)
  const breadcrumbs = useMemo(() => {
    const base = incomingTrail.length > 0 ? incomingTrail : [fallbackRoot];
    const existingIdx = base.findIndex((item) => item.to === current.to);
    if (existingIdx >= 0) {
      return [...base.slice(0, existingIdx), current];
    }
    // Juda uzun bo'lib ketmasligi uchun oxirgi 6 ta qadamni saqlaymiz
    const combined = [...base, current];
    if (combined.length > 6) {
      return [combined[0], ...combined.slice(combined.length - 5)];
    }
    return combined;
  }, [incomingTrail, fallbackRoot, current]);

  const previousItem = useMemo(() => {
    if (breadcrumbs.length >= 2) {
      return breadcrumbs[breadcrumbs.length - 2];
    }
    return fallbackRoot;
  }, [breadcrumbs, fallbackRoot]);

  const navigateWithTrail = useCallback(
    (to: string) => {
      if (to === current.to) return;
      navigate(to, {
        state: { trail: breadcrumbs } satisfies DossierLocationState,
      });
    },
    [navigate, breadcrumbs, current.to],
  );

  const goBack = useCallback(() => {
    const targetIdx = breadcrumbs.length - 2;
    if (targetIdx >= 0) {
      const target = breadcrumbs[targetIdx];
      const nextTrail = breadcrumbs.slice(0, targetIdx);
      navigate(target.to, {
        state:
          nextTrail.length > 0 ? ({ trail: nextTrail } satisfies DossierLocationState) : undefined,
      });
      return;
    }
    navigate(fallbackRoot.to);
  }, [breadcrumbs, navigate, fallbackRoot.to]);

  const goToBreadcrumb = useCallback(
    (index: number) => {
      const target = breadcrumbs[index];
      if (!target || index === breadcrumbs.length - 1) return;
      const nextTrail = breadcrumbs.slice(0, index);
      navigate(target.to, {
        state:
          nextTrail.length > 0 ? ({ trail: nextTrail } satisfies DossierLocationState) : undefined,
      });
    },
    [breadcrumbs, navigate],
  );

  return {
    breadcrumbs,
    previousItem,
    navigateWithTrail,
    goBack,
    goToBreadcrumb,
  };
}
