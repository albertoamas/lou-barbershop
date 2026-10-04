import { m } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  calendarEvent,
  type PublicBookingConfirmation,
} from '../../../core/public-booking/PublicBooking'
import { publicSite } from '../../content/publicSite'
import { cn } from '../../styles/cn'
import { AppIcon } from '../AppIcon'
import { Button } from '../Button'
import { buttonStyles } from '../buttonStyles'
import { AppointmentSummary } from './AppointmentSummary'
import { bookingDateTime } from './bookingFormat'

const darkButtonClassName = cn(
  buttonStyles({ variant: 'ghost' }),
  'border-on-ink/25 text-on-ink hover:bg-on-ink/10',
)

// "Te esperamos": the confirmed appointment, the private management link and a calendar
// file the customer can keep on their phone.
export const BookingSuccess = ({ confirmation }: { confirmation: PublicBookingConfirmation }) => {
  const appointment = confirmation.appointment
  const [copyNotice, setCopyNotice] = useState('')
  const managementUrl = new URL(confirmation.managementPath, window.location.origin).toString()
  const whatsappText = encodeURIComponent(
    `Mi cita en Lou Barbershop: ${bookingDateTime(appointment.startsAt)}. Enlace privado: ${managementUrl}`,
  )
  const calendarHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(
    calendarEvent({
      id: appointment.id,
      title: `${appointment.serviceName} en Lou Barbershop`,
      startsAt: appointment.startsAt,
      durationMinutes: appointment.durationMinutes,
      location: publicSite.address ?? `Lou Barbershop, ${publicSite.city}`,
      description: `Con ${appointment.barberName}. Para cambiar o cancelar: ${managementUrl}`,
    }),
  )}`

  const copyManagementLink = async () => {
    try {
      await navigator.clipboard.writeText(managementUrl)
      setCopyNotice('Enlace copiado. Guárdalo en un lugar privado.')
    } catch {
      setCopyNotice('No pudimos copiarlo. Abre "Gestionar mi cita" y guarda esa página.')
    }
  }

  return (
    <main className="bg-paper-warm px-4 py-12 sm:px-6 lg:py-16">
      <div className="mx-auto w-full max-w-3xl text-center">
        <m.div
          className="mx-auto grid size-20 place-items-center rounded-full bg-success text-on-ink shadow-floating"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 18 }}
        >
          <AppIcon name="check" size={38} />
        </m.div>
        <p className="mt-5 text-lg font-semibold text-success-ink">Reserva confirmada</p>
        <h1
          className="mt-2 flex flex-wrap items-baseline justify-center gap-x-[0.2em] font-display text-[clamp(2.75rem,10vw,4.5rem)] leading-[0.95] font-extrabold lg:flex-nowrap"
          aria-label={`Te esperamos, ${appointment.customerName}.`}
        >
          <span className="whitespace-nowrap">Te esperamos,</span>
          <span className="min-w-0 break-words">{appointment.customerName}.</span>
        </h1>

        <AppointmentSummary appointment={appointment} />

        <a
          className={cn(
            buttonStyles({ variant: 'secondary', size: 'lg' }),
            'mt-4 w-full sm:w-auto',
          )}
          href={calendarHref}
          download="cita-lou-barbershop.ics"
        >
          <AppIcon name="calendar" size={20} />
          Guardar en mi calendario
        </a>

        <section
          className="mt-6 rounded-sheet bg-ink p-6 text-left text-on-ink [--color-focus:var(--color-on-ink)] sm:p-8"
          aria-labelledby="private-link"
        >
          <h2 id="private-link" className="font-display text-3xl font-extrabold">
            Guarda tu enlace privado
          </h2>
          <p className="mt-2 max-w-xl text-on-ink-muted">
            Lo necesitas para ver, cambiar o cancelar esta cita. No lo compartas con nadie más.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              className={buttonStyles({ variant: 'inverse' })}
              to={confirmation.managementPath}
              viewTransition
            >
              Gestionar mi cita
            </Link>
            <Button
              type="button"
              variant="ghost"
              className="border-on-ink/25 text-on-ink hover:bg-on-ink/10"
              onClick={() => void copyManagementLink()}
            >
              Copiar enlace
            </Button>
            <a
              className={darkButtonClassName}
              href={`https://wa.me/?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Compartir por WhatsApp
            </a>
          </div>
          {copyNotice && (
            <p className="mt-3 text-on-ink-muted" role="status">
              {copyNotice}
            </p>
          )}
        </section>

        <Link
          className="mt-6 inline-flex min-h-11 items-center px-2 font-semibold underline underline-offset-4 hover:no-underline"
          to="/reservar"
          viewTransition
        >
          Reservar otra cita
        </Link>
      </div>
    </main>
  )
}
