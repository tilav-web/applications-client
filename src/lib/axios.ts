import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const API_BASE_URL = BASE_URL;

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Access token faqat xotirada (in-memory) saqlanadi — localStorage XSS xavfini bartaraf etish uchun
let inMemoryAccessToken: string | null = null;

export const setInMemoryAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

export const getInMemoryAccessToken = (): string | null => inMemoryAccessToken;

// Request interceptor: Attach authorization header if in-memory token exists (HttpOnly cookie also sent via withCredentials)
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (inMemoryAccessToken && config.headers) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

type AuthClearCallback = () => void;
type TokenUpdateCallback = (token: string) => void;

let authClearCallback: AuthClearCallback | null = null;
let tokenUpdateCallback: TokenUpdateCallback | null = null;

export const setAuthClearCallback = (cb: AuthClearCallback) => {
  authClearCallback = cb;
};

export const setTokenUpdateCallback = (cb: TokenUpdateCallback) => {
  tokenUpdateCallback = cb;
};

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: Automatic token update & silent refresh handling
apiClient.interceptors.response.use(
  (response) => {
    // Check for new access token in headers
    const newAccessToken = response.headers['x-new-access-token'];
    if (newAccessToken && typeof newAccessToken === 'string') {
      inMemoryAccessToken = newAccessToken;
      if (tokenUpdateCallback) {
        tokenUpdateCallback(newAccessToken);
      }
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Don't intercept refresh or login 401s
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers && token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<{ access_token: string }>(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true, timeout: 15000 },
        );

        const newAccessToken = data.access_token;
        inMemoryAccessToken = newAccessToken;
        if (tokenUpdateCallback) {
          tokenUpdateCallback(newAccessToken);
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        inMemoryAccessToken = null;
        try {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth-storage');
          localStorage.removeItem('global_recent_searches_v1');
        } catch {
          // ignore storage errors
        }
        if (authClearCallback) {
          authClearCallback();
        }
        // If in browser and not on login page, redirect
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
