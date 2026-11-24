import type { PaginatedResponse } from '@/types/models';

import { apiClient } from '../axios';

export const detectionSourcesApi = {
  getAll: async (includeInactive = false) => {
    const res = await apiClient.get<import('@/types/models').DetectionSource[]>(
      '/detection-sources',
      { params: includeInactive ? { include_inactive: 'true' } : undefined },
    );
    return res.data;
  },
  create: async (data: {
    name: string;
    code?: string;
    description?: string;
    sort_order?: number;
    is_active?: boolean;
  }) => {
    const res = await apiClient.post<import('@/types/models').DetectionSource>(
      '/detection-sources',
      data,
    );
    return res.data;
  },
  update: async (
    id: string,
    data: Partial<{
      name: string;
      code?: string;
      description?: string;
      sort_order?: number;
      is_active?: boolean;
    }>,
  ) => {
    const res = await apiClient.patch<import('@/types/models').DetectionSource>(
      `/detection-sources/${id}`,
      data,
    );
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/detection-sources/${id}`,
    );
    return res.data;
  },
};

export const detectedCrimeStatusesApi = {
  getAll: async (includeInactive = false) => {
    const res = await apiClient.get<import('@/types/models').DetectedCrimeStatusItem[]>(
      '/detected-crime-statuses',
      { params: includeInactive ? { include_inactive: 'true' } : undefined },
    );
    return res.data;
  },
  create: async (payload: {
    name: string;
    code?: string;
    color?: string;
    is_default?: boolean;
    is_final?: boolean;
    sort_order?: number;
  }) => {
    const res = await apiClient.post<import('@/types/models').DetectedCrimeStatusItem>(
      '/detected-crime-statuses',
      payload,
    );
    return res.data;
  },
  update: async (
    id: string,
    payload: {
      name?: string;
      code?: string;
      color?: string;
      is_default?: boolean;
      is_final?: boolean;
      sort_order?: number;
      is_active?: boolean;
    },
  ) => {
    const res = await apiClient.patch<import('@/types/models').DetectedCrimeStatusItem>(
      `/detected-crime-statuses/${id}`,
      payload,
    );
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/detected-crime-statuses/${id}`,
    );
    return res.data;
  },
};

export const detectedCrimesApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    district_id?: string;
    crime_id?: string;
    detection_source_id?: string;
    crime_status_id?: string;
    status_id?: string;
    qualification_type?: string;
  }) => {
    const res = await apiClient.get<PaginatedResponse<import('@/types/models').DetectedCrime>>(
      '/detected-crimes',
      { params },
    );
    return res.data;
  },
  getStats: async () => {
    const res = await apiClient.get<{
      total: number;
      criminalCount: number;
      adminCount: number;
      preInvCount: number;
      finalCount: number;
      inProgressCount: number;
      overdueCount: number;
    }>('/detected-crimes/stats');
    return res.data;
  },
  getMapStats: async (params?: { period?: string; startDate?: string; endDate?: string }) => {
    const res = await apiClient.get<{
      total: number;
      totalDamage: number;
      byDistrict: Array<{
        id: string;
        name: string;
        region_id?: string | null;
        latitude?: number | null;
        longitude?: number | null;
        count: number;
        totalLoss: number;
        percent: number;
      }>;
      byNeighborhood: Array<{
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
    }>('/detected-crimes/map-stats', { params });
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get<import('@/types/models').DetectedCrime>(
      `/detected-crimes/${id}`,
    );
    return res.data;
  },
  getByCitizen: async (citizenId: string) => {
    const res = await apiClient.get<
      Array<{
        id: string;
        case_number: string | null;
        title: string;
        qualification_type: import('@/types/models').DetectedCrimeQualification;
        crime_article: string | null;
        mjtk_article: string | null;
        district_name: string | null;
        source_name: string | null;
        status_name: string | null;
        status_color: string | null;
        role_in_crime: string;
        detention_status: string;
        detected_at: string;
      }>
    >(`/detected-crimes/citizen/${citizenId}`);
    return res.data;
  },
  checkCitizenRepeat: async (citizenId: string, excludeId?: string) => {
    const res = await apiClient.get<{
      isRepeat: boolean;
      count: number;
      items: Array<{
        id: string;
        case_number: string | null;
        title: string;
        qualification_type: string;
        article: string | null;
        detected_at: string;
        role_in_crime: string;
      }>;
    }>(`/detected-crimes/citizen/${citizenId}/repeat-check`, {
      params: excludeId ? { exclude_id: excludeId } : undefined,
    });
    return res.data;
  },
  create: async (data: Record<string, unknown>) => {
    const res = await apiClient.post<import('@/types/models').DetectedCrime>(
      '/detected-crimes',
      data,
    );
    return res.data;
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const res = await apiClient.patch<import('@/types/models').DetectedCrime>(
      `/detected-crimes/${id}`,
      data,
    );
    return res.data;
  },
  extendDeadline: async (
    id: string,
    data: { extend_days?: number; reason: string; prosecutor_approval_number?: string },
  ) => {
    const res = await apiClient.post<import('@/types/models').DetectedCrime>(
      `/detected-crimes/${id}/extend-deadline`,
      data,
    );
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/detected-crimes/${id}`,
    );
    return res.data;
  },
  exportExcel: async (params?: Record<string, unknown>) => {
    const res = await apiClient.get('/detected-crimes/export/excel', {
      params,
      responseType: 'blob',
    });
    return res.data as Blob;
  },
};
