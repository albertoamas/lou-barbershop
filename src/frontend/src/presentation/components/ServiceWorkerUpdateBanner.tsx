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
    <div
      className="flex flex-wrap items-center justify-center gap-3 border-b border-emerald-900/20 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-950"
      role="status"
    >
      <span>Hay una versión nueva. Actualiza cuando termines lo que estás haciendo.</span>
      <button
        className="min-h-11 rounded-lg bg-lou-ink px-4 py-2 font-bold text-white transition-[scale,background-color] duration-300 ease-lou active:scale-[0.98]"
        type="button"
        onClick={() => void serviceWorkerUpdateSource.apply()}
      >
        Actualizar ahora
      </button>
    </div>
  )
}
