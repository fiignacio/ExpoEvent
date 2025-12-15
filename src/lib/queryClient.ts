import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos - datos considerados frescos
      gcTime: 1000 * 60 * 30, // 30 minutos en cache
      refetchOnWindowFocus: false, // no refetch al volver a la pestaña
      retry: 1, // solo 1 retry en errores
    },
  },
});
