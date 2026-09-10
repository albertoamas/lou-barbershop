import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'

vi.mock('../components/ServiceWorkerUpdateBanner', () => ({
  ServiceWorkerUpdateBanner: () => null,
}))

afterEach(cleanup)

describe('AppShell', () => {
  it('shows landing anchors over a transparent header', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell>
          <main>Landing</main>
        </AppShell>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Servicios' })).toHaveAttribute('href', '#servicios')
    expect(screen.getByRole('link', { name: 'Cómo funciona' })).toHaveAttribute(
      'href',
      '#como-funciona',
    )
    expect(screen.getByRole('banner')).toHaveAttribute('data-landing-header', 'transparent')
  })

  it('keeps secondary public screens on the solid header without landing anchors', () => {
    render(
      <MemoryRouter initialEntries={['/reservar']}>
        <AppShell>
          <main>Reserva</main>
        </AppShell>
      </MemoryRouter>,
    )

    expect(screen.queryByRole('link', { name: 'Servicios' })).not.toBeInTheDocument()
    expect(screen.getByRole('banner')).not.toHaveAttribute('data-landing-header')
  })
})
