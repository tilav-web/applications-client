import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { DetectedCrimeStatusesReferenceTab } from '@/components/references/detected-crime-statuses-reference-tab';
import { DetectionSourcesReferenceTab } from '@/components/references/detection-sources-reference-tab';
import { invalidateReferenceTabCaches } from '@/components/references/reference-cache.util';
import { ReferenceDialogs } from '@/components/references/reference-dialogs';
import { ReferenceFinanceTabs } from '@/components/references/reference-finance-tabs';
import {
  ALL_REFERENCE_TABS,
  REFERENCE_NAV_GROUPS,
  type ReferenceFormData,
  type ReferenceItem,
  type ReferenceTabKey,
  VALID_TAB_KEYS,
} from '@/components/references/reference-types';
import { WorkplacesReferenceTab } from '@/components/references/workplaces-reference-tab';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  neighborhoodsApi,
  occupationCategoriesApi,
  occupationsApi,
  paymentProvidersApi,
  regionsApi,
  rejectionReasonsApi,
  suspectFieldConfigsApi,
  transferChannelsApi,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { matchesLatinSearch } from '@/lib/transliterate';
import type {
  ApplicationStatusItem,
  Crime,
  CrimeMethod,
  District,
  Neighborhood,
  Region,
  SuspectFieldConfig,
  TransferDestinationType,
} from '@/types/models';

