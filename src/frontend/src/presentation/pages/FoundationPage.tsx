import { useQuery } from '@tanstack/react-query'
import { m } from 'motion/react'
import { Link } from 'react-router-dom'
import { authApi } from '../../infrastructure/http/authApi'
import { AppIcon, type IconName } from '../components/AppIcon'
import { buttonStyles } from '../components/buttonStyles'
import { useConnectivity } from '../hooks/useConnectivity'

export const FoundationPage = () => {
  const connectivity = useConnectivity()
  const session = useQuery({ queryKey: ['auth', 'session'], queryFn: authApi.current })
  const isOwner = session.data?.roles.includes('OWNER') === true
  const isAdmin = session.data?.roles.includes('ADMIN') === true
  const isBarber = !isOwner && !isAdmin
  const economyDestination = isOwner
    ? '/app/reportes'
    : isAdmin
      ? '/app/inventario'
      : '/app/comisiones'
  const economyLabel = isOwner
    ? 'Ver reportes'
    : isAdmin
      ? 'Abrir inventario y caja'
      : 'Ver mis comisiones'
  const economyDescription = isOwner
    ? 'Cobros, caja, comisiones y liquidaciones, siempre separados.'
    : isAdmin
      ? 'Inventario, compras, gastos y caja operativa.'
      : 'Consulta tus comisiones y liquidaciones sin mezclarlas con los cobros.'

  const actions: Array<{
    description: string
    icon: IconName
    label: string
    linkLabel: string
    to: string
  }> = [
    {
      icon: 'calendar',
      label: isBarber ? 'Mi agenda' : 'Agenda',
      description: isBarber
        ? 'Revisa tus próximas citas y llegadas de hoy.'
        : 'Revisa las citas, llegadas y cambios de todo el equipo.',
      to: '/app/agenda',
      linkLabel: 'Abrir agenda',
    },
    {
      icon: 'scissors',
      label: 'Atención',
      description: 'Registra servicios, productos, cortesías y pagos mixtos.',
      to: '/app/atenciones',
      linkLabel: 'Iniciar atención',
    },
    {
      icon: isOwner ? 'chart' : isAdmin ? 'box' : 'wallet',
      label: isOwner ? 'Economía' : isAdmin ? 'Inventario y caja' : 'Mis comisiones',
      description: economyDescription,
      to: economyDestination,
      linkLabel: economyLabel,
    },
  ]

  return (
    <main className="mx-auto w-full max-w-360 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <header className="grid gap-6 border-b border-lou-fog pb-9 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">
            Lou · Operación local
          </p>
          <h1 className="m-0 max-w-4xl font-display text-5xl leading-[0.9] font-bold tracking-tight sm:text-7xl">
            {isBarber ? 'Tu día, en orden.' : 'La jornada comienza aquí.'}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-lou-graphite/65">
            Agenda, atención y economía conectadas, cada una con su propia trazabilidad.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-lou-fog bg-white px-4 py-2 text-xs font-bold shadow-lou-sm">
          <i
            className={`size-2 rounded-full ${connectivity === 'online' ? 'bg-emerald-600' : 'bg-amber-600'}`}
          />
          {connectivity === 'online' ? 'Sistema conectado' : 'Sin conexión'}
        </span>
      </header>

      <section className="mt-8 grid gap-4 lg:grid-cols-3" aria-label="Acciones principales">
        {actions.map((action, index) => (
          <m.article
            key={action.to}
            className="group flex min-h-72 flex-col rounded-2xl border border-lou-fog bg-white p-6 shadow-lou-sm transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-lou-steel hover:shadow-lou-lg"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <span className="grid size-12 place-items-center rounded-xl bg-lou-ink text-white transition-transform duration-200 group-hover:rotate-[-3deg] group-hover:scale-105">
              <AppIcon name={action.icon} size={24} />
            </span>
            <h2 className="mt-10 font-display text-3xl font-bold">{action.label}</h2>
            <p className="mt-2 text-sm leading-6 text-lou-graphite/65">{action.description}</p>
            <Link
              className="mt-auto inline-flex min-h-11 items-center gap-2 pt-6 text-sm font-bold underline-offset-4 hover:underline"
              to={action.to}
            >
              {action.linkLabel} <AppIcon name="arrow-right" size={18} />
            </Link>
          </m.article>
        ))}
      </section>

      <section
        className="mt-6 flex flex-col justify-between gap-5 rounded-2xl bg-lou-charcoal p-6 text-white shadow-lou-lg sm:flex-row sm:items-center"
        aria-label="Estado de conexión"
      >
        <div>
          <strong className="font-display text-2xl">Agenda con confirmación en línea</strong>
          <p className="mt-1 text-sm text-white/60">
            {connectivity === 'online'
              ? 'Con conexión. Puedes confirmar y cambiar citas.'
              : 'Sin conexión. Los cambios quedan bloqueados hasta recuperarla.'}
          </p>
        </div>
        <Link className={buttonStyles({ variant: 'secondary' })} to="/app/disponibilidad">
          Consultar disponibilidad
        </Link>
      </section>
    </main>
  )
}
