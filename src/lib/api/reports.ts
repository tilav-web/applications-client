import { apiClient } from '../axios';

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
  awareness_status: string;
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
