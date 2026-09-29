import { describe, expect, it } from 'vitest'
import {
  appointmentReportLabel,
  basisPointsToPercent,
  commissionReportLabel,
  paymentReportLabel,
} from './Reporting'

describe('reporting presentation rules', () => {
  it('renders integer basis points without losing precision', () => {
    expect(basisPointsToPercent(3333)).toBe('33.33 %')
  })

  it('uses business terms for appointment, commission and payment states', () => {
    expect(appointmentReportLabel('NO_SHOW')).toBe('No asistió')
    expect(commissionReportLabel('SETTLED')).toBe('Liquidada')
    expect(paymentReportLabel('CASH')).toBe('Efectivo')
  })
})
