import type { PaginatedResponse } from '@/types/models';

import { apiClient } from '../axios';

// 10. Users API
export interface UserItem {
  id: string;
  username: string;
  role: string;
  is_root?: boolean;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  assigned_districts?: { id: string; name: string | null }[];
  created_at?: string;
  updated_at?: string;
}

export interface UserStatsResponse {
  total: number;
  withDistrictsCount: number;
  rootCount: number;
  byRole: Array<{ role: string; count: number; percent: number }>;
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
  getStats: async () => {
    const res = await apiClient.get<UserStatsResponse>('/users/stats');
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

// ============================================================================
// AUDIT LOG & TRAFFIC / CROWDSEC SECURITY API (SUPER_ADMIN)
// ============================================================================
export interface AuditLogItem {
  id: string;
  user_id: string | null;
  username: string | null;
  role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  summary: string | null;
  details: Record<string, unknown> | null;
  method: string;
  path: string;
  ip: string | null;
  user_agent: string | null;
  status_code: number;
  is_success: boolean;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  duration_ms: number;
  created_at: string;
}

export interface AuditStatsResponse {
  total_logs: number;
  today_count: number;
  failed_auth_24h: number;
  exports_24h: number;
  deletes_24h: number;
  critical_24h: number;
}

export interface AuditSettingsResponse {
  audit_retention_days: number;
  audit_archive_to_minio: boolean;
}

export interface TrafficOverviewResponse {
  timeline: { time: string; requests: number }[];
  status_breakdown: {
    total: number;
    '2xx': number;
    '3xx': number;
    '4xx': number;
    '401': number;
    '403': number;
    '429': number;
    '5xx': number;
  };
  top_ips: { ip: string; requests: number; errors: number; is_blocked: boolean }[];
  top_endpoints: { endpoint: string; requests: number }[];
  blocked_ips: {
    ip: string;
    reason: string;
    blocked_by: string;
    blocked_at: string;
    expires_at: string;
  }[];
  crowdsec: {
    connected: boolean;
    decisions: {
      id?: number;
      origin?: string;
      type?: string;
      scope?: string;
      value?: string;
      duration?: string;
      scenario?: string;
    }[];
    error?: string;
  };
}

export const auditApi = {
  getLogs: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
    entity_type?: string;
    severity?: string;
    date_from?: string;
    date_to?: string;
  }) => {
    const res = await apiClient.get<PaginatedResponse<AuditLogItem>>('/audit/logs', { params });
    return res.data;
  },
  getStats: async () => {
    const res = await apiClient.get<AuditStatsResponse>('/audit/stats');
    return res.data;
  },
  getSettings: async () => {
    const res = await apiClient.get<AuditSettingsResponse>('/audit/settings');
    return res.data;
  },
  updateSettings: async (data: {
    audit_retention_days?: number;
    audit_archive_to_minio?: boolean;
  }) => {
    const res = await apiClient.patch<AuditSettingsResponse>('/audit/settings', data);
    return res.data;
  },
  runCleanup: async () => {
    const res = await apiClient.post<{
      deleted_count: number;
      archived_key: string | null;
      retention_days: number;
    }>('/audit/cleanup');
    return res.data;
  },
  exportExcel: async (params?: Record<string, string | undefined>) => {
    const res = await apiClient.get('/audit/export/excel', {
      params,
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_jurnal_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  },
  getTraffic: async () => {
    const res = await apiClient.get<TrafficOverviewResponse>('/audit/traffic');
    return res.data;
  },
  blockIp: async (data: { ip: string; reason?: string; duration_hours?: number }) => {
    const res = await apiClient.post('/audit/traffic/block-ip', data);
    return res.data;
  },
  unblockIp: async (ip: string) => {
    const res = await apiClient.delete(`/audit/traffic/block-ip/${encodeURIComponent(ip)}`);
    return res.data;
  },
};

// =========================================================================
// 16. NOTIFICATIONS & TELEGRAM BOT API
// =========================================================================

export interface NotificationItem {
  id: string;
  user_id: string;
  type:
    | 'HIGH_VALUE_ALERT'
    | 'CROSS_CASE_MATCH'
    | 'SLA_WARNING'
    | 'SLA_OVERDUE'
    | 'NEW_APPLICATION'
    | 'STATUS_CHANGED'
    | 'SECURITY_ALERT'
    | 'DAILY_DIGEST'
    | 'SYSTEM';
  priority: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  link_url: string | null;
  metadata?: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  sent_to_telegram: boolean;
  created_at: string;
}

export interface NotificationPrefs {
  telegram_enabled: boolean;
  high_value: boolean;
  cross_case: boolean;
  sla: boolean;
  new_application: boolean;
  status_changed: boolean;
  daily_digest: boolean;
  security: boolean;
}

export interface MyNotificationPrefsResponse {
  telegram_connected: boolean;
  telegram_username: string | null;
  telegram_first_name: string | null;
  bot_available: boolean;
  bot_username: string | null;
  bot_name: string | null;
  prefs: NotificationPrefs;
}

export interface TelegramBotConfigView {
  is_configured: boolean;
  enabled: boolean;
  polling_active: boolean;
  bot_id: string | null;
  bot_username: string | null;
  bot_name: string | null;
  token_masked: string | null;
}

export interface NotificationAdminSettingsResponse {
  bot: TelegramBotConfigView;
  linkedUsersCount: number;
  queue?: {
    connected: boolean;
    delayed: number;
    waiting: number;
    active: number;
    failed: number;
  };
  rules: {
    high_value_threshold: number;
    sla_days: number;
    sla_warn_hours_before?: number;
    sla_urgent_hours_before?: number;
    sla_escalate_hours_after?: number;
    sla_max_extension_days?: number;
    daily_digest_enabled: boolean;
    daily_digest_hour: number;
  };
}

export const notificationsApi = {
  getMine: async (params?: { page?: number; limit?: number }) => {
    const res = await apiClient.get<{
      items: NotificationItem[];
      unreadCount: number;
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>('/notifications', { params });
    return res.data;
  },
  markRead: async (id: string) => {
    const res = await apiClient.patch<{ success: boolean }>(`/notifications/${id}/read`);
    return res.data;
  },
  markAllRead: async () => {
    const res = await apiClient.post<{ success: boolean }>('/notifications/read-all');
    return res.data;
  },
  getPreferences: async () => {
    const res = await apiClient.get<MyNotificationPrefsResponse>('/notifications/preferences');
    return res.data;
  },
  updatePreferences: async (data: Partial<NotificationPrefs>) => {
    const res = await apiClient.patch<MyNotificationPrefsResponse>(
      '/notifications/preferences',
      data,
    );
    return res.data;
  },
  generateTelegramLink: async () => {
    const res = await apiClient.post<{
      available: boolean;
      deep_link?: string;
      bot_username?: string;
      expires_in_minutes?: number;
      message?: string;
    }>('/notifications/telegram/link-token');
    return res.data;
  },
  unlinkTelegram: async () => {
    const res = await apiClient.delete<{ success: boolean }>('/notifications/telegram/unlink');
    return res.data;
  },
  sendTest: async () => {
    const res = await apiClient.post<{ success: boolean; sentToTelegram: boolean }>(
      '/notifications/test',
    );
    return res.data;
  },
  getAdminSettings: async () => {
    const res = await apiClient.get<NotificationAdminSettingsResponse>(
      '/notifications/admin/settings',
    );
    return res.data;
  },
  updateAdminRules: async (data: {
    high_value_threshold?: number;
    sla_days?: number;
    sla_warn_hours_before?: number;
    sla_urgent_hours_before?: number;
    sla_escalate_hours_after?: number;
    sla_max_extension_days?: number;
    daily_digest_enabled?: boolean;
    daily_digest_hour?: number;
  }) => {
    const res = await apiClient.patch<NotificationAdminSettingsResponse>(
      '/notifications/admin/settings',
      data,
    );
    return res.data;
  },
  reconcileSlaQueue: async () => {
    const res = await apiClient.post<{ scheduled: number }>('/notifications/admin/sla/reconcile');
    return res.data;
  },
  configureTelegramBot: async (data: { token: string; enabled?: boolean }) => {
    const res = await apiClient.post<TelegramBotConfigView>(
      '/notifications/admin/telegram/configure',
      data,
    );
    return res.data;
  },
  toggleTelegramBot: async (enabled: boolean) => {
    const res = await apiClient.post<TelegramBotConfigView>(
      '/notifications/admin/telegram/toggle',
      {
        enabled,
      },
    );
    return res.data;
  },
  removeTelegramBot: async () => {
    const res = await apiClient.delete<TelegramBotConfigView>('/notifications/admin/telegram');
    return res.data;
  },
  sendDigestNow: async () => {
    const res = await apiClient.post<{ sentCount: number }>('/notifications/admin/digest/send-now');
    return res.data;
  },
};
