import type { Connectivity, ConnectivitySource } from '../../core/connectivity/Connectivity'

const getSnapshot = (): Connectivity => (navigator.onLine ? 'online' : 'offline')

const subscribe = (listener: () => void): (() => void) => {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)

  return () => {
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}

export const browserConnectivitySource: ConnectivitySource = {
  getSnapshot,
  subscribe,
}
