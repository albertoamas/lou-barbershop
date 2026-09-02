import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../infrastructure/http/apiClient'
import { authApi } from '../../infrastructure/http/authApi'

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
      navigate(requestedPath ?? '/', { replace: true })
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
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">Acceso interno</p>
        <h1>Bienvenido a Lou.</h1>
        <label htmlFor="username">Usuario</label>
        <input
          id="username"
          autoComplete="username"
          value={userName}
          onChange={(event) => setUserName(event.target.value)}
          required
        />
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {message && (
          <p className="form-error" role="alert">
            {message}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  )
}
