import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { authApi } from '../../infrastructure/http/authApi'
import { ApiError } from '../../infrastructure/http/apiClient'
import { Button } from '../components/Button'

const fieldClassName =
  'min-h-12 w-full rounded-xl border border-lou-steel/60 bg-white px-4 text-base text-lou-ink shadow-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-lou-ink focus:ring-3 focus:ring-lou-ink/10'

const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? (error.problem.detail ?? error.problem.title)
    : 'No pudimos completar la operación. Revisa tu conexión e inténtalo nuevamente.'

export const SecurityPage = () => {
  const queryClient = useQueryClient()
  const session = useQuery({ queryKey: ['auth', 'session'], queryFn: authApi.current })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mfaPassword, setMfaPassword] = useState('')
  const [currentFactor, setCurrentFactor] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [sharedKey, setSharedKey] = useState('')
  const [authenticatorUri, setAuthenticatorUri] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const changePassword = (event: FormEvent) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('La confirmación no coincide con la nueva contraseña.')
      return
    }
    void run(async () => {
      await authApi.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setNotice('Contraseña actualizada. Las demás sesiones quedaron revocadas.')
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
    })
  }

  const prepareMfa = () =>
    void run(async () => {
      const setup = await authApi.setupMfa(mfaPassword, currentFactor || undefined)
      setSharedKey(setup.sharedKey)
      setAuthenticatorUri(setup.authenticatorUri)
      setRecoveryCodes([])
      setNotice('Agrega la cuenta en tu aplicación autenticadora y confirma con un código.')
    })

  const enableMfa = () =>
    void run(async () => {
      const enabled = await authApi.enableMfa(mfaPassword, verificationCode)
      setRecoveryCodes(enabled.recoveryCodes)
      setSharedKey('')
      setAuthenticatorUri('')
      setVerificationCode('')
      setCurrentFactor('')
      setMfaPassword('')
      setNotice('Verificación en dos pasos activada. Guarda los códigos de recuperación ahora.')
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
    })

  const disableMfa = () =>
    void run(async () => {
      await authApi.disableMfa(mfaPassword, currentFactor)
      setMfaPassword('')
      setCurrentFactor('')
      setRecoveryCodes([])
      setNotice('Verificación en dos pasos desactivada.')
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
    })

  const mfaEnabled = session.data?.mfaEnabled === true
  const validAuthenticatorUri = authenticatorUri.startsWith('otpauth://totp/')

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <header className="border-b border-lou-fog pb-7">
        <p className="text-xs font-bold tracking-[0.18em] text-lou-graphite/50 uppercase">
          Cuenta y acceso
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">Seguridad</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-lou-graphite/65">
          Cambia tu contraseña y protege tu cuenta con una aplicación autenticadora. Los códigos y
          contraseñas nunca se guardan en este dispositivo.
        </p>
      </header>

      {session.data?.mfaRequired && !mfaEnabled && (
        <p
          className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950"
          role="alert"
        >
          La cuenta propietaria debe activar la verificación en dos pasos antes de usar las demás
          secciones.
        </p>
      )}
      {notice && (
        <p
          className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"
          role="status"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-semibold text-lou-danger"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <form
          className="rounded-2xl border border-lou-fog bg-white p-6 shadow-lou-sm"
          onSubmit={changePassword}
        >
          <h2 className="font-display text-2xl font-bold">Cambiar contraseña</h2>
          <p className="mt-2 text-sm leading-6 text-lou-graphite/60">
            Usa al menos 12 caracteres. Al guardar se revocan las demás sesiones de esta cuenta.
          </p>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-bold">
              Contraseña actual
              <input
                className={fieldClassName}
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Nueva contraseña
              <input
                className={fieldClassName}
                type="password"
                autoComplete="new-password"
                minLength={12}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Repite la nueva contraseña
              <input
                className={fieldClassName}
                type="password"
                autoComplete="new-password"
                minLength={12}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>
          </div>
          <Button className="mt-6" type="submit" disabled={busy}>
            Actualizar contraseña
          </Button>
        </form>

        <section className="rounded-2xl border border-lou-fog bg-white p-6 shadow-lou-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold">Verificación en dos pasos</h2>
              <p className="mt-2 text-sm leading-6 text-lou-graphite/60">
                Compatible con Google Authenticator, Microsoft Authenticator, 1Password y otras
                aplicaciones TOTP.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${mfaEnabled ? 'bg-emerald-100 text-emerald-900' : 'bg-lou-fog text-lou-graphite'}`}
            >
              {mfaEnabled ? 'Activa' : 'Inactiva'}
            </span>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-bold">
              Contraseña actual
              <input
                className={fieldClassName}
                type="password"
                autoComplete="current-password"
                value={mfaPassword}
                onChange={(event) => setMfaPassword(event.target.value)}
                required
              />
            </label>
            {mfaEnabled && (
              <label className="grid gap-2 text-sm font-bold">
                Código actual o de recuperación
                <input
                  className={fieldClassName}
                  autoComplete="one-time-code"
                  value={currentFactor}
                  onChange={(event) => setCurrentFactor(event.target.value)}
                  required
                />
              </label>
            )}
          </div>

          {!sharedKey && (
            <Button
              className="mt-6"
              type="button"
              disabled={busy || !mfaPassword || (mfaEnabled && !currentFactor)}
              onClick={mfaEnabled ? disableMfa : prepareMfa}
              variant={mfaEnabled ? 'danger' : 'primary'}
            >
              {mfaEnabled ? 'Desactivar segundo factor' : 'Configurar segundo factor'}
            </Button>
          )}

          {sharedKey && (
            <div className="mt-6 rounded-xl bg-lou-fog/70 p-4">
              <p className="text-sm font-bold">Clave de configuración</p>
              <code className="mt-2 block break-all rounded-lg bg-white p-3 text-sm">
                {sharedKey}
              </code>
              {validAuthenticatorUri && (
                <a
                  className="mt-3 inline-block text-sm font-bold underline"
                  href={authenticatorUri}
                >
                  Abrir en mi autenticador
                </a>
              )}
              <label className="mt-5 grid gap-2 text-sm font-bold">
                Código de seis dígitos
                <input
                  className={fieldClassName}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  required
                />
              </label>
              <Button
                className="mt-4"
                type="button"
                disabled={busy || verificationCode.length < 6}
                onClick={enableMfa}
              >
                Confirmar y activar
              </Button>
            </div>
          )}

          {recoveryCodes.length > 0 && (
            <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
              <h3 className="font-bold text-amber-950">Códigos de recuperación</h3>
              <p className="mt-1 text-sm text-amber-900">
                Guárdalos fuera de la aplicación. Cada código funciona una sola vez.
              </p>
              <ul
                className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm"
                aria-label="Códigos de recuperación"
              >
                {recoveryCodes.map((code) => (
                  <li key={code} className="rounded bg-white px-2 py-1">
                    {code}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
