import type { IconName } from '../AppIcon'

// Each service gets a drawing of what it is, so lists read at a glance.
export const serviceIcon = (name: string): IconName => {
  const value = name.toLocaleLowerCase('es')
  if (value.includes('infantil') || value.includes('niño')) return 'kid'
  if (value.includes('corte') && value.includes('barba')) return 'beard'
  if (value.includes('afeitado') || value.includes('navaja')) return 'razor'
  if (value.includes('barba')) return 'beard'
  if (value.includes('ceja')) return 'eyebrow'
  if (value.includes('diseño')) return 'clipper'
  return 'scissors'
}
