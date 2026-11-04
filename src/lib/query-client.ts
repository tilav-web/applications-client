import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Stale-while-revalidate: ma'lumot keshdan zudlik bilan chiqadi va fonda serverdan yangilanadi
      gcTime: 1000 * 60 * 15, // 15 minut kesh xotirada saqlanadi
      retry: 1,
      refetchOnWindowFocus: true, // Brauzer oynasiga qaytganda ma'lumotlarni yangilash
      refetchOnMount: 'always', // Sahifaga o'tganda har doim eng so'nggi ma'lumotlarni tekshirib olish
    },
    mutations: {
      retry: 0,
    },
  },
});
