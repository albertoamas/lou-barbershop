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
      className="border-b border-amber-800/20 bg-amber-100 px-4 py-2.5 text-center text-sm font-medium text-amber-950"
      role="status"
    >
      Sin conexión. Lo que ya ves puede estar desactualizado; no puedes reservar ni guardar cambios
      o movimientos económicos hasta volver a conectarte.
    </div>
  )
}
