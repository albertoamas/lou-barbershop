import { useQuery } from '@tanstack/react-query'
import { animate, m, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { agendaTime } from '../../core/agenda/Agenda'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import {
  activeAppointments,
  availableCommissionCents,
  dashboardRoleFor,
  nextAppointment,
  type DashboardAppointment,
  type DashboardRole,
} from '../../core/dashboard/Dashboard'
import { todayInBusinessTime } from '../../core/scheduling/Scheduling'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { authApi } from '../../infrastructure/http/authApi'
import { commissionApi } from '../../infrastructure/http/commissionApi'
import { inventoryApi } from '../../infrastructure/http/inventoryApi'
import { reportingApi } from '../../infrastructure/http/reportingApi'
import { salesApi } from '../../infrastructure/http/salesApi'
import { AppIcon, type IconName } from '../components/AppIcon'
import { buttonStyles } from '../components/buttonStyles'
import { useConnectivity } from '../hooks/useConnectivity'

const roleContent: Record<
  DashboardRole,
  { eyebrow: string; title: string; description: string; action: string; destination: string }
> = {
  OWNER: {
    eyebrow: 'Resumen del negocio',
    title: 'Lou, hoy.',
    description: 'Ventas, cobros y deuda de comisión visibles sin mezclarlos.',
    action: 'Ver reportes',
    destination: '/app/reportes',
  },
  ADMIN: {
    eyebrow: 'Control de la jornada',
    title: 'Todo listo para atender.',
    description: 'Citas, llegadas, atenciones y cobros del equipo en un solo vistazo.',
    action: 'Nueva cita',
    destination: '/app/agenda',
  },
  BARBER: {
    eyebrow: 'Mi día',
    title: 'Tu jornada, clara.',
    description: 'Tu próxima cita, tu producción y tu comisión, sólo de tu trabajo.',
    action: 'Atender llegada directa',
    destination: '/app/atenciones',
  },
}

interface Metric {
  label: string
  value: number
  format?: 'money'
  hint: string
  icon: IconName
}

const AnimatedMetric = ({ metric, index }: { metric: Metric; index: number }) => {
  const reduceMotion = useReducedMotion()
  const [displayed, setDisplayed] = useState(reduceMotion ? metric.value : 0)
  const animated = useRef(false)

  useEffect(() => {
    if (animated.current || reduceMotion) {
      setDisplayed(metric.value)
      animated.current = true
      return
    }
    animated.current = true
    const controls = animate(0, metric.value, {
      duration: 0.55,
      delay: index * 0.04,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (value) => setDisplayed(Math.round(value)),
    })
    return () => controls.stop()
  }, [index, metric.value, reduceMotion])

  return (
    <m.div
      className="rounded-2xl border border-lou-fog bg-white p-5 shadow-lou-sm"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <div className="flex items-center justify-between gap-3">
        <dt className="text-[0.68rem] font-bold tracking-[0.14em] text-lou-graphite/50 uppercase">
          {metric.label}
        </dt>
        <span className="grid size-9 place-items-center rounded-lg bg-lou-paper text-lou-graphite/65">
          <AppIcon name={metric.icon} size={18} />
        </span>
      </div>
      <dd className="mt-5 font-display text-4xl leading-none font-bold tabular-nums">
        {metric.format === 'money' ? centsToBolivianos(displayed) : displayed}
      </dd>
      <p className="mt-2 text-xs leading-5 text-lou-graphite/55">{metric.hint}</p>
    </m.div>
  )
}

const AppointmentCard = ({ appointment }: { appointment?: DashboardAppointment | undefined }) => (
  <section className="rounded-2xl bg-lou-charcoal p-6 text-white shadow-lou-lg">
    <p className="text-[0.68rem] font-bold tracking-[0.16em] text-white/45 uppercase">
      Próxima cita
    </p>
    {appointment ? (
      <div className="mt-5 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <time
          className="w-fit rounded-xl bg-white px-4 py-3 font-display text-3xl font-bold text-lou-ink tabular-nums"
          dateTime={appointment.startsAt}
        >
          {agendaTime(appointment.startsAt)}
        </time>
        <div>
          <h2 className="font-display text-3xl font-bold">{appointment.customerName}</h2>
          <p className="mt-1 text-sm text-white/65">
            {appointment.serviceName} · {appointment.barberName}
          </p>
        </div>
      </div>
    ) : (
      <div className="mt-5">
        <h2 className="font-display text-3xl font-bold">Sin citas próximas</h2>
        <p className="mt-2 text-sm leading-6 text-white/60">
          La jornada no tiene otra cita activa programada para hoy.
        </p>
      </div>
    )}
    <Link
      className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold"
      to="/app/agenda"
    >
      Abrir agenda <AppIcon name="arrow-right" size={18} />
    </Link>
  </section>
)

export const FoundationPage = () => {
  const connectivity = useConnectivity()
  const today = todayInBusinessTime()
  const session = useQuery({ queryKey: ['auth', 'session'], queryFn: authApi.current })
  const role = dashboardRoleFor(session.data?.roles ?? [])
  const isOwner = role === 'OWNER'
  const isAdmin = role === 'ADMIN'
  const isBarber = role === 'BARBER'

  const report = useQuery({
    queryKey: ['reports', 'daily', today],
    queryFn: () => reportingApi.daily(today),
    enabled: isOwner && Boolean(session.data),
  })
  const agenda = useQuery({
    queryKey: ['agenda', 'dashboard', today, session.data?.id],
    queryFn: () => agendaApi.list(today, today),
    enabled: (isAdmin || isBarber) && Boolean(session.data),
    refetchInterval: connectivity === 'online' ? 30_000 : false,
  })
  const operations = useQuery({
    queryKey: ['operations', today],
    queryFn: () => salesApi.daily(today),
    enabled: (isAdmin || isBarber) && Boolean(session.data),
    refetchInterval: connectivity === 'online' ? 30_000 : false,
  })
  const inventory = useQuery({
    queryKey: ['inventory'],
    queryFn: inventoryApi.inventory,
    enabled: (isOwner || isAdmin) && Boolean(session.data),
  })
  const commissions = useQuery({
    queryKey: ['commissions', 'AVAILABLE'],
    queryFn: () => commissionApi.commissions(undefined, 'AVAILABLE'),
    enabled: (isOwner || isBarber) && Boolean(session.data),
  })

  const appointments: DashboardAppointment[] = isOwner
    ? (report.data?.appointments ?? [])
    : (agenda.data ?? [])
  const active = activeAppointments(appointments)
  const next = nextAppointment(appointments)
  const lowStock = inventory.data?.filter((item) => item.lowStock) ?? []
  const pendingCommission = availableCommissionCents(commissions.data)
  const readyToPay =
    operations.data?.operations.filter((item) => item.status === 'READY_TO_PAY').length ?? 0
  const inService = active.filter((item) => item.status === 'IN_SERVICE').length
  const content = roleContent[role]

  const metrics: Metric[] = isOwner
    ? [
        {
          label: 'Ventas de hoy',
          value: report.data?.chargesCents ?? 0,
          format: 'money',
          hint: `${report.data?.paidOperationCount ?? 0} operaciones cobradas`,
          icon: 'chart',
        },
        {
          label: 'Efectivo cobrado',
          value: report.data?.cashCollectedCents ?? 0,
          format: 'money',
          hint: 'Dinero recibido en efectivo',
          icon: 'wallet',
        },
        {
          label: 'QR cobrado',
          value: report.data?.qrCollectedCents ?? 0,
          format: 'money',
          hint: 'Pagos confirmados por QR',
          icon: 'wallet',
        },
        {
          label: 'Comisión pendiente',
          value: pendingCommission,
          format: 'money',
          hint: 'Deuda disponible; no es dinero cobrado',
          icon: 'scissors',
        },
      ]
    : isAdmin
      ? [
          {
            label: 'Citas activas',
            value: active.length,
            hint: 'Confirmadas, presentes o en atención',
            icon: 'calendar',
          },
          {
            label: 'Próximas llegadas',
            value: active.filter((item) => item.status === 'CONFIRMED').length,
            hint: 'Citas confirmadas para hoy',
            icon: 'clock',
          },
          {
            label: 'En atención',
            value: inService,
            hint: 'Servicios actualmente iniciados',
            icon: 'scissors',
          },
          {
            label: 'Por cobrar',
            value: readyToPay,
            hint: 'Operaciones listas para pago',
            icon: 'wallet',
          },
        ]
      : [
          {
            label: 'Mis citas',
            value: active.length,
            hint: 'Citas activas de tu jornada',
            icon: 'calendar',
          },
          {
            label: 'Producción personal',
            value: operations.data?.totalCents ?? 0,
            format: 'money',
            hint: 'Total cobrado de tu trabajo hoy',
            icon: 'chart',
          },
          {
            label: 'Servicios cobrados',
            value: operations.data?.paidCount ?? 0,
            hint: 'Operaciones propias completadas',
            icon: 'scissors',
          },
          {
            label: 'Mi comisión',
            value: pendingCommission,
            format: 'money',
            hint: 'Comisión disponible pendiente de liquidar',
            icon: 'wallet',
          },
        ]

  const relevantQueries = isOwner
    ? [report, inventory, commissions]
    : isAdmin
      ? [agenda, operations, inventory]
      : [agenda, operations, commissions]
  const loading = session.isPending || relevantQueries.some((query) => query.isPending)
  const failed = relevantQueries.some((query) => query.isError)

  return (
    <main className="mx-auto w-full max-w-360 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <header className="flex flex-col justify-between gap-5 border-b border-lou-fog pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.18em] text-lou-graphite/50 uppercase">
            {content.eyebrow} ·{' '}
            {new Intl.DateTimeFormat('es-BO', {
              timeZone: 'America/La_Paz',
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            }).format(new Date())}
          </p>
          <h1 className="m-0 font-display text-5xl leading-none font-bold sm:text-6xl">
            {content.title}
          </h1>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-lou-fog bg-white px-4 py-2 text-xs font-bold shadow-lou-sm">
          <i
            className={`size-2 rounded-full ${connectivity === 'online' ? 'bg-emerald-600' : 'bg-amber-600'}`}
          />
          {connectivity === 'online' ? 'Sistema conectado' : 'Sin conexión'}
        </span>
      </header>

      <section className="mt-6 overflow-hidden rounded-2xl bg-lou-ink text-white shadow-lou-lg">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="max-w-2xl text-sm leading-6 text-white/65">{content.description}</p>
            <p className="mt-4 text-xs font-semibold text-white/45">
              Sesión de {session.data?.userName ?? 'equipo Lou'}
            </p>
          </div>
          <Link
            className={buttonStyles({ variant: 'secondary' })}
            state={isAdmin ? { newAppointment: true } : undefined}
            to={content.destination}
          >
            {content.action} <AppIcon name="arrow-right" size={18} />
          </Link>
        </div>
      </section>

      {failed && (
        <p
          className="mt-5 rounded-xl border border-amber-800/20 bg-amber-50 p-4 text-sm text-amber-950"
          role="alert"
        >
          Parte del resumen no pudo actualizarse. Las secciones disponibles siguen siendo
          utilizables.
        </p>
      )}

      {loading ? (
        <section
          className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Cargando resumen"
          aria-busy="true"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <span className="h-40 animate-pulse rounded-2xl bg-black/7" key={index} />
          ))}
        </section>
      ) : (
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, index) => (
            <AnimatedMetric key={metric.label} metric={metric} index={index} />
          ))}
        </dl>
      )}

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <AppointmentCard appointment={next} />
        <section className="rounded-2xl border border-lou-fog bg-white p-6 shadow-lou-sm">
          <p className="text-[0.68rem] font-bold tracking-[0.16em] text-lou-graphite/45 uppercase">
            {isBarber ? 'Acceso rápido' : 'Atención necesaria'}
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold">
            {isBarber
              ? 'Continúa tu jornada'
              : lowStock.length
                ? `${lowStock.length} alertas de stock`
                : 'Todo bajo control'}
          </h2>
          {isBarber ? (
            <p className="mt-2 text-sm leading-6 text-lou-graphite/60">
              Registra una llegada directa o revisa el detalle de tus comisiones.
            </p>
          ) : lowStock.length ? (
            <ul className="mt-4 grid gap-2 text-sm text-lou-graphite/70">
              {lowStock.slice(0, 3).map((item) => (
                <li
                  className="flex justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2"
                  key={item.productId}
                >
                  <span>{item.name}</span>
                  <strong>{item.quantity} disponibles</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm leading-6 text-lou-graphite/60">
              No hay productos por debajo del mínimo configurado.
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className={buttonStyles({ variant: 'ghost' })}
              to={isBarber ? '/app/comisiones' : '/app/inventario'}
            >
              {isBarber ? 'Mis comisiones' : 'Ver inventario'}
            </Link>
            {isOwner && (
              <Link
                className="inline-flex min-h-11 items-center px-2 text-sm font-bold"
                to="/app/comisiones"
              >
                Liquidaciones
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
