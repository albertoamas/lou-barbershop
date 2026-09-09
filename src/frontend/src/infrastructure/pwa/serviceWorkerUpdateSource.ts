import { registerSW } from 'virtual:pwa-register'
import type { ServiceWorkerUpdateSource } from '../../core/pwa/ServiceWorkerUpdate'

let updateAvailable = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateAvailable = true
    notify()
  },
})

export const serviceWorkerUpdateSource: ServiceWorkerUpdateSource = {
  getSnapshot: () => updateAvailable,
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  async apply() {
    await updateSW(true)
  },
}
