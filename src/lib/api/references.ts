import type {
  ApplicationSource,
  ApplicationStatusItem,
  Bank,
  Crime,
  CrimeMethod,
  DecisionType,
  DepartmentService,
  District,
  Mahalla,
  Occupation,
  OccupationCategory,
  PaginatedResponse,
  PaymentProvider,
  RejectionReason,
  SuspectFieldConfig,
  TransferChannel,
} from '@/types/models';

import { apiClient } from '../axios';

// 5. Districts API
export const districtsApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get<PaginatedResponse<District>>('/districts', {
      params,
    });
    return res.data;
  },
  create: async (data: Partial<District>) => {
    const res = await apiClient.post<District>('/districts', data);
    return res.data;
  },
  update: async (id: string, data: Partial<District>) => {
    const res = await apiClient.patch<District>(`/districts/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/districts/${id}`);
    return res.data;
  },
};

// 5.1. Mahallas API
export const mahallasApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    district_id?: string;
    search?: string;
  }) => {
    const res = await apiClient.get<PaginatedResponse<Mahalla>>('/mahallas', {
      params,
    });
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get<Mahalla>(`/mahallas/${id}`);
    return res.data;
  },
  create: async (data: { name: string; district_id: string }) => {
    const res = await apiClient.post<Mahalla>('/mahallas', data);
    return res.data;
  },
  update: async (id: string, data: Partial<{ name: string; district_id: string }>) => {
    const res = await apiClient.patch<Mahalla>(`/mahallas/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/mahallas/${id}`);
    return res.data;
  },
};

// 5.2. Application Statuses API
export const applicationStatusesApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get<PaginatedResponse<ApplicationStatusItem>>(
      '/application-statuses',
      {
        params,
      },
    );
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get<ApplicationStatusItem>(`/application-statuses/${id}`);
    return res.data;
  },
  create: async (data: Partial<ApplicationStatusItem>) => {
    const res = await apiClient.post<ApplicationStatusItem>('/application-statuses', data);
    return res.data;
  },
  update: async (id: string, data: Partial<ApplicationStatusItem>) => {
    const res = await apiClient.patch<ApplicationStatusItem>(`/application-statuses/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/application-statuses/${id}`,
    );
    return res.data;
  },
};

