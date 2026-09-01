import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '../presentation/components/ErrorBoundary'
import { AppShell } from '../presentation/layout/AppShell'
import { FoundationPage } from '../presentation/pages/FoundationPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
    mutations: { retry: false },
  },
})

export const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="*" element={<FoundationPage />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
)
