import { Link } from 'react-router-dom'

const sections = [
  {
    title: 'Qué datos usamos',
    body: 'Para una reserva solicitamos tu nombre y número de teléfono o WhatsApp. También conservamos los datos necesarios de la cita y su estado. No solicitamos documentos, fotografías ni datos médicos.',
  },
  {
    title: 'Para qué los usamos',
    body: 'Los usamos únicamente para crear, confirmar, modificar o cancelar tu cita y para que el equipo de Lou Barbershop pueda atenderte. No vendemos tus datos ni los usamos para publicidad automática.',
  },
  {
    title: 'Cómo protegemos tu cita',
    body: 'La gestión en línea utiliza un enlace privado. No lo compartas: quien tenga ese enlace podrá consultar o cambiar la cita mientras siga vigente. El sistema almacena una huella del token, no el token original.',
  },
  {
    title: 'Conservación y solicitudes',
    body: 'Conservamos la información necesaria para operar y respaldar el historial de atención. Puedes solicitar corrección o revisión directamente en el local. Los registros económicos que deban conservarse se protegen y no se eliminan de forma que altere la contabilidad.',
  },
]

export const PrivacyPage = () => (
  <main className="bg-lou-paper px-4 py-10 sm:px-6 sm:py-16 lg:px-10">
    <article className="mx-auto max-w-4xl rounded-3xl border border-lou-fog bg-white p-6 shadow-lou-sm sm:p-10">
      <p className="text-xs font-bold tracking-[0.18em] text-lou-graphite/60 uppercase">
        Privacidad
      </p>
      <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-lou-ink sm:text-5xl">
        Tus datos, sólo para gestionar tu visita.
      </h1>
      <p className="mt-5 max-w-3xl text-base leading-7 text-lou-graphite/75">
        Este aviso resume el tratamiento de datos en la reserva pública de Lou Barbershop. La
        información administrativa y económica interna tiene controles de acceso adicionales.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {sections.map((section) => (
          <section key={section.title} className="rounded-2xl bg-lou-paper p-5">
            <h2 className="text-lg font-extrabold text-lou-ink">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-lou-graphite/75">{section.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3 border-t border-lou-fog pt-6">
        <Link
          className="inline-flex min-h-11 items-center rounded-xl bg-lou-ink px-5 text-sm font-bold text-white transition-colors hover:bg-lou-graphite"
          to="/reservar"
          viewTransition
        >
          Reservar una cita
        </Link>
        <Link
          className="inline-flex min-h-11 items-center rounded-xl border border-lou-fog px-5 text-sm font-bold text-lou-ink transition-colors hover:bg-lou-paper"
          to="/"
          viewTransition
        >
          Volver al inicio
        </Link>
      </div>
    </article>
  </main>
)
