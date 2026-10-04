import { useCallback, useSyncExternalStore } from 'react'

// Breakpoints shared with Tailwind: md is the tablet, lg the landscape tablet.
export const tabletQuery = '(min-width: 768px)'
export const wideQuery = '(min-width: 1024px)'

export const useMediaQuery = (query: string) => {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => undefined
      const list = window.matchMedia(query)
      list.addEventListener('change', notify)
      return () => list.removeEventListener('change', notify)
    },
    [query],
  )
  const snapshot = () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
