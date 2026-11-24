import { apiClient } from '../axios';

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
    const res = await apiClient.post<UploadedFile>(
      `/files/upload?folder=${encodeURIComponent(folder)}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return res.data;
  },
  uploadMultiple: async (files: File[], folder = 'attachments') => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    const res = await apiClient.post<UploadedFile[]>(
      `/files/upload-multiple?folder=${encodeURIComponent(folder)}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return res.data;
  },
};

function sanitizeSafeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  // Nisbiy yo'llar ("/files/...", "/uvd-attachments/...") xavfsiz, "//" protokol-nisbiy URL ni bloklaymiz
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (
      parsed.protocol === 'http:' ||
      parsed.protocol === 'https:' ||
      parsed.protocol === 'blob:'
    ) {
      return trimmed;
    }
  } catch {
    return '';
  }
  return '';
}

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
        return sanitizeSafeUrl(file.proxy_url.substring(idx));
      }
    }
    return sanitizeSafeUrl(file.proxy_url);
  }
  if (file.url) {
    if (file.url.includes('/uvd-attachments/')) {
      const idx = file.url.indexOf('/uvd-attachments/');
      return sanitizeSafeUrl(file.url.substring(idx));
    }
    return sanitizeSafeUrl(file.url);
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
    coEditing?: Record<string, unknown>;
    customization?: Record<string, unknown>;
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
  getByDetectedCrime: async (detectedCrimeId: string) => {
    const res = await apiClient.get<ApplicationDocumentItem[]>(
      `/detected-crimes/${detectedCrimeId}/documents`,
    );
    return res.data;
  },
  createBlankForDetectedCrime: async (detectedCrimeId: string, title?: string) => {
    const res = await apiClient.post<ApplicationDocumentItem>(
      `/detected-crimes/${detectedCrimeId}/documents/blank`,
      { title },
    );
    return res.data;
  },
  uploadForDetectedCrime: async (detectedCrimeId: string, file: File, title?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    const res = await apiClient.post<ApplicationDocumentItem>(
      `/detected-crimes/${detectedCrimeId}/documents/upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
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
      `/applications/${encodeURIComponent(applicationId)}/documents/template-preview/${encodeURIComponent(templateId)}`,
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
    return `${base}/documents/${encodeURIComponent(documentId)}/file`;
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
