import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // gcTime largo: mantener las consultas en cache para que la persistencia
      // (offline) tenga datos que hidratar aunque pase tiempo entre sesiones.
      gcTime: 1000 * 60 * 60 * 24 * 14, // 14 días
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Por defecto las mutaciones NO se ponen en cola offline: fallan rápido
      // (mutateAsync rechaza y el catch muestra el error) en vez de colgarse.
      // La única mutación offline (registrar pago) sobrescribe a 'online' en
      // @/lib/offline para SÍ pausarse y encolarse.
      networkMode: 'always',
    },
  },
})
