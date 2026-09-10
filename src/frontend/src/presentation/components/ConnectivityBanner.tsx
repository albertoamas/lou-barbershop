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
      Sin conexión. Puedes consultar el contenido disponible, pero no reservar ni registrar
      movimientos económicos.
    </div>
  )
}
