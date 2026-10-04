import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { agendaTime } from '../../core/agenda/Agenda'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import {
  activeAppointments,
  availableCommissionCents,
  dashboardRoleFor,
  dayCounts,
  greetingFor,
  statusSentence,
  upcomingAppointments,
  type DashboardAppointment,
} from '../../core/dashboard/Dashboard'
import { todayInBusinessTime } from '../../core/scheduling/Scheduling'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { authApi } from '../../infrastructure/http/authApi'
import { commissionApi } from '../../infrastructure/http/commissionApi'
import { inventoryApi } from '../../infrastructure/http/inventoryApi'
import { reportingApi } from '../../infrastructure/http/reportingApi'
import { salesApi } from '../../infrastructure/http/salesApi'
import { AppIcon } from '../components/AppIcon'
import { Button } from '../components/Button'
import { buttonStyles } from '../components/buttonStyles'
import { HomeSection } from '../components/home/HomeSection'
import { HomeTile } from '../components/home/HomeTile'
import { StockAlerts } from '../components/home/StockAlerts'
import { VisitList } from '../components/home/VisitList'
import { useConnectivity } from '../hooks/useConnectivity'
import { useMinuteClock } from '../hooks/useMinuteClock'
import { cn } from '../styles/cn'
import { errorClassName } from '../styles/formStyles'

const longDate = (now: Date) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now)

