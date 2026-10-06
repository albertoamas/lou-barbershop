import { useEffect, useState } from 'react'
import type { Connectivity } from '../../core/connectivity/Connectivity'
import { AppIcon } from './AppIcon'

interface ConnectivityBannerProps {
  connectivity: Connectivity
}

const recoveredMs = 4000

// One line while offline; a short confirmation when the connection comes back.
export const ConnectivityBanner = ({ connectivity }: ConnectivityBannerProps) => {
  const [wasOffline, setWasOffline] = useState(connectivity !== 'online')
  const [recovered, setRecovered] = useState(false)

  if (connectivity !== 'online' && !wasOffline) setWasOffline(true)
  if (connectivity === 'online' && wasOffline) {
    setWasOffline(false)
    setRecovered(true)
  }

  useEffect(() => {
    if (!recovered) return
    const timer = window.setTimeout(() => setRecovered(false), recoveredMs)
    return () => window.clearTimeout(timer)
  }, [recovered])

  if (connectivity === 'online' && !recovered) return null
  const offline = connectivity !== 'online'

  return (
    <div
      className={
        offline
          ? 'flex items-center justify-center gap-2 bg-warning-soft px-4 py-2.5 text-sm font-semibold text-warning-ink'
          : 'flex items-center justify-center gap-2 bg-success-soft px-4 py-2.5 text-sm font-semibold text-success-ink'
      }
      role="status"
    >
      <AppIcon name={offline ? 'alert' : 'check'} size={18} />
      {offline
        ? 'Sin conexión. Puedes ver lo guardado, pero no guardar cambios.'
        : 'Conexión recuperada'}
    </div>
  )
}
