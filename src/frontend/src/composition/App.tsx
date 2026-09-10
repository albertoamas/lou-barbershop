import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '../presentation/components/ErrorBoundary'
import { MotionProvider } from '../presentation/components/MotionProvider'
import { SessionBoundary } from '../presentation/components/SessionBoundary'
import { AppShell } from '../presentation/layout/AppShell'
import { LegacyRedirect } from '../presentation/pages/LegacyRedirect'

const AgendaPage = lazy(() =>
  import('../presentation/pages/AgendaPage').then((module) => ({ default: module.AgendaPage })),
)
const AuthStatePage = lazy(() =>
  import('../presentation/pages/AuthStatePage').then((module) => ({
    default: module.AuthStatePage,
  })),
)
const CommissionsPage = lazy(() =>
  import('../presentation/pages/CommissionsPage').then((module) => ({
    default: module.CommissionsPage,
  })),
)
const ConfigurationPage = lazy(() =>
  import('../presentation/pages/ConfigurationPage').then((module) => ({
    default: module.ConfigurationPage,
  })),
)
const FoundationPage = lazy(() =>
  import('../presentation/pages/FoundationPage').then((module) => ({
    default: module.FoundationPage,
  })),
)
const InventoryPage = lazy(() =>
  import('../presentation/pages/InventoryPage').then((module) => ({
    default: module.InventoryPage,
  })),
)
const LandingPage = lazy(() =>
  import('../presentation/pages/LandingPage').then((module) => ({ default: module.LandingPage })),
)
const LoginPage = lazy(() =>
  import('../presentation/pages/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const NotFoundPage = lazy(() =>
  import('../presentation/pages/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
)
const OperationsPage = lazy(() =>
  import('../presentation/pages/OperationsPage').then((module) => ({
    default: module.OperationsPage,
  })),
)
const PublicBookingPage = lazy(() =>
  import('../presentation/pages/PublicBookingPage').then((module) => ({
    default: module.PublicBookingPage,
  })),
)
const PublicManageBookingPage = lazy(() =>
  import('../presentation/pages/PublicManageBookingPage').then((module) => ({
    default: module.PublicManageBookingPage,
  })),
)
const ReportsPage = lazy(() =>
  import('../presentation/pages/ReportsPage').then((module) => ({ default: module.ReportsPage })),
)
const SchedulingPage = lazy(() =>
  import('../presentation/pages/SchedulingPage').then((module) => ({
    default: module.SchedulingPage,
  })),
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
    mutations: { retry: false },
  },
})

export const App = () => (
  <ErrorBoundary>
    <MotionProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppShell>
            <Suspense
              fallback={
                <main className="grid min-h-[55dvh] place-items-center px-4" aria-busy="true">
                  <span className="text-sm font-semibold text-lou-graphite/65">
                    Cargando pantalla…
                  </span>
                </main>
              }
            >
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/reservar" element={<PublicBookingPage />} />
                <Route path="/mi-cita" element={<PublicManageBookingPage />} />
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
                <Route path="/app" element={<SessionBoundary />}>
                  <Route index element={<FoundationPage />} />
                  <Route path="agenda" element={<AgendaPage />} />
                  <Route path="atenciones" element={<OperationsPage />} />
                  <Route path="comisiones" element={<CommissionsPage />} />
                  <Route path="inventario" element={<InventoryPage />} />
                  <Route path="disponibilidad" element={<SchedulingPage />} />
                  <Route path="reportes" element={<ReportsPage />} />
                  <Route path="configuracion" element={<ConfigurationPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
                <Route path="/book" element={<LegacyRedirect to="/reservar" />} />
                <Route
                  path="/book/manage"
                  element={<LegacyRedirect to="/mi-cita" preserveHash />}
                />
                <Route path="/login" element={<LegacyRedirect to="/app/login" />} />
                <Route
                  path="/session-expired"
                  element={<LegacyRedirect to="/app/sesion-expirada" />}
                />
                <Route
                  path="/access-denied"
                  element={<LegacyRedirect to="/app/acceso-denegado" />}
                />
                <Route path="/agenda" element={<LegacyRedirect to="/app/agenda" />} />
                <Route path="/operations" element={<LegacyRedirect to="/app/atenciones" />} />
                <Route path="/commissions" element={<LegacyRedirect to="/app/comisiones" />} />
                <Route path="/reports" element={<LegacyRedirect to="/app/reportes" />} />
                <Route path="/inventory" element={<LegacyRedirect to="/app/inventario" />} />
                <Route path="/scheduling" element={<LegacyRedirect to="/app/disponibilidad" />} />
                <Route path="/configuration" element={<LegacyRedirect to="/app/configuracion" />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </AppShell>
        </BrowserRouter>
      </QueryClientProvider>
    </MotionProvider>
  </ErrorBoundary>
)