const byStart = (left: DashboardAppointment, right: DashboardAppointment) =>
  left.startsAt.localeCompare(right.startsAt)

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-panel bg-surface-strong', className)} />
)

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export const FoundationPage = () => {
  const online = useConnectivity() === 'online'
  const now = useMinuteClock()
  const today = todayInBusinessTime(now)
  const session = useQuery({ queryKey: ['auth', 'session'], queryFn: authApi.current })
  const role = dashboardRoleFor(session.data?.roles ?? [])
  const ready = Boolean(session.data)
  const isOwner = ready && role === 'OWNER'
  const isAdmin = ready && role === 'ADMIN'
  const isBarber = ready && role === 'BARBER'
  const refetchInterval = online ? 30_000 : false

  const report = useQuery({
    queryKey: ['reports', 'daily', today],
    queryFn: () => reportingApi.daily(today),
    enabled: isOwner,
    refetchInterval,
  })
  const agenda = useQuery({
    queryKey: ['agenda', 'dashboard', today, session.data?.id],
    queryFn: () => agendaApi.list(today, today),
    enabled: isAdmin || isBarber,
    refetchInterval,
  })
  const operations = useQuery({
    queryKey: ['operations', today],
    queryFn: () => salesApi.daily(today),
    enabled: ready,
    refetchInterval,
  })
  const inventory = useQuery({
    queryKey: ['inventory'],
    queryFn: inventoryApi.inventory,
    enabled: isOwner || isAdmin,
  })
  const commissions = useQuery({
    queryKey: ['commissions', 'AVAILABLE'],
    queryFn: () => commissionApi.commissions(undefined, 'AVAILABLE'),
    enabled: isOwner || isBarber,
  })

  const appointments: DashboardAppointment[] = [
    ...(isOwner ? (report.data?.appointments ?? []) : (agenda.data ?? [])),
  ].sort(byStart)
  const counts = dayCounts(
    appointments,
    operations.data?.operations.map((item) => item.status),
    now,
  )
  const upcoming = upcomingAppointments(appointments, now, 6)
  const present = appointments.filter(
    (item) => item.status === 'CHECKED_IN' || item.status === 'IN_SERVICE',
  )
  const appointmentsReady = isOwner ? report.data !== undefined : agenda.data !== undefined
  // Only the queries this role runs can fail; the rest stay idle.
  const used = [
    isOwner ? report : undefined,
    isAdmin || isBarber ? agenda : undefined,
    ready ? operations : undefined,
    isOwner || isAdmin ? inventory : undefined,
    isOwner || isBarber ? commissions : undefined,
  ].filter((query) => query !== undefined)
  const failed = used.filter((query) => query.isError)

  return (
    <main className="mx-auto w-full max-w-360 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-5xl leading-none font-extrabold text-balance sm:text-6xl">
            {greetingFor(now)}
          </h1>
          <p className="mt-2 text-lg text-pretty text-ink-soft first-letter:uppercase">
            {longDate(now)}. {appointmentsReady && operations.data ? statusSentence(counts) : ''}
          </p>
        </div>
        {(isAdmin || isBarber) && (
          <div className="flex flex-wrap gap-2 max-sm:w-full">
            {isAdmin && (
              <Link
                className={cn(buttonStyles(), 'max-sm:flex-1')}
                to="/app/agenda"
                state={{ newAppointment: true }}
              >
                <AppIcon name="calendar" size={20} />
                Nueva cita
              </Link>
            )}
            <Link
              className={cn(
                buttonStyles({ variant: isAdmin ? 'secondary' : 'primary' }),
                'max-sm:flex-1',
              )}
              to="/app/atenciones"
              state={{ walkIn: true }}
            >
              <AppIcon name="plus" size={20} />
              Llegada sin cita
            </Link>
          </div>
        )}
      </header>

      {failed.length > 0 && (
        <div
          className={cn(errorClassName, 'mt-5 flex flex-wrap items-center justify-between gap-3')}
          role="alert"
        >
          Parte del resumen no se pudo actualizar. Lo demás sigue al día.
          <Button
            variant="secondary"
            size="sm"
            onClick={() => failed.forEach((query) => void query.refetch())}
          >
            Reintentar
          </Button>
        </div>
      )}

      {!ready && (
        <div
          className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Cargando inicio"
          role="status"
        >
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-24" />
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6">
          <nav
            className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 lg:grid-cols-4"
            aria-label="Ahora en el local"
          >
            <HomeTile
              label="Esperando"
              value={String(counts.waiting)}
              hint={counts.waiting > 0 ? 'Ya llegaron' : 'Nadie espera'}
              icon="clock"
              to="/app/agenda"
              tone={counts.waiting > 0 ? 'info' : 'neutral'}
            />
            <HomeTile
              label="En atención"
              value={String(counts.inService)}
              hint="En la silla ahora"
              icon="scissors"
              to="/app/agenda"
            />
            <HomeTile
              label="Por cobrar"
              value={String(counts.pendingCharges)}
              hint={counts.pendingCharges > 0 ? 'Toca para cobrar' : 'Todo cobrado'}
              icon="wallet"
              to="/app/atenciones"
              tone={counts.pendingCharges > 0 ? 'success' : 'neutral'}
            />
            <HomeTile
              label="Por llegar"
              value={String(counts.upcoming)}
              hint="Citas confirmadas"
              icon="calendar"
              to="/app/agenda"
            />
          </nav>
          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
              <HomeSection id="home-present" title="En el local">
                {appointmentsReady ? (
                  <VisitList
                    appointments={present}
                    showBarber
                    date={today}
                    empty="Nadie en el local ahora."
                  />
                ) : (
                  <Skeleton className="h-32" />
                )}
              </HomeSection>
              <HomeSection
                id="home-upcoming"
                title="Próximas llegadas"
                action={{ label: 'Ver agenda', to: '/app/agenda' }}
              >
                {appointmentsReady ? (
                  <VisitList
                    appointments={upcoming}
                    showBarber
                    date={today}
                    empty="No hay más citas confirmadas hoy."
                  />
                ) : (
                  <Skeleton className="h-48" />
                )}
              </HomeSection>
            </div>
            {inventory.data ? (
              <StockAlerts items={inventory.data} />
            ) : (
              <Skeleton className="h-48" />
            )}
          </div>
        </div>
      )}

      {isOwner && (
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6">
          <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 lg:grid-cols-4">
            <Link
              className="flex min-h-40 flex-col justify-between gap-4 rounded-panel bg-success-soft p-5 text-success-ink transition-shadow duration-150 hover:shadow-floating col-span-2 lg:row-span-2"
              to="/app/reportes"
            >
              <span className="flex items-center justify-between font-semibold">
                Cobrado hoy
                <AppIcon name="chart" size={22} />
              </span>
              {report.data ? (
                <span>
                  <span className="block font-display text-6xl leading-none font-extrabold tabular-nums">
                    {centsToBolivianos(report.data.chargesCents)}
                  </span>
                  <span className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-lg">
                    <span>Efectivo {centsToBolivianos(report.data.cashCollectedCents)}</span>
                    <span>QR {centsToBolivianos(report.data.qrCollectedCents)}</span>
                  </span>
                  <span className="mt-1 block">
                    {plural(
                      report.data.paidOperationCount,
                      'atención pagada',
                      'atenciones pagadas',
                    )}
                  </span>
                </span>
              ) : (
                <Skeleton className="h-20 bg-success/15" />
              )}
            </Link>
            <HomeTile
              label="Por cobrar"
              value={String(counts.pendingCharges)}
              hint={counts.pendingCharges > 0 ? 'Atenciones abiertas' : 'Todo cobrado'}
              icon="wallet"
              to="/app/atenciones"
              tone={counts.pendingCharges > 0 ? 'info' : 'neutral'}
            />
            <HomeTile
              label="Citas de hoy"
              value={String(activeAppointments(appointments).length)}
              hint={counts.waiting > 0 ? `${counts.waiting} esperando` : 'Activas en la agenda'}
              icon="calendar"
              to="/app/agenda"
            />
            <HomeTile
              label="Por liquidar"
              value={centsToBolivianos(availableCommissionCents(commissions.data))}
              hint="Comisiones de barberos, no es dinero en caja"
              icon="scissors"
              to="/app/comisiones"
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <HomeSection
              id="home-upcoming"
              title="Próximas citas"
              action={{ label: 'Ver agenda', to: '/app/agenda' }}
            >
              {appointmentsReady ? (
                <VisitList
                  appointments={upcoming}
                  showBarber
                  date={today}
                  empty="No hay más citas confirmadas hoy."
                />
              ) : (
                <Skeleton className="h-48" />
              )}
            </HomeSection>
            {inventory.data ? (
              <StockAlerts items={inventory.data} />
            ) : (
              <Skeleton className="h-48" />
            )}
          </div>
        </div>
      )}

      {isBarber && (
        <BarberHome
          appointments={appointments}
          ready={appointmentsReady}
          now={now}
          today={today}
          producedCents={operations.data?.totalCents}
          commissionCents={
            commissions.data ? availableCommissionCents(commissions.data) : undefined
          }
        />
      )}
    </main>
  )
}

