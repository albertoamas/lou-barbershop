import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState, type ReactNode } from 'react'
import { ApiError } from '../../infrastructure/http/apiClient'
import { authApi } from '../../infrastructure/http/authApi'
import { AgendaDialog } from '../components/AgendaDialog'
import { AppIcon, type IconName } from '../components/AppIcon'
import { Button } from '../components/Button'
import { StatusBadge } from '../components/StatusBadge'
import { Toast } from '../components/Toast'
import { MfaDisableSheet, MfaSetupSheet } from '../components/security/MfaSheets'
import { PasswordSheet } from '../components/security/PasswordSheet'
import { useConnectivity } from '../hooks/useConnectivity'
import { cn } from '../styles/cn'
import { errorClassName, warningClassName } from '../styles/formStyles'

type Panel = 'password' | 'mfa-on' | 'mfa-off'

const errorMessage = (error: unknown) => {
  if (!(error instanceof ApiError))
    return 'No pudimos completar el cambio. Revisa tu conexión y vuelve a intentarlo.'
  if (error.problem.status === 429)
    return 'Demasiados intentos. Espera unos minutos antes de volver a intentar.'
  return (
    error.problem.detail ??
    error.problem.title ??
    'No pudimos completar el cambio. Vuelve a intentarlo.'
  )
}

const today = () =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date())
    .replace(/\./g, '')

const Row = ({
  icon,
  title,
  status,
  children,
  action,
}: {
  icon: IconName
  title: string
  status?: ReactNode
  children: ReactNode
  action: ReactNode
}) => (
  <li className="grid grid-cols-[minmax(0,1fr)] gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
    <div className="flex min-w-0 gap-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-muted">
        <AppIcon name={icon} size={22} />
      </span>
      <div className="min-w-0">
        <h2 className="flex flex-wrap items-center gap-2 font-display text-2xl font-extrabold">
          {title}
          {status}
        </h2>
        <div className="mt-1 text-pretty text-ink-soft">{children}</div>
      </div>
    </div>
    <div className="grid sm:justify-items-end">{action}</div>
  </li>
)

export const SecurityPage = () => {
  const queryClient = useQueryClient()
  const online = useConnectivity() === 'online'
  const session = useQuery({ queryKey: ['auth', 'session'], queryFn: authApi.current })
  const [panel, setPanel] = useState<Panel | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const clearNotice = useCallback(() => setNotice(''), [])

  const open = (next: Panel | null) => {
    setError('')
    setPanel(next)
  }
  const run = async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true)
    setError('')
    try {
      return await action()
    } catch (caught) {
      setError(errorMessage(caught))
      return undefined
    } finally {
      setBusy(false)
    }
  }
  const refreshSession = () => queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })

  if (session.isPending)
    return (
      <main
        className="mx-auto w-full max-w-4xl px-4 py-6"
        role="status"
        aria-label="Cargando seguridad"
      >
        <div className="h-64 animate-pulse rounded-panel bg-surface-strong" />
      </main>
    )
  if (session.isError || !session.data)
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <div
          className={cn(errorClassName, 'flex flex-wrap items-center justify-between gap-3')}
          role="alert"
        >
          No pudimos comprobar tu sesión.
          <Button variant="secondary" size="sm" onClick={() => void session.refetch()}>
            Reintentar
          </Button>
        </div>
      </main>
    )

  const account = session.data
  const mfaEnabled = account.mfaEnabled === true
  const isOwner = account.roles.includes('OWNER')

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header>
        <h1 className="font-display text-5xl leading-none font-extrabold sm:text-6xl">Seguridad</h1>
        <p className="mt-2 text-lg text-pretty text-ink-soft">
          Protege tu cuenta <strong className="text-ink">{account.userName}</strong>.
        </p>
      </header>

      {account.mfaRequired && !mfaEnabled ? (
        <p className={cn(warningClassName, 'mt-5')} role="alert">
          Debes activar la verificación en dos pasos antes de usar las demás secciones.
        </p>
      ) : (
        isOwner &&
        !mfaEnabled && (
          <p className={cn(warningClassName, 'mt-5')} role="status">
            Te recomendamos activar la verificación en dos pasos: tu cuenta puede ver el dinero y
            cambiar la configuración.
          </p>
        )
      )}
      {!online && (
        <p className={cn(warningClassName, 'mt-5')} role="status">
          Sin conexión. Vuelve a conectarte para hacer cambios de seguridad.
        </p>
      )}

      <ul className="mt-6 divide-y divide-surface-strong rounded-panel bg-surface shadow-raised">
        <Row
          icon="shield"
          title="Contraseña"
          action={
            <Button variant="secondary" disabled={!online} onClick={() => open('password')}>
              Cambiar contraseña
            </Button>
          }
        >
          La que usas para entrar. Elige una que no uses en otro lugar.
        </Row>
        <Row
          icon="check"
          title="Verificación en dos pasos"
          status={
            <StatusBadge tone={mfaEnabled ? 'success' : 'muted'}>
              {mfaEnabled ? 'Activada' : 'Desactivada'}
            </StatusBadge>
          }
          action={
            mfaEnabled ? (
              <Button variant="dangerSoft" disabled={!online} onClick={() => open('mfa-off')}>
                Desactivar
              </Button>
            ) : (
              <Button disabled={!online} onClick={() => open('mfa-on')}>
                Activar
              </Button>
            )
          }
        >
          {mfaEnabled
            ? 'Al entrar te pedimos un código de la aplicación de tu teléfono.'
            : 'Agrega un código de tu teléfono al entrar. Así nadie entra solo con tu contraseña.'}
        </Row>
      </ul>

      {panel && (
        <AgendaDialog
          label={
            panel === 'password'
              ? 'Cambiar contraseña'
              : panel === 'mfa-on'
                ? 'Activar verificación en dos pasos'
                : 'Desactivar verificación'
          }
          // Recovery codes must not be dismissed by accident; the setup sheet closes itself.
          {...(panel === 'mfa-on' ? {} : { onClose: () => !busy && open(null) })}
        >
          {panel === 'password' && (
            <PasswordSheet
              busy={busy}
              online={online}
              error={error}
              onClose={() => open(null)}
              onSave={(current, next) =>
                void run(async () => {
                  await authApi.changePassword(current, next)
                  return true
                }).then(async (done) => {
                  if (!done) return
                  await refreshSession()
                  open(null)
                  setNotice('Contraseña cambiada. Se cerró la sesión en tus otros dispositivos.')
                })
              }
            />
          )}
          {panel === 'mfa-on' && (
            <MfaSetupSheet
              userName={account.userName}
              date={today()}
              busy={busy}
              online={online}
              error={error}
              onClose={() => {
                open(null)
                void refreshSession()
              }}
              onSetup={(password) => run(() => authApi.setupMfa(password))}
              onEnable={async (password, code) => {
                const enabled = await run(() => authApi.enableMfa(password, code))
                if (enabled) setNotice('Verificación en dos pasos activada')
                return enabled?.recoveryCodes
              }}
            />
          )}
          {panel === 'mfa-off' && (
            <MfaDisableSheet
              busy={busy}
              online={online}
              error={error}
              onClose={() => open(null)}
              onDisable={(password, code) =>
                void run(async () => {
                  await authApi.disableMfa(password, code)
                  return true
                }).then(async (done) => {
                  if (!done) return
                  await refreshSession()
                  open(null)
                  setNotice('Verificación en dos pasos desactivada')
                })
              }
            />
          )}
        </AgendaDialog>
      )}
      <Toast message={notice} onDone={clearNotice} />
    </main>
  )
}
