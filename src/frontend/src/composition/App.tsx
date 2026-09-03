import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '../presentation/components/ErrorBoundary'
import { AppShell } from '../presentation/layout/AppShell'
import { FoundationPage } from '../presentation/pages/FoundationPage'
import { AuthStatePage } from '../presentation/pages/AuthStatePage'
import { LoginPage } from '../presentation/pages/LoginPage'
import { SessionBoundary } from '../presentation/components/SessionBoundary'
import { ConfigurationPage } from '../presentation/pages/ConfigurationPage'

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
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/session-expired"
              element={
                <AuthStatePage
                  title="Tu sesión terminó"
                  message="Vuelve a ingresar para continuar de forma segura."
                />
              }
            />
            <Route
              path="/access-denied"
              element={
                <AuthStatePage
                  title="Acceso restringido"
                  message="Tu cuenta no tiene permiso para realizar esta acción."
                />
              }
            />
            <Route
              path="/"
              element={
                <SessionBoundary>
                  <FoundationPage />
                </SessionBoundary>
              }
            />
            <Route
              path="/configuration"
              element={
                <SessionBoundary>
                  <ConfigurationPage />
                </SessionBoundary>
              }
            />
            <Route
              path="*"
              element={
                <SessionBoundary>
                  <FoundationPage />
                </SessionBoundary>
              }
            />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
)