interface BarberHomeProps {
  appointments: DashboardAppointment[]
  ready: boolean
  now: Date
  today: string
  producedCents: number | undefined
  commissionCents: number | undefined
}

// A barber's day: who is next, the whole list and what they earned so far.
const BarberHome = ({
  appointments,
  ready,
  now,
  today,
  producedCents,
  commissionCents,
}: BarberHomeProps) => {
  const waiting = appointments.find((item) => item.status === 'CHECKED_IN')
  const next = waiting ?? upcomingAppointments(appointments, now, 1)[0]
  return (
    <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="grid gap-3">
        {ready ? (
          <Link
            className="grid gap-3 rounded-panel bg-ink p-5 text-on-ink transition-colors duration-150 hover:bg-ink-soft sm:p-6"
            to={`/app/agenda?fecha=${today}`}
          >
            <span className="font-semibold text-on-ink-muted">
              {waiting ? 'Te espera ahora' : 'Tu próximo cliente'}
            </span>
            {next ? (
              <span className="flex items-center gap-4">
                <time
                  className="rounded-control bg-on-ink px-3 py-2 font-display text-3xl font-extrabold text-ink tabular-nums"
                  dateTime={next.startsAt}
                >
                  {agendaTime(next.startsAt)}
                </time>
                <span className="min-w-0">
                  <span className="block truncate font-display text-3xl leading-tight font-extrabold">
                    {next.customerName}
                  </span>
                  <span className="block truncate text-on-ink-muted">{next.serviceName}</span>
                </span>
              </span>
            ) : (
              <span className="font-display text-3xl font-extrabold">No tienes más citas hoy</span>
            )}
            <span className="inline-flex items-center gap-2 font-semibold">
              Ver en la agenda
              <AppIcon name="arrow-right" size={18} />
            </span>
          </Link>
        ) : (
          <Skeleton className="h-44" />
        )}
        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
          <HomeTile
            label="Cobrado hoy"
            value={producedCents === undefined ? '...' : centsToBolivianos(producedCents)}
            hint="De tu trabajo"
            icon="chart"
            to="/app/atenciones"
            tone="success"
          />
          <HomeTile
            label="Mi comisión"
            value={commissionCents === undefined ? '...' : centsToBolivianos(commissionCents)}
            hint="Por liquidar"
            icon="wallet"
            to="/app/comisiones"
          />
        </div>
      </div>
      <HomeSection
        id="home-my-day"
        title="Mi día"
        action={{ label: 'Ver agenda', to: '/app/agenda' }}
      >
        {ready ? (
          <VisitList
            appointments={appointments}
            showBarber={false}
            date={today}
            empty="No tienes citas hoy."
          />
        ) : (
          <Skeleton className="h-48" />
        )}
      </HomeSection>
    </div>
  )
}
