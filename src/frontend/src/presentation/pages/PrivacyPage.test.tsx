import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PrivacyPage } from './PrivacyPage'

describe('PrivacyPage', () => {
  it('explains public booking data use and offers safe navigation', () => {
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Privacidad' })).toBeInTheDocument()
    expect(screen.getByText(/solo una huella que no permite reconstruirlo/)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '¿Quieres corregir tus datos o tienes dudas?' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Qué datos usamos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cómo protegemos tu cita' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reservar una cita' })).toHaveAttribute(
      'href',
      '/reservar',
    )
  })
})
