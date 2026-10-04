import { useState, useSyncExternalStore } from 'react'
import { serviceWorkerUpdateSource } from '../../infrastructure/pwa/serviceWorkerUpdateSource'
import { Button } from './Button'

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
      className="flex flex-wrap items-center justify-center gap-3 bg-surface-muted px-4 py-2.5 text-sm font-semibold text-ink"
      role="status"
    >
      <span>
        {error
          ? 'No se pudo actualizar. Intenta de nuevo cuando tengas conexión.'
          : 'Hay una versión nueva. Termina lo que estás haciendo antes de actualizar.'}
      </span>
      <Button
        size="sm"
        variant="primary"
        type="button"
        disabled={applying}
        onClick={() => void apply()}
      >
        {applying ? 'Actualizando...' : 'Actualizar ahora'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        type="button"
        disabled={applying}
        onClick={() => setDeferred(true)}
      >
        Más tarde
      </Button>
    </div>
  )
}
