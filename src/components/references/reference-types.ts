import {
  Activity,
  AlertOctagon,
  BookmarkCheck,
  Briefcase,
  Building2,
  CreditCard,
  Globe,
  Layers,
  MapPin,
  Megaphone,
  Radio,
  Scale,
  Server,
  Shield,
  ShieldAlert,
} from 'lucide-react';

import type {
  ApplicationSource,
  ApplicationStatusItem,
  AwarenessStatus,
  Bank,
  Crime,
  CrimeGravity,
  CrimeMethod,
  DecisionType,
  DepartmentService,
  District,
  ExternalSystem,
  Neighborhood,
  Occupation,
  OccupationCategory,
  PaymentProvider,
  Region,
  RejectionReason,
  SuspectFieldConfig,
  TransferChannel,
} from '@/types/models';

export type ReferenceItem =
  | Region
  | District
  | Neighborhood
  | Crime
  | CrimeMethod
  | Bank
  | PaymentProvider
  | TransferChannel
  | ApplicationStatusItem
  | SuspectFieldConfig
  | OccupationCategory
  | Occupation
  | ApplicationSource
  | AwarenessStatus
  | ExternalSystem
  | DepartmentService
  | RejectionReason
  | DecisionType;

export interface ReferenceFormData {
  name?: string | null;
  title?: string | null;
  code?: string | null;
  color?: string | null;
  description?: string | null;
  is_default?: boolean | null;
  is_active?: boolean | null;
  sort_order?: number | null;
  article?: string | null;
  mfo?: string | null;
  short_name?: string | null;
  category_id?: string | null;
  gravity?: CrimeGravity | null;
  region_id?: string | null;
  district_id?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  group_name?: string | null;
  key?: string | null;
  label?: string | null;
  category?: string | OccupationCategory | null;
  sample_value?: string | null;
  [key: string]: unknown;
}

export type ReferenceTabKey =
  | 'regions'
  | 'districts'
  | 'neighborhoods'
  | 'crimes'
  | 'crime_methods'
  | 'occupations'
  | 'workplaces'
  | 'detection_sources'
  | 'detected_crime_statuses'
  | 'sources'
  | 'awareness_statuses'
  | 'external_systems'
  | 'department_services'
  | 'decision_types'
  | 'rejection_reasons'
  | 'banks'
  | 'providers'
  | 'transfer_channels'
  | 'statuses'
  | 'suspect_fields';

export const REFERENCE_NAV_GROUPS: Array<{
  title: string;
  items: Array<{
    key: ReferenceTabKey;
    label: string;
    description: string;
    icon: typeof MapPin;
  }>;
}> = [
  {
    title: 'Hududiy tuzilma',
    items: [
      {
        key: 'regions',
        label: 'Viloyatlar',
        description: 'Viloyatlar va ularning geografik markaz koordinatalari',
        icon: Globe,
      },
      {
        key: 'districts',
        label: 'Tumanlar',
        description: 'Viloyatlarga biriktirilgan tuman va shahar bo‘limlari',
        icon: MapPin,
      },
      {
        key: 'neighborhoods',
        label: 'Mahallalar',
        description: 'Tumanlarga biriktirilgan mahallalar va koordinatalar',
        icon: Building2,
      },
    ],
  },
  {
    title: 'Jinoyat & Tergov',
    items: [
      {
        key: 'crimes',
        label: 'Jinoyat Turlari',
        description: 'Jinoyat kodeksi moddalari va toifalari',
        icon: BookmarkCheck,
      },
      {
        key: 'crime_methods',
        label: 'Jinoyat Usullari',
        description: 'Sodir etish usullari va dinamik maydonlar konstruktori',
        icon: Layers,
      },
      {
        key: 'suspect_fields',
        label: 'Gumonlanuvchi Parametrlari',
        description: 'Raqamli izlar va gumonlanuvchi atributlari',
        icon: ShieldAlert,
      },
    ],
  },
  {
    title: 'Ariza & Jarayon',
    items: [
      {
        key: 'statuses',
        label: 'Ariza Statuslari',
        description: 'Murojaat holatlari va rang kodlari',
        icon: Activity,
      },
      {
        key: 'sources',
        label: 'Murojaat Manbalari',
        description: '102, 112, ishonch telefoni va boshqa kanallar',
        icon: Radio,
      },
      {
        key: 'awareness_statuses',
        label: 'Targ‘ibot Holatlari',
        description: 'Fuqaro kiberxavfsizlik bo‘yicha targ‘ibot qilinganligi holatlari',
        icon: Megaphone,
      },
      {
        key: 'external_systems',
        label: 'Tashqi Tizimlar',
        description: 'CardBlock, E-Elektron, E-Material va boshqa tizimlar reestri',
        icon: Server,
      },
      {
        key: 'department_services',
        label: 'Sohaviy Xizmatlar',
        description: 'Boshqarma va sohaviy xizmat yo‘nalishlari',
        icon: Shield,
      },
      {
        key: 'decision_types',
        label: 'Qaror Turlari',
        description: 'Murojaat bo‘yicha qabul qilinadigan qarorlar',
        icon: Scale,
      },
      {
        key: 'rejection_reasons',
        label: 'Rad Sabablari',
        description: 'Arizani rad etish asoslari',
        icon: AlertOctagon,
      },
      {
        key: 'occupations',
        label: 'Kasb & Toifalar',
        description: 'Fuqarolarning bandlik toifalari va kasblari',
        icon: Briefcase,
      },
      {
        key: 'workplaces',
        label: 'Ish joylari / Tashkilotlar',
        description: 'Maktab, shifoxona, bank va boshqa ish joylari reestri',
        icon: Building2,
      },
      {
        key: 'detection_sources',
        label: 'Aniqlash Usullari',
        description: 'Kiber-monitoring, tezkor tadbir, OAV va boshqa aniqlash manbalari',
        icon: Radio,
      },
      {
        key: 'detected_crime_statuses',
        label: 'Aniqlangan Jinoyat Statuslari',
        description: 'Fosh etilgan jinoyatlar uchun alohida holatlar (tergov, sud, yakunlandi)',
        icon: Shield,
      },
    ],
  },
  {
    title: 'Moliya & Bank',
    items: [
      {
        key: 'banks',
        label: 'Banklar',
        description: 'O‘zbekiston tijorat banklari va MFO kodlari',
        icon: Building2,
      },
      {
        key: 'providers',
        label: 'To‘lov Provayderlari',
        description: 'Payme, Click, Uzum va boshqa to‘lov tizimlari',
        icon: CreditCard,
      },
      {
        key: 'transfer_channels',
        label: 'Chiqish Kanallari',
        description: 'Moliyaviy oqimda pul chiqish yo‘llari (Kripto, ATM, Servislar...)',
        icon: Layers,
      },
    ],
  },
];

export const ALL_REFERENCE_TABS = REFERENCE_NAV_GROUPS.flatMap((g) => g.items);
export const VALID_TAB_KEYS = new Set<string>(ALL_REFERENCE_TABS.map((t) => t.key));
