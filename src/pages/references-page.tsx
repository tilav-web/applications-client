import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertOctagon,
  BookmarkCheck,
  Briefcase,
  Building2,
  CheckCircle2,
  CreditCard,
  Edit2,
  Layers,
  MapPin,
  Plus,
  Radio,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { TableRowsSkeleton } from '@/components/ui/page-skeletons';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { toast } from '@/components/ui/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import {
  applicationSourcesApi,
  applicationStatusesApi,
  banksApi,
  crimeMethodsApi,
  crimesApi,
  decisionTypesApi,
  departmentServicesApi,
  districtsApi,
  mahallasApi,
  occupationCategoriesApi,
  occupationsApi,
  paymentProvidersApi,
  rejectionReasonsApi,
  suspectFieldConfigsApi,
  transferChannelsApi,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type {
  ApplicationSource,
  ApplicationStatusItem,
  Bank,
  Crime,
  CrimeGravity,
  CrimeMethod,
  DecisionType,
  DepartmentService,
  District,
  Mahalla,
  Occupation,
  OccupationCategory,
  PaymentProvider,
  RejectionReason,
  SuspectFieldConfig,
  TransferChannel,
  TransferDestinationType,
} from '@/types/models';

type ReferenceItem =
  | District
  | Mahalla
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
  | DepartmentService
  | RejectionReason
  | DecisionType;

interface ReferenceFormData {
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
  district_id?: string | null;
  group_name?: string | null;
  key?: string | null;
  label?: string | null;
  category?: string | OccupationCategory | null;
  sample_value?: string | null;
  [key: string]: unknown;
}

type ReferenceTabKey =
  | 'districts'
  | 'mahallas'
  | 'crimes'
  | 'crime_methods'
  | 'occupations'
  | 'sources'
  | 'department_services'
  | 'decision_types'
  | 'rejection_reasons'
  | 'banks'
  | 'providers'
  | 'transfer_channels'
  | 'statuses'
  | 'suspect_fields';

