import type { Connectivity } from '../../core/connectivity/Connectivity'

interface ConnectivityBannerProps {
  connectivity: Connectivity
}

export const ConnectivityBanner = ({ connectivity }: ConnectivityBannerProps) => {
  if (connectivity === 'online') {
    return null
  }

  return (
    <div
      className="bg-warning-soft px-4 py-3 text-center text-sm font-semibold text-warning-ink"
      role="status"
    >
      Sin conexión. Lo que ya ves puede estar desactualizado; no puedes reservar ni guardar cambios
      o movimientos económicos hasta volver a conectarte.
    </div>
  )
}
