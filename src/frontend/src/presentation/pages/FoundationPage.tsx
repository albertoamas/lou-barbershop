import { canExecuteCriticalMutation } from '../../core/mutations/canExecuteCriticalMutation'
import { useConnectivity } from '../hooks/useConnectivity'

export const FoundationPage = () => {
  const connectivity = useConnectivity()
  const mutationAllowed = canExecuteCriticalMutation(connectivity)

  return (
    <main className="content">
      <p className="eyebrow">R0 · Fundación técnica</p>
      <h1>Simple por fuera. Rigurosa por dentro.</h1>
      <p className="lead">
        Esta primera versión valida la estructura, instalación y conectividad. Los módulos reales de
        agenda, atención y economía se incorporarán por fases, sin inventar datos ni reglas.
      </p>

      <section className="foundation-grid" aria-label="Principios de la aplicación">
        <article className="foundation-card">
          <span>01</span>
          <h2>Agenda</h2>
          <p>Reserva y disponibilidad tendrán su propio ciclo de vida.</p>
        </article>
        <article className="foundation-card">
          <span>02</span>
          <h2>Atención</h2>
          <p>Lo realizado se registrará separado de lo que estaba reservado.</p>
        </article>
        <article className="foundation-card">
          <span>03</span>
          <h2>Economía</h2>
          <p>Cobros, comisiones y liquidaciones conservarán trazabilidad independiente.</p>
        </article>
      </section>

      <section className="protected-action" aria-label="Prueba de seguridad sin conexión">
        <div>
          <strong>Mutación crítica de demostración</strong>
          <p>
            {mutationAllowed ? 'Disponible con conexión.' : 'Bloqueada hasta recuperar conexión.'}
          </p>
        </div>
        <button
          type="button"
          disabled={!mutationAllowed}
          onClick={() =>
            window.alert('La base permite enviar la solicitud; aún no existe lógica de negocio.')
          }
        >
          Probar protección
        </button>
      </section>
    </main>
  )
}
