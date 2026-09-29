import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, m } from 'motion/react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { internalReturnPath } from '../../core/auth/AuthSession'
import { authApi } from '../../infrastructure/http/authApi'
import { ApiError } from '../../infrastructure/http/apiClient'
import { Button } from '../components/Button'
import { AppIcon } from '../components/AppIcon'
import { BrandLockup } from '../components/BrandLockup'

const fieldClassName =
  'min-h-12 w-full rounded-xl border border-lou-steel/60 bg-white px-4 text-base text-lou-ink shadow-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-lou-ink focus:ring-3 focus:ring-lou-ink/10'

const loginErrorMessage = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    return 'No pudimos conectar con el sistema. Revisa tu conexión e inténtalo nuevamente.'
  }

  if (error.problem.status === 429) {
    return 'Demasiados intentos. Espera unos minutos antes de volver a intentar.'
  }

  if (error.problem.status === 401) {
    return 'Usuario o contraseña incorrectos.'
  }

  return 'El acceso no está disponible en este momento. Inténtalo nuevamente.'
}

export const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')

    try {
      await authApi.login(userName, password, twoFactorRequired ? twoFactorCode : undefined)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
      const requestedPath = internalReturnPath((location.state as { from?: unknown } | null)?.from)
      navigate(requestedPath, { replace: true, viewTransition: true })
    } catch (error) {
      if (error instanceof ApiError && error.problem.code === 'auth.two_factor_required') {
        setTwoFactorRequired(true)
        setMessage('Escribe el código de tu aplicación autenticadora o un código de recuperación.')
        return
      }
      setMessage(loginErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-dvh bg-white lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative hidden overflow-hidden bg-lou-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-30 [background:linear-gradient(128deg,transparent_0_55%,rgba(255,255,255,.1)_55%_55.5%,transparent_55.5%_100%)]" />
        <p className="relative text-xs font-bold tracking-[0.2em] text-white/50 uppercase">
          Acceso del equipo
        </p>
        <div className="relative">
          <h1 className="m-0 max-w-lg font-display text-7xl leading-[0.86] font-bold">
            Cada turno. Cada detalle.
          </h1>
          <p className="mt-6 max-w-md leading-7 text-white/55">
            La operación diaria de Lou, con agenda, atención y economía claramente separadas.
          </p>
        </div>
        <span className="relative text-xs text-white/35">Lou Barbershop · Operación interna</span>
      </section>

      <section className="grid place-items-center px-4 py-10 sm:px-8 lg:py-12">
        <m.form
          className="w-full max-w-md"
          onSubmit={submit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          aria-busy={submitting}
        >
          <BrandLockup className="mb-12 text-lou-ink lg:hidden" />
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">
            Acceso interno
          </p>
          <h1 className="m-0 max-w-none font-display text-5xl leading-none font-bold sm:text-6xl">
            Bienvenido a Lou.
          </h1>
          <p className="mt-3 text-sm leading-6 text-lou-graphite/60">
            Ingresa con la cuenta asignada a tu rol.
          </p>

          <div className="mt-9 grid gap-5">
            <label className="grid gap-2 text-sm font-bold" htmlFor="username">
              Usuario
              <input
                className={fieldClassName}
                id="username"
                autoComplete="username"
                value={userName}
                onChange={(event) => setUserName(event.target.value)}
                required
              />
            </label>
            <div className="grid gap-2">
              <label className="text-sm font-bold" htmlFor="password">
                Contraseña
              </label>
              <div className="relative">
                <input
                  className={`${fieldClassName} pr-13`}
                  id="password"
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  className="absolute inset-y-1 right-1 grid aspect-square place-items-center rounded-lg text-lou-graphite/60 transition-colors duration-200 hover:bg-lou-fog hover:text-lou-ink focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                  type="button"
                  aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={passwordVisible}
                  onClick={() => setPasswordVisible((visible) => !visible)}
                >
                  <AppIcon name={passwordVisible ? 'eye-off' : 'eye'} size={20} />
                </button>
              </div>
            </div>
            {twoFactorRequired && (
              <label className="grid gap-2 text-sm font-bold" htmlFor="two-factor-code">
                Código de verificación
                <input
                  className={fieldClassName}
                  id="two-factor-code"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  value={twoFactorCode}
                  onChange={(event) => setTwoFactorCode(event.target.value)}
                  required
                />
                <span className="text-xs leading-5 font-normal text-lou-graphite/55">
                  Puedes usar el código de seis dígitos o uno de tus códigos de recuperación.
                </span>
              </label>
            )}
          </div>

          <AnimatePresence initial={false}>
            {message && (
              <m.p
                className="mt-5 rounded-xl border border-lou-danger/20 bg-red-50 px-4 py-3 text-sm font-semibold text-lou-danger"
                role="alert"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                {message}
              </m.p>
            )}
          </AnimatePresence>
          <Button className="mt-6" type="submit" width="full" disabled={submitting}>
            {submitting && (
              <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
            )}
            {submitting ? 'Verificando…' : 'Ingresar'}
          </Button>
          <Link
            className="mt-6 block text-center text-sm font-semibold text-lou-graphite/60 underline-offset-4 hover:text-lou-ink hover:underline"
            to="/"
            viewTransition
          >
            Volver al sitio público
          </Link>
        </m.form>
      </section>
    </main>
  )
}