export const workplacesApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    district_id?: string;
    occupation_category_id?: string;
    occupation_id?: string;
    include_inactive?: boolean;
  }) => {
    const res = await apiClient.get<PaginatedResponse<import('@/types/models').Workplace>>(
      '/workplaces',
      { params },
    );
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get<import('@/types/models').Workplace>(`/workplaces/${id}`);
    return res.data;
  },
  create: async (data: {
    name: string;
    district_id?: string | null;
    mahalla_id?: string | null;
    occupation_category_id?: string | null;
    occupation_ids?: string[];
    address?: string | null;
    inn?: string | null;
    is_active?: boolean;
  }) => {
    const res = await apiClient.post<import('@/types/models').Workplace>('/workplaces', data);
    return res.data;
  },
  update: async (
    id: string,
    data: Partial<{
      name: string;
      district_id?: string | null;
      mahalla_id?: string | null;
      occupation_category_id?: string | null;
      occupation_ids?: string[];
      address?: string | null;
      inn?: string | null;
      is_active?: boolean;
    }>,
  ) => {
    const res = await apiClient.patch<import('@/types/models').Workplace>(
      `/workplaces/${id}`,
      data,
    );
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/workplaces/${id}`);
    return res.data;
  },
};

// 5.3. Suspect Field Configs API (Gumonlanuvchi belgilari sozlamalari)
export const suspectFieldConfigsApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get<PaginatedResponse<SuspectFieldConfig>>(
      '/suspect-field-configs',
      {
        params,
      },
    );
    return res.data;
  },
  getAllActive: async () => {
    const res = await apiClient.get<SuspectFieldConfig[]>('/suspect-field-configs/active');
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get<SuspectFieldConfig>(`/suspect-field-configs/${id}`);
    return res.data;
  },
  create: async (data: Partial<SuspectFieldConfig>) => {
    const res = await apiClient.post<SuspectFieldConfig>('/suspect-field-configs', data);
    return res.data;
  },
  update: async (id: string, data: Partial<SuspectFieldConfig>) => {
    const res = await apiClient.patch<SuspectFieldConfig>(`/suspect-field-configs/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/suspect-field-configs/${id}`,
    );
    return res.data;
  },
};

// 6. Crimes API
export const crimesApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get<PaginatedResponse<Crime>>('/crimes', {
      params,
    });
    return res.data;
  },
  create: async (data: Partial<Crime>) => {
    const res = await apiClient.post<Crime>('/crimes', data);
    return res.data;
  },
  update: async (id: string, data: Partial<Crime>) => {
    const res = await apiClient.patch<Crime>(`/crimes/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/crimes/${id}`);
    return res.data;
  },
};

// 6.1. Crime Methods API
export const crimeMethodsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    group_name?: string;
    crime_id?: string;
  }) => {
    const res = await apiClient.get<PaginatedResponse<CrimeMethod>>('/crime-methods', {
      params,
    });
    return res.data;
  },
  getAllActive: async (crimeId?: string) => {
    const res = await apiClient.get<CrimeMethod[]>('/crime-methods/active', {
      params: crimeId ? { crime_id: crimeId } : undefined,
    });
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get<CrimeMethod>(`/crime-methods/${id}`);
    return res.data;
  },
  create: async (
    data: Omit<Partial<CrimeMethod>, 'fields'> & {
      crime_ids?: string[];
      fields?: Array<{
        key?: string;
        label: string;
        field_type?: string;
        options?: string[];
        placeholder?: string;
        is_required?: boolean;
        show_in_excel?: boolean;
        excel_header?: string;
        sort_order?: number;
        is_active?: boolean;
      }>;
    },
  ) => {
    const res = await apiClient.post<CrimeMethod>('/crime-methods', data);
    return res.data;
  },
  update: async (
    id: string,
    data: Omit<Partial<CrimeMethod>, 'fields'> & {
      crime_ids?: string[];
      fields?: Array<{
        key?: string;
        label: string;
        field_type?: string;
        options?: string[];
        placeholder?: string;
        is_required?: boolean;
        show_in_excel?: boolean;
        excel_header?: string;
        sort_order?: number;
        is_active?: boolean;
      }>;
    },
  ) => {
    const res = await apiClient.patch<CrimeMethod>(`/crime-methods/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/crime-methods/${id}`,
    );
    return res.data;
  },
};

// 7. Banks API
export const banksApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get<PaginatedResponse<Bank>>('/banks', {
      params,
    });
    return res.data;
  },
  create: async (data: Partial<Bank>) => {
    const res = await apiClient.post<Bank>('/banks', data);
    return res.data;
  },
  update: async (id: string, data: Partial<Bank>) => {
    const res = await apiClient.patch<Bank>(`/banks/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/banks/${id}`);
    return res.data;
  },
};

// 8. Payment Providers API
export const paymentProvidersApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get<PaginatedResponse<PaymentProvider>>('/payment-providers', {
      params,
    });
    return res.data;
  },
  create: async (data: Partial<PaymentProvider>) => {
    const res = await apiClient.post<PaymentProvider>('/payment-providers', data);
    return res.data;
  },
  update: async (id: string, data: Partial<PaymentProvider>) => {
    const res = await apiClient.patch<PaymentProvider>(`/payment-providers/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/payment-providers/${id}`,
    );
    return res.data;
  },
};

// 8.1. Transfer Exit Channels API (Dinamik chiqish kanallari)
export const transferChannelsApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get<PaginatedResponse<TransferChannel>>('/transfer-channels', {
      params,
    });
    return res.data;
  },
  create: async (data: Partial<TransferChannel>) => {
    const res = await apiClient.post<TransferChannel>('/transfer-channels', data);
    return res.data;
  },
  update: async (id: string, data: Partial<TransferChannel>) => {
    const res = await apiClient.patch<TransferChannel>(`/transfer-channels/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/transfer-channels/${id}`,
    );
    return res.data;
  },
};

// 11. Occupation Categories & Occupations API
export const occupationCategoriesApi = {
  getAll: async (params?: { includeInactive?: boolean }) => {
    const res = await apiClient.get<OccupationCategory[]>('/occupation-categories', { params });
    return res.data;
  },
  create: async (data: Partial<OccupationCategory>) => {
    const res = await apiClient.post<OccupationCategory>('/occupation-categories', data);
    return res.data;
  },
  update: async (id: string, data: Partial<OccupationCategory>) => {
    const res = await apiClient.put<OccupationCategory>(`/occupation-categories/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/occupation-categories/${id}`,
    );
    return res.data;
  },
};

export const occupationsApi = {
  getAll: async (params?: { category_id?: string; includeInactive?: boolean }) => {
    const res = await apiClient.get<Occupation[]>('/occupations', { params });
    return res.data;
  },
  create: async (data: Partial<Occupation> & { category_id: string }) => {
    const res = await apiClient.post<Occupation>('/occupations', data);
    return res.data;
  },
  update: async (id: string, data: Partial<Occupation>) => {
    const res = await apiClient.put<Occupation>(`/occupations/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/occupations/${id}`);
    return res.data;
  },
};

// 12. Application Sources API (Murojaat manbalari: 102, 112, etc.)
export const applicationSourcesApi = {
  getAll: async (params?: { includeInactive?: boolean }) => {
    const res = await apiClient.get<ApplicationSource[]>('/application-sources', { params });
    return res.data;
  },
  create: async (data: Partial<ApplicationSource>) => {
    const res = await apiClient.post<ApplicationSource>('/application-sources', data);
    return res.data;
  },
  update: async (id: string, data: Partial<ApplicationSource>) => {
    const res = await apiClient.put<ApplicationSource>(`/application-sources/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/application-sources/${id}`,
    );
    return res.data;
  },
};

// 13. Department Services API (Sohaviy xizmatlar: UYOKK, JQK, TQK, etc.)
export const departmentServicesApi = {
  getAll: async (params?: { includeInactive?: boolean }) => {
    const res = await apiClient.get<DepartmentService[]>('/department-services', { params });
    return res.data;
  },
  create: async (data: Partial<DepartmentService>) => {
    const res = await apiClient.post<DepartmentService>('/department-services', data);
    return res.data;
  },
  update: async (id: string, data: Partial<DepartmentService>) => {
    const res = await apiClient.put<DepartmentService>(`/department-services/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/department-services/${id}`,
    );
    return res.data;
  },
};

// 14. Rejection Reasons API (Rad etish sabablari)
export const rejectionReasonsApi = {
  getAll: async (params?: { includeInactive?: boolean }) => {
    const res = await apiClient.get<RejectionReason[]>('/rejection-reasons', { params });
    return res.data;
  },
  create: async (data: Partial<RejectionReason>) => {
    const res = await apiClient.post<RejectionReason>('/rejection-reasons', data);
    return res.data;
  },
  update: async (id: string, data: Partial<RejectionReason>) => {
    const res = await apiClient.put<RejectionReason>(`/rejection-reasons/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/rejection-reasons/${id}`,
    );
    return res.data;
  },
};

// 15. Decision Types API (Qaror turlari)
export const decisionTypesApi = {
  getAll: async (params?: { includeInactive?: boolean }) => {
    const res = await apiClient.get<DecisionType[]>('/decision-types', { params });
    return res.data;
  },
  create: async (data: Partial<DecisionType>) => {
    const res = await apiClient.post<DecisionType>('/decision-types', data);
    return res.data;
  },
  update: async (id: string, data: Partial<DecisionType>) => {
    const res = await apiClient.put<DecisionType>(`/decision-types/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/decision-types/${id}`,
    );
    return res.data;
  },
};
