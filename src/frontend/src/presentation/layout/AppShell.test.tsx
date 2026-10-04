import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'

vi.mock('../components/ServiceWorkerUpdateBanner', () => ({
  ServiceWorkerUpdateBanner: () => <div role="status">Actualización disponible</div>,
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
    expect(screen.getByRole('link', { name: 'Equipo' })).toHaveAttribute('href', '#equipo')
    expect(screen.getByRole('link', { name: 'Horario' })).toHaveAttribute('href', '#ubicacion')
    expect(screen.getByRole('banner')).toHaveAttribute('data-landing-header', 'transparent')
    expect(screen.getByRole('status').parentElement).toHaveAttribute(
      'data-public-notices',
      'below-fixed-header',
    )
    expect(screen.getByRole('status').parentElement).toHaveClass(
      'top-[calc(4.5rem+env(safe-area-inset-top))]',
      'z-30',
    )
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
    expect(screen.getByRole('status').parentElement).not.toHaveAttribute('data-public-notices')
  })

  it('keeps authentication screens free from the public navigation and footer', () => {
    render(
      <MemoryRouter initialEntries={['/app/login']}>
        <AppShell>
          <main>Acceso interno</main>
        </AppShell>
      </MemoryRouter>,
    )

    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navegación pública' })).not.toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })

  it('offers a skip link and restores content focus after route navigation', async () => {
    const user = userEvent.setup()
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)

    render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell>
          <Routes>
            <Route path="/" element={<Link to="/mi-cita">Ir a mi cita</Link>} />
            <Route path="/mi-cita" element={<h1>Gestionar mi cita</h1>} />
          </Routes>
        </AppShell>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
      'href',
      '#main-content',
    )
    await user.click(screen.getByRole('link', { name: 'Ir a mi cita' }))
    expect(document.activeElement).toBe(document.getElementById('main-content'))
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    scrollTo.mockRestore()
  })
})
