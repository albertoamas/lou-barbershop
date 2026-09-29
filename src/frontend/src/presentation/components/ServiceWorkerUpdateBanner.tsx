import { useState, useSyncExternalStore } from 'react'
import { serviceWorkerUpdateSource } from '../../infrastructure/pwa/serviceWorkerUpdateSource'

export const ServiceWorkerUpdateBanner = () => {
  const [deferred, setDeferred] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState(false)
  const available = useSyncExternalStore(
    serviceWorkerUpdateSource.subscribe,
    serviceWorkerUpdateSource.getSnapshot,
    () => false,
  )
  if (!available || deferred) return null
  const apply = async () => {
    setApplying(true)
    setError(false)
    try {
      await serviceWorkerUpdateSource.apply()
    } catch {
      setError(true)
    } finally {
      setApplying(false)
    }
  }
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-3 border-b border-lou-steel/30 bg-white px-4 py-2.5 text-sm text-lou-ink"
      role="status"
    >
      <span>
        {error
          ? 'No se pudo actualizar. Intenta de nuevo cuando tengas conexión.'
          : 'Hay una versión nueva. Termina lo que estás haciendo antes de actualizar.'}
      </span>
      <button
        className="min-h-11 rounded-lg bg-lou-ink px-4 py-2 font-bold text-white transition-colors duration-300 hover:bg-lou-charcoal disabled:opacity-50"
        type="button"
        disabled={applying}
        onClick={() => void apply()}
      >
        {applying ? 'Actualizando…' : 'Actualizar ahora'}
      </button>
      <button
        className="min-h-11 rounded-lg px-4 py-2 font-bold text-lou-graphite/70 hover:bg-lou-paper hover:text-lou-ink"
        type="button"
        disabled={applying}
        onClick={() => setDeferred(true)}
      >
        Más tarde
      </button>
    </div>
  )
}
