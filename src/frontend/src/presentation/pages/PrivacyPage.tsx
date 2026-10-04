import { Link } from 'react-router-dom'
import { AppIcon, type IconName } from '../components/AppIcon'
import { buttonStyles } from '../components/buttonStyles'
import { publicSite } from '../content/publicSite'

// The legal content stays as approved; only the technical wording is said plainly.
const sections: { title: string; icon: IconName; body: string }[] = [
  {
    title: 'Qué datos usamos',
    icon: 'eye',
    body: 'Para una reserva solicitamos tu nombre y número de teléfono o WhatsApp. También conservamos los datos necesarios de la cita y su estado. No solicitamos documentos, fotografías ni datos médicos.',
  },
  {
    title: 'Para qué los usamos',
    icon: 'calendar',
    body: 'Los usamos únicamente para crear, confirmar, modificar o cancelar tu cita y para que el equipo de Lou Barbershop pueda atenderte. No vendemos tus datos ni los usamos para publicidad automática.',
  },
  {
    title: 'Cómo protegemos tu cita',
    icon: 'shield',
    body: 'La gestión en línea utiliza un enlace privado. No lo compartas: quien tenga ese enlace podrá consultar o cambiar la cita mientras siga vigente. No guardamos el código de tu enlace, solo una huella que no permite reconstruirlo.',
  },
  {
    title: 'Conservación y solicitudes',
    icon: 'box',
    body: 'Conservamos la información necesaria para operar y respaldar el historial de atención. Puedes solicitar corrección o revisión directamente en el local. Los registros económicos que deban conservarse se protegen y no se eliminan de forma que altere la contabilidad.',
  },
]

export const PrivacyPage = () => (
  <main className="bg-paper-warm px-4 pt-6 pb-12 sm:px-6 lg:pt-10">
    <article className="mx-auto grid w-full max-w-2xl gap-8">
      <header>
        <h1 className="font-display text-5xl leading-none font-extrabold sm:text-6xl">
          Privacidad
        </h1>
        <p className="mt-4 text-xl text-pretty text-ink-soft">
          Tus datos se usan solo para gestionar tu cita en Lou Barbershop. La información interna
          del negocio tiene controles de acceso adicionales.
        </p>
      </header>

      <div className="grid gap-8 rounded-sheet bg-surface p-6 shadow-raised sm:p-8">
        {sections.map((section) => (
          <section key={section.title} aria-labelledby={`privacy-${section.icon}`}>
            <h2
              id={`privacy-${section.icon}`}
              className="flex items-center gap-3 font-display text-2xl font-extrabold"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper-warm">
                <AppIcon name={section.icon} size={20} />
              </span>
              {section.title}
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-pretty text-ink-soft">{section.body}</p>
          </section>
        ))}
      </div>

      <section
        className="rounded-sheet bg-ink p-6 text-on-ink [--color-focus:var(--color-on-ink)] sm:p-8"
        aria-labelledby="privacy-contact"
      >
        <h2 id="privacy-contact" className="font-display text-2xl font-extrabold">
          ¿Quieres corregir tus datos o tienes dudas?
        </h2>
        {publicSite.whatsappUrl ? (
          <a
            className={`${buttonStyles({ variant: 'inverse' })} mt-4`}
            href={publicSite.whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            Escribir a la barbería
          </a>
        ) : (
          <p className="mt-2 text-on-ink-muted">
            Consúltanos en el local y te ayudamos en el momento.
          </p>
        )}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link className={buttonStyles({ size: 'lg' })} to="/reservar" viewTransition>
          Reservar una cita
        </Link>
        <Link className={buttonStyles({ variant: 'secondary', size: 'lg' })} to="/" viewTransition>
          Volver al inicio
        </Link>
      </div>
    </article>
  </main>
)
