import { useQueryClient } from '@tanstack/react-query'
import { m } from 'motion/react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authApi } from '../../infrastructure/http/authApi'
import { ApiError } from '../../infrastructure/http/apiClient'
import { Button } from '../components/Button'

const fieldClassName =
  'min-h-12 w-full rounded-xl border border-lou-steel/60 bg-white px-4 text-base text-lou-ink shadow-sm outline-none transition-[border-color,box-shadow] duration-150 focus:border-lou-ink focus:ring-3 focus:ring-lou-ink/10'

export const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')

    try {
      await authApi.login(userName, password)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
      const requestedPath = (location.state as { from?: string } | null)?.from
      navigate(requestedPath ?? '/app', { replace: true, viewTransition: true })
    } catch (error) {
      setMessage(
        error instanceof ApiError && error.problem.status === 429
          ? 'Demasiados intentos. Espera unos minutos.'
          : 'Usuario o contraseña incorrectos.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-[calc(100svh-4.5rem)] bg-white lg:grid-cols-[0.9fr_1.1fr]">
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

      <section className="grid place-items-center px-4 py-12 sm:px-8">
        <m.form
          className="w-full max-w-md"
          onSubmit={submit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
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
            <label className="grid gap-2 text-sm font-bold" htmlFor="password">
              Contraseña
              <input
                className={fieldClassName}
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
          </div>

          {message && (
            <m.p
              className="mt-5 rounded-xl border border-lou-danger/20 bg-red-50 px-4 py-3 text-sm font-semibold text-lou-danger"
              role="alert"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {message}
            </m.p>
          )}
          <Button className="mt-6" type="submit" width="full" disabled={submitting}>
            {submitting ? 'Ingresando…' : 'Ingresar'}
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