const parseOptionalCoord = (val: unknown): number | null | undefined => {
  if (val === undefined) return undefined;
  if (val === null || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
};

const formatCoordPair = (lat?: number | null, lng?: number | null): string => {
  if (lat == null || lng == null) return '—';
  return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
};

export function ReferencesPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromUrl = searchParams.get('tab');
  const activeTab: ReferenceTabKey =
    tabFromUrl && VALID_TAB_KEYS.has(tabFromUrl)
      ? (tabFromUrl as ReferenceTabKey)
      : tabFromUrl === 'mahallas'
        ? 'neighborhoods'
        : 'regions';

  const setActiveTab = (nextTab: ReferenceTabKey) => {
    setSearchParams({ tab: nextTab }, { replace: true });
  };

  const activeTabMeta =
    ALL_REFERENCE_TABS.find((t) => t.key === activeTab) || ALL_REFERENCE_TABS[0];

  // Search and page state for each tab
  const [regionSearch, setRegionSearch] = useState('');
  const [regionPage, setRegionPage] = useState(1);

  const [districtSearch, setDistrictSearch] = useState('');
  const [districtPage, setDistrictPage] = useState(1);
  const [selectedRegionFilter, setSelectedRegionFilter] = useState('');

  const [neighborhoodSearch, setNeighborhoodSearch] = useState('');
  const [neighborhoodPage, setNeighborhoodPage] = useState(1);

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

  // 0. Regions Query
  const { data: regionsData, isLoading: isRegionsLoading } = useQuery({
    queryKey: ['regions', { page: regionPage, limit: pageSize, search: regionSearch }],
    queryFn: () => regionsApi.getAll({ page: regionPage, limit: pageSize, search: regionSearch }),
    enabled: activeTab === 'regions',
  });

  // Viloyatlar lug'ati (Tuman yaratish/filtrlash uchun)
  const { data: allRegionsForDistrict } = useQuery({
    queryKey: ['regions-autocomplete'],
    queryFn: () => regionsApi.getAll({ limit: 100 }),
    enabled:
      activeTab === 'districts' ||
      activeTab === 'regions' ||
      modalType === 'create' ||
      modalType === 'edit',
  });
  const allRegionsList = allRegionsForDistrict?.items || [];

  // 1. Districts Query
  const { data: districtsData, isLoading: isDistrictsLoading } = useQuery({
    queryKey: [
      'districts',
      {
        page: districtPage,
        limit: pageSize,
        search: districtSearch,
        region_id: selectedRegionFilter || undefined,
      },
    ],
    queryFn: () =>
      districtsApi.getAll({
        page: districtPage,
        limit: pageSize,
        search: districtSearch,
        region_id: selectedRegionFilter || undefined,
      }),
    enabled: activeTab === 'districts',
  });

  // 1.1. Neighborhoods Query
  const { data: neighborhoodsData, isLoading: isNeighborhoodsLoading } = useQuery({
    queryKey: [
      'neighborhoods',
      { page: neighborhoodPage, limit: pageSize, search: neighborhoodSearch },
    ],
    queryFn: () =>
      neighborhoodsApi.getAll({
        page: neighborhoodPage,
        limit: pageSize,
        search: neighborhoodSearch,
      }),
    enabled: activeTab === 'neighborhoods',
  });

  // Tumanlar lug'ati (Mahalla yaratish uchun)
  const { data: allDistrictsForNeighborhood } = useQuery({
    queryKey: ['all-districts-for-neighborhood'],
    queryFn: () => districtsApi.getAll({ limit: 500 }),
    enabled: activeTab === 'neighborhoods' || modalType === 'create' || modalType === 'edit',
  });
  const allDistrictsList = allDistrictsForNeighborhood?.items || [];

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
      if (activeTab === 'regions')
        return regionsApi.create({
          name: formData.name || '',
          code: formData.code || null,
          latitude: parseOptionalCoord(formData.latitude),
          longitude: parseOptionalCoord(formData.longitude),
        });
      if (activeTab === 'districts')
        return districtsApi.create({
          name: formData.name || '',
          region_id: formData.region_id || null,
          latitude: parseOptionalCoord(formData.latitude),
          longitude: parseOptionalCoord(formData.longitude),
        });
      if (activeTab === 'neighborhoods')
        return neighborhoodsApi.create({
          name: formData.name || '',
          district_id: formData.district_id || '',
          latitude: parseOptionalCoord(formData.latitude),
          longitude: parseOptionalCoord(formData.longitude),
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
      invalidateReferenceTabCaches(queryClient, activeTab);
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
      if (activeTab === 'regions')
        return regionsApi.update(targetItem.id, {
          name: formData.name || undefined,
          code: formData.code !== undefined ? formData.code || null : undefined,
          latitude: parseOptionalCoord(formData.latitude),
          longitude: parseOptionalCoord(formData.longitude),
        });
      if (activeTab === 'districts')
        return districtsApi.update(targetItem.id, {
          name: formData.name || undefined,
          region_id: formData.region_id !== undefined ? formData.region_id || null : undefined,
          latitude: parseOptionalCoord(formData.latitude),
          longitude: parseOptionalCoord(formData.longitude),
        });
      if (activeTab === 'neighborhoods')
        return neighborhoodsApi.update(targetItem.id, {
          name: formData.name || undefined,
          district_id: formData.district_id || undefined,
          latitude: parseOptionalCoord(formData.latitude),
          longitude: parseOptionalCoord(formData.longitude),
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
      invalidateReferenceTabCaches(queryClient, activeTab);
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
      if (activeTab === 'regions') return regionsApi.delete(targetItem.id);
      if (activeTab === 'districts') return districtsApi.delete(targetItem.id);
      if (activeTab === 'neighborhoods') return neighborhoodsApi.delete(targetItem.id);
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
      invalidateReferenceTabCaches(queryClient, activeTab);
      closeModal();
      toast.success('Yozuv o‘chirildi');
    },
    onError: (err: unknown) => {
      toast.error('O‘chirishda xatolik', { description: getErrorMessage(err) });
    },
  });

  const openCreateModal = () => {
    const initial: ReferenceFormData = {};
    if (activeTab === 'districts') {
      const defaultRegion =
        allRegionsList.find((r) => r.code === 'QASHQADARYO') || allRegionsList[0];
      if (selectedRegionFilter) {
        initial.region_id = selectedRegionFilter;
      } else if (defaultRegion) {
        initial.region_id = defaultRegion.id;
      }
    }
    setFormData(initial);
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
    <div className="w-full h-full flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Mobil ekranlar uchun qulay bo'lim tanlash */}
      <div className="lg:hidden space-y-2 p-3 pb-2 border-b border-border/60 shrink-0 bg-card/60">
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
        className="w-full flex-1 flex flex-col min-h-0 overflow-hidden gap-0"
      >
        <div className="flex-1 flex flex-col lg:flex-row-reverse min-h-0 overflow-hidden">
          {/* O'ng tomondagi FIXED vertikal sidebar — faqat o'z ichi scroll bo'ladi */}
          <aside className="hidden lg:flex flex-col w-64 shrink-0 h-full border-l border-border/80 bg-card/70 backdrop-blur-sm overflow-y-auto p-3 space-y-4">
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
          </aside>

          {/* Chap tomondagi asosiy tarkib — alohida mustaqil scroll */}
          <div className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-5 space-y-4">
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

              {activeTab !== 'workplaces' &&
                activeTab !== 'detection_sources' &&
                activeTab !== 'detected_crime_statuses' && (
                  <Button
                    size="sm"
                    onClick={openCreateModal}
                    className="gap-2 shadow-md shadow-primary/25 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Yangi Qo&apos;shish
                  </Button>
                )}
            </div>

            {/* WORKPLACES TAB */}
            <TabsContent value="workplaces" className="space-y-4 mt-0">
              <WorkplacesReferenceTab />
            </TabsContent>

            {/* DETECTION SOURCES TAB */}
            <TabsContent value="detection_sources" className="space-y-4 mt-0">
              <DetectionSourcesReferenceTab />
            </TabsContent>

            {/* DETECTED CRIME STATUSES TAB */}
            <TabsContent value="detected_crime_statuses" className="space-y-4 mt-0">
              <DetectedCrimeStatusesReferenceTab />
            </TabsContent>

            {/* 0. REGIONS TAB */}
            <TabsContent value="regions" className="space-y-4 mt-0">
              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="relative max-w-md lg:max-w-lg">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Viloyat nomi yoki kodi bo'yicha qidiruv..."
                      value={regionSearch}
                      onChange={(e) => {
                        setRegionSearch(e.target.value);
                        setRegionPage(1);
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
                      <TableHead>Viloyat Nomi</TableHead>
                      <TableHead>Kodi</TableHead>
                      <TableHead>Koordinatalar (Lat, Lng)</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isRegionsLoading ? (
                      <TableRowsSkeleton rows={4} columns={4} />
                    ) : regionsData?.items?.length ? (
                      regionsData.items.map((region: Region) => (
                        <TableRow key={region.id}>
                          <TableCell className="font-medium text-foreground">
                            {region.name || '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-primary font-semibold">
                            {region.code || '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {formatCoordPair(region.latitude, region.longitude)}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(region)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(region)}
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
                          Hech qanday viloyat topilmadi
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {regionsData?.meta && (
                  <PaginationBar
                    page={regionsData.meta.page}
                    totalPages={regionsData.meta.totalPages}
                    total={regionsData.meta.total}
                    limit={pageSize}
                    hasNextPage={regionsData.meta.hasNextPage}
                    hasPreviousPage={regionsData.meta.hasPreviousPage}
                    onPageChange={(p) => setRegionPage(p)}
                    onLimitChange={(newLimit) => {
                      setPageSize(newLimit);
                      setRegionPage(1);
                    }}
                    isLoading={isRegionsLoading}
                  />
                )}
              </Card>
            </TabsContent>

            {/* 1. DISTRICTS TAB */}
            <TabsContent value="districts" className="space-y-4 mt-0">
              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <div className="relative flex-1 max-w-md lg:max-w-lg">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tuman nomi bo'yicha qidiruv..."
                      value={districtSearch}
                      onChange={(e) => {
                        setDistrictSearch(e.target.value);
                        setDistrictPage(1);
                      }}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                  <select
                    value={selectedRegionFilter}
                    onChange={(e) => {
                      setSelectedRegionFilter(e.target.value);
                      setDistrictPage(1);
                    }}
                    className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium min-w-[200px]"
                  >
                    <option value="">Barcha viloyatlar</option>
                    {allRegionsList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </CardContent>
              </Card>

              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tuman / Bo&apos;lim Nomi</TableHead>
                      <TableHead>Viloyat</TableHead>
                      <TableHead>Koordinatalar (Lat, Lng)</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isDistrictsLoading ? (
                      <TableRowsSkeleton rows={6} columns={4} />
                    ) : districtsData?.items?.length ? (
                      districtsData.items.map((district: District) => (
                        <TableRow key={district.id}>
                          <TableCell className="font-medium text-foreground">
                            {district.name || '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {district.region?.name || '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {formatCoordPair(district.latitude, district.longitude)}
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
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
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

            {/* 1.1. NEIGHBORHOODS (MAHALLAS) TAB */}
            <TabsContent value="neighborhoods" className="space-y-4 mt-0">
              <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="relative max-w-md lg:max-w-lg">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Mahalla nomi bo'yicha qidiruv..."
                      value={neighborhoodSearch}
                      onChange={(e) => {
                        setNeighborhoodSearch(e.target.value);
                        setNeighborhoodPage(1);
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
                      <TableHead>Koordinatalar (Lat, Lng)</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isNeighborhoodsLoading ? (
                      <TableRowsSkeleton rows={6} columns={4} />
                    ) : neighborhoodsData?.items?.length ? (
                      neighborhoodsData.items.map((neighborhood: Neighborhood) => (
                        <TableRow key={neighborhood.id}>
                          <TableCell className="font-medium text-foreground">
                            {neighborhood.name || '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {neighborhood.district?.name || '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {formatCoordPair(neighborhood.latitude, neighborhood.longitude)}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(neighborhood)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(neighborhood)}
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
                          Hech qanday mahalla topilmadi
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {neighborhoodsData?.meta && (
                  <PaginationBar
                    page={neighborhoodsData.meta.page}
                    totalPages={neighborhoodsData.meta.totalPages}
                    total={neighborhoodsData.meta.total}
                    limit={pageSize}
                    hasNextPage={neighborhoodsData.meta.hasNextPage}
                    hasPreviousPage={neighborhoodsData.meta.hasPreviousPage}
                    onPageChange={(p) => setNeighborhoodPage(p)}
                    onLimitChange={(newLimit) => {
                      setPageSize(newLimit);
                      setNeighborhoodPage(1);
                    }}
                    isLoading={isNeighborhoodsLoading}
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

            <ReferenceFinanceTabs
              bankSearch={bankSearch}
              setBankSearch={setBankSearch}
              setBankPage={setBankPage}
              banksData={banksData}
              isBanksLoading={isBanksLoading}
              providerSearch={providerSearch}
              setProviderSearch={setProviderSearch}
              setProviderPage={setProviderPage}
              providersData={providersData}
              isProvidersLoading={isProvidersLoading}
              transferChannelsData={transferChannelsData}
              isTransferChannelsLoading={isTransferChannelsLoading}
              pageSize={pageSize}
              setPageSize={setPageSize}
              openEditModal={openEditModal}
              openDeleteModal={openDeleteModal}
            />

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
                          matchesLatinSearch(c.name, occupationSearch),
                        ).length ? (
                        allCategoriesList
                          .filter((c) => matchesLatinSearch(c.name, occupationSearch))
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
                          matchesLatinSearch(o.name, occupationSearch),
                        ).length ? (
                        allOccupationsList
                          .filter((o) => matchesLatinSearch(o.name, occupationSearch))
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
                    ) : allSourcesList.filter((s) => matchesLatinSearch(s.name, sourceSearch))
                        .length ? (
                      allSourcesList
                        .filter((s) => matchesLatinSearch(s.name, sourceSearch))
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
                    ) : allDeptServicesList.filter(
                        (d) =>
                          matchesLatinSearch(d.name, deptServiceSearch) ||
                          (d.short_name && matchesLatinSearch(d.short_name, deptServiceSearch)),
                      ).length ? (
                      allDeptServicesList
                        .filter(
                          (d) =>
                            matchesLatinSearch(d.name, deptServiceSearch) ||
                            (d.short_name && matchesLatinSearch(d.short_name, deptServiceSearch)),
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
                        matchesLatinSearch(d.name, decisionSearch),
                      ).length ? (
                      allDecisionTypesList
                        .filter((d) => matchesLatinSearch(d.name, decisionSearch))
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
                        matchesLatinSearch(r.name, rejectionSearch),
                      ).length ? (
                      allRejectionReasonsList
                        .filter((r) => matchesLatinSearch(r.name, rejectionSearch))
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

      <ReferenceDialogs
        modalType={modalType}
        activeTab={activeTab}
        occupationMode={occupationMode}
        selectedOccupCatFilter={selectedOccupCatFilter}
        targetItem={targetItem}
        formData={formData}
        setFormData={setFormData}
        allRegionsList={allRegionsList}
        allDistrictsList={allDistrictsList}
        allCrimesList={allCrimesList}
        allCategoriesList={allCategoriesList}
        isSaving={createMutation.isPending || updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
        onClose={closeModal}
        onSave={() => (modalType === 'create' ? createMutation.mutate() : updateMutation.mutate())}
        onDelete={() => deleteMutation.mutate()}
      />
    </div>
  );
}
