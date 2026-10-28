'use client'
// Provider de TanStack Query para todo el Estudio
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

export default function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 1500, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
