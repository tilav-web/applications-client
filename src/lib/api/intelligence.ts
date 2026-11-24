import type {
  Card,
  DigitalIdentifierRecord,
  EntityLinkRole,
  FullDossierResponse,
  GlobalSearchResponse,
  IGraphData,
  IGraphNode,
  INetworkGraph,
  LinkedApplicationInfo,
  LiveRadarResponse,
  PhoneRecord,
  Transfer,
} from '@/types/models';

import { apiClient } from '../axios';

// 12. Financial Flow (Tarmoq Grafigi) API
export const financialFlowApi = {
  getGraph: async (params?: { searchCard?: string; riskLevel?: string; minAmount?: number }) => {
    const res = await apiClient.get<IGraphData>('/financial-flow/graph', { params });
    return res.data;
  },
  getCardDetails: async (cardNumber: string) => {
    const res = await apiClient.get<{
      card: Card;
      node: IGraphNode | null;
      linkedApplications: LinkedApplicationInfo[];
    }>(`/financial-flow/card/${cardNumber}`);
    return res.data;
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
    destination_type?: string;
    destination_platform?: string;
    destination_value?: string;
    destination_label?: string;
    destination_details?: Record<string, unknown>;
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
