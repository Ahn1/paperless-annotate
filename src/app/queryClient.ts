import { QueryClient } from '@tanstack/react-query'
import { AuthError, ForbiddenError } from '@/api/client'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof AuthError || error instanceof ForbiddenError) return false
        return failureCount < 2
      },
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})
