import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';

const REFERENCE_TAB_INVALIDATION_KEYS: Record<string, readonly (readonly string[])[]> = {
  regions: [
    queryKeys.references.regions,
    queryKeys.references.regionsSelect,
    queryKeys.references.districts,
  ],
  districts: [
    queryKeys.references.districts,
    queryKeys.references.districtsSelect,
    ['all-districts-for-neighborhood'],
    ['districts-for-dc-form'],
    queryKeys.applications.dashboardStatistics,
  ],
  neighborhoods: [
    queryKeys.references.neighborhoods,
    ['citizen-neighborhoods'],
    ['custom-citizen-neighborhoods-select'],
    queryKeys.applications.dashboardStatistics,
  ],
  crimes: [
    queryKeys.references.crimes,
    queryKeys.references.crimesSelect,
    ['all-crimes-for-method'],
    ['crimes-for-dc-form'],
  ],
  crime_methods: [queryKeys.references.crimeMethods, queryKeys.references.crimeMethodsActive],
  banks: [queryKeys.references.banks, queryKeys.references.banksSelect],
  providers: [queryKeys.references.providers, queryKeys.references.providersSelect],
  transfer_channels: [queryKeys.references.transferChannels],
  statuses: [
    queryKeys.references.statuses,
    queryKeys.references.statusesAll,
    queryKeys.references.statusesSelect,
  ],
  suspect_fields: [queryKeys.references.suspectFields, queryKeys.references.suspectFieldsActive],
  occupations: [
    queryKeys.references.occupations,
    queryKeys.references.occupationsSelect,
    queryKeys.references.occupationCategories,
    queryKeys.references.occupationCategoriesSelect,
  ],
  sources: [queryKeys.references.sources, queryKeys.references.sourcesSelect],
  department_services: [
    queryKeys.references.departmentServices,
    queryKeys.references.departmentServicesSelect,
    ['dept-services-for-dc-form'],
  ],
  rejection_reasons: [
    queryKeys.references.rejectionReasons,
    queryKeys.references.rejectionReasonsSelect,
  ],
  decision_types: [
    queryKeys.references.decisionTypes,
    queryKeys.references.decisionTypesSelect,
    ['decision-types-for-dc-form'],
  ],
};

export function invalidateReferenceTabCaches(queryClient: QueryClient, activeTab: string): void {
  const keys = REFERENCE_TAB_INVALIDATION_KEYS[activeTab] || [[activeTab]];
  for (const qk of keys) {
    void queryClient.invalidateQueries({ queryKey: [...qk] });
  }
}
