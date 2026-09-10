import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '../presentation/components/ErrorBoundary'
import { AppShell } from '../presentation/layout/AppShell'
import { FoundationPage } from '../presentation/pages/FoundationPage'
import { AuthStatePage } from '../presentation/pages/AuthStatePage'
import { LoginPage } from '../presentation/pages/LoginPage'
import { SessionBoundary } from '../presentation/components/SessionBoundary'
import { ConfigurationPage } from '../presentation/pages/ConfigurationPage'
import { SchedulingPage } from '../presentation/pages/SchedulingPage'
import { AgendaPage } from '../presentation/pages/AgendaPage'
import { OperationsPage } from '../presentation/pages/OperationsPage'
import { InventoryPage } from '../presentation/pages/InventoryPage'
import { CommissionsPage } from '../presentation/pages/CommissionsPage'
import { ReportsPage } from '../presentation/pages/ReportsPage'
import { PublicBookingPage } from '../presentation/pages/PublicBookingPage'
import { PublicManageBookingPage } from '../presentation/pages/PublicManageBookingPage'
import { LandingPage } from '../presentation/pages/LandingPage'
import { LegacyRedirect } from '../presentation/pages/LegacyRedirect'
import { NotFoundPage } from '../presentation/pages/NotFoundPage'

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
            <Route path="/" element={<LandingPage />} />
            <Route path="/reservar" element={<PublicBookingPage />} />
            <Route path="/mi-cita" element={<PublicManageBookingPage />} />
            <Route
              path="/app/reportes"
              element={
                <SessionBoundary>
                  <ReportsPage />
                </SessionBoundary>
              }
            />
            <Route
              path="/app/comisiones"
              element={
                <SessionBoundary>
                  <CommissionsPage />
                </SessionBoundary>
              }
            />
            <Route
              path="/app/inventario"
              element={
                <SessionBoundary>
                  <InventoryPage />
                </SessionBoundary>
              }
            />
            <Route
              path="/app/atenciones"
              element={
                <SessionBoundary>
                  <OperationsPage />
                </SessionBoundary>
              }
            />
            <Route
              path="/app/agenda"
              element={
                <SessionBoundary>
                  <AgendaPage />
                </SessionBoundary>
              }
            />
            <Route path="/app/login" element={<LoginPage />} />
            <Route
              path="/app/sesion-expirada"
              element={
                <AuthStatePage
                  title="Tu sesión terminó"
                  message="Vuelve a ingresar para continuar de forma segura."
                />
              }
            />
            <Route
              path="/app/acceso-denegado"
              element={
                <AuthStatePage
                  title="Acceso restringido"
                  message="Tu cuenta no tiene permiso para realizar esta acción."
                />
              }
            />
            <Route
              path="/app"
              element={
                <SessionBoundary>
                  <FoundationPage />
                </SessionBoundary>
              }
            />
            <Route
              path="/app/configuracion"
              element={
                <SessionBoundary>
                  <ConfigurationPage />
                </SessionBoundary>
              }
            />
            <Route
              path="/app/disponibilidad"
              element={
                <SessionBoundary>
                  <SchedulingPage />
                </SessionBoundary>
              }
            />
            <Route path="/book" element={<LegacyRedirect to="/reservar" />} />
            <Route path="/book/manage" element={<LegacyRedirect to="/mi-cita" preserveHash />} />
            <Route path="/login" element={<LegacyRedirect to="/app/login" />} />
            <Route path="/session-expired" element={<LegacyRedirect to="/app/sesion-expirada" />} />
            <Route path="/access-denied" element={<LegacyRedirect to="/app/acceso-denegado" />} />
            <Route path="/agenda" element={<LegacyRedirect to="/app/agenda" />} />
            <Route path="/operations" element={<LegacyRedirect to="/app/atenciones" />} />
            <Route path="/commissions" element={<LegacyRedirect to="/app/comisiones" />} />
            <Route path="/reports" element={<LegacyRedirect to="/app/reportes" />} />
            <Route path="/inventory" element={<LegacyRedirect to="/app/inventario" />} />
            <Route path="/scheduling" element={<LegacyRedirect to="/app/disponibilidad" />} />
            <Route path="/configuration" element={<LegacyRedirect to="/app/configuracion" />} />
            <Route
              path="/app/*"
              element={
                <SessionBoundary>
                  <NotFoundPage />
                </SessionBoundary>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
)
