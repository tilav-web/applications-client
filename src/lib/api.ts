import type {
  Application,
  ApplicationRelationsData,
  ApplicationSource,
  ApplicationStatusItem,
  Bank,
  Card,
  Citizen,
  Crime,
  CrimeMethod,
  DecisionType,
  DepartmentService,
  DigitalIdentifierRecord,
  District,
  EntityLinkRole,
  FullDossierResponse,
  GlobalSearchResponse,
  IGraphData,
  INetworkGraph,
  LiveRadarResponse,
  Mahalla,
  Occupation,
  OccupationCategory,
  PaginatedResponse,
  PaymentProvider,
  PhoneRecord,
  RejectionReason,
  SuspectFieldConfig,
  Transfer,
} from '@/types/models';

import { apiClient } from './axios';

// 1. Applications API
export const applicationsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    status_id?: string;
    district_id?: string;
    crime_id?: string;
    crime_method_id?: string;
    application_number?: string;
    citizen_name?: string;
    card_number?: string;
    phone_number?: string;
    description?: string;
    date?: string;
    date_from?: string;
    date_to?: string;
    relations_filter?: string;
  }) => {
    const res = await apiClient.get<PaginatedResponse<Application>>('/applications', { params });
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get<Application>(`/applications/${id}`);
    return res.data;
  },
  getRelations: async (id: string) => {
    const res = await apiClient.get<ApplicationRelationsData>(`/applications/${id}/relations`);
    return res.data;
  },
  create: async (data: Record<string, unknown>) => {
    const res = await apiClient.post<Application>('/applications', data);
    return res.data;
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const res = await apiClient.patch<Application>(`/applications/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/applications/${id}`,
    );
    return res.data;
  },
  getStatistics: async (params?: { period?: string; startDate?: string; endDate?: string }) => {
    const res = await apiClient.get<DashboardStatistics>('/applications/statistics', { params });
    return res.data;
  },
  exportExcel: async (params?: Record<string, unknown>) => {
    const res = await apiClient.get('/applications/export/excel', {
      params,
      responseType: 'blob',
    });
    return res.data as Blob;
  },
};

export interface DashboardStatistics {
  period: string;
  startDate: string;
  endDate: string;
  summary: {
    totalApplications: number;
    newApplications: number;
    inProgressApplications: number;
    resolvedApplications: number;
    rejectedApplications: number;
    totalLoss: number;
    resolvedLoss: number;
    avgLoss: number;
    maxLoss: number;
    resolutionRate: number;
    comparison: {
      totalPercentChange: number;
      lossPercentChange: number;
    };
  };
  timeline: Array<{
    date: string;
    label: string;
    total: number;
    resolved: number;
    in_progress: number;
    new: number;
    loss: number;
  }>;
  byStatus: Array<{
    status: string;
    label: string;
    count: number;
    percent: number;
    color: string;
  }>;
  byDistrict: Array<{
    id: string;
    name: string;
    code: string | null;
    count: number;
    percent: number;
    totalLoss: number;
  }>;
  byCrime: Array<{
    id: string;
    article: string;
    title: string | null;
    gravity: string | null;
    count: number;
    percent: number;
  }>;
  byPaymentProvider: Array<{
    name: string;
    count: number;
    totalAmount: number;
    percent: number;
  }>;
  recentApplications: Array<{
    id: string;
    application_number: string | null;
    description: string | null;
    officer_notes?: string | null;
    status: string | null;
    date: string | null;
    created_at: string;
    citizen_name: string | null;
    district_name: string | null;
    crime_article: string | null;
    amount: number | null;
  }>;
}

// 2. Citizens API
export const citizensApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    passport?: string;
    phone_number?: string;
    card_number?: string;
    pinfl?: string;
    gender?: string;
    district_id?: string;
  }) => {
    const res = await apiClient.get<PaginatedResponse<Citizen>>('/citizens', {
      params,
    });
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get<Citizen>(`/citizens/${id}`);
    return res.data;
  },
  create: async (data: Partial<Citizen>) => {
    const res = await apiClient.post<Citizen>('/citizens', data);
    return res.data;
  },
  update: async (id: string, data: Partial<Citizen>) => {
    const res = await apiClient.patch<Citizen>(`/citizens/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/citizens/${id}`);
    return res.data;
  },
  exportExcel: async (params?: Record<string, unknown>) => {
    const res = await apiClient.get('/citizens/export/excel', {
      params,
      responseType: 'blob',
    });
    return res.data as Blob;
  },
};

