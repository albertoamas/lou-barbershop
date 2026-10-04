import { describe, expect, it } from 'vitest'
import { serviceGroupOf } from './PublicBooking'

describe('service groups', () => {
  it('reads the group from the service name', () => {
    expect(serviceGroupOf('Corte clásico')).toBe('CUTS')
    expect(serviceGroupOf('Corte y barba')).toBe('CUTS')
    expect(serviceGroupOf('Barba')).toBe('BEARD')
    expect(serviceGroupOf('Afeitado con navaja')).toBe('BEARD')
    expect(serviceGroupOf('Cejas')).toBe('DETAILS')
    expect(serviceGroupOf('Diseño')).toBe('DETAILS')
  })
})