const REFERENCE_NAV_GROUPS: Array<{
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
        key: 'districts',
        label: 'Tumanlar',
        description: 'Tuman va shahar bo‘limlari ro‘yxati',
        icon: MapPin,
      },
      {
        key: 'mahallas',
        label: 'Mahallalar',
        description: 'Tumanlarga biriktirilgan mahallalar',
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

const ALL_REFERENCE_TABS = REFERENCE_NAV_GROUPS.flatMap((g) => g.items);
const VALID_TAB_KEYS = new Set<string>(ALL_REFERENCE_TABS.map((t) => t.key));

export function ReferencesPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromUrl = searchParams.get('tab');
  const activeTab: ReferenceTabKey =
    tabFromUrl && VALID_TAB_KEYS.has(tabFromUrl) ? (tabFromUrl as ReferenceTabKey) : 'districts';

  const setActiveTab = (nextTab: ReferenceTabKey) => {
    setSearchParams({ tab: nextTab }, { replace: true });
  };

  const activeTabMeta =
    ALL_REFERENCE_TABS.find((t) => t.key === activeTab) || ALL_REFERENCE_TABS[0];

  // Search and page state for each tab
  const [districtSearch, setDistrictSearch] = useState('');
  const [districtPage, setDistrictPage] = useState(1);

  const [mahallaSearch, setMahallaSearch] = useState('');
  const [mahallaPage, setMahallaPage] = useState(1);

  const [crimeSearch, setCrimeSearch] = useState('');
  const [crimePage, setCrimePage] = useState(1);

  const [crimeMethodSearch, setCrimeMethodSearch] = useState('');
  const [crimeMethodPage, setCrimeMethodPage] = useState(1);

  const [bankSearch, setBankSearch] = useState('');
  const [bankPage, setBankPage] = useState(1);

  const [providerSearch, setProviderSearch] = useState('');
  const [providerPage, setProviderPage] = useState(1);

  const [statusSearch, setStatusSearch] = useState('');
  const [statusPage, setStatusPage] = useState(1);

  const [suspectFieldSearch, setSuspectFieldSearch] = useState('');
  const [suspectFieldPage, setSuspectFieldPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // New References States:
  const [occupationMode, setOccupationMode] = useState<'categories' | 'occupations'>('occupations');
  const [occupationSearch, setOccupationSearch] = useState('');
  const [selectedOccupCatFilter, setSelectedOccupCatFilter] = useState<string>('');

  const [sourceSearch, setSourceSearch] = useState('');
  const [deptServiceSearch, setDeptServiceSearch] = useState('');
  const [rejectionSearch, setRejectionSearch] = useState('');
  const [decisionSearch, setDecisionSearch] = useState('');

  // Modal dialog states
  const [modalType, setModalType] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [targetItem, setTargetItem] = useState<ReferenceItem | null>(null);
  const [formData, setFormData] = useState<ReferenceFormData>({});

  // 1. Districts Query
  const { data: districtsData, isLoading: isDistrictsLoading } = useQuery({
    queryKey: ['districts', { page: districtPage, limit: pageSize, search: districtSearch }],
    queryFn: () =>
      districtsApi.getAll({ page: districtPage, limit: pageSize, search: districtSearch }),
    enabled: activeTab === 'districts',
  });

  // 1.1. Mahallas Query
  const { data: mahallasData, isLoading: isMahallasLoading } = useQuery({
    queryKey: ['mahallas', { page: mahallaPage, limit: pageSize, search: mahallaSearch }],
    queryFn: () =>
      mahallasApi.getAll({ page: mahallaPage, limit: pageSize, search: mahallaSearch }),
    enabled: activeTab === 'mahallas',
  });

  // Tumanlar lug'ati (Mahalla yaratish uchun)
  const { data: allDistrictsForMahalla } = useQuery({
    queryKey: ['all-districts-for-mahalla'],
    queryFn: () => districtsApi.getAll({ limit: 100 }),
    enabled: activeTab === 'mahallas' || modalType === 'create' || modalType === 'edit',
  });
  const allDistrictsList = allDistrictsForMahalla?.items || [];

  // 2. Crimes Query
  const { data: crimesData, isLoading: isCrimesLoading } = useQuery({
    queryKey: ['crimes', { page: crimePage, limit: pageSize, search: crimeSearch }],
    queryFn: () => crimesApi.getAll({ page: crimePage, limit: pageSize, search: crimeSearch }),
    enabled: activeTab === 'crimes',
  });

  // Jinoyat turlari lug'ati (Jinoyat usuliga bog'lash uchun)
  const { data: allCrimesForMethod } = useQuery({
    queryKey: ['all-crimes-for-method'],
    queryFn: () => crimesApi.getAll({ limit: 100 }),
    enabled: activeTab === 'crime_methods',
  });
  const allCrimesList = allCrimesForMethod?.items || [];

  // 2.1. Crime Methods Query
  const { data: crimeMethodsData, isLoading: isCrimeMethodsLoading } = useQuery({
    queryKey: [
      'crime-methods',
      { page: crimeMethodPage, limit: pageSize, search: crimeMethodSearch },
    ],
    queryFn: () =>
      crimeMethodsApi.getAll({ page: crimeMethodPage, limit: pageSize, search: crimeMethodSearch }),
    enabled: activeTab === 'crime_methods',
  });

  // 3. Banks Query
  const { data: banksData, isLoading: isBanksLoading } = useQuery({
    queryKey: ['banks', { page: bankPage, limit: pageSize, search: bankSearch }],
    queryFn: () => banksApi.getAll({ page: bankPage, limit: pageSize, search: bankSearch }),
    enabled: activeTab === 'banks',
  });

  // 4. Payment Providers Query
  const { data: providersData, isLoading: isProvidersLoading } = useQuery({
    queryKey: [
      'payment-providers',
      { page: providerPage, limit: pageSize, search: providerSearch },
    ],
    queryFn: () =>
      paymentProvidersApi.getAll({ page: providerPage, limit: pageSize, search: providerSearch }),
    enabled: activeTab === 'providers',
  });

  // 4.1. Transfer Exit Channels Query
  const { data: transferChannelsData, isLoading: isTransferChannelsLoading } = useQuery({
    queryKey: ['transfer-channels'],
    queryFn: () => transferChannelsApi.getAll({ limit: 100 }),
    enabled: activeTab === 'transfer_channels',
  });

  // 5. Application Statuses Query
  const { data: statusesData, isLoading: isStatusesLoading } = useQuery({
    queryKey: ['application-statuses', { page: statusPage, limit: pageSize, search: statusSearch }],
    queryFn: () =>
      applicationStatusesApi.getAll({ page: statusPage, limit: pageSize, search: statusSearch }),
    enabled: activeTab === 'statuses',
  });

  // 6. Suspect Field Configs Query
  const { data: suspectFieldsData, isLoading: isSuspectFieldsLoading } = useQuery({
    queryKey: [
      'suspect-field-configs',
      { page: suspectFieldPage, limit: pageSize, search: suspectFieldSearch },
    ],
    queryFn: () =>
      suspectFieldConfigsApi.getAll({
        page: suspectFieldPage,
        limit: pageSize,
        search: suspectFieldSearch,
      }),
    enabled: activeTab === 'suspect_fields',
  });

  // 7. Occupation Categories Query
  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['occupation-categories-all'],
    queryFn: () => occupationCategoriesApi.getAll({ includeInactive: true }),
    enabled: activeTab === 'occupations' || modalType === 'create' || modalType === 'edit',
  });
  const allCategoriesList = categoriesData || [];

  // 7.1. Occupations (Kasblar) Query
  const { data: occupationsData, isLoading: isOccupationsLoading } = useQuery({
    queryKey: ['occupations-all', selectedOccupCatFilter],
    queryFn: () =>
      occupationsApi.getAll({
        category_id: selectedOccupCatFilter || undefined,
        includeInactive: true,
      }),
    enabled: activeTab === 'occupations',
  });
  const allOccupationsList = occupationsData || [];

  // 8. Application Sources Query
  const { data: sourcesData, isLoading: isSourcesLoading } = useQuery({
    queryKey: ['application-sources-all'],
    queryFn: () => applicationSourcesApi.getAll({ includeInactive: true }),
    enabled: activeTab === 'sources',
  });
  const allSourcesList = sourcesData || [];

  // 9. Department Services Query
  const { data: deptServicesData, isLoading: isDeptServicesLoading } = useQuery({
    queryKey: ['department-services-all'],
    queryFn: () => departmentServicesApi.getAll({ includeInactive: true }),
    enabled: activeTab === 'department_services',
  });
  const allDeptServicesList = deptServicesData || [];

  // 10. Rejection Reasons Query
  const { data: rejectionReasonsData, isLoading: isRejectionReasonsLoading } = useQuery({
    queryKey: ['rejection-reasons-all'],
    queryFn: () => rejectionReasonsApi.getAll({ includeInactive: true }),
    enabled: activeTab === 'rejection_reasons',
  });
  const allRejectionReasonsList = rejectionReasonsData || [];

  // 11. Decision Types Query
  const { data: decisionTypesData, isLoading: isDecisionTypesLoading } = useQuery({
    queryKey: ['decision-types-all'],
    queryFn: () => decisionTypesApi.getAll({ includeInactive: true }),
    enabled: activeTab === 'decision_types',
  });
  const allDecisionTypesList = decisionTypesData || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      if (activeTab === 'districts') return districtsApi.create(formData);
      if (activeTab === 'mahallas')
        return mahallasApi.create({
          name: formData.name || '',
          district_id: formData.district_id || '',
        });
      if (activeTab === 'crimes')
        return crimesApi.create({
          article: formData.name || formData.title || formData.article || '',
          title: formData.name || formData.title || formData.article || '',
        });
      if (activeTab === 'crime_methods')
        return crimeMethodsApi.create({
          name: formData.name || '',
          group_name: (formData.group_name as string) || 'Бошқа',
          sort_order: formData.sort_order ? Number(formData.sort_order) : 0,
          description: (formData.description as string) || undefined,
          crime_ids: Array.isArray(formData.crime_ids) ? (formData.crime_ids as string[]) : [],
          fields: Array.isArray(formData.fields)
            ? (formData.fields as Array<{
                key?: string;
                label: string;
                field_type?: string;
                options?: string[];
                placeholder?: string;
                is_required?: boolean;
                show_in_excel?: boolean;
                excel_header?: string;
                sort_order?: number;
              }>)
            : [],
        });
      if (activeTab === 'banks') return banksApi.create(formData);
      if (activeTab === 'providers') return paymentProvidersApi.create(formData);
      if (activeTab === 'transfer_channels') {
        const rawPresets =
          typeof formData.presets_text === 'string'
            ? formData.presets_text
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : Array.isArray(formData.presets)
              ? (formData.presets as string[])
              : [];
        return transferChannelsApi.create({
          name: formData.name || '',
          code: formData.code || undefined,
          category: ((formData.category as string) || 'PLATFORM') as TransferDestinationType,
          color: (formData.color as string) || '#0891b2',
          icon: (formData.icon as string) || '🌐',
          presets: rawPresets,
          platform_label: (formData.platform_label as string) || undefined,
          platform_placeholder: (formData.platform_placeholder as string) || undefined,
          value_label: (formData.value_label as string) || undefined,
          value_placeholder: (formData.value_placeholder as string) || undefined,
          sort_order: formData.sort_order ? Number(formData.sort_order) : 10,
          is_active: formData.is_active !== false,
        });
      }
      if (activeTab === 'statuses')
        return applicationStatusesApi.create({
          name: formData.name || '',
          code: formData.code || undefined,
          color: (formData.color as string) || 'blue',
          description: (formData.description as string) || undefined,
          category: ((formData.category as string) || 'OPEN') as ApplicationStatusItem['category'],
          tracks_sla: formData.tracks_sla !== undefined ? Boolean(formData.tracks_sla) : true,
          default_sla_days:
            formData.default_sla_days !== undefined && formData.default_sla_days !== ''
              ? Number(formData.default_sla_days)
              : null,
          legal_article: (formData.legal_article as string) || undefined,
          requires_decision: Boolean(formData.requires_decision),
          requires_rejection_reason: Boolean(formData.requires_rejection_reason),
          is_default: Boolean(formData.is_default),
          sort_order: formData.sort_order ? Number(formData.sort_order) : 0,
        });
      if (activeTab === 'suspect_fields')
        return suspectFieldConfigsApi.create({
          key: (formData.key as string) || (formData.name as string) || '',
          label: (formData.label as string) || (formData.name as string) || '',
          category: (formData.category as string) || 'Umumiy',
          sample_value: (formData.sample_value as string) || undefined,
          description: (formData.description as string) || undefined,
          sort_order: formData.sort_order !== undefined ? Number(formData.sort_order) : 0,
        });
      if (activeTab === 'occupations') {
        if (occupationMode === 'categories') {
          return occupationCategoriesApi.create({
            name: formData.name || '',
            code: formData.code || undefined,
            sort_order: formData.sort_order ? Number(formData.sort_order) : 0,
            is_active: formData.is_active !== undefined ? Boolean(formData.is_active) : true,
          });
        }
        return occupationsApi.create({
          category_id:
            (formData.category_id as string) ||
            selectedOccupCatFilter ||
            allCategoriesList[0]?.id ||
            '',
          name: formData.name || '',
          code: formData.code || undefined,
          sort_order: formData.sort_order ? Number(formData.sort_order) : 0,
          is_active: formData.is_active !== undefined ? Boolean(formData.is_active) : true,
        });
      }
      if (activeTab === 'sources') {
        return applicationSourcesApi.create({
          name: formData.name || '',
          code: formData.code || undefined,
          is_active: formData.is_active !== undefined ? Boolean(formData.is_active) : true,
        });
      }
      if (activeTab === 'department_services') {
        return departmentServicesApi.create({
          name: formData.name || '',
          short_name: (formData.short_name as string) || undefined,
          is_active: formData.is_active !== undefined ? Boolean(formData.is_active) : true,
        });
      }
      if (activeTab === 'rejection_reasons') {
        return rejectionReasonsApi.create({
          name: formData.name || '',
          is_active: formData.is_active !== undefined ? Boolean(formData.is_active) : true,
        });
      }
      if (activeTab === 'decision_types') {
        return decisionTypesApi.create({
          name: formData.name || '',
          is_active: formData.is_active !== undefined ? Boolean(formData.is_active) : true,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          activeTab === 'providers'
            ? 'payment-providers'
            : activeTab === 'transfer_channels'
              ? 'transfer-channels'
              : activeTab === 'statuses'
                ? 'application-statuses'
                : activeTab === 'suspect_fields'
                  ? 'suspect-field-configs'
                  : activeTab === 'crime_methods'
                    ? 'crime-methods'
                    : activeTab === 'occupations'
                      ? 'occupations-all'
                      : activeTab === 'sources'
                        ? 'application-sources-all'
                        : activeTab === 'department_services'
                          ? 'department-services-all'
                          : activeTab === 'rejection_reasons'
                            ? 'rejection-reasons-all'
                            : activeTab === 'decision_types'
                              ? 'decision-types-all'
                              : activeTab,
        ],
      });
      if (activeTab === 'occupations') {
        queryClient.invalidateQueries({ queryKey: ['occupation-categories-all'] });
      }
      if (activeTab === 'crime_methods') {
        queryClient.invalidateQueries({ queryKey: ['crime-methods-active'] });
      }
      if (activeTab === 'statuses') {
        queryClient.invalidateQueries({ queryKey: ['application-statuses-all'] });
        queryClient.invalidateQueries({ queryKey: ['application-statuses-autocomplete'] });
      }
      if (activeTab === 'suspect_fields') {
        queryClient.invalidateQueries({ queryKey: ['suspect-field-configs-active'] });
      }
      closeModal();
      toast.success('Yangi yozuv muvaffaqiyatli qo‘shildi');
    },
    onError: (err: unknown) => {
      toast.error('Saqlashda xatolik', { description: getErrorMessage(err) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!targetItem) return;
      if (activeTab === 'districts') return districtsApi.update(targetItem.id, formData);
      if (activeTab === 'mahallas')
        return mahallasApi.update(targetItem.id, {
          name: formData.name || undefined,
          district_id: formData.district_id || undefined,
        });
      if (activeTab === 'crimes')
        return crimesApi.update(targetItem.id, {
          article: formData.name || formData.title || formData.article || undefined,
          title: formData.name || formData.title || formData.article || undefined,
        });
      if (activeTab === 'crime_methods')
        return crimeMethodsApi.update(targetItem.id, {
          name: formData.name || undefined,
          group_name: (formData.group_name as string) || undefined,
          sort_order: formData.sort_order !== undefined ? Number(formData.sort_order) : undefined,
          description: (formData.description as string) || undefined,
          crime_ids: Array.isArray(formData.crime_ids)
            ? (formData.crime_ids as string[])
            : undefined,
          fields: Array.isArray(formData.fields)
            ? (formData.fields as Array<{
                key?: string;
                label: string;
                field_type?: string;
                options?: string[];
                placeholder?: string;
                is_required?: boolean;
                show_in_excel?: boolean;
                excel_header?: string;
                sort_order?: number;
              }>)
            : undefined,
        });
      if (activeTab === 'banks') return banksApi.update(targetItem.id, formData);
      if (activeTab === 'providers') return paymentProvidersApi.update(targetItem.id, formData);
      if (activeTab === 'transfer_channels') {
        const rawPresets =
          typeof formData.presets_text === 'string'
            ? formData.presets_text
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : Array.isArray(formData.presets)
              ? (formData.presets as string[])
              : undefined;
        return transferChannelsApi.update(targetItem.id, {
          name: formData.name || undefined,
          code: formData.code || undefined,
          category: (formData.category as TransferDestinationType) || undefined,
          color: (formData.color as string) || undefined,
          icon: (formData.icon as string) || undefined,
          presets: rawPresets,
          platform_label: (formData.platform_label as string) || undefined,
          platform_placeholder: (formData.platform_placeholder as string) || undefined,
          value_label: (formData.value_label as string) || undefined,
          value_placeholder: (formData.value_placeholder as string) || undefined,
          sort_order: formData.sort_order !== undefined ? Number(formData.sort_order) : undefined,
          is_active: formData.is_active !== undefined ? Boolean(formData.is_active) : undefined,
        });
      }
      if (activeTab === 'statuses')
        return applicationStatusesApi.update(targetItem.id, {
          name: formData.name || undefined,
          code: formData.code || undefined,
          color: (formData.color as string) || undefined,
          description: (formData.description as string) || undefined,
          category: (formData.category as ApplicationStatusItem['category']) || undefined,
          tracks_sla: formData.tracks_sla !== undefined ? Boolean(formData.tracks_sla) : undefined,
          default_sla_days:
            formData.default_sla_days !== undefined && formData.default_sla_days !== ''
              ? Number(formData.default_sla_days)
              : null,
          legal_article: (formData.legal_article as string) || null,
          requires_decision:
            formData.requires_decision !== undefined
              ? Boolean(formData.requires_decision)
              : undefined,
          requires_rejection_reason:
            formData.requires_rejection_reason !== undefined
              ? Boolean(formData.requires_rejection_reason)
              : undefined,
          is_default: formData.is_default !== undefined ? Boolean(formData.is_default) : undefined,
          sort_order: formData.sort_order !== undefined ? Number(formData.sort_order) : undefined,
        });
      if (activeTab === 'suspect_fields')
        return suspectFieldConfigsApi.update(targetItem.id, {
          key: formData.key !== undefined ? (formData.key as string) : undefined,
          label: formData.label !== undefined ? (formData.label as string) : undefined,
          category: formData.category !== undefined ? (formData.category as string) : undefined,
          sample_value:
            formData.sample_value !== undefined ? (formData.sample_value as string) : undefined,
          description:
            formData.description !== undefined ? (formData.description as string) : undefined,
          sort_order: formData.sort_order !== undefined ? Number(formData.sort_order) : undefined,
        });
      if (activeTab === 'occupations') {
        if (occupationMode === 'categories') {
          return occupationCategoriesApi.update(targetItem.id, {
            name: formData.name || undefined,
            code: formData.code || undefined,
            sort_order: formData.sort_order !== undefined ? Number(formData.sort_order) : undefined,
            is_active: formData.is_active !== undefined ? Boolean(formData.is_active) : undefined,
          });
        }
        return occupationsApi.update(targetItem.id, {
          category_id: (formData.category_id as string) || undefined,
          name: formData.name || undefined,
          code: formData.code || undefined,
          sort_order: formData.sort_order !== undefined ? Number(formData.sort_order) : undefined,
          is_active: formData.is_active !== undefined ? Boolean(formData.is_active) : undefined,
        });
      }
      if (activeTab === 'sources') {
        return applicationSourcesApi.update(targetItem.id, {
          name: formData.name || undefined,
          code: formData.code || undefined,
          is_active: formData.is_active !== undefined ? Boolean(formData.is_active) : undefined,
        });
      }
      if (activeTab === 'department_services') {
        return departmentServicesApi.update(targetItem.id, {
          name: formData.name || undefined,
          short_name: (formData.short_name as string) || undefined,
          is_active: formData.is_active !== undefined ? Boolean(formData.is_active) : undefined,
        });
      }
      if (activeTab === 'rejection_reasons') {
        return rejectionReasonsApi.update(targetItem.id, {
          name: formData.name || undefined,
          is_active: formData.is_active !== undefined ? Boolean(formData.is_active) : undefined,
        });
      }
      if (activeTab === 'decision_types') {
        return decisionTypesApi.update(targetItem.id, {
          name: formData.name || undefined,
          is_active: formData.is_active !== undefined ? Boolean(formData.is_active) : undefined,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          activeTab === 'providers'
            ? 'payment-providers'
            : activeTab === 'transfer_channels'
              ? 'transfer-channels'
              : activeTab === 'statuses'
                ? 'application-statuses'
                : activeTab === 'suspect_fields'
                  ? 'suspect-field-configs'
                  : activeTab === 'crime_methods'
                    ? 'crime-methods'
                    : activeTab === 'occupations'
                      ? 'occupations-all'
                      : activeTab === 'sources'
                        ? 'application-sources-all'
                        : activeTab === 'department_services'
                          ? 'department-services-all'
                          : activeTab === 'rejection_reasons'
                            ? 'rejection-reasons-all'
                            : activeTab === 'decision_types'
                              ? 'decision-types-all'
                              : activeTab,
        ],
      });
      if (activeTab === 'occupations') {
        queryClient.invalidateQueries({ queryKey: ['occupation-categories-all'] });
      }
      if (activeTab === 'crime_methods') {
        queryClient.invalidateQueries({ queryKey: ['crime-methods-active'] });
      }
      if (activeTab === 'statuses') {
        queryClient.invalidateQueries({ queryKey: ['application-statuses-all'] });
        queryClient.invalidateQueries({ queryKey: ['application-statuses-autocomplete'] });
      }
      if (activeTab === 'suspect_fields') {
        queryClient.invalidateQueries({ queryKey: ['suspect-field-configs-active'] });
      }
      closeModal();
      toast.success('Yozuv muvaffaqiyatli yangilandi');
    },
    onError: (err: unknown) => {
      toast.error('Yangilashda xatolik', { description: getErrorMessage(err) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!targetItem) return;
      if (activeTab === 'districts') return districtsApi.delete(targetItem.id);
      if (activeTab === 'mahallas') return mahallasApi.delete(targetItem.id);
      if (activeTab === 'crimes') return crimesApi.delete(targetItem.id);
      if (activeTab === 'crime_methods') return crimeMethodsApi.delete(targetItem.id);
      if (activeTab === 'banks') return banksApi.delete(targetItem.id);
      if (activeTab === 'providers') return paymentProvidersApi.delete(targetItem.id);
      if (activeTab === 'transfer_channels') return transferChannelsApi.delete(targetItem.id);
      if (activeTab === 'statuses') return applicationStatusesApi.delete(targetItem.id);
      if (activeTab === 'suspect_fields') return suspectFieldConfigsApi.delete(targetItem.id);
      if (activeTab === 'occupations') {
        if (occupationMode === 'categories') {
          return occupationCategoriesApi.delete(targetItem.id);
        }
        return occupationsApi.delete(targetItem.id);
      }
      if (activeTab === 'sources') return applicationSourcesApi.delete(targetItem.id);
      if (activeTab === 'department_services') return departmentServicesApi.delete(targetItem.id);
      if (activeTab === 'rejection_reasons') return rejectionReasonsApi.delete(targetItem.id);
      if (activeTab === 'decision_types') return decisionTypesApi.delete(targetItem.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          activeTab === 'providers'
            ? 'payment-providers'
            : activeTab === 'transfer_channels'
              ? 'transfer-channels'
              : activeTab === 'statuses'
                ? 'application-statuses'
                : activeTab === 'suspect_fields'
                  ? 'suspect-field-configs'
                  : activeTab === 'crime_methods'
                    ? 'crime-methods'
                    : activeTab === 'occupations'
                      ? 'occupations-all'
                      : activeTab === 'sources'
                        ? 'application-sources-all'
                        : activeTab === 'department_services'
                          ? 'department-services-all'
                          : activeTab === 'rejection_reasons'
                            ? 'rejection-reasons-all'
                            : activeTab === 'decision_types'
                              ? 'decision-types-all'
                              : activeTab,
        ],
      });
      if (activeTab === 'occupations') {
        queryClient.invalidateQueries({ queryKey: ['occupation-categories-all'] });
      }
      if (activeTab === 'crime_methods') {
        queryClient.invalidateQueries({ queryKey: ['crime-methods-active'] });
      }
      if (activeTab === 'statuses') {
        queryClient.invalidateQueries({ queryKey: ['application-statuses-all'] });
        queryClient.invalidateQueries({ queryKey: ['application-statuses-autocomplete'] });
      }
      if (activeTab === 'suspect_fields') {
        queryClient.invalidateQueries({ queryKey: ['suspect-field-configs-active'] });
      }
      closeModal();
      toast.success('Yozuv o‘chirildi');
    },
    onError: (err: unknown) => {
      toast.error('O‘chirishda xatolik', { description: getErrorMessage(err) });
    },
  });

  const openCreateModal = () => {
    setFormData({});
    setTargetItem(null);
    setModalType('create');
  };

  const openEditModal = (item: ReferenceItem) => {
    setTargetItem(item);
    const extra: Record<string, unknown> = {};
    if ('presets' in item && Array.isArray(item.presets)) {
      extra.presets_text = item.presets.join(', ');
    }
    setFormData({ ...item, ...extra });
    setModalType('edit');
  };

  const openDeleteModal = (item: ReferenceItem) => {
    setTargetItem(item);
    setModalType('delete');
  };

  const closeModal = () => {
    setModalType(null);
    setTargetItem(null);
    setFormData({});
  };

  const ActiveTabIcon = activeTabMeta.icon;

  return (
    <div className="w-full space-y-5">
      {/* Mobil ekranlar uchun qulay bo'lim tanlash */}
      <div className="lg:hidden space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-extrabold tracking-tight">Ma&apos;lumotnomalar</h1>
          <Button size="sm" onClick={openCreateModal} className="gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            Qo&apos;shish
          </Button>
        </div>
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as ReferenceTabKey)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium"
        >
          {REFERENCE_NAV_GROUPS.map((group) => (
            <optgroup key={group.title} label={group.title}>
              {group.items.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as ReferenceTabKey)}
        className="w-full"
      >
        <div className="flex flex-col lg:flex-row-reverse gap-5 items-start">
          {/* O'ng tomondagi vertikal guruhlangan navigatsiya (Desktop) */}
          <aside className="hidden lg:block w-64 shrink-0 sticky top-4">
            <Card className="py-2 gap-0 border-border/80 bg-card/70 backdrop-blur-sm">
              <CardContent className="p-2 space-y-4">
                {REFERENCE_NAV_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                      {group.title}
                    </p>
                    <nav className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.key;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setActiveTab(item.key)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                              isActive
                                ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                            }`}
                          >
                            <Icon
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isActive ? 'text-primary-foreground' : 'text-primary/80'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>

          {/* Chap tomondagi asosiy tarkib */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            <div className="hidden lg:flex items-center justify-between gap-4 pb-1 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ActiveTabIcon className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight leading-tight">
                    {activeTabMeta.label}
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activeTabMeta.description}
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                onClick={openCreateModal}
                className="gap-2 shadow-md shadow-primary/25 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Yangi Qo&apos;shish
              </Button>
            </div>

            {/* 1. DISTRICTS TAB */}
            <TabsContent value="districts" className="space-y-4 mt-0">
              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="relative max-w-md lg:max-w-lg">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tuman nomi yoki kodi bo'yicha qidiruv..."
                      value={districtSearch}
                      onChange={(e) => {
                        setDistrictSearch(e.target.value);
                        setDistrictPage(1);
                      }}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tuman / Bo&apos;lim Nomi</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isDistrictsLoading ? (
                      <TableRowsSkeleton rows={6} columns={2} />
                    ) : districtsData?.items?.length ? (
                      districtsData.items.map((district: District) => (
                        <TableRow key={district.id}>
                          <TableCell className="font-medium text-foreground">
                            {district.name || '—'}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(district)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(district)}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          Hech qanday tuman topilmadi
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {districtsData?.meta && (
                  <PaginationBar
                    page={districtsData.meta.page}
                    totalPages={districtsData.meta.totalPages}
                    total={districtsData.meta.total}
                    limit={pageSize}
                    hasNextPage={districtsData.meta.hasNextPage}
                    hasPreviousPage={districtsData.meta.hasPreviousPage}
                    onPageChange={(p) => setDistrictPage(p)}
                    onLimitChange={(newLimit) => {
                      setPageSize(newLimit);
                      setDistrictPage(1);
                    }}
                    isLoading={isDistrictsLoading}
                  />
                )}
              </Card>
            </TabsContent>

            {/* 1.1. MAHALLAS TAB */}
            <TabsContent value="mahallas" className="space-y-4 mt-0">
              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="relative max-w-md lg:max-w-lg">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Mahalla nomi bo'yicha qidiruv..."
                      value={mahallaSearch}
                      onChange={(e) => {
                        setMahallaSearch(e.target.value);
                        setMahallaPage(1);
                      }}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mahalla Nomi</TableHead>
                      <TableHead>Tegishli Tuman</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isMahallasLoading ? (
                      <TableRowsSkeleton rows={6} columns={3} />
                    ) : mahallasData?.items?.length ? (
                      mahallasData.items.map((mahalla: Mahalla) => (
                        <TableRow key={mahalla.id}>
                          <TableCell className="font-medium text-foreground">
                            {mahalla.name || '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {mahalla.district?.name || '—'}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(mahalla)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(mahalla)}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          Hech qanday mahalla topilmadi
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {mahallasData?.meta && (
                  <PaginationBar
                    page={mahallasData.meta.page}
                    totalPages={mahallasData.meta.totalPages}
                    total={mahallasData.meta.total}
                    limit={pageSize}
                    hasNextPage={mahallasData.meta.hasNextPage}
                    hasPreviousPage={mahallasData.meta.hasPreviousPage}
                    onPageChange={(p) => setMahallaPage(p)}
                    onLimitChange={(newLimit) => {
                      setPageSize(newLimit);
                      setMahallaPage(1);
                    }}
                    isLoading={isMahallasLoading}
                  />
                )}
              </Card>
            </TabsContent>

            {/* 2. CRIMES TAB */}
            <TabsContent value="crimes" className="space-y-4 mt-0">
              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="relative max-w-md lg:max-w-lg">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Jinoyat turi bo'yicha qidiruv..."
                      value={crimeSearch}
                      onChange={(e) => {
                        setCrimeSearch(e.target.value);
                        setCrimePage(1);
                      }}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jinoyat Turi</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isCrimesLoading ? (
                      <TableRowsSkeleton rows={6} columns={2} />
                    ) : crimesData?.items?.length ? (
                      crimesData.items.map((crime: Crime) => (
                        <TableRow key={crime.id}>
                          <TableCell className="font-semibold text-foreground">
                            {crime.article || crime.title || '—'}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openEditModal({
                                  ...crime,
                                  name: crime.article || crime.title || '',
                                })
                              }
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(crime)}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                          Hech qanday jinoyat turi topilmadi
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {crimesData?.meta && (
                  <PaginationBar
                    page={crimesData.meta.page}
                    totalPages={crimesData.meta.totalPages}
                    total={crimesData.meta.total}
                    limit={pageSize}
                    hasNextPage={crimesData.meta.hasNextPage}
                    hasPreviousPage={crimesData.meta.hasPreviousPage}
                    onPageChange={(p) => setCrimePage(p)}
                    onLimitChange={(newLimit) => {
                      setPageSize(newLimit);
                      setCrimePage(1);
                    }}
                    isLoading={isCrimesLoading}
                  />
                )}
              </Card>
            </TabsContent>

            {/* 2.1. CRIME METHODS TAB */}
            <TabsContent value="crime_methods" className="space-y-4 mt-0">
              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="relative max-w-md lg:max-w-lg">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Jinoyat usuli yoki guruhi bo'yicha qidiruv..."
                      value={crimeMethodSearch}
                      onChange={(e) => {
                        setCrimeMethodSearch(e.target.value);
                        setCrimeMethodPage(1);
                      }}
                      className="pl-9 bg-background/50"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border">
                      <TableHead className="whitespace-nowrap">Usul nomi</TableHead>
                      <TableHead className="whitespace-nowrap">Guruhi</TableHead>
                      <TableHead className="whitespace-nowrap">Jinoyat turlari</TableHead>
                      <TableHead className="whitespace-nowrap text-center">Maydonlar</TableHead>
                      <TableHead className="whitespace-nowrap text-center">Tartib</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border">
                    {isCrimeMethodsLoading ? (
                      <TableRowsSkeleton rows={6} columns={6} />
                    ) : crimeMethodsData?.items?.length ? (
                      crimeMethodsData.items.map((method: CrimeMethod) => (
                        <TableRow key={method.id} className="border-b border-border">
                          <TableCell className="font-semibold text-foreground max-w-md">
                            {method.name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-xs bg-primary/5 text-primary border-primary/20"
                            >
                              {method.group_name || 'Бошқа'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {method.crimes && method.crimes.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {method.crimes.map((c) => (
                                  <Badge key={c.id} variant="secondary" className="text-[10px]">
                                    {c.article || c.title}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              >
                                Umumiy (barchasi)
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {method.fields && method.fields.length > 0 ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20"
                              >
                                {method.fields.length} ta maydon
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs text-muted-foreground">
                            {method.sort_order ?? 0}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openEditModal({
                                  ...method,
                                  name: method.name,
                                  group_name: method.group_name,
                                  sort_order: method.sort_order,
                                  description: method.description,
                                  crime_ids: method.crimes?.map((c) => c.id) || [],
                                  fields: method.fields || [],
                                } as ReferenceItem)
                              }
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(method)}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Hech qanday jinoyat usuli topilmadi
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {crimeMethodsData?.meta && (
                  <PaginationBar
                    page={crimeMethodsData.meta.page}
                    totalPages={crimeMethodsData.meta.totalPages}
                    total={crimeMethodsData.meta.total}
                    limit={pageSize}
                    hasNextPage={crimeMethodsData.meta.hasNextPage}
                    hasPreviousPage={crimeMethodsData.meta.hasPreviousPage}
                    onPageChange={(p) => setCrimeMethodPage(p)}
                    onLimitChange={(newLimit) => {
                      setPageSize(newLimit);
                      setCrimeMethodPage(1);
                    }}
                    isLoading={isCrimeMethodsLoading}
                  />
                )}
              </Card>
            </TabsContent>

            {/* 3. BANKS TAB */}
            <TabsContent value="banks" className="space-y-4 mt-0">
              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="relative max-w-md lg:max-w-lg">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Bank nomi, kodi yoki MFO bo'yicha qidiruv..."
                      value={bankSearch}
                      onChange={(e) => {
                        setBankSearch(e.target.value);
                        setBankPage(1);
                      }}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bank Nomi</TableHead>
                      <TableHead>Kodi</TableHead>
                      <TableHead>MFO</TableHead>
                      <TableHead>Holati</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isBanksLoading ? (
                      <TableRowsSkeleton rows={6} columns={5} />
                    ) : banksData?.items?.length ? (
                      banksData.items.map((bank: Bank) => (
                        <TableRow key={bank.id}>
                          <TableCell className="font-semibold text-foreground">
                            {bank.name || '—'}
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">
                            {bank.code || '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{bank.mfo || '—'}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                bank.is_active
                                  ? 'border-emerald-500/40 text-emerald-400'
                                  : 'text-muted-foreground'
                              }
                            >
                              {bank.is_active ? 'Faol' : 'Nofaol'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(bank)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(bank)}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Hech qanday bank topilmadi
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {banksData?.meta && (
                  <PaginationBar
                    page={banksData.meta.page}
                    totalPages={banksData.meta.totalPages}
                    total={banksData.meta.total}
                    limit={pageSize}
                    hasNextPage={banksData.meta.hasNextPage}
                    hasPreviousPage={banksData.meta.hasPreviousPage}
                    onPageChange={(p) => setBankPage(p)}
                    onLimitChange={(newLimit) => {
                      setPageSize(newLimit);
                      setBankPage(1);
                    }}
                    isLoading={isBanksLoading}
                  />
                )}
              </Card>
            </TabsContent>

            {/* 4. PAYMENT PROVIDERS TAB */}
            <TabsContent value="providers" className="space-y-4 mt-0">
              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="relative max-w-md lg:max-w-lg">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Provayder nomi yoki kodi bo'yicha qidiruv..."
                      value={providerSearch}
                      onChange={(e) => {
                        setProviderSearch(e.target.value);
                        setProviderPage(1);
                      }}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provayder Nomi</TableHead>
                      <TableHead>Tizim Kodi</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isProvidersLoading ? (
                      <TableRowsSkeleton rows={6} columns={3} />
                    ) : providersData?.items?.length ? (
                      providersData.items.map((prov: PaymentProvider) => (
                        <TableRow key={prov.id}>
                          <TableCell className="font-semibold text-foreground">
                            {prov.name || '—'}
                          </TableCell>
                          <TableCell className="font-mono text-primary font-bold">
                            {prov.code || '—'}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(prov)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(prov)}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          Hech qanday provayder topilmadi
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {providersData?.meta && (
                  <PaginationBar
                    page={providersData.meta.page}
                    totalPages={providersData.meta.totalPages}
                    total={providersData.meta.total}
                    limit={pageSize}
                    hasNextPage={providersData.meta.hasNextPage}
                    hasPreviousPage={providersData.meta.hasPreviousPage}
                    onPageChange={(p) => setProviderPage(p)}
                    onLimitChange={(newLimit) => {
                      setPageSize(newLimit);
                      setProviderPage(1);
                    }}
                    isLoading={isProvidersLoading}
                  />
                )}
              </Card>
            </TabsContent>

            {/* 4.1. TRANSFER EXIT CHANNELS TAB (Dinamik chiqish kanallari) */}
            <TabsContent value="transfer_channels" className="space-y-4 mt-0">
              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Kanal Nomi</TableHead>
                      <TableHead>Kategoriya (Graf turi)</TableHead>
                      <TableHead>Tezkor Variantlar (Presets)</TableHead>
                      <TableHead className="w-[80px] text-center">Tartib</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isTransferChannelsLoading ? (
                      <TableRowsSkeleton rows={5} columns={5} />
                    ) : transferChannelsData?.items?.length ? (
                      transferChannelsData.items.map((ch: TransferChannel) => (
                        <TableRow key={ch.id} className="hover:bg-primary/[0.04]">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
                                style={{ backgroundColor: `${ch.color || '#0891b2'}20` }}
                              >
                                {ch.icon || '🌐'}
                              </span>
                              <div>
                                <div className="font-semibold text-foreground">{ch.name}</div>
                                <div className="font-mono text-[10px] text-muted-foreground">
                                  {ch.code}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[11px] font-mono">
                              {ch.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {ch.presets && ch.presets.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {ch.presets.map((p) => (
                                  <Badge
                                    key={p}
                                    variant="secondary"
                                    className="text-[10px] font-normal"
                                  >
                                    {p}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {ch.sort_order}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 cursor-pointer"
                                onClick={() => openEditModal(ch)}
                              >
                                <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                              {ch.code !== 'CARD' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:text-destructive cursor-pointer"
                                  onClick={() => openDeleteModal(ch)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Chiqish kanallari topilmadi
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* 5. APPLICATION STATUSES TAB */}
            <TabsContent value="statuses" className="space-y-4 mt-0">
              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="relative max-w-md lg:max-w-lg">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Status nomi yoki kodi bo'yicha qidiruv..."
                      value={statusSearch}
                      onChange={(e) => {
                        setStatusSearch(e.target.value);
                        setStatusPage(1);
                      }}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status Nomi</TableHead>
                      <TableHead>Tizim Kodi</TableHead>
                      <TableHead>Rangi</TableHead>
                      <TableHead>Standart Holat</TableHead>
                      <TableHead>Tartib</TableHead>
                      <TableHead>Izoh</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isStatusesLoading ? (
                      <TableRowsSkeleton rows={6} columns={7} />
                    ) : statusesData?.items?.length ? (
                      statusesData.items.map((st: ApplicationStatusItem) => (
                        <TableRow key={st.id}>
                          <TableCell className="font-semibold text-foreground">
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  st.color === 'emerald'
                                    ? 'bg-emerald-500'
                                    : st.color === 'amber'
                                      ? 'bg-amber-500'
                                      : st.color === 'rose' || st.color === 'red'
                                        ? 'bg-rose-500'
                                        : st.color === 'purple'
                                          ? 'bg-purple-500'
                                          : 'bg-blue-500'
                                }`}
                              />
                              <span>{st.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-primary">
                            {st.code || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[11px] capitalize">
                              {st.color || 'blue'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {st.is_default ? (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[11px]">
                                <CheckCircle2 className="h-3 w-3" />
                                Birlamchi
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {st.sort_order ?? 0}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                            {st.description || '—'}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(st)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="Tahrirlash"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(st)}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              title="O‘chirish"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Hech qanday ariza statusi topilmadi
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {statusesData?.meta && (
                  <PaginationBar
                    page={statusesData.meta.page}
                    totalPages={statusesData.meta.totalPages}
                    total={statusesData.meta.total}
                    limit={pageSize}
                    hasNextPage={statusesData.meta.hasNextPage}
                    hasPreviousPage={statusesData.meta.hasPreviousPage}
                    onPageChange={(p) => setStatusPage(p)}
                    onLimitChange={(newLimit) => {
                      setPageSize(newLimit);
                      setStatusPage(1);
                    }}
                    isLoading={isStatusesLoading}
                  />
                )}
              </Card>
            </TabsContent>

            {/* 6. SUSPECT FIELD CONFIGS TAB */}
            <TabsContent value="suspect_fields" className="space-y-4 mt-0">
              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="relative max-w-md lg:max-w-lg">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Parametr nomi yoki kaliti bo'yicha qidiruv..."
                      value={suspectFieldSearch}
                      onChange={(e) => {
                        setSuspectFieldSearch(e.target.value);
                        setSuspectFieldPage(1);
                      }}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parametr Nomi</TableHead>
                      <TableHead>Tizim Kaliti (Tag / Variable)</TableHead>
                      <TableHead>Toifasi</TableHead>
                      <TableHead>Namuna Qiymat</TableHead>
                      <TableHead>Tartib</TableHead>
                      <TableHead>Tavsif</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isSuspectFieldsLoading ? (
                      <TableRowsSkeleton rows={6} columns={7} />
                    ) : suspectFieldsData?.items?.length ? (
                      suspectFieldsData.items.map((field: SuspectFieldConfig) => (
                        <TableRow key={field.id}>
                          <TableCell className="font-semibold text-foreground">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-primary" />
                              <span>{field.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="font-mono text-xs text-primary font-bold"
                            >
                              {`{{suspect.${field.key}}}`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[11px]">
                              {field.category || 'Umumiy'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {field.sample_value || '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {field.sort_order ?? 0}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                            {field.description || '—'}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(field)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="Tahrirlash"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(field)}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              title="O‘chirish"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Hech qanday parametr topilmadi
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {suspectFieldsData?.meta && (
                  <PaginationBar
                    page={suspectFieldsData.meta.page}
                    totalPages={suspectFieldsData.meta.totalPages}
                    total={suspectFieldsData.meta.total}
                    limit={pageSize}
                    hasNextPage={suspectFieldsData.meta.hasNextPage}
                    hasPreviousPage={suspectFieldsData.meta.hasPreviousPage}
                    onPageChange={(p) => setSuspectFieldPage(p)}
                    onLimitChange={(newLimit) => {
                      setPageSize(newLimit);
                      setSuspectFieldPage(1);
                    }}
                    isLoading={isSuspectFieldsLoading}
                  />
                )}
              </Card>
            </TabsContent>

            {/* 7. OCCUPATIONS & CATEGORIES TAB */}
            <TabsContent value="occupations" className="space-y-4 mt-0">
              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border border-border p-1 bg-muted/40">
                      <button
                        type="button"
                        onClick={() => setOccupationMode('occupations')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                          occupationMode === 'occupations'
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Kasblar / Mutaxassisliklar
                      </button>
                      <button
                        type="button"
                        onClick={() => setOccupationMode('categories')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                          occupationMode === 'categories'
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Kasb Toifalari (Guruhlar)
                      </button>
                    </div>

                    {occupationMode === 'occupations' && (
                      <select
                        value={selectedOccupCatFilter}
                        onChange={(e) => setSelectedOccupCatFilter(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Barcha Toifalar bo‘yicha</option>
                        {allCategoriesList.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="relative max-w-xs sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Qidirish..."
                      value={occupationSearch}
                      onChange={(e) => setOccupationSearch(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
                {occupationMode === 'categories' ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Toifa Nomi</TableHead>
                        <TableHead>Kodi</TableHead>
                        <TableHead>Tartib Raqami</TableHead>
                        <TableHead>Holati</TableHead>
                        <TableHead className="text-right">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isCategoriesLoading ? (
                        <TableRowsSkeleton rows={6} columns={5} />
                      ) : allCategoriesList.filter((c) =>
                          occupationSearch
                            ? c.name.toLowerCase().includes(occupationSearch.toLowerCase())
                            : true,
                        ).length ? (
                        allCategoriesList
                          .filter((c) =>
                            occupationSearch
                              ? c.name.toLowerCase().includes(occupationSearch.toLowerCase())
                              : true,
                          )
                          .map((cat) => (
                            <TableRow key={cat.id}>
                              <TableCell className="font-semibold text-foreground">
                                {cat.name}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {cat.code || '—'}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {cat.sort_order ?? 0}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    cat.is_active !== false
                                      ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10 text-[10px]'
                                      : 'border-slate-500/30 text-slate-500 bg-slate-500/10 text-[10px]'
                                  }
                                >
                                  {cat.is_active !== false ? 'Faol' : 'Nofaol'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(cat)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDeleteModal(cat)}
                                  className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Toifalar topilmadi
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kasb / Mutaxassislik</TableHead>
                        <TableHead>Biriktirilgan Toifa</TableHead>
                        <TableHead>Kodi</TableHead>
                        <TableHead>Tartib</TableHead>
                        <TableHead>Holati</TableHead>
                        <TableHead className="text-right">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isOccupationsLoading ? (
                        <TableRowsSkeleton rows={6} columns={6} />
                      ) : allOccupationsList.filter((o) =>
                          occupationSearch
                            ? o.name.toLowerCase().includes(occupationSearch.toLowerCase())
                            : true,
                        ).length ? (
                        allOccupationsList
                          .filter((o) =>
                            occupationSearch
                              ? o.name.toLowerCase().includes(occupationSearch.toLowerCase())
                              : true,
                          )
                          .map((occup) => (
                            <TableRow key={occup.id}>
                              <TableCell className="font-semibold text-foreground">
                                {occup.name}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {occup.category?.name ||
                                  allCategoriesList.find((c) => c.id === occup.category_id)?.name ||
                                  '—'}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {occup.code || '—'}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {occup.sort_order ?? 0}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    occup.is_active !== false
                                      ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10 text-[10px]'
                                      : 'border-slate-500/30 text-slate-500 bg-slate-500/10 text-[10px]'
                                  }
                                >
                                  {occup.is_active !== false ? 'Faol' : 'Nofaol'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(occup)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDeleteModal(occup)}
                                  className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Kasblar ro‘yxati topilmadi
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </TabsContent>

            {/* 8. APPLICATION SOURCES TAB */}
            <TabsContent value="sources" className="space-y-4 mt-0">
              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="relative max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Murojaat manbasi bo‘yicha qidiruv (102, 112, Ishonch telefoni)..."
                      value={sourceSearch}
                      onChange={(e) => setSourceSearch(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Murojaat Manbasi Nomi</TableHead>
                      <TableHead>Kodi / Raqami</TableHead>
                      <TableHead>Holati</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isSourcesLoading ? (
                      <TableRowsSkeleton rows={6} columns={4} />
                    ) : allSourcesList.filter((s) =>
                        sourceSearch
                          ? s.name.toLowerCase().includes(sourceSearch.toLowerCase())
                          : true,
                      ).length ? (
                      allSourcesList
                        .filter((s) =>
                          sourceSearch
                            ? s.name.toLowerCase().includes(sourceSearch.toLowerCase())
                            : true,
                        )
                        .map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-semibold text-foreground">
                              {item.name}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {item.code || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  item.is_active !== false
                                    ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10 text-[10px]'
                                    : 'border-slate-500/30 text-slate-500 bg-slate-500/10 text-[10px]'
                                }
                              >
                                {item.is_active !== false ? 'Faol' : 'Nofaol'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(item)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteModal(item)}
                                className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Murojaat manbalari topilmadi
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* 9. DEPARTMENT SERVICES TAB */}
            <TabsContent value="department_services" className="space-y-4 mt-0">
              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="relative max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Sohaviy xizmat nomi yoki qisqartmasi (UYOKK, JQK, TQK)..."
                      value={deptServiceSearch}
                      onChange={(e) => setDeptServiceSearch(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sohaviy Xizmat To‘liq Nomi</TableHead>
                      <TableHead>Qisqartmasi (Abbreviatura)</TableHead>
                      <TableHead>Holati</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isDeptServicesLoading ? (
                      <TableRowsSkeleton rows={6} columns={4} />
                    ) : allDeptServicesList.filter((d) =>
                        deptServiceSearch
                          ? d.name.toLowerCase().includes(deptServiceSearch.toLowerCase()) ||
                            (d.short_name &&
                              d.short_name.toLowerCase().includes(deptServiceSearch.toLowerCase()))
                          : true,
                      ).length ? (
                      allDeptServicesList
                        .filter((d) =>
                          deptServiceSearch
                            ? d.name.toLowerCase().includes(deptServiceSearch.toLowerCase()) ||
                              (d.short_name &&
                                d.short_name
                                  .toLowerCase()
                                  .includes(deptServiceSearch.toLowerCase()))
                            : true,
                        )
                        .map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-semibold text-foreground">
                              {item.name}
                            </TableCell>
                            <TableCell>
                              <Badge className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
                                {item.short_name || '—'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  item.is_active !== false
                                    ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10 text-[10px]'
                                    : 'border-slate-500/30 text-slate-500 bg-slate-500/10 text-[10px]'
                                }
                              >
                                {item.is_active !== false ? 'Faol' : 'Nofaol'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(item)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteModal(item)}
                                className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Sohaviy xizmatlar topilmadi
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* 10. DECISION TYPES TAB */}
            <TabsContent value="decision_types" className="space-y-4 mt-0">
              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="relative max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Qaror turi bo‘yicha qidiruv..."
                      value={decisionSearch}
                      onChange={(e) => setDecisionSearch(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Qaror Turi</TableHead>
                      <TableHead>Holati</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isDecisionTypesLoading ? (
                      <TableRowsSkeleton rows={6} columns={3} />
                    ) : allDecisionTypesList.filter((d) =>
                        decisionSearch
                          ? d.name.toLowerCase().includes(decisionSearch.toLowerCase())
                          : true,
                      ).length ? (
                      allDecisionTypesList
                        .filter((d) =>
                          decisionSearch
                            ? d.name.toLowerCase().includes(decisionSearch.toLowerCase())
                            : true,
                        )
                        .map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-semibold text-foreground">
                              {item.name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  item.is_active !== false
                                    ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10 text-[10px]'
                                    : 'border-slate-500/30 text-slate-500 bg-slate-500/10 text-[10px]'
                                }
                              >
                                {item.is_active !== false ? 'Faol' : 'Nofaol'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(item)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteModal(item)}
                                className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          Qaror turlari topilmadi
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* 11. REJECTION REASONS TAB */}
            <TabsContent value="rejection_reasons" className="space-y-4 mt-0">
              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="relative max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rad etish sababi bo‘yicha qidiruv..."
                      value={rejectionSearch}
                      onChange={(e) => setRejectionSearch(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rad Etish Sababi Nomi</TableHead>
                      <TableHead>Holati</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isRejectionReasonsLoading ? (
                      <TableRowsSkeleton rows={6} columns={3} />
                    ) : allRejectionReasonsList.filter((r) =>
                        rejectionSearch
                          ? r.name.toLowerCase().includes(rejectionSearch.toLowerCase())
                          : true,
                      ).length ? (
                      allRejectionReasonsList
                        .filter((r) =>
                          rejectionSearch
                            ? r.name.toLowerCase().includes(rejectionSearch.toLowerCase())
                            : true,
                        )
                        .map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-semibold text-foreground">
                              {item.name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  item.is_active !== false
                                    ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10 text-[10px]'
                                    : 'border-slate-500/30 text-slate-500 bg-slate-500/10 text-[10px]'
                                }
                              >
                                {item.is_active !== false ? 'Faol' : 'Nofaol'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(item)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteModal(item)}
                                className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          Rad etish sabablari topilmadi
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={modalType === 'create' || modalType === 'edit'} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {modalType === 'create' ? 'Yangi Yozuv Qo‘shish' : 'Tahrirlash'}
            </DialogTitle>
            <DialogDescription>
              {activeTab === 'districts' && 'Tuman yoki hududiy bo‘lim ma‘lumotlarini kiriting'}
              {activeTab === 'mahallas' && 'Mahalla nomi va tegishli tumanni tanlang'}
              {activeTab === 'crimes' && 'Jinoyat turini kiriting'}
              {activeTab === 'banks' && 'Tijorat banki nomi va MFO kodini kiriting'}
              {activeTab === 'providers' && 'To‘lov xizmati provayderi ma‘lumotlarini kiriting'}
              {activeTab === 'statuses' &&
                'Ariza holati/statusi nomi, kodi, rangi va parametrlarini kiriting'}
              {activeTab === 'suspect_fields' &&
                'Gumonlanuvchi parametri (Telegram, Instagram, telefon, karta va h.k.) va tizim kalitini kiriting'}
              {activeTab === 'occupations' &&
                (occupationMode === 'categories'
                  ? 'Yangi kasb toifasi (guruhi) ma’lumotlarini kiriting'
                  : 'Yangi kasb yoki mutaxassislik ma’lumotlarini kiriting')}
              {activeTab === 'sources' &&
                'Murojaat manbasi (102, 112, Ishonch telefoni va h.k.) ma’lumotlarini kiriting'}
              {activeTab === 'department_services' &&
                'Sohaviy xizmat nomi va qisqartmasini kiriting'}
              {activeTab === 'decision_types' &&
                'Ariza yuzasidan qabul qilinadigan qaror turini kiriting'}
              {activeTab === 'rejection_reasons' && 'Arizani rad etish sababini kiriting'}
            </DialogDescription>
          </DialogHeader>

          <fieldset
            disabled={createMutation.isPending || updateMutation.isPending}
            className="space-y-4 py-2 border-0 p-0 m-0"
          >
            {/* Common Name field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {activeTab === 'crimes'
                  ? 'Jinoyat Turi Nomi *'
                  : activeTab === 'suspect_fields'
                    ? 'Parametr Nomi (Label) *'
                    : 'Nomi / Sarlavha *'}
              </label>
              <Input
                placeholder={
                  activeTab === 'crimes'
                    ? 'Masalan: Firibgarlik...'
                    : activeTab === 'suspect_fields'
                      ? 'Masalan: Telegram Username...'
                      : 'Nomi...'
                }
                value={
                  (formData.label as string) ||
                  formData.name ||
                  formData.title ||
                  formData.article ||
                  ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  const updates: Record<string, unknown> = {
                    name: val,
                    title: val,
                    article: val,
                    label: val,
                  };
                  if (activeTab === 'suspect_fields' && !targetItem && !formData.key) {
                    updates.key = val
                      .toLowerCase()
                      .replace(/[\s-]+/g, '_')
                      .replace(/[^a-z0-9_]/g, '');
                  }
                  setFormData({
                    ...formData,
                    ...updates,
                  });
                }}
                className="h-10 text-xs sm:text-sm font-medium"
              />
            </div>

            {/* Mahalla uchun tegishli Tuman tanlash */}
            {activeTab === 'mahallas' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Tegishli Tuman *</label>
                <select
                  value={formData.district_id || ''}
                  onChange={(e) => setFormData({ ...formData, district_id: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs sm:text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">Tumanni tanlang...</option>
                  {allDistrictsList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Jinoyat usuli qo'shimcha maydonlari */}
            {activeTab === 'crime_methods' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Guruhi / Kategoriyasi *
                  </label>
                  <Input
                    placeholder="Masalan: Фишинг ва қурилма/карта бошқаруви"
                    value={(formData.group_name as string) || ''}
                    onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                    className="h-10 text-xs sm:text-sm font-medium"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Tartib raqami (Sort order)
                    </label>
                    <Input
                      type="number"
                      value={formData.sort_order ?? 0}
                      onChange={(e) =>
                        setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                      }
                      className="h-10 text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Qo'shimcha izoh</label>
                    <Input
                      placeholder="Qisqacha izoh..."
                      value={(formData.description as string) || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                {/* 1. Bog'langan jinoyat turlari (Bo'sh = Umumiy) */}
                <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Qaysi jinoyat turlariga tegishli?
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      Tanlanmasa — barcha turlar uchun umumiy
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {allCrimesList.map((crime) => {
                      const selectedIds: string[] = Array.isArray(formData.crime_ids)
                        ? (formData.crime_ids as string[])
                        : [];
                      const isChecked = selectedIds.includes(crime.id);
                      return (
                        <button
                          key={crime.id}
                          type="button"
                          onClick={() => {
                            const next = isChecked
                              ? selectedIds.filter((cid) => cid !== crime.id)
                              : [...selectedIds, crime.id];
                            setFormData({ ...formData, crime_ids: next });
                          }}
                          className={`px-2.5 py-1 rounded-md text-xs border transition-colors cursor-pointer ${
                            isChecked
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-foreground border-border hover:bg-muted'
                          }`}
                        >
                          {crime.article || crime.title}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Dinamik maydonlar konstruktori (APK, Telegram va h.k.) */}
                <div className="space-y-2.5 p-3 rounded-lg border border-primary/20 bg-primary/[0.02]">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold text-foreground block">
                        Usul bo‘yicha dinamik maydonlar (Excel da ham chiqadi)
                      </label>
                      <span className="text-[11px] text-muted-foreground">
                        Masalan: APK nomi, Telegram @username, Fishing havolasi...
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        const prevFields = Array.isArray(formData.fields)
                          ? [...(formData.fields as Array<Record<string, unknown>>)]
                          : [];
                        prevFields.push({
                          label: '',
                          field_type: 'STRING',
                          placeholder: '',
                          is_required: false,
                          show_in_excel: true,
                          sort_order: prevFields.length,
                        });
                        setFormData({ ...formData, fields: prevFields });
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Maydon qo‘shish
                    </Button>
                  </div>

                  {Array.isArray(formData.fields) &&
                    (formData.fields as Array<Record<string, unknown>>).length > 0 && (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {(formData.fields as Array<Record<string, unknown>>).map((fld, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-md border bg-background space-y-2"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                              <Input
                                placeholder="Maydon nomi (masalan: APK nomi)"
                                value={(fld.label as string) || ''}
                                onChange={(e) => {
                                  const next = [
                                    ...(formData.fields as Array<Record<string, unknown>>),
                                  ];
                                  next[idx] = { ...next[idx], label: e.target.value };
                                  setFormData({ ...formData, fields: next });
                                }}
                                className="h-8 text-xs sm:col-span-5"
                              />
                              <select
                                value={(fld.field_type as string) || 'STRING'}
                                onChange={(e) => {
                                  const next = [
                                    ...(formData.fields as Array<Record<string, unknown>>),
                                  ];
                                  next[idx] = { ...next[idx], field_type: e.target.value };
                                  setFormData({ ...formData, fields: next });
                                }}
                                className="h-8 rounded-md border border-input bg-background px-2 text-xs sm:col-span-3"
                              >
                                <option value="STRING">Matn</option>
                                <option value="NUMBER">Raqam</option>
                                <option value="URL">Havola (URL)</option>
                                <option value="PHONE">Telefon</option>
                                <option value="DATE">Sana</option>
                                <option value="TEXT">Ko‘p qatorli</option>
                                <option value="SELECT">Ro‘yxat</option>
                              </select>
                              <Input
                                placeholder="Placeholder"
                                value={(fld.placeholder as string) || ''}
                                onChange={(e) => {
                                  const next = [
                                    ...(formData.fields as Array<Record<string, unknown>>),
                                  ];
                                  next[idx] = { ...next[idx], placeholder: e.target.value };
                                  setFormData({ ...formData, fields: next });
                                }}
                                className="h-8 text-xs sm:col-span-3"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-rose-500 sm:col-span-1"
                                onClick={() => {
                                  const next = (
                                    formData.fields as Array<Record<string, unknown>>
                                  ).filter((_, i) => i !== idx);
                                  setFormData({ ...formData, fields: next });
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-[11px]">
                              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(fld.is_required)}
                                  onChange={(e) => {
                                    const next = [
                                      ...(formData.fields as Array<Record<string, unknown>>),
                                    ];
                                    next[idx] = { ...next[idx], is_required: e.target.checked };
                                    setFormData({ ...formData, fields: next });
                                  }}
                                />
                                <span>Majburiy</span>
                              </label>
                              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={fld.show_in_excel !== false}
                                  onChange={(e) => {
                                    const next = [
                                      ...(formData.fields as Array<Record<string, unknown>>),
                                    ];
                                    next[idx] = { ...next[idx], show_in_excel: e.target.checked };
                                    setFormData({ ...formData, fields: next });
                                  }}
                                />
                                <span>Excelda ko‘rinsin</span>
                              </label>
                              {fld.field_type === 'SELECT' && (
                                <Input
                                  placeholder="Variantlar (vergul bilan: Telegram, Instagram, SMS)"
                                  value={
                                    Array.isArray(fld.options)
                                      ? (fld.options as string[]).join(', ')
                                      : ''
                                  }
                                  onChange={(e) => {
                                    const next = [
                                      ...(formData.fields as Array<Record<string, unknown>>),
                                    ];
                                    next[idx] = {
                                      ...next[idx],
                                      options: e.target.value
                                        .split(',')
                                        .map((s) => s.trim())
                                        .filter(Boolean),
                                    };
                                    setFormData({ ...formData, fields: next });
                                  }}
                                  className="h-7 text-xs flex-1 min-w-[200px]"
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            )}

            {activeTab === 'banks' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Bank Kodi</label>
                  <Input
                    placeholder="AGRO, KAPITAL"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="h-10 text-xs sm:text-sm font-mono uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">MFO Kodi</label>
                  <Input
                    placeholder="00394"
                    value={formData.mfo || ''}
                    onChange={(e) => setFormData({ ...formData, mfo: e.target.value })}
                    className="h-10 text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>
            )}

            {activeTab === 'providers' && (
              <div className="space-y-1">
                <label className="font-medium text-foreground">Tizim Kodi (Slug)</label>
                <Input
                  placeholder="PAYME, CLICK, UZUM"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>
            )}

            {activeTab === 'transfer_channels' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Kategoriya (Graf turi)</label>
                    <select
                      value={(formData.category as string) || 'PLATFORM'}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                    >
                      <option value="CARD">Plastik karta (CARD)</option>
                      <option value="CRYPTO">Kripto / Birja (CRYPTO)</option>
                      <option value="CASH">Naqdlashtirish / ATM (CASH)</option>
                      <option value="PLATFORM">Onlayn Servis / Profil (PLATFORM)</option>
                      <option value="BANK_ACCOUNT">Bank hisob raqami (BANK_ACCOUNT)</option>
                      <option value="OTHER">Boshqa (OTHER)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Tizim Kodi (Slug)</label>
                    <Input
                      placeholder="CRYPTO, BETTING, TIKTOK..."
                      value={formData.code || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="h-9 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Ikonka (Emoji)</label>
                    <Input
                      placeholder="🪙 / 🏧 / 🌐 / 🎰"
                      value={(formData.icon as string) || ''}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="h-9 text-sm text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Rang (Hex)</label>
                    <Input
                      type="color"
                      value={(formData.color as string) || '#0891b2'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="h-9 p-1 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Tartib raqami</label>
                    <Input
                      type="number"
                      value={formData.sort_order ?? 10}
                      onChange={(e) =>
                        setFormData({ ...formData, sort_order: Number(e.target.value) })
                      }
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">
                    Tezkor tanlash tugmalari (vergul bilan ajratilgan)
                  </label>
                  <Input
                    placeholder="Binance, Bybit, OKX, USDT TRC-20, TON"
                    value={(formData.presets_text as string) || ''}
                    onChange={(e) => setFormData({ ...formData, presets_text: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Platforma maydoni nomi</label>
                    <Input
                      placeholder="Birja / Platforma nomi"
                      value={(formData.platform_label as string) || ''}
                      onChange={(e) => setFormData({ ...formData, platform_label: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Qiymat maydoni nomi</label>
                    <Input
                      placeholder="UID / Hamyon / Profil ID *"
                      value={(formData.value_label as string) || ''}
                      onChange={(e) => setFormData({ ...formData, value_label: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'statuses' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Tizim Kodi (Slug)</label>
                    <Input
                      placeholder="YANGI, JARAYONDA, EKSPERTIZADA..."
                      value={formData.code || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="h-9 text-xs font-mono font-bold uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Status Rangi</label>
                    <select
                      value={(formData.color as string) || 'blue'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="blue">Ko‘k (Blue)</option>
                      <option value="amber">Sariq / Oltinrang (Amber)</option>
                      <option value="orange">To‘q sariq (Orange)</option>
                      <option value="emerald">Yashil (Emerald)</option>
                      <option value="teal">Moviy-yashil (Teal)</option>
                      <option value="cyan">Havorang (Cyan)</option>
                      <option value="indigo">Indigo (Indigo)</option>
                      <option value="purple">Binafsha (Purple)</option>
                      <option value="rose">Qizil (Rose)</option>
                      <option value="slate">To‘q kulrang (Slate)</option>
                      <option value="gray">Kulrang (Gray)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Bosqich kategoriyasi (JPK)
                    </label>
                    <select
                      value={(formData.category as string) || 'OPEN'}
                      onChange={(e) => {
                        const cat = e.target.value;
                        const isClosedOrPaused = cat === 'CLOSED' || cat === 'PAUSED';
                        setFormData({
                          ...formData,
                          category: cat,
                          tracks_sla: !isClosedOrPaused,
                        });
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="OPEN">Boshlang‘ich / Qabul (OPEN)</option>
                      <option value="IN_PROGRESS">Tekshiruv / Jarayonda (IN_PROGRESS)</option>
                      <option value="EXTENDED">Muddati uzaytirilgan (EXTENDED)</option>
                      <option value="PAUSED">Vaqtincha to‘xtatilgan (PAUSED)</option>
                      <option value="CLOSED">Yakuniy / Yopilgan (CLOSED)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Standart SLA muddati (kun)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      placeholder="3, 10, 30..."
                      value={
                        formData.default_sla_days !== undefined &&
                        formData.default_sla_days !== null
                          ? String(formData.default_sla_days)
                          : ''
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          default_sla_days: e.target.value ? parseInt(e.target.value, 10) : '',
                        })
                      }
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Huquqiy asos (Modda)</label>
                  <Input
                    placeholder="Masalan: JPK 329-modda, JPK 333-m. (83/84-m.)..."
                    value={(formData.legal_article as string) || ''}
                    onChange={(e) => setFormData({ ...formData, legal_article: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 h-9 px-2.5 rounded-md border border-input bg-background text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.tracks_sla !== false}
                      onChange={(e) => setFormData({ ...formData, tracks_sla: e.target.checked })}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    SLA taymeri yursin
                  </label>
                  <label className="flex items-center gap-2 h-9 px-2.5 rounded-md border border-input bg-background text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.requires_decision)}
                      onChange={(e) =>
                        setFormData({ ...formData, requires_decision: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    Qaror turi majburiy
                  </label>
                  <label className="flex items-center gap-2 h-9 px-2.5 rounded-md border border-input bg-background text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.requires_rejection_reason)}
                      onChange={(e) =>
                        setFormData({ ...formData, requires_rejection_reason: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    Rad sababi majburiy
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Tartib raqami (Sort order)
                    </label>
                    <Input
                      type="number"
                      placeholder="1, 2, 3..."
                      value={formData.sort_order ?? 0}
                      onChange={(e) =>
                        setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                      }
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Standart (Birlamchi) holat
                    </label>
                    <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background">
                      <input
                        type="checkbox"
                        id="is_default_check"
                        checked={Boolean(formData.is_default)}
                        onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <label htmlFor="is_default_check" className="text-xs cursor-pointer">
                        Yangi arizalarga avtomatik biriksin
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Izoh (Tavsif)</label>
                  <Input
                    placeholder="Ariza statusi haqida qisqacha izoh..."
                    value={(formData.description as string) || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </>
            )}

            {/* Suspect Field Configs Form Fields */}
            {activeTab === 'suspect_fields' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Tizim Kaliti (Key) *</label>
                    <Input
                      placeholder="telegram_username, phone_number..."
                      value={(formData.key as string) || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                        })
                      }
                      className="h-9 text-xs font-mono"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Word shablonda {`{{suspect.${(formData.key as string) || 'kalit'}}}`} bo‘lib
                      chiqadi
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Toifasi (Category)</label>
                    <select
                      value={(formData.category as string) || 'Umumiy'}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Telegram">Telegram</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Aloqa">Aloqa / Telefon</option>
                      <option value="Moliya">Moliya / Bank / Kripto</option>
                      <option value="Tarmoq">Tarmoq / IP / Server</option>
                      <option value="Transport">Transport / Avto</option>
                      <option value="Umumiy">Umumiy / Boshqa</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Namuna qiymat (Sample value)
                    </label>
                    <Input
                      placeholder="Masalan: @tilav_web, 123456..."
                      value={(formData.sample_value as string) || ''}
                      onChange={(e) => setFormData({ ...formData, sample_value: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Tartib raqami (Sort order)
                    </label>
                    <Input
                      type="number"
                      placeholder="1, 2, 3..."
                      value={formData.sort_order ?? 0}
                      onChange={(e) =>
                        setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                      }
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Tavsif / Izoh</label>
                  <Input
                    placeholder="Ushbu parametr nima maqsadda ishlatilishi haqida izoh..."
                    value={(formData.description as string) || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </>
            )}

            {/* Occupations form fields */}
            {activeTab === 'occupations' && (
              <div className="space-y-4">
                {occupationMode === 'occupations' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Tegishli Kasb Toifasi *
                    </label>
                    <select
                      value={(formData.category_id as string) || selectedOccupCatFilter || ''}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs sm:text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    >
                      <option value="">Toifani tanlang...</option>
                      {allCategoriesList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Kodi (Ixtiyoriy)
                    </label>
                    <Input
                      placeholder="Savdo, O'qituvchi..."
                      value={formData.code || ''}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="h-10 text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Tartib raqami</label>
                    <Input
                      type="number"
                      value={formData.sort_order ?? 0}
                      onChange={(e) =>
                        setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                      }
                      className="h-10 text-xs sm:text-sm font-mono"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.is_active !== false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-input text-primary"
                  />
                  <span>Faol holatda</span>
                </label>
              </div>
            )}

            {/* Sources form fields */}
            {activeTab === 'sources' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Kodi / Qisqa raqami
                  </label>
                  <Input
                    placeholder="102, 112..."
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="h-10 text-xs sm:text-sm font-mono"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.is_active !== false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-input text-primary"
                  />
                  <span>Faol holatda</span>
                </label>
              </div>
            )}

            {/* Department Services form fields */}
            {activeTab === 'department_services' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Qisqartmasi (Abbreviatura) *
                  </label>
                  <Input
                    placeholder="UYOKK, JQK, TQK, HQPX..."
                    value={formData.short_name || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, short_name: e.target.value.toUpperCase() })
                    }
                    className="h-10 text-xs sm:text-sm font-mono uppercase font-bold"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.is_active !== false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-input text-primary"
                  />
                  <span>Faol holatda</span>
                </label>
              </div>
            )}

            {/* Decision Types form fields */}
            {activeTab === 'decision_types' && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.is_active !== false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-input text-primary"
                  />
                  <span>Faol holatda</span>
                </label>
              </div>
            )}

            {/* Rejection Reasons form fields */}
            {activeTab === 'rejection_reasons' && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.is_active !== false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-input text-primary"
                  />
                  <span>Faol holatda</span>
                </label>
              </div>
            )}
          </fieldset>

          <DialogFooter>
            <Button
              variant="outline"
              size="default"
              onClick={closeModal}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="text-xs sm:text-sm h-10 px-5 cursor-pointer font-medium"
            >
              Bekor qilish
            </Button>
            <Button
              size="default"
              onClick={() =>
                modalType === 'create' ? createMutation.mutate() : updateMutation.mutate()
              }
              loading={createMutation.isPending || updateMutation.isPending}
              className="text-xs sm:text-sm h-10 px-6 font-semibold shadow-md shadow-primary/25 cursor-pointer"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={modalType === 'delete'} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>O‘chirishni tasdiqlang</DialogTitle>
            <DialogDescription>
              Ushbu yozuvni o‘chirishni xohlaysizmi? Bu amalni ortga qaytarib bo‘lmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="default"
              onClick={closeModal}
              disabled={deleteMutation.isPending}
              className="text-xs sm:text-sm h-10 px-4 cursor-pointer font-medium"
            >
              Yo&apos;q, bekor qilish
            </Button>
            <Button
              variant="destructive"
              size="default"
              onClick={() => deleteMutation.mutate()}
              loading={deleteMutation.isPending}
              className="text-xs sm:text-sm h-10 px-5 font-semibold cursor-pointer shadow-md shadow-red-500/20"
            >
              {deleteMutation.isPending ? 'O‘chirilmoqda...' : 'Ha, o‘chirish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
