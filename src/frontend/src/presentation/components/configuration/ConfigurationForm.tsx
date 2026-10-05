import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import {
  bolivianosToCents,
  centsToInput,
  percentToBasisPoints,
  roleLabel,
  type ConfigurationSnapshot,
} from '../../../core/configuration/Configuration'
import { todayInBusinessTime } from '../../../core/scheduling/Scheduling'
import { configurationApi } from '../../../infrastructure/http/configurationApi'
import { cn } from '../../styles/cn'
import { errorClassName, fieldClassName, labelClassName } from '../../styles/formStyles'
import { Button } from '../Button'
import { editorTitles, type EditorKind } from './configPanels'
import { SheetHeader } from './SheetHeader'

const read = (data: FormData, key: string) => String(data.get(key) ?? '').trim()

const Field = ({
  label,
  name,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; hint?: string }) => (
  <div className="grid gap-2">
    <label className={labelClassName}>
      {label}
      <input
        className={fieldClassName}
        name={name}
        aria-describedby={hint ? `${name}-hint` : undefined}
        {...props}
      />
    </label>
    {hint && (
      <span id={`${name}-hint`} className="text-sm text-ink-soft">
        {hint}
      </span>
    )}
  </div>
)

const SelectField = ({
  label,
  name,
  options,
  defaultValue,
  required = false,
}: {
  label: string
  name: string
  options: { value: string; label: string }[]
  defaultValue?: string | undefined
  required?: boolean
}) => (
  <label className={labelClassName}>
    {label}
    <select
      className={fieldClassName}
      name={name}
      defaultValue={defaultValue ?? (required ? '' : (options[0]?.value ?? ''))}
      required={required}
    >
      {required && <option value="">Elige una opción</option>}
      {options.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  </label>
)

const Note = ({ children }: { children: ReactNode }) => (
  <p className="rounded-control bg-surface-muted p-4 text-pretty text-ink-soft">{children}</p>
)

const employmentOptions = [
  { value: 'CONTRACTOR', label: 'Contratado, genera comisión' },
  { value: 'OWNER', label: 'Dueño, sin comisión' },
]
const frequencyOptions = [
  { value: 'BIWEEKLY', label: 'Quincenal' },
  { value: 'MONTHLY', label: 'Mensual' },
]

export const ConfigurationForm = ({
  kind,
  id,
  barberId,
  data,
  busy,
  online,
  error,
  footer,
  onBack,
  onClose,
  onCreateAccount,
  onSave,
}: {
  kind: EditorKind
  id?: string | undefined
  barberId?: string | undefined
  data: ConfigurationSnapshot
  busy: boolean
  online: boolean
  error: string
  // Secondary actions for the record, such as deactivating it.
  footer?: ReactNode
  onBack?: (() => void) | undefined
  onClose: () => void
  onCreateAccount: () => void
  onSave: (action: () => Promise<unknown>, refresh?: string[][]) => void
}) => {
  const [localError, setLocalError] = useState('')
  const staff = data.staff.find((item) => item.id === id)
  const barber = data.barbers.find((item) => item.id === id)
  const service = data.services.find((item) => item.id === id)
  const product = data.products.find((item) => item.id === id)
  const category = data.expenseCategories.find((item) => item.id === id)
  const user = data.users.find((item) => item.id === id)
  const targetBarber = data.barbers.find((item) => item.id === barberId)
  const nameFor = (staffId: string | undefined) =>
    data.staff.find((item) => item.id === staffId)?.displayName ?? 'Barbero'
  const freeAccounts = data.users.filter(
    (item) => item.active && !data.staff.some((person) => person.userId === item.id),
  )
  const freeStaff = data.staff.filter(
    (item) => item.active && !data.barbers.some((profile) => profile.staffProfileId === item.id),
  )
  const today = todayInBusinessTime()

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalError('')
    const form = new FormData(event.currentTarget)
    if (read(form, 'to') && read(form, 'to') < read(form, 'from')) {
      setLocalError('La fecha final no puede ser anterior a la fecha de inicio.')
      return
    }
    const cents = bolivianosToCents(read(form, 'price'))
    if (form.has('price') && cents === null) {
      setLocalError('Escribe el precio en bolivianos, por ejemplo 60 o 60,50.')
      return
    }
    const price = cents ?? 0
    const roles = form.getAll('roles').map(String)
    if ((kind === 'create-users' || kind === 'roles-users') && roles.length === 0) {
      setLocalError('Elige al menos un rol.')
      return
    }
    const validity = {
      validFrom: read(form, 'from'),
      ...(read(form, 'to') ? { validTo: read(form, 'to') } : {}),
    }
    switch (kind) {
      case 'create-team':
        return onSave(() =>
          configurationApi.createStaff({
            userId: read(form, 'userId'),
            displayName: read(form, 'name'),
            ...(read(form, 'phone') ? { phone: read(form, 'phone') } : {}),
          }),
        )
      case 'edit-team':
        if (!staff) break
        return onSave(() =>
          configurationApi.updateStaff(
            { ...staff, displayName: read(form, 'name'), phone: read(form, 'phone') },
            staff.active,
          ),
        )
      case 'create-barber':
        return onSave(() =>
          configurationApi.createBarber({
            staffProfileId: read(form, 'staffId') || (id ?? ''),
            employmentType: read(form, 'employmentType'),
            settlementFrequency: read(form, 'frequency'),
            color: read(form, 'color'),
          }),
        )
      case 'edit-barber':
        if (!barber) break
        return onSave(() =>
          configurationApi.updateBarber(
            {
              ...barber,
              employmentType: read(form, 'employmentType') as typeof barber.employmentType,
              settlementFrequency: read(form, 'frequency') as typeof barber.settlementFrequency,
              color: read(form, 'color'),
            },
            barber.active,
          ),
        )
      case 'create-services':
        return onSave(() =>
          configurationApi.createService({
            name: read(form, 'name'),
            defaultDurationMinutes: Number(read(form, 'duration')),
            defaultPriceCents: price,
          }),
        )
      case 'edit-services':
        if (!service) break
        return onSave(() =>
          configurationApi.updateService(
            {
              ...service,
              name: read(form, 'name'),
              defaultDurationMinutes: Number(read(form, 'duration')),
              defaultPriceCents: price,
            },
            service.active,
          ),
        )
      case 'create-offerings':
        if (!barberId) break
        return onSave(
          () =>
            configurationApi.createOffering(barberId, {
              serviceId: read(form, 'serviceId'),
              durationMinutes: Number(read(form, 'duration')),
              priceCents: price,
              ...validity,
            }),
          [['offerings', barberId]],
        )
      case 'create-products':
        return onSave(() =>
          configurationApi.createProduct({
            name: read(form, 'name'),
            ...(read(form, 'brand') ? { brand: read(form, 'brand') } : {}),
            ...(read(form, 'sku') ? { sku: read(form, 'sku') } : {}),
            salePriceCents: price,
            minimumStock: Number(read(form, 'minimum')),
          }),
        )
      case 'edit-products':
        if (!product) break
        return onSave(() =>
          configurationApi.updateProduct(
            {
              ...product,
              name: read(form, 'name'),
              brand: read(form, 'brand'),
              sku: read(form, 'sku'),
              salePriceCents: price,
              minimumStock: Number(read(form, 'minimum')),
            },
            product.active,
          ),
        )
      case 'create-commissions': {
        const points = percentToBasisPoints(read(form, 'rate'))
        if (points === null) {
          setLocalError('Escribe un porcentaje entre 0 y 100, con hasta dos decimales.')
          return
        }
        if (!barberId) break
        return onSave(
          () =>
            configurationApi.createCommissionRule(barberId, {
              kind: read(form, 'kind'),
              rateBasisPoints: points,
              ...validity,
            }),
          [['commission-rules', barberId]],
        )
      }
      case 'create-expenses':
        return onSave(() => configurationApi.createExpenseCategory(read(form, 'name')))
      case 'edit-expenses':
        if (!category) break
        return onSave(() =>
          configurationApi.updateExpenseCategory(
            { ...category, name: read(form, 'name') },
            category.active,
          ),
        )
      case 'create-users':
        return onSave(() =>
          configurationApi.createUser({
            userName: read(form, 'name'),
            password: read(form, 'password'),
            roles,
          }),
        )
      case 'roles-users':
        if (!user) break
        return onSave(() => configurationApi.replaceUserRoles(user.id, roles))
      case 'password-users':
        if (read(form, 'password') !== read(form, 'confirm')) {
          setLocalError('Las dos contraseñas no coinciden.')
          return
        }
        if (!user) break
        return onSave(() => configurationApi.resetUserPassword(user.id, read(form, 'password')))
    }
    setLocalError('No encontramos el registro. Cierra y vuelve a intentarlo.')
  }

  const durationField = (initial = 45) => (
    <Field
      label="Duración en minutos"
      name="duration"
      type="number"
      inputMode="numeric"
      min="5"
      max="480"
      defaultValue={String(initial)}
      required
    />
  )
  const priceField = (label: string, cents?: number) => (
    <Field
      label={label}
      name="price"
      inputMode="decimal"
      autoComplete="off"
      placeholder="60,00"
      defaultValue={cents === undefined ? '' : centsToInput(cents)}
      required
    />
  )
  const validityFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Rige desde" name="from" type="date" defaultValue={today} required />
      <Field label="Hasta (opcional)" name="to" type="date" />
    </div>
  )
  const roleFields = (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-semibold text-ink-soft">Rol</legend>
      {(['OWNER', 'ADMIN', 'BARBER'] as const).map((role) => (
        <label
          key={role}
          className="flex min-h-12 items-center gap-3 rounded-control border border-line px-4 font-semibold"
        >
          <input
            type="checkbox"
            name="roles"
            value={role}
            defaultChecked={kind === 'roles-users' ? user?.roles.includes(role) : role === 'BARBER'}
            className="size-5 accent-ink"
          />
          {roleLabel(role)}
        </label>
      ))}
    </fieldset>
  )
  const subtitle =
    kind === 'create-offerings' || kind === 'create-commissions'
      ? `Para ${nameFor(targetBarber?.staffProfileId)}`
      : kind === 'edit-barber' && barber
        ? nameFor(barber.staffProfileId)
        : kind === 'create-barber' && staff
          ? staff.displayName
          : (kind === 'roles-users' || kind === 'password-users') && user
            ? `Cuenta ${user.userName}`
            : undefined

  return (
    <>
      <SheetHeader title={editorTitles[kind]} busy={busy} onBack={onBack} onClose={onClose}>
        {subtitle && <p className="mt-1 text-ink-soft">{subtitle}</p>}
      </SheetHeader>
      <form onSubmit={submit} className="grid gap-4">
        {kind === 'create-team' &&
          (freeAccounts.length ? (
            <>
              <SelectField
                label="Cuenta de acceso"
                name="userId"
                options={freeAccounts.map((item) => ({ value: item.id, label: item.userName }))}
                required
              />
              <Field label="Nombre" name="name" maxLength={120} required />
              <Field label="Teléfono (opcional)" name="phone" inputMode="tel" />
            </>
          ) : (
            <Note>
              Cada persona necesita su propia cuenta de acceso y todas las cuentas ya tienen una
              persona.{' '}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={onCreateAccount}
              >
                Crear cuenta de acceso
              </Button>
            </Note>
          ))}
        {kind === 'edit-team' && staff && (
          <>
            <Field
              label="Nombre"
              name="name"
              defaultValue={staff.displayName}
              maxLength={120}
              required
            />
            <Field
              label="Teléfono (opcional)"
              name="phone"
              defaultValue={staff.phone ?? ''}
              inputMode="tel"
            />
          </>
        )}
        {kind === 'create-barber' && (
          <>
            {!staff && (
              <SelectField
                label="Persona"
                name="staffId"
                options={freeStaff.map((item) => ({ value: item.id, label: item.displayName }))}
                required
              />
            )}
            <SelectField label="Tipo" name="employmentType" options={employmentOptions} />
            <SelectField label="Liquidación" name="frequency" options={frequencyOptions} />
            <Field label="Color en la agenda" name="color" type="color" defaultValue="#2E3338" />
          </>
        )}
        {kind === 'edit-barber' && barber && (
          <>
            <SelectField
              label="Tipo"
              name="employmentType"
              defaultValue={barber.employmentType}
              options={employmentOptions}
            />
            <SelectField
              label="Liquidación"
              name="frequency"
              defaultValue={barber.settlementFrequency}
              options={frequencyOptions}
            />
            <Field
              label="Color en la agenda"
              name="color"
              type="color"
              defaultValue={barber.color || '#2E3338'}
            />
          </>
        )}
        {(kind === 'create-services' || kind === 'edit-services') && (
          <>
            <Field label="Nombre" name="name" defaultValue={service?.name ?? ''} required />
            <div className="grid gap-4 sm:grid-cols-2">
              {durationField(service?.defaultDurationMinutes)}
              {priceField('Precio por defecto en Bs', service?.defaultPriceCents)}
            </div>
            <Note>
              Cada barbero puede tener su propio precio en su ficha. Cambiar este valor no modifica
              citas ni cobros anteriores.
            </Note>
          </>
        )}
        {kind === 'create-offerings' && (
          <>
            <SelectField
              label="Servicio"
              name="serviceId"
              options={data.services
                .filter((item) => item.active)
                .map((item) => ({ value: item.id, label: item.name }))}
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {durationField()}
              {priceField('Precio en Bs')}
            </div>
            {validityFields}
            <Note>Las citas ya agendadas conservan el precio con el que se reservaron.</Note>
          </>
        )}
        {(kind === 'create-products' || kind === 'edit-products') && (
          <>
            <Field label="Nombre" name="name" defaultValue={product?.name ?? ''} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Marca (opcional)" name="brand" defaultValue={product?.brand ?? ''} />
              <Field label="Código (opcional)" name="sku" defaultValue={product?.sku ?? ''} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {priceField('Precio de venta en Bs', product?.salePriceCents)}
              <Field
                label="Avisar cuando queden"
                name="minimum"
                type="number"
                inputMode="numeric"
                min="0"
                defaultValue={String(product?.minimumStock ?? 0)}
                required
              />
            </div>
            <Note>Las existencias se registran en Inventario con compras y correcciones.</Note>
          </>
        )}
        {kind === 'create-commissions' && (
          <>
            <SelectField
              label="Aplica a"
              name="kind"
              options={[
                { value: 'SERVICE', label: 'Servicios' },
                { value: 'PRODUCT', label: 'Productos' },
              ]}
            />
            <Field
              label="Porcentaje"
              name="rate"
              inputMode="decimal"
              autoComplete="off"
              placeholder="50"
              required
            />
            {validityFields}
            <Note>La comisión nueva se aplica a lo que se cobre desde esa fecha.</Note>
          </>
        )}
        {(kind === 'create-expenses' || kind === 'edit-expenses') && (
          <Field label="Nombre" name="name" defaultValue={category?.name ?? ''} required />
        )}
        {kind === 'create-users' && (
          <>
            <Field label="Usuario" name="name" autoComplete="off" maxLength={100} required />
            <Field
              label="Contraseña inicial"
              name="password"
              type="password"
              minLength={12}
              autoComplete="new-password"
              hint="Al menos 12 caracteres."
              required
            />
            {roleFields}
          </>
        )}
        {kind === 'roles-users' && (
          <>
            {roleFields}
            <Note>Al cambiar el rol se cierran las sesiones abiertas de esta cuenta.</Note>
          </>
        )}
        {kind === 'password-users' && (
          <>
            <Field
              label="Nueva contraseña"
              name="password"
              type="password"
              minLength={12}
              autoComplete="new-password"
              hint="Al menos 12 caracteres."
              required
            />
            <Field
              label="Repite la contraseña"
              name="confirm"
              type="password"
              minLength={12}
              autoComplete="new-password"
              required
            />
            <Note>Al cambiarla se cierran las sesiones abiertas de esta cuenta.</Note>
          </>
        )}
        {(localError || error) && (
          <p className={errorClassName} role="alert">
            {localError || error}
          </p>
        )}
        {!(kind === 'create-team' && freeAccounts.length === 0) && (
          <div className={cn('grid gap-2 sm:grid-cols-2')}>
            <Button type="button" variant="ghost" disabled={busy} onClick={onBack ?? onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy || !online}>
              {busy ? 'Guardando' : 'Guardar'}
            </Button>
          </div>
        )}
        {footer}
      </form>
    </>
  )
}
