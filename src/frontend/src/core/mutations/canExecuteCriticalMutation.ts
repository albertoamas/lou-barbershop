import type { Connectivity } from '../connectivity/Connectivity'

export const canExecuteCriticalMutation = (connectivity: Connectivity): boolean =>
  connectivity === 'online'
