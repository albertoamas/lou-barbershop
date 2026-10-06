import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, m } from 'motion/react'
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { internalReturnPath } from '../../core/auth/AuthSession'
import { ApiError } from '../../infrastructure/http/apiClient'
import { authApi } from '../../infrastructure/http/authApi'
import { AppIcon } from '../components/AppIcon'
import { BrandLockup } from '../components/BrandLockup'
import { Button } from '../components/Button'
import { buttonStyles } from '../components/buttonStyles'
import { publicSite } from '../content/publicSite'
import { cn } from '../styles/cn'
import { errorClassName, fieldClassName, labelClassName } from '../styles/formStyles'

type Step = 'credentials' | 'code'

const loginErrorMessage = (error: unknown, step: Step) => {
  if (!(error instanceof ApiError))
    return 'No pudimos conectar con el sistema. Revisa tu conexión y vuelve a intentarlo.'
  if (error.problem.status === 429)
    return 'Demasiados intentos. Espera unos minutos antes de volver a intentar.'
  if (error.problem.status === 401)
    return step === 'code'
      ? 'El código no es correcto. Escribe el código que aparece ahora en tu aplicación.'
      : 'Usuario o contraseña incorrectos.'
  return 'El acceso no está disponible en este momento. Vuelve a intentarlo.'
}

const slide = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
}

