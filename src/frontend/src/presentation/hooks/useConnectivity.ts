import { useSyncExternalStore } from 'react'
import type { Connectivity } from '../../core/connectivity/Connectivity'
import { browserConnectivitySource } from '../../infrastructure/browser/browserConnectivitySource'

export const useConnectivity = (): Connectivity =>
  useSyncExternalStore(
    browserConnectivitySource.subscribe,
    browserConnectivitySource.getSnapshot,
    () => 'online',
  )
