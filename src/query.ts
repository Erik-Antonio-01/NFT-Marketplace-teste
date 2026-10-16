import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: { queries: {
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    retry: (failureCount, error: unknown) => !(typeof error === 'object' && error && 'response' in error) && failureCount < 1,
    refetchOnWindowFocus: true,
  }, mutations: { retry: false } },
})