export const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const passwordRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('credentials')
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [code, setCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState(false)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const trackCapsLock = (event: KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(event.getModifierState('CapsLock'))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      await authApi.login(userName, password, step === 'code' ? code.trim() : undefined)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
      const requestedPath = internalReturnPath((location.state as { from?: unknown } | null)?.from)
      navigate(requestedPath, { replace: true, viewTransition: true })
    } catch (error) {
      if (error instanceof ApiError && error.problem.code === 'auth.two_factor_required') {
        setStep('code')
        return
      }
      setMessage(loginErrorMessage(error, step))
      // A wrong secret is cleared so the next attempt starts clean, with the cursor there.
      if (error instanceof ApiError && error.problem.status === 401) {
        if (step === 'code') {
          setCode('')
          codeRef.current?.focus()
        } else {
          setPassword('')
          passwordRef.current?.focus()
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  const switchAccount = () => {
    setStep('credentials')
    setPassword('')
    setCode('')
    setRecoveryCode(false)
    setMessage('')
  }

  const shop = publicSite.photos.shop

  return (
    <main className="min-h-dvh bg-paper-warm lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      {/* Brand: a band on phones and tablets, a full panel on desktop. */}
      <section className="relative overflow-hidden bg-ink text-on-ink lg:flex lg:min-h-dvh lg:flex-col lg:justify-between lg:p-12">
        {shop && (
          <img
            className="absolute inset-0 hidden size-full object-cover opacity-45 lg:block"
            src={shop.src}
            alt=""
            width={shop.width}
            height={shop.height}
          />
        )}
        <div className="relative px-4 py-5 sm:px-8 lg:p-0">
          <BrandLockup className="text-on-ink" />
        </div>
        <div className="relative hidden lg:block">
          <h2 className="max-w-lg font-display text-7xl leading-[0.9] font-extrabold text-balance">
            Cada turno. Cada detalle.
          </h2>
          <p className="mt-5 max-w-md text-lg text-pretty text-on-ink-muted">
            La agenda, los cobros y el equipo de Lou, en un solo lugar.
          </p>
        </div>
        <p className="relative hidden text-on-ink-muted lg:block">Acceso solo para el equipo.</p>
      </section>

      <section className="flex justify-center px-4 py-8 sm:px-8 sm:py-14 lg:items-center lg:py-12">
        <div className="grid w-full max-w-md gap-4">
          <div className="rounded-panel bg-surface p-6 shadow-raised sm:p-8">
            <AnimatePresence mode="wait" initial={false}>
              <m.form
                key={step}
                onSubmit={submit}
                aria-busy={submitting}
                initial={slide.initial}
                animate={slide.animate}
                exit={slide.exit}
                transition={slide.transition}
              >
                {step === 'credentials' ? (
                  <>
                    <h1 className="font-display text-5xl leading-none font-extrabold">
                      Ingresa a Lou
                    </h1>
                    <p className="mt-3 text-pretty text-ink-soft">
                      Usa el usuario y la contraseña que te dio el dueño.
                    </p>
                    <div className="mt-8 grid gap-5">
                      <label className={labelClassName} htmlFor="username">
                        Usuario
                        <input
                          className={fieldClassName}
                          id="username"
                          name="username"
                          autoComplete="username"
                          autoCapitalize="none"
                          spellCheck={false}
                          value={userName}
                          onChange={(event) => setUserName(event.target.value)}
                          required
                        />
                      </label>
                      <div className="grid gap-2">
                        <label className={labelClassName} htmlFor="password">
                          Contraseña
                        </label>
                        <div className="relative">
                          <input
                            ref={passwordRef}
                            className={cn(fieldClassName, 'pr-14')}
                            id="password"
                            name="password"
                            type={passwordVisible ? 'text' : 'password'}
                            autoComplete="current-password"
                            aria-describedby={capsLock ? 'caps-lock' : undefined}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            onKeyDown={trackCapsLock}
                            onKeyUp={trackCapsLock}
                            onBlur={() => setCapsLock(false)}
                            required
                          />
                          <button
                            className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-control text-ink-soft transition-colors duration-150 hover:text-ink"
                            type="button"
                            aria-label={
                              passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'
                            }
                            aria-pressed={passwordVisible}
                            onClick={() => setPasswordVisible((visible) => !visible)}
                          >
                            <AppIcon name={passwordVisible ? 'eye-off' : 'eye'} size={20} />
                          </button>
                        </div>
                        {capsLock && (
                          <p
                            id="caps-lock"
                            className="flex items-center gap-2 text-sm font-semibold text-warning-ink"
                          >
                            <AppIcon name="alert" size={16} />
                            Bloq Mayús está activado.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h1 className="font-display text-5xl leading-none font-extrabold text-balance">
                      Verificación en dos pasos
                    </h1>
                    <p className="mt-3 text-pretty text-ink-soft">
                      {recoveryCode
                        ? 'Escribe uno de los códigos de recuperación que guardaste al activar la verificación.'
                        : 'Abre tu aplicación autenticadora y escribe el código de 6 dígitos de Lou.'}
                    </p>
                    <div className="mt-8 grid gap-3">
                      <label className={labelClassName} htmlFor="two-factor-code">
                        {recoveryCode ? 'Código de recuperación' : 'Código de verificación'}
                        <input
                          ref={codeRef}
                          className={cn(
                            fieldClassName,
                            !recoveryCode && 'text-center text-2xl tracking-[0.3em] tabular-nums',
                          )}
                          id="two-factor-code"
                          name="two-factor-code"
                          autoComplete="one-time-code"
                          autoCapitalize="none"
                          spellCheck={false}
                          inputMode={recoveryCode ? 'text' : 'numeric'}
                          maxLength={recoveryCode ? 32 : 6}
                          // eslint-disable-next-line jsx-a11y/no-autofocus -- the only field of this step
                          autoFocus
                          value={code}
                          onChange={(event) => setCode(event.target.value)}
                          required
                        />
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="justify-self-start"
                        onClick={() => {
                          setRecoveryCode((value) => !value)
                          setCode('')
                          codeRef.current?.focus()
                        }}
                      >
                        {recoveryCode
                          ? 'Usar el código de la aplicación'
                          : 'Usar un código de recuperación'}
                      </Button>
                    </div>
                  </>
                )}

                <AnimatePresence initial={false}>
                  {message && (
                    <m.p
                      className={cn(errorClassName, 'mt-5')}
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
                    <span className="size-4 animate-spin rounded-full border-2 border-on-ink/35 border-t-on-ink" />
                  )}
                  {step === 'code'
                    ? submitting
                      ? 'Verificando'
                      : 'Verificar'
                    : submitting
                      ? 'Ingresando'
                      : 'Ingresar'}
                </Button>

                {step === 'code' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    width="full"
                    className="mt-2"
                    disabled={submitting}
                    onClick={switchAccount}
                  >
                    <AppIcon name="arrow-left" size={18} />
                    Usar otra cuenta
                  </Button>
                ) : (
                  <p className="mt-6 text-sm text-pretty text-ink-soft">
                    ¿Olvidaste tu contraseña? Pídele al dueño que la cambie desde Configuración.
                  </p>
                )}
              </m.form>
            </AnimatePresence>
          </div>
          <Link
            className={cn(buttonStyles({ variant: 'ghost', size: 'sm' }), 'justify-self-center')}
            to="/"
            viewTransition
          >
            <AppIcon name="arrow-left" size={18} />
            Volver al sitio público
          </Link>
        </div>
      </section>
    </main>
  )
}
