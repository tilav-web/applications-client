import { QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 soniya kesh — sahifalar o'rtasida keraksiz qayta so'rovlarni kamaytiradi
      gcTime: 1000 * 60 * 15, // 15 minut kesh xotirada saqlanadi
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;
        if (isAxiosError(error)) {
          const status = error.response?.status;
          // 4xx foydalanuvchi / ruxsat xatolarida qayta urinmaymiz
          if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
            return false;
          }
        }
        return true;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
