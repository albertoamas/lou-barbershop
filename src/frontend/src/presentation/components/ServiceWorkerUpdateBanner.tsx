import { useSyncExternalStore } from 'react'
import { serviceWorkerUpdateSource } from '../../infrastructure/pwa/serviceWorkerUpdateSource'

export const ServiceWorkerUpdateBanner = () => {
  const available = useSyncExternalStore(
    serviceWorkerUpdateSource.subscribe,
    serviceWorkerUpdateSource.getSnapshot,
    () => false,
  )
  if (!available) return null
  return (
    <div className="update-banner" role="status">
      <span>Hay una versión nueva. Actualiza cuando termines lo que estás haciendo.</span>
      <button type="button" onClick={() => void serviceWorkerUpdateSource.apply()}>
        Actualizar ahora
      </button>
    </div>
  )
}
