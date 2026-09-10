import { useQuery } from '@tanstack/react-query'
import { m } from 'motion/react'
import { Link } from 'react-router-dom'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import { publicBookingApi } from '../../infrastructure/http/publicBookingApi'
import { AppIcon } from '../components/AppIcon'
import { buttonStyles } from '../components/buttonStyles'

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
}

export const LandingPage = () => {
  const catalog = useQuery({
    queryKey: ['public-booking', 'catalog'],
    queryFn: publicBookingApi.catalog,
    networkMode: 'always',
  })

  return (
    <main className="overflow-hidden bg-lou-paper">
      <section
        className="relative isolate grid min-h-[calc(100svh-4.5rem)] items-center overflow-hidden bg-lou-ink px-4 py-16 text-white sm:px-6 lg:px-10"
        aria-labelledby="landing-title"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-35 [background:linear-gradient(120deg,transparent_0_56%,rgba(255,255,255,.08)_56%_56.4%,transparent_56.4%_100%)]" />
        <div className="pointer-events-none absolute -right-32 -bottom-32 -z-10 size-[34rem] rounded-full border border-white/10" />
        <div className="mx-auto grid w-full max-w-360 items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <m.div
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
          >
            <p className="mb-5 text-xs font-bold tracking-[0.22em] text-white/55 uppercase">
              Estilo · detalle · oficio
            </p>
            <h1
              id="landing-title"
              className="m-0 max-w-[10ch] font-display text-[clamp(3.7rem,10vw,8.5rem)] leading-[0.82] font-bold tracking-[-0.045em] text-balance"
            >
              Tu estilo empieza en <span className="text-white/55">Lou.</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-7 text-white/65 sm:text-lg">
              Elige tu servicio, profesional y horario. Reserva en pocos pasos, sin crear una
              cuenta.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                className={buttonStyles({ variant: 'secondary' })}
                to="/reservar"
                viewTransition
              >
                Reservar una cita
                <AppIcon name="arrow-right" size={18} />
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                to="/mi-cita"
                viewTransition
              >
                Gestionar mi cita
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-xs font-semibold text-white/45">
              <li>Sin cuenta</li>
              <li>Disponibilidad actualizada</li>
              <li>Enlace privado</li>
            </ul>
          </m.div>

          <m.div
            className="relative mx-auto w-full max-w-lg lg:justify-self-end"
            initial={{ opacity: 0, scale: 0.94, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            aria-hidden="true"
          >
            <div className="absolute -inset-5 rotate-3 rounded-3xl border border-white/10" />
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm">
              <img
                className="aspect-square w-full rounded-xl object-cover grayscale"
                src="/brand/lou-logo.jpg"
                alt=""
              />
              <div className="absolute inset-x-5 bottom-5 flex items-end justify-between rounded-b-xl bg-gradient-to-t from-black/90 to-transparent px-5 pt-20 pb-5">
                <span className="font-display text-3xl font-bold">Lou Barbershop</span>
                <span className="text-xs tracking-[0.16em] text-white/55 uppercase">
                  Una sucursal
                </span>
              </div>
            </div>
          </m.div>
        </div>
      </section>

      <m.section
        className="mx-auto max-w-360 px-4 py-20 sm:px-6 lg:px-10 lg:py-28"
        aria-labelledby="services-title"
        {...reveal}
      >
        <div className="mb-10 flex flex-col justify-between gap-5 border-b border-lou-steel/40 pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">
              Servicios
            </p>
            <h2
              id="services-title"
              className="m-0 font-display text-5xl leading-none font-bold sm:text-6xl"
            >
              Elige tu próximo corte.
            </h2>
          </div>
          <Link
            className="text-sm font-bold underline-offset-4 hover:underline"
            to="/reservar"
            viewTransition
          >
            Ver horarios disponibles <AppIcon name="arrow-right" size={18} />
          </Link>
        </div>

        {catalog.isPending && (
          <div className="grid gap-3" aria-busy="true" aria-label="Cargando servicios">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-xl bg-black/6" />
            ))}
          </div>
        )}
        {catalog.isError && (
          <div
            className="grid gap-1 rounded-xl border border-amber-800/20 bg-amber-50 p-5"
            role="status"
          >
            <strong>El catálogo no está disponible en este momento.</strong>
            <span className="text-sm text-lou-graphite/70">
              Puedes entrar a la reserva e intentarlo nuevamente.
            </span>
          </div>
        )}
        {catalog.data && (
          <div className="grid gap-3">
            {catalog.data.services.slice(0, 6).map((service, index) => (
              <m.article
                key={service.id}
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-xl border border-lou-fog bg-white p-4 shadow-lou-sm transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-lou-steel hover:shadow-lou-lg sm:gap-7 sm:p-6"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(index * 0.04, 0.2) }}
              >
                <span className="font-display text-2xl font-bold text-lou-steel">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="m-0 font-display text-2xl font-bold sm:text-3xl">
                    {service.name}
                  </h3>
                  {service.description && (
                    <p className="my-1 hidden text-sm text-lou-graphite/65 sm:block">
                      {service.description}
                    </p>
                  )}
                  <small className="text-xs font-semibold text-lou-graphite/50">
                    {service.durationMinutes} minutos
                  </small>
                </div>
                <strong className="font-display text-2xl tabular-nums sm:text-3xl">
                  {centsToBolivianos(service.priceCents)}
                </strong>
              </m.article>
            ))}
          </div>
        )}
      </m.section>

      <section
        className="bg-white px-4 py-20 sm:px-6 lg:px-10 lg:py-28"
        aria-labelledby="process-title"
      >
        <m.div className="mx-auto max-w-360" {...reveal}>
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">
            Reserva simple
          </p>
          <h2
            id="process-title"
            className="m-0 max-w-xl font-display text-5xl leading-none font-bold sm:text-6xl"
          >
            Tres pasos. Sin vueltas.
          </h2>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-lou-fog bg-lou-fog lg:grid-cols-3">
            {[
              { icon: 'scissors' as const, title: 'Elige', text: 'Servicio y profesional.' },
              { icon: 'calendar' as const, title: 'Encuentra', text: 'Un horario disponible.' },
              { icon: 'clock' as const, title: 'Confirma', text: 'Recibe tu enlace privado.' },
            ].map((step, index) => (
              <li key={step.title} className="relative bg-lou-paper p-7 sm:p-9">
                <span className="absolute top-5 right-6 font-display text-5xl font-bold text-black/6">
                  0{index + 1}
                </span>
                <span className="grid size-12 place-items-center rounded-xl bg-lou-ink text-white">
                  <AppIcon name={step.icon} size={24} />
                </span>
                <strong className="mt-8 block font-display text-3xl">{step.title}</strong>
                <span className="mt-1 block text-sm text-lou-graphite/65">{step.text}</span>
              </li>
            ))}
          </ol>
        </m.div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-10">
        <m.div
          className="mx-auto flex max-w-360 flex-col items-start justify-between gap-8 overflow-hidden rounded-2xl bg-lou-charcoal p-8 text-white shadow-lou-lg sm:p-12 lg:flex-row lg:items-end"
          {...reveal}
        >
          <div>
            <p className="mb-3 text-xs font-bold tracking-[0.2em] text-white/45 uppercase">
              Lou Barbershop
            </p>
            <h2 className="m-0 max-w-2xl font-display text-5xl leading-[0.92] font-bold sm:text-7xl">
              Tu próximo estilo empieza aquí.
            </h2>
          </div>
          <Link className={buttonStyles({ variant: 'secondary' })} to="/reservar" viewTransition>
            Reservar ahora
          </Link>
        </m.div>
      </section>
    </main>
  )
}
