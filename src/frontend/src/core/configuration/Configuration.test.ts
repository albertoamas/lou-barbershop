import { describe, expect, it } from 'vitest'
import {
  bolivianosToCents,
  byActiveThenName,
  centsToBolivianos,
  centsToInput,
  percentToBasisPoints,
  roleLabel,
  splitByValidity,
  staffFunction,
  type BarberProfile,
  type UserSummary,
} from './Configuration'

describe('people and conditions', () => {
  const barbers = [
    { id: 'b1', staffProfileId: 's1', employmentType: 'OWNER', active: true },
    { id: 'b2', staffProfileId: 's2', employmentType: 'CONTRACTOR', active: true },
    { id: 'b3', staffProfileId: 's3', employmentType: 'CONTRACTOR', active: false },
  ] as BarberProfile[]
  const users = [
    { id: 'u3', userName: 'ex', active: true, roles: ['BARBER'] },
    { id: 'u4', userName: 'lucia', active: true, roles: ['ADMIN'] },
  ] as UserSummary[]

  it('names what each person does in the shop', () => {
    expect(staffFunction({ id: 's1', userId: 'u1' }, barbers, users)).toBe('Dueño y barbero')
    expect(staffFunction({ id: 's2', userId: 'u2' }, barbers, users)).toBe('Barbero contratado')
    expect(staffFunction({ id: 's3', userId: 'u3' }, barbers, users)).toBe('Personal')
    expect(staffFunction({ id: 's4', userId: 'u4' }, barbers, users)).toBe('Administración')
    expect(roleLabel('ADMIN')).toBe('Administración')
  })

  it('separates current conditions from their history, newest first', () => {
    const { current, past } = splitByValidity([
      { id: 'a', active: false, validFrom: '2026-01-01' },
      { id: 'b', active: true, validFrom: '2026-08-01' },
      { id: 'c', active: true, validFrom: '2026-09-01' },
    ])
    expect(current.map((item) => item.id)).toEqual(['c', 'b'])
    expect(past.map((item) => item.id)).toEqual(['a'])
  })

  it('sinks deactivated records and sorts names in Spanish', () => {
    const rows = [
      { name: 'Zeta', active: true },
      { name: 'Ana', active: false },
      { name: 'Ñandú', active: true },
    ]
    expect(rows.sort(byActiveThenName((row) => row.name)).map((row) => row.name)).toEqual([
      'Ñandú',
      'Zeta',
      'Ana',
    ])
  })

  it('prints stored amounts for editing with a comma', () => {
    expect(centsToInput(5000)).toBe('50,00')
    expect(bolivianosToCents(centsToInput(6050))).toBe(6050)
  })
})

describe('money input for configuration', () => {
  it('converts BOB decimal input into integer cents', () => {
    expect(bolivianosToCents('60,50')).toBe(6050)
    expect(bolivianosToCents('70')).toBe(7000)
  })

  it('rejects ambiguous or over-precise values', () => {
    expect(bolivianosToCents('60.005')).toBeNull()
    expect(bolivianosToCents('-1')).toBeNull()
  })

  it('formats cents without floating point domain storage', () => {
    expect(centsToBolivianos(6050)).toContain('60')
  })
})

describe('commission rate input', () => {
  it('converts two decimal percent without rounding drift', () => {
    expect(percentToBasisPoints('50,29')).toBe(5029)
    expect(percentToBasisPoints('100')).toBe(10000)
  })

  it('rejects values outside the rate contract', () => {
    expect(percentToBasisPoints('100,01')).toBeNull()
    expect(percentToBasisPoints('50,123')).toBeNull()
    expect(percentToBasisPoints('-5')).toBeNull()
  })
})
