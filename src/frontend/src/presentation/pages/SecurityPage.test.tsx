import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthSession } from '../../core/auth/AuthSession'
import { authApi } from '../../infrastructure/http/authApi'
import { MotionProvider } from '../components/MotionProvider'
import { SecurityPage } from './SecurityPage'

vi.mock('../../infrastructure/http/authApi', () => ({
  authApi: {
    current: vi.fn(),
    changePassword: vi.fn(),
    setupMfa: vi.fn(),
    enableMfa: vi.fn(),
    disableMfa: vi.fn(),
  },
}))

const owner: AuthSession = {
  id: 'owner',
  userName: 'alberto',
  roles: ['OWNER', 'BARBER'],
  mfaEnabled: false,
  mfaRequired: false,
}

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MotionProvider>
        <SecurityPage />
      </MotionProvider>
    </QueryClientProvider>,
  )

beforeEach(() => {
  vi.mocked(authApi.current).mockResolvedValue(owner)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('SecurityPage', () => {
  it('summarises the account and recommends two-step verification to the owner', async () => {
    renderPage()
    expect(await screen.findByText('alberto')).toBeInTheDocument()
    expect(screen.getByText('Desactivada')).toBeInTheDocument()
    expect(screen.getByText(/Te recomendamos activar/)).toHaveAttribute('role', 'status')
  })

  it('blocks the rest of the app message when the account must enable it', async () => {
    vi.mocked(authApi.current).mockResolvedValue({ ...owner, mfaRequired: true })
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Debes activar la verificación en dos pasos antes de usar las demás secciones.',
    )
  })

  it('changes the password only once every requirement is met', async () => {
    vi.mocked(authApi.changePassword).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Cambiar contraseña' }))
    const sheet = screen.getByRole('dialog', { name: 'Cambiar contraseña' })
    const save = within(sheet).getByRole('button', { name: 'Cambiar contraseña' })

    await user.type(within(sheet).getByLabelText('Contraseña actual'), 'Vieja-clave!8426')
    await user.type(within(sheet).getByLabelText('Nueva contraseña'), 'nueva-clave')
    expect(within(sheet).getByText('Una letra mayúscula')).toHaveTextContent('pendiente')
    expect(save).toBeDisabled()

    await user.clear(within(sheet).getByLabelText('Nueva contraseña'))
    await user.type(within(sheet).getByLabelText('Nueva contraseña'), 'Nueva-clave!2026')
    await user.type(within(sheet).getByLabelText('Repite la nueva contraseña'), 'Nueva-clave!2025')
    expect(within(sheet).getByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    expect(save).toBeDisabled()

    await user.clear(within(sheet).getByLabelText('Repite la nueva contraseña'))
    await user.type(within(sheet).getByLabelText('Repite la nueva contraseña'), 'Nueva-clave!2026')
    expect(within(sheet).getByText('Las contraseñas coinciden.')).toBeInTheDocument()
    await user.click(save)

    expect(authApi.changePassword).toHaveBeenCalledWith('Vieja-clave!8426', 'Nueva-clave!2026')
    expect(
      await screen.findByText('Contraseña cambiada. Se cerró la sesión en tus otros dispositivos.'),
    ).toBeInTheDocument()
  })

  it('guides activation with a QR code and keeps the codes sheet open until they are saved', async () => {
    vi.mocked(authApi.setupMfa).mockResolvedValue({
      sharedKey: 'abcd efgh ijkl mnop',
      authenticatorUri: 'otpauth://totp/Lou:alberto?secret=ABCDEFGHIJKLMNOP&issuer=Lou',
    })
    vi.mocked(authApi.enableMfa).mockResolvedValue({
      recoveryCodes: ['aaaa-bbbb', 'cccc-dddd'],
    })
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Activar' }))
    const sheet = screen.getByRole('dialog', { name: 'Activar verificación en dos pasos' })

    expect(within(sheet).getByText('Paso 1 de 3')).toBeInTheDocument()
    await user.type(within(sheet).getByLabelText('Tu contraseña actual'), 'Clave-local!8426')
    await user.click(within(sheet).getByRole('button', { name: 'Continuar' }))
    expect(authApi.setupMfa).toHaveBeenCalledWith('Clave-local!8426')

    expect(
      await within(sheet).findByRole('img', {
        name: 'Código QR para agregar Lou a tu aplicación',
      }),
    ).toBeInTheDocument()
    expect(within(sheet).getByText('ABCD EFGH IJKL MNOP')).toBeInTheDocument()
    await user.click(within(sheet).getByRole('button', { name: 'Ya lo agregué' }))

    await user.type(within(sheet).getByLabelText('Código de 6 dígitos'), '12a3456')
    expect(within(sheet).getByLabelText('Código de 6 dígitos')).toHaveValue('123456')
    await user.click(within(sheet).getByRole('button', { name: 'Activar' }))
    expect(authApi.enableMfa).toHaveBeenCalledWith('Clave-local!8426', '123456')

    const codes = await within(sheet).findByRole('list', { name: 'Códigos de recuperación' })
    expect(within(codes).getAllByRole('listitem')).toHaveLength(2)
    expect(within(sheet).getByRole('link', { name: 'Descargar' })).toHaveAttribute(
      'download',
      'lou-codigos-recuperacion-alberto.txt',
    )
    const done = within(sheet).getByRole('button', { name: 'Listo' })
    expect(done).toBeDisabled()
    expect(within(sheet).getByRole('button', { name: 'Cerrar' })).toBeDisabled()
    await user.click(within(sheet).getByRole('checkbox', { name: 'Ya guardé mis códigos' }))
    await user.click(done)
    expect(
      screen.queryByRole('dialog', { name: 'Activar verificación en dos pasos' }),
    ).not.toBeInTheDocument()
  })

  it('disables two-step verification with the password and a code', async () => {
    vi.mocked(authApi.current).mockResolvedValue({ ...owner, mfaEnabled: true })
    vi.mocked(authApi.disableMfa).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText('Activada')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Desactivar' }))
    const sheet = screen.getByRole('dialog', { name: 'Desactivar verificación' })
    await user.type(within(sheet).getByLabelText('Tu contraseña actual'), 'Clave-local!8426')
    await user.type(
      within(sheet).getByLabelText('Código de tu aplicación o de recuperación'),
      ' 654321 ',
    )
    await user.click(within(sheet).getByRole('button', { name: 'Desactivar verificación' }))
    expect(authApi.disableMfa).toHaveBeenCalledWith('Clave-local!8426', '654321')
  })
})
