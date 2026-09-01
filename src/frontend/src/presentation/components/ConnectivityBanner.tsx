import type { Connectivity } from '../../core/connectivity/Connectivity'

interface ConnectivityBannerProps {
  connectivity: Connectivity
}

export const ConnectivityBanner = ({ connectivity }: ConnectivityBannerProps) => {
  if (connectivity === 'online') {
    return null
  }

  return (
    <div className="connectivity-banner" role="status">
      Sin conexión. Puedes consultar el contenido disponible, pero no reservar ni registrar
      movimientos económicos.
    </div>
  )
}
