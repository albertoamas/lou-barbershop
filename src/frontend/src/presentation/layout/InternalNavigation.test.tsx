import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InternalNavigation } from './InternalNavigation'

afterEach(cleanup)

const renderNavigation = (roles: string[]) => {
  const onLogout = vi.fn().mockResolvedValue(undefined)
  render(
    <MemoryRouter initialEntries={['/app/agenda']}>
      <InternalNavigation roles={roles} userName="lou.owner" onLogout={onLogout} />
    </MemoryRouter>,
  )
  return onLogout
}

describe('InternalNavigation', () => {
  it('shows the four primary mobile tasks and owner destinations', () => {
    renderNavigation(['OWNER'])

    const mobileNavigation = screen.getByRole('navigation', {
      name: 'Navegación principal móvil',
    })
    expect(mobileNavigation).toHaveTextContent('Inicio')
    expect(mobileNavigation).toHaveTextContent('Agenda')
    expect(mobileNavigation).toHaveTextContent('Atender')
    expect(mobileNavigation).toHaveTextContent('Más')
    expect(screen.getByRole('link', { name: /Reportes/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Configuración/i })).toBeInTheDocument()
  })

  it('keeps owner-only destinations away from a barber session', () => {
    renderNavigation(['BARBER'])

    expect(screen.queryByRole('link', { name: /Reportes/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Inventario y gastos/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Configuración/i })).not.toBeInTheDocument()
  })

  it('shows operational administration without exposing owner configuration', () => {
    renderNavigation(['ADMIN'])

    expect(screen.getByRole('link', { name: /Inventario y gastos/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Configuración/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Reportes/i })).not.toBeInTheDocument()
  })

  it('opens the mobile menu and closes the session', async () => {
    const user = userEvent.setup()
    const onLogout = renderNavigation(['OWNER'])

    await user.click(screen.getByRole('button', { name: 'Más' }))
    expect(screen.getAllByText('Sesión activa')).toHaveLength(2)
    await user.click(screen.getAllByRole('button', { name: /Cerrar sesión/i }).at(-1)!)

    expect(onLogout).toHaveBeenCalledOnce()
  })

  it('keeps keyboard focus in the mobile menu and returns it when dismissed', async () => {
    const user = userEvent.setup()
    renderNavigation(['OWNER'])

    const more = screen.getByRole('button', { name: 'Más' })
    await user.click(more)
    expect(screen.getByRole('dialog', { name: 'Más opciones del equipo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toHaveFocus()

    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(screen.getAllByRole('button', { name: 'Cerrar sesión' }).at(-1)).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(more).toHaveFocus()
  })
})
