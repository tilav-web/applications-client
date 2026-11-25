import type {
  AppealType,
  Application,
  ApplicationChainResponse,
  ApplicationRelationsData,
  ApplicationRepeatType,
  Card,
  Citizen,
  CitizenPreviousApplication,
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
    repeat_type?: string;
    appeal_type?: string;
    submission_form?: string;
    awareness_status_id?: string;
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
  getChain: async (id: string) => {
    const res = await apiClient.get<ApplicationChainResponse>(`/applications/${id}/chain`);
    return res.data;
  },
  getByCitizen: async (citizenId: string, excludeId?: string) => {
    const res = await apiClient.get<CitizenPreviousApplication[]>(
      `/applications/by-citizen/${citizenId}`,
      { params: excludeId ? { exclude_id: excludeId } : undefined },
    );
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
  downloadImportTemplate: async () => {
    const res = await apiClient.get('/applications/import/template', {
      responseType: 'blob',
    });
    return res.data as Blob;
  },
  previewExcelImport: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ApplicationImportPreviewResponse>(
      '/applications/import/preview',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data;
  },
  commitExcelImport: async (file: File, options?: { skipErrors?: boolean }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('skip_errors', String(options?.skipErrors !== false));
    const res = await apiClient.post<ApplicationImportCommitResponse>(
      '/applications/import/commit',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data;
  },
  downloadImportErrorReport: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/applications/import/error-report', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'blob',
    });
    return res.data as Blob;
  },
};

export interface ApplicationImportCellError {
  sheet: 'APPLICATIONS' | 'EXTRA_TRANSFERS' | 'SUSPECT_CLUES';
  rowNumber: number;
  columnKey: string;
  message: string;
}

export interface ApplicationImportPreviewRow {
  rowNumber: number;
  linkCode: string | null;
  applicationNumber: string | null;
  date: string | null;
  districtName: string | null;
  citizenFullName: string | null;
  citizenIdentifier: string | null;
  crimeLabel: string | null;
  totalAmount: number;
  currency: string;
  transfersCount: number;
  suspectCluesCount: number;
  status: 'READY' | 'DUPLICATE' | 'ERROR';
  duplicateReason?: string | null;
  matchedExistingCitizen?: boolean;
  matchedExistingCards?: string[];
  errors: string[];
  cellErrors: ApplicationImportCellError[];
  warnings: string[];
}

export interface ApplicationImportOrphanError {
  sheet: 'EXTRA_TRANSFERS' | 'SUSPECT_CLUES';
  rowNumber: number;
  appRef: string | null;
  message: string;
  columnKey: string;
}

export interface ApplicationImportPreviewResponse {
  templateValid: boolean;
  totalRows: number;
  readyCount: number;
  duplicateCount: number;
  errorCount: number;
  orphanErrorsCount: number;
  ignoredExtraColumns: string[];
  rows: ApplicationImportPreviewRow[];
  orphanErrors: ApplicationImportOrphanError[];
}

export interface ApplicationImportCommitResponse {
  totalRows: number;
  createdCount: number;
  skippedDuplicateCount: number;
  failedCount: number;
  createdApplications: Array<{
    id: string;
    rowNumber: number;
    application_number: string | null;
    citizen_name: string | null;
  }>;
  skippedDuplicates: Array<{
    rowNumber: number;
    application_number: string | null;
    reason: string;
  }>;
  failedRows: Array<{
    rowNumber: number;
    application_number: string | null;
    errors: string[];
  }>;
  errorReportBase64: string | null;
  errorReportFileName: string | null;
}

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
  byRepeatType?: {
    primary: number;
    repeat: number;
    duplicate: number;
    supplemental: number;
  };
  byAppealType?: {
    appeal: number;
    complaint: number;
    proposal: number;
  };
  bySubmissionForm?: {
    written: number;
    oral: number;
    electronic: number;
  };
  byAwarenessStatus?: {
    informedCount: number;
    notInformedCount: number;
    unspecifiedCount: number;
    informedPercent: number;
    items: Array<{
      id: string;
      name: string;
      code: string | null;
      is_informed: boolean;
      source_channel: string | null;
      count: number;
      percent: number;
    }>;
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
    code?: string | null;
    region_id?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    count: number;
    percent: number;
    totalLoss: number;
  }>;
  byNeighborhood?: Array<{
    id: string;
    name: string;
    district_id: string;
    district_name: string | null;
    latitude?: number | null;
    longitude?: number | null;
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
    appeal_type?: AppealType;
    repeat_type?: ApplicationRepeatType;
    repeat_sequence?: number;
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
