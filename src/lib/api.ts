import type {
  Application,
  ApplicationRelationsData,
  ApplicationStatusItem,
  Bank,
  Card,
  Citizen,
  Crime,
  District,
  IGraphData,
  Mahalla,
  PaginatedResponse,
  PaymentProvider,
  Transfer,
} from '@/types/models';

import { apiClient } from './axios';

// 1. Applications API
export const applicationsApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
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
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    passport?: string;
    phone_number?: string;
    pinfl?: string;
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
};

// 3. Cards API
export const cardsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    citizen_id?: string;
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
};

// 4. Transfers API
export const transfersApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    application_id?: string;
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
  created_at?: string;
  updated_at?: string;
}

export const usersApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
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
  createFromTemplate: async (
    applicationId: string,
    payload: GenerateFromTemplatePayload,
  ) => {
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
  category: string;
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
  category: string;
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
  getAll: async (params?: { script?: 'lotin' | 'krill'; category?: string; search?: string }) => {
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
  createBlank: async (data: { title: string; title_krill?: string; description?: string; category?: string }) => {
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
  testGenerate: async (id: string, payload?: { applicationId?: string; script?: 'lotin' | 'krill' }) => {
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

