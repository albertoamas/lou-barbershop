import { useState, type FormEvent } from 'react'
import type { MfaSetup } from '../../../core/auth/AuthSession'
import { groupedKey, isAuthenticatorUri } from '../../../core/auth/Security'
import { cn } from '../../styles/cn'
import { errorClassName, fieldClassName, labelClassName } from '../../styles/formStyles'
import { AppIcon } from '../AppIcon'
import { Button } from '../Button'
import { buttonStyles } from '../buttonStyles'
import { SheetHeader } from '../SheetHeader'
import { PasswordField } from './PasswordField'
import { QrCode } from './QrCode'
import { RecoveryCodes } from './RecoveryCodes'

type SetupStep = 'password' | 'scan' | 'code' | 'codes'
const stepNumber: Record<Exclude<SetupStep, 'codes'>, number> = { password: 1, scan: 2, code: 3 }

const Progress = ({ step }: { step: SetupStep }) =>
  step === 'codes' ? null : (
    <p className="mb-4 font-semibold text-ink-soft">Paso {stepNumber[step]} de 3</p>
  )

const Actions = ({
  busy,
  disabled,
  label,
  onBack,
  backLabel = 'Cancelar',
}: {
  busy: boolean
  disabled: boolean
  label: string
  onBack: () => void
  backLabel?: string
}) => (
  <div className="grid gap-2 sm:grid-cols-2">
    <Button type="button" variant="ghost" disabled={busy} onClick={onBack}>
      {backLabel}
    </Button>
    <Button type="submit" disabled={busy || disabled}>
      {busy ? 'Un momento' : label}
    </Button>
  </div>
)

const CodeField = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <label className={labelClassName} htmlFor="mfa-code">
    Código de 6 dígitos
    <input
      id="mfa-code"
      name="mfa-code"
      className={cn(fieldClassName, 'text-center text-2xl tracking-[0.3em] tabular-nums')}
      autoComplete="one-time-code"
      inputMode="numeric"
      maxLength={6}
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
      required
    />
  </label>
)

export const MfaSetupSheet = ({
  userName,
  date,
  busy,
  online,
  error,
  onClose,
  onSetup,
  onEnable,
}: {
  userName: string
  date: string
  busy: boolean
  online: boolean
  error: string
  onClose: () => void
  onSetup: (password: string) => Promise<MfaSetup | undefined>
  onEnable: (password: string, code: string) => Promise<string[] | undefined>
}) => {
  const [step, setStep] = useState<SetupStep>('password')
  const [password, setPassword] = useState('')
  const [setup, setSetup] = useState<MfaSetup>()
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const finished = step === 'codes'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (step === 'password') {
      const result = await onSetup(password)
      if (result) {
        setSetup(result)
        setStep('scan')
      }
    } else if (step === 'scan') setStep('code')
    else if (step === 'code') {
      const result = await onEnable(password, code)
      if (result) {
        setCodes(result)
        setPassword('')
        setStep('codes')
      } else setCode('')
    } else if (saved) onClose()
  }

  const copyKey = async () => {
    if (!setup) return
    try {
      await navigator.clipboard.writeText(setup.sharedKey.replace(/\s+/g, ''))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <SheetHeader
        title={finished ? 'Verificación activada' : 'Activar verificación en dos pasos'}
        busy={busy || (finished && !saved)}
        onClose={onClose}
      >
        {finished && (
          <p className="mt-1 text-pretty text-ink-soft">
            Desde ahora, al entrar te pediremos un código de tu teléfono.
          </p>
        )}
      </SheetHeader>
      <Progress step={step} />
      <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
        {step === 'password' && (
          <>
            <p className="text-pretty">
              Además de tu contraseña, para entrar te pediremos un código que cambia cada 30
              segundos en una aplicación de tu teléfono, como Google Authenticator o Microsoft
              Authenticator.
            </p>
            <PasswordField
              id="mfa-password"
              label="Tu contraseña actual"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </>
        )}
        {step === 'scan' && setup && (
          <>
            <p className="text-pretty">
              Abre la aplicación de tu teléfono, toca agregar cuenta y escanea este código.
            </p>
            <div className="grid justify-items-center gap-3 rounded-control bg-surface-muted p-4">
              <QrCode
                value={setup.authenticatorUri}
                label="Código QR para agregar Lou a tu aplicación"
              />
              {isAuthenticatorUri(setup.authenticatorUri) && (
                <a
                  className={cn(buttonStyles({ variant: 'secondary', size: 'sm' }), 'md:hidden')}
                  href={setup.authenticatorUri}
                >
                  Abrir en mi aplicación
                </a>
              )}
            </div>
            <div className="grid gap-2">
              <p className="font-semibold">¿No puedes escanear? Escribe esta clave:</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 rounded-control bg-surface-muted px-3 py-2 font-mono text-base break-all">
                  {groupedKey(setup.sharedKey)}
                </code>
                <Button type="button" variant="secondary" size="sm" onClick={() => void copyKey()}>
                  {copied ? 'Copiada' : 'Copiar'}
                </Button>
              </div>
            </div>
          </>
        )}
        {step === 'code' && (
          <>
            <p className="text-pretty">
              Escribe el código de 6 dígitos que muestra ahora tu aplicación para Lou.
            </p>
            <CodeField value={code} onChange={setCode} />
          </>
        )}
        {step === 'codes' && (
          <RecoveryCodes
            codes={codes}
            userName={userName}
            date={date}
            saved={saved}
            onSavedChange={setSaved}
          />
        )}
        {error && (
          <p className={errorClassName} role="alert">
            {error}
          </p>
        )}
        {step === 'password' && (
          <Actions busy={busy} disabled={!online || !password} label="Continuar" onBack={onClose} />
        )}
        {step === 'scan' && (
          <Actions busy={busy} disabled={false} label="Ya lo agregué" onBack={onClose} />
        )}
        {step === 'code' && (
          <Actions
            busy={busy}
            disabled={!online || code.length !== 6}
            label="Activar"
            backLabel="Volver"
            onBack={() => setStep('scan')}
          />
        )}
        {step === 'codes' && (
          <Button type="submit" width="full" disabled={!saved}>
            <AppIcon name="check" size={18} />
            Listo
          </Button>
        )}
      </form>
    </>
  )
}

export const MfaDisableSheet = ({
  busy,
  online,
  error,
  onClose,
  onDisable,
}: {
  busy: boolean
  online: boolean
  error: string
  onClose: () => void
  onDisable: (password: string, code: string) => void
}) => {
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  return (
    <>
      <SheetHeader title="Desactivar verificación" busy={busy} onClose={onClose}>
        <p className="mt-1 text-pretty text-ink-soft">
          Tu cuenta quedará protegida solo con la contraseña. Si alguien la conoce, podrá entrar.
        </p>
      </SheetHeader>
      <form
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault()
          onDisable(password, code.trim())
        }}
      >
        <PasswordField
          id="disable-password"
          label="Tu contraseña actual"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <label className={labelClassName} htmlFor="disable-code">
          Código de tu aplicación o de recuperación
          <input
            id="disable-code"
            name="disable-code"
            className={fieldClassName}
            autoComplete="one-time-code"
            autoCapitalize="none"
            spellCheck={false}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
        </label>
        {error && (
          <p className={errorClassName} role="alert">
            {error}
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={busy || !online || !password || !code.trim()}
          >
            {busy ? 'Un momento' : 'Desactivar verificación'}
          </Button>
        </div>
      </form>
    </>
  )
}