// 3. Cards API
export const cardsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    citizen_id?: string;
    bank_id?: string;
    owner_state?: string;
    card_number?: string;
    owner_name?: string;
    phone_number?: string;
    expire_date?: string;
  }) => {
    const res = await apiClient.get<PaginatedResponse<Card>>('/cards', {
      params,
    });
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get<Card>(`/cards/${id}`);
    return res.data;
  },
  create: async (data: Partial<Card>) => {
    const res = await apiClient.post<Card>('/cards', data);
    return res.data;
  },
  update: async (id: string, data: Partial<Card>) => {
    const res = await apiClient.patch<Card>(`/cards/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/cards/${id}`);
    return res.data;
  },
  exportExcel: async (params?: Record<string, unknown>) => {
    const res = await apiClient.get('/cards/export/excel', {
      params,
      responseType: 'blob',
    });
    return res.data as Blob;
  },
};

// 4. Transfers API
export const transfersApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    application_id?: string;
    status?: string;
    payment_provider_id?: string;
    transaction_id?: string;
    sender_card_number?: string;
    receiver_card_number?: string;
    transfer_date?: string;
  }) => {
    const res = await apiClient.get<PaginatedResponse<Transfer>>('/transfers', {
      params,
    });
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get<Transfer>(`/transfers/${id}`);
    return res.data;
  },
  create: async (data: Record<string, unknown>) => {
    const res = await apiClient.post<Transfer>('/transfers', data);
    return res.data;
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const res = await apiClient.patch<Transfer>(`/transfers/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/transfers/${id}`);
    return res.data;
  },
  exportExcel: async (params?: Record<string, unknown>) => {
    const res = await apiClient.get('/transfers/export/excel', {
      params,
      responseType: 'blob',
    });
    return res.data as Blob;
  },
};

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
  }) => {
    const res = await apiClient.get<PaginatedResponse<CrimeMethod>>('/crime-methods', {
      params,
    });
    return res.data;
  },
  getAllActive: async () => {
    const res = await apiClient.get<CrimeMethod[]>('/crime-methods/active');
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get<CrimeMethod>(`/crime-methods/${id}`);
    return res.data;
  },
  create: async (data: Partial<CrimeMethod>) => {
    const res = await apiClient.post<CrimeMethod>('/crime-methods', data);
    return res.data;
  },
  update: async (id: string, data: Partial<CrimeMethod>) => {
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

// 9. MinIO Files API
export interface UploadedFile {
  url: string;
  proxy_url: string;
  key: string;
  filename: string;
  original_name: string;
  size: number;
  mimetype: string;
}

export const filesApi = {
  getViewUrl: getFileViewUrl,
  getDownloadUrl: getFileDownloadUrl,
  uploadSingle: async (file: File, folder = 'attachments') => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<UploadedFile>(`/files/upload?folder=${folder}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  uploadMultiple: async (files: File[], folder = 'attachments') => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    const res = await apiClient.post<UploadedFile[]>(
      `/files/upload-multiple?folder=${folder}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return res.data;
  },
};

export function getFileViewUrl(
  file?: UploadedFile | { key?: string; proxy_url?: string; url?: string } | null,
): string {
  if (!file) return '';
  if (file.key) {
    return `/files/view?key=${encodeURIComponent(file.key)}`;
  }
  if (file.proxy_url) {
    try {
      const parsed = new URL(file.proxy_url, window.location.origin);
      if (parsed.pathname.includes('/files/')) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      if (file.proxy_url.includes('/files/view')) {
        const idx = file.proxy_url.indexOf('/files/view');
        return file.proxy_url.substring(idx);
      }
    }
    return file.proxy_url;
  }
  if (file.url) {
    if (file.url.includes('/uvd-attachments/')) {
      const idx = file.url.indexOf('/uvd-attachments/');
      return file.url.substring(idx);
    }
    return file.url;
  }
  return '';
}

export function getFileDownloadUrl(
  file?: UploadedFile | { key?: string; proxy_url?: string; url?: string } | null,
): string {
  if (!file) return '';
  if (file.key) {
    return `/files/download?key=${encodeURIComponent(file.key)}`;
  }
  const viewUrl = getFileViewUrl(file);
  return viewUrl ? viewUrl.replace('/files/view', '/files/download') : '';
}

// 10. Users API
export interface UserItem {
  id: string;
  username: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  assigned_districts?: { id: string; name: string | null }[];
  created_at?: string;
  updated_at?: string;
}

export const usersApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    full_name?: string;
    username?: string;
    phone_number?: string;
    district_id?: string;
  }) => {
    const res = await apiClient.get<PaginatedResponse<UserItem>>('/users', { params });
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get<UserItem>(`/users/${id}`);
    return res.data;
  },
  create: async (data: {
    username: string;
    password?: string;
    role?: string;
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    assigned_district_ids?: string[];
  }) => {
    const res = await apiClient.post<UserItem>('/users', data);
    return res.data;
  },
  update: async (
    id: string,
    data: {
      username?: string;
      password?: string;
      role?: string;
      first_name?: string;
      last_name?: string;
      phone_number?: string;
      assigned_district_ids?: string[];
    },
  ) => {
    const res = await apiClient.patch<UserItem>(`/users/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/users/${id}`);
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

// ============================================================================
// ONLYOFFICE & WORD HUJJATLAR API
// ============================================================================
export interface ApplicationDocumentItem {
  id: string;
  application_id: string;
  title: string;
  file_name: string;
  file_key: string;
  file_url: string;
  file_type: string;
  size: number;
  version: number;
  doc_key: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentEditorConfigResponse {
  documentType: string;
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions?: Record<string, boolean>;
  };
  editorConfig: {
    callbackUrl: string;
    user: {
      id: string;
      name: string;
    };
    mode: string;
    lang: string;
    coEditing?: any;
    customization?: any;
  };
  documentId: string;
  applicationId: string;
  title: string;
}

export interface TemplateFieldConfig {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'date';
  required?: boolean;
  description?: string;
  category?: 'citizen' | 'incident' | 'card' | 'officer';
  defaultValue?: string;
}

export interface DocumentTemplateItem {
  id: string;
  title: string;
  defaultDocTitle?: string;
  description: string;
  category: 'Tushuntirish xati' | 'Bayonnoma' | 'Sanksiya' | 'Bo‘sh blank' | string;
  pageCount: number;
  isDynamic?: boolean;
  availableTags?: string[];
  fields: TemplateFieldConfig[];
}

export interface TemplatePreviewResponse {
  template: DocumentTemplateItem;
  prefilledData: Record<string, string>;
  script: 'lotin' | 'krill';
  applicationNumber?: string;
}

export interface GenerateFromTemplatePayload {
  templateId: string;
  script: 'lotin' | 'krill';
  title?: string;
  customData?: Record<string, string>;
}

export const documentsApi = {
  getByApplication: async (applicationId: string) => {
    const res = await apiClient.get<ApplicationDocumentItem[]>(
      `/applications/${applicationId}/documents`,
    );
    return res.data;
  },
  getTemplates: async (script?: 'lotin' | 'krill') => {
    const res = await apiClient.get<DocumentTemplateItem[]>('/documents/templates', {
      params: { script },
    });
    return res.data;
  },
  getTemplatePreview: async (
    applicationId: string,
    templateId: string,
    script: 'lotin' | 'krill' = 'lotin',
  ) => {
    const res = await apiClient.get<TemplatePreviewResponse>(
      `/applications/${applicationId}/documents/template-preview/${templateId}`,
      { params: { script } },
    );
    return res.data;
  },
  createFromTemplate: async (applicationId: string, payload: GenerateFromTemplatePayload) => {
    const res = await apiClient.post<ApplicationDocumentItem>(
      `/applications/${applicationId}/documents/from-template`,
      payload,
    );
    return res.data;
  },
  createBlank: async (applicationId: string, title?: string) => {
    const res = await apiClient.post<ApplicationDocumentItem>(
      `/applications/${applicationId}/documents/blank`,
      { title },
    );
    return res.data;
  },
  upload: async (applicationId: string, file: File, title?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    const res = await apiClient.post<ApplicationDocumentItem>(
      `/applications/${applicationId}/documents/upload`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return res.data;
  },
  getConfig: async (documentId: string) => {
    const res = await apiClient.get<DocumentEditorConfigResponse>(
      `/documents/${documentId}/config`,
    );
    return res.data;
  },
  delete: async (documentId: string) => {
    const res = await apiClient.delete<boolean>(`/documents/${documentId}`);
    return res.data;
  },
  getFileUrl: (documentId: string) => {
    const base = apiClient.defaults.baseURL || '';
    return `${base}/documents/${documentId}/file`;
  },
};

export interface TemplateVariableItem {
  tag: string;
  rawKey: string;
  label: string;
  modelName?: string;
  category?: string;
  description?: string;
  sampleValue: string;
}

export interface TemplateCategoryConfig {
  id: string;
  label: string;
  iconName: string;
  items: TemplateVariableItem[];
}

export interface DocumentTemplateRecord {
  id: string;
  title: string;
  title_krill?: string | null;
  displayTitle?: string;
  description?: string | null;
  category?: string | null;
  file_key: string;
  file_key_krill?: string | null;
  file_name: string;
  file_size: number;
  version: number;
  doc_key?: string | null;
  is_active: boolean;
  available_tags: string[];
  created_at: string;
  updated_at: string;
}

export const templatesApi = {
  getAll: async (params?: { script?: 'lotin' | 'krill'; search?: string; category?: string }) => {
    const res = await apiClient.get<DocumentTemplateRecord[]>('/templates', { params });
    return res.data;
  },
  getVariables: async () => {
    const res = await apiClient.get<TemplateCategoryConfig[]>('/templates/variables');
    return res.data;
  },
  getById: async (id: string) => {
    const res = await apiClient.get<DocumentTemplateRecord>(`/templates/${id}`);
    return res.data;
  },
  createBlank: async (data: {
    title: string;
    title_krill?: string;
    description?: string;
    category?: string;
  }) => {
    const res = await apiClient.post<DocumentTemplateRecord>('/templates/blank', data);
    return res.data;
  },
  upload: async (formData: FormData) => {
    const res = await apiClient.post<DocumentTemplateRecord>('/templates/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  update: async (id: string, data: Partial<DocumentTemplateRecord>) => {
    const res = await apiClient.put<DocumentTemplateRecord>(`/templates/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<boolean>(`/templates/${id}`);
    return res.data;
  },
  getConfig: async (id: string) => {
    const res = await apiClient.get<DocumentEditorConfigResponse>(`/templates/${id}/config`);
    return res.data;
  },
  testGenerate: async (
    id: string,
    payload?: { applicationId?: string; script?: 'lotin' | 'krill' },
  ) => {
    const res = await apiClient.post(`/templates/${id}/test-generate`, payload || {}, {
      responseType: 'blob',
    });
    return res.data;
  },
};

// 12. Financial Flow (Tarmoq Grafigi) API
export const financialFlowApi = {
  getGraph: async (params?: { searchCard?: string; riskLevel?: string; minAmount?: number }) => {
    const res = await apiClient.get<IGraphData>('/financial-flow/graph', { params });
    return res.data;
  },
  getCardDetails: async (cardNumber: string) => {
    const res = await apiClient.get<{ card: Card; node: any; linkedApplications: any[] }>(
      `/financial-flow/card/${cardNumber}`,
    );
    return res.data;
  },
};

// 13. Reports & Statistics (Hisobotlar & Statistika) API
export interface OperationalMatrixRow {
  index: number;
  district_name: string;
  district_id: string | null;

  // 1 kunda (kunlik)
  daily_total: number;
  daily_fraud: number;
  daily_theft: number;
  daily_insult: number;
  daily_photo_distribution: number;
  daily_mistake_transfer: number;
  daily_other: number;

  // Moddalar kesimida dinamika
  m168_month: number;
  m168_year: number;
  m169_month: number;
  m169_year: number;
  other_month: number;
  other_year: number;

  // Jami murojaatlar
  month_total: number;
  year_total: number;
  total_168_169: number;
  repeated_count: number;

  // Tezkor tadbirlar
  search_fund: number;
  card_blocked: number;
  sanction_taken: number;

  // Jarayonda
  in_progress_total: number;
  in_progress_initiate: number;
  in_progress_other: number;

  // Rad etilgan (JPK)
  rejected_total: number;
  rejected_deceived: number;
  rejected_credit: number;
  rejected_photo: number;
  rejected_insult: number;
  rejected_money: number;
  rejected_other: number;

  // Jinoyat ishi qo'zg'atilgan (J/I)
  initiated_total: number;

  // Boshqa qarorlar
  other_crime_case: number;
  combined_case: number;
  transferred_territory: number;
}

export interface OperationalMatrixResponse {
  date: string;
  rows: OperationalMatrixRow[];
  total: OperationalMatrixRow;
}

export interface DepartmentServiceItem {
  daily: number;
  period: number;
}

export interface DepartmentServicesRow {
  index: number;
  district_name: string;
  district_id: string | null;
  organized_crime: DepartmentServiceItem;
  criminal_investigation: DepartmentServiceItem;
  cyber_security: DepartmentServiceItem;
  crime_prevention: DepartmentServiceItem;
  traffic_safety: DepartmentServiceItem;
  public_order: DepartmentServiceItem;
  probation: DepartmentServiceItem;
  spiritual_educational: DepartmentServiceItem;
  total: DepartmentServiceItem;
}

export interface DepartmentServicesResponse {
  date: string;
  startDate: string;
  endDate: string;
  rows: DepartmentServicesRow[];
  total: DepartmentServicesRow;
}

export interface RegistryReportItem {
  index: number;
  id: string;
  source: string;
  officer: string;
  date: string;
  district: string;
  application_number: string;
  author_name: string;
  description: string;
  crime_type: string;
  loss_amount: number;
  crime_method: string;
  additional_notes: string;
  card_numbers: string;
  banks: string;
  providers: string;
  phone_number: string;
  birth_date: string;
}

export interface RegistryReportResponse {
  items: RegistryReportItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const reportsApi = {
  getOperationalMatrix: async (params?: { date?: string; districtId?: string }) => {
    const res = await apiClient.get<OperationalMatrixResponse>(
      '/applications/reports/operational-matrix',
      {
        params,
      },
    );
    return res.data;
  },
  exportOperationalMatrixExcel: async (params?: { date?: string; districtId?: string }) => {
    const res = await apiClient.get('/applications/reports/operational-matrix/export', {
      params,
      responseType: 'blob',
    });
    return res.data as Blob;
  },
  getDepartmentServices: async (params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const res = await apiClient.get<DepartmentServicesResponse>(
      '/applications/reports/department-services',
      {
        params,
      },
    );
    return res.data;
  },
  exportDepartmentServicesExcel: async (params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const res = await apiClient.get('/applications/reports/department-services/export', {
      params,
      responseType: 'blob',
    });
    return res.data as Blob;
  },
  getRegistryReport: async (params?: {
    search?: string;
    applicationNumber?: string;
    citizenName?: string;
    cardNumber?: string;
    phoneNumber?: string;
    description?: string;
    districtId?: string;
    crimeId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<RegistryReportResponse>('/applications/reports/registry', {
      params,
    });
    return res.data;
  },
  exportRegistryExcel: async (params?: {
    search?: string;
    applicationNumber?: string;
    citizenName?: string;
    cardNumber?: string;
    phoneNumber?: string;
    description?: string;
    districtId?: string;
    crimeId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const res = await apiClient.get('/applications/reports/registry/export', {
      params,
      responseType: 'blob',
    });
    return res.data as Blob;
  },
};

// ============================================================================
// 15. Intelligence, Global Search (Ctrl+K), Live Radar & 360° Dossiers API
// ============================================================================
export const intelligenceApi = {
  globalSearch: async (params: { q: string; category?: string; limit?: number }) => {
    const res = await apiClient.get<GlobalSearchResponse>('/intelligence/search', { params });
    return res.data;
  },
  checkRadar: async (params: { type: string; value: string; excludeAppId?: string }) => {
    const res = await apiClient.get<LiveRadarResponse>('/intelligence/radar', { params });
    return res.data;
  },
  expandNode: async (params: { nodeType: string; entityId: string }) => {
    const res = await apiClient.get<INetworkGraph>('/intelligence/expand-node', { params });
    return res.data;
  },
  getCitizenDossier: async (id: string) => {
    const res = await apiClient.get<FullDossierResponse>(`/intelligence/dossier/citizen/${id}`);
    return res.data;
  },
  getCardDossier: async (id: string) => {
    const res = await apiClient.get<FullDossierResponse>(`/intelligence/dossier/card/${id}`);
    return res.data;
  },
  getPhoneDossier: async (id: string) => {
    const res = await apiClient.get<FullDossierResponse>(`/intelligence/dossier/phone/${id}`);
    return res.data;
  },
  getIdentifierDossier: async (id: string) => {
    const res = await apiClient.get<FullDossierResponse>(`/intelligence/dossier/identifier/${id}`);
    return res.data;
  },
  exportDossier: async (
    entityType: 'citizen' | 'card' | 'phone' | 'identifier',
    id: string,
    format: 'excel' | 'docx',
  ) => {
    const res = await apiClient.get(`/intelligence/dossier/${entityType}/${id}/export/${format}`, {
      responseType: 'blob',
    });
    return res.data as Blob;
  },
  addPhoneToCitizen: async (
    citizenId: string,
    data: { phone_number: string; label?: string; notes?: string; is_primary?: boolean },
  ) => {
    const res = await apiClient.post<{
      phone: PhoneRecord;
      wasAlreadyInDatabase: boolean;
      newlyLinkedAppsCount: number;
    }>(`/intelligence/dossier/citizen/${citizenId}/phones`, data);
    return res.data;
  },
  removePhone: async (phoneId: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/intelligence/phones/${phoneId}`,
    );
    return res.data;
  },
  addCardToCitizen: async (
    citizenId: string,
    data: {
      card_number: string;
      expire_date?: string;
      bank_id?: string;
      bank_name?: string;
      full_name?: string;
    },
  ) => {
    const res = await apiClient.post<{
      card: Card;
      wasAlreadyInDatabase: boolean;
      newlyLinkedAppsCount: number;
    }>(`/intelligence/dossier/citizen/${citizenId}/cards`, data);
    return res.data;
  },
  unlinkCardFromCitizen: async (cardId: string) => {
    const res = await apiClient.patch<{ success: boolean; message: string }>(
      `/intelligence/cards/${cardId}/unlink-citizen`,
    );
    return res.data;
  },
  addIdentifierToCitizen: async (
    citizenId: string,
    data: { type: string; value: string; type_label?: string; notes?: string },
  ) => {
    const res = await apiClient.post<{
      identifier: DigitalIdentifierRecord;
      newlyLinkedAppsCount: number;
    }>(`/intelligence/dossier/citizen/${citizenId}/identifiers`, data);
    return res.data;
  },
  removeIdentifier: async (identifierId: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/intelligence/identifiers/${identifierId}`,
    );
    return res.data;
  },
  bindEntityToCitizen: async (data: {
    entity_type: 'card' | 'phone' | 'identifier';
    entity_id: string;
    citizen_id: string;
  }) => {
    const res = await apiClient.post<{ success: boolean; message: string }>(
      '/intelligence/bind-to-citizen',
      data,
    );
    return res.data;
  },
  createTransitTransfer: async (data: {
    sender_card_id?: string;
    sender_card_number?: string;
    sender_owner_name?: string;
    receiver_card_id?: string;
    receiver_card_number?: string;
    receiver_owner_name?: string;
    amount: number;
    currency?: string;
    transfer_date?: string;
    transfer_time?: string;
    payment_provider_id?: string;
    payment_provider_name?: string;
    transaction_id?: string;
    application_id?: string;
  }) => {
    const res = await apiClient.post<Transfer>('/intelligence/transfers/transit', data);
    return res.data;
  },
  linkCitizenRoleToApplication: async (data: {
    application_id: string;
    citizen_id: string;
    role: EntityLinkRole;
    note?: string;
  }) => {
    const res = await apiClient.post('/intelligence/application-role-link', data);
    return res.data;
  },
  confirmProbableMatch: async (data: { citizen_id: string; card_id: string }) => {
    const res = await apiClient.post<{ success: boolean; message: string }>(
      '/intelligence/confirm-match',
      data,
    );
    return res.data;
  },
};
