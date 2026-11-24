import type {
  Application,
  ApplicationRelationsData,
  Card,
  Citizen,
  PaginatedResponse,
  Transfer,
} from '@/types/models';

import { apiClient } from '../axios';

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
    min_amount?: number;
    max_amount?: number;
    relations_filter?: string;
    sla_filter?: string;
  }) => {
    const res = await apiClient.get<PaginatedResponse<Application>>('/applications', { params });
    return res.data;
  },
  getSlaOverview: async () => {
    const res = await apiClient.get<import('@/types/models').SlaOverviewResponse>(
      '/applications/sla/overview',
    );
    return res.data;
  },
  extendDeadline: async (
    id: string,
    data: {
      new_deadline_at?: string;
      extend_days?: number;
      reason: string;
      prosecutor_approval_number?: string;
      prosecutor_approval_date?: string;
      switch_to_extended_status?: boolean;
    },
  ) => {
    const res = await apiClient.post<Application>(`/applications/${id}/extend-deadline`, data);
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
  exportCyberControlExcel: async (ids: string[]) => {
    const res = await apiClient.post(
      '/applications/export/cybercontrol-template',
      { ids },
      { responseType: 'blob' },
    );
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
  byMahalla?: Array<{
    id: string;
    name: string;
    district_id: string;
    district_name: string | null;
    count: number;
    totalLoss: number;
    percent: number;
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
  scopedDistrictNames?: string[] | null;
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
