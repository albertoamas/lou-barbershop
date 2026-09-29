import { useState, type FormEvent } from 'react'
import {
  bolivianosToCents,
  percentToBasisPoints,
  type ConfigurationSnapshot,
} from '../../core/configuration/Configuration'
import { todayInBusinessTime } from '../../core/scheduling/Scheduling'
import { configurationApi } from '../../infrastructure/http/configurationApi'
import { cn } from '../styles/cn'
import { errorClassName, fieldClassName, labelClassName } from '../styles/formStyles'
import { AgendaDialog } from './AgendaDialog'
import { Button } from './Button'

type Kind =
  | 'create-team'
  | 'edit-team'
  | 'create-barber'
  | 'edit-barber'
  | 'create-services'
  | 'edit-services'
  | 'create-offerings'
  | 'create-products'
  | 'edit-products'
  | 'create-commissions'
  | 'create-expenses'
  | 'edit-expenses'
  | 'create-users'
  | 'roles-users'
  | 'password-users'
export type ConfigurationPanel = { kind: Kind; id?: string }
type Props = {
  panel: ConfigurationPanel
  data: ConfigurationSnapshot
  barberId: string
  busy: boolean
  error?: string | undefined
  onClose: () => void
  onSave: (action: () => Promise<unknown>, extra?: string[][]) => Promise<boolean>
}
const value = (data: FormData, key: string) => String(data.get(key) ?? '').trim()
const money = (data: FormData, key: string) => bolivianosToCents(value(data, key))
const title: Record<Kind, string> = {
  'create-team': 'Vincular persona',
  'edit-team': 'Editar persona',
  'create-barber': 'Habilitar barbero',
  'edit-barber': 'Editar barbero',
  'create-services': 'Crear servicio',
  'edit-services': 'Editar servicio',
  'create-offerings': 'Nueva oferta',
  'create-products': 'Crear producto',
  'edit-products': 'Editar producto',
  'create-commissions': 'Nueva regla de comisión',
  'create-expenses': 'Nueva categoría',
  'edit-expenses': 'Editar categoría',
  'create-users': 'Crear usuario',
  'roles-users': 'Cambiar roles',
  'password-users': 'Nueva contraseña',
}

export const ConfigurationEditor = ({
  panel,
  data,
  barberId,
  busy,
  error,
  onClose,
  onSave,
}: Props) => {
  const [localError, setLocalError] = useState('')
  const staff = data.staff.find((item) => item.id === panel.id)
  const barber = data.barbers.find((item) => item.id === panel.id)
  const service = data.services.find((item) => item.id === panel.id)
  const product = data.products.find((item) => item.id === panel.id)
  const expense = data.expenseCategories.find((item) => item.id === panel.id)
  const user = data.users.find((item) => item.id === panel.id)
  const availableUsers = data.users.filter(
    (item) => item.active && !data.staff.some((person) => person.userId === item.id),
  )
  const availableStaff = data.staff.filter(
    (item) => item.active && !data.barbers.some((profile) => profile.staffProfileId === item.id),
  )
  const selectedBarber = data.barbers.find((item) => item.id === barberId)
  const nameFor = (staffId: string) =>
    data.staff.find((item) => item.id === staffId)?.displayName ?? 'Barbero'
  const show =
    panel.kind === 'create-team' || panel.kind === 'edit-team'
      ? 'Una cuenta corresponde a una sola persona.'
      : panel.kind === 'create-offerings' || panel.kind === 'create-commissions'
        ? 'La nueva condición sólo afecta su vigencia; los registros anteriores permanecen intactos.'
        : panel.kind === 'create-users' ||
            panel.kind === 'roles-users' ||
            panel.kind === 'password-users'
          ? 'Los cambios de acceso revocan sesiones anteriores cuando corresponde.'
          : 'Los cambios no reescriben operaciones históricas.'

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalError('')
    const form = new FormData(event.currentTarget)
    if (value(form, 'to') && value(form, 'to') < value(form, 'from')) {
      setLocalError('La fecha de fin no puede ser anterior al inicio.')
      return
    }
    const cents = money(form, 'price')
    let action: (() => Promise<unknown>) | null = null
    let extra: string[][] = []
    switch (panel.kind) {
      case 'create-team':
        action = () =>
          configurationApi.createStaff({
            userId: value(form, 'userId'),
            displayName: value(form, 'name'),
            ...(value(form, 'phone') ? { phone: value(form, 'phone') } : {}),
          })
        break
      case 'edit-team':
        if (staff)
          action = () =>
            configurationApi.updateStaff(
              { ...staff, displayName: value(form, 'name'), phone: value(form, 'phone') },
              staff.active,
            )
        break
      case 'create-barber':
        action = () =>
          configurationApi.createBarber({
            staffProfileId: value(form, 'staffId'),
            employmentType: value(form, 'employmentType'),
            settlementFrequency: value(form, 'frequency'),
            color: value(form, 'color'),
          })
        break
      case 'edit-barber':
        if (barber)
          action = () =>
            configurationApi.updateBarber(
              {
                ...barber,
                employmentType: value(form, 'employmentType') as typeof barber.employmentType,
                settlementFrequency: value(form, 'frequency') as typeof barber.settlementFrequency,
                color: value(form, 'color'),
              },
              barber.active,
            )
        break
      case 'create-services':
        if (cents !== null)
          action = () =>
            configurationApi.createService({
              name: value(form, 'name'),
              defaultDurationMinutes: Number(value(form, 'duration')),
              defaultPriceCents: cents,
            })
        break
      case 'edit-services':
        if (service && cents !== null)
          action = () =>
            configurationApi.updateService(
              {
                ...service,
                name: value(form, 'name'),
                defaultDurationMinutes: Number(value(form, 'duration')),
                defaultPriceCents: cents,
              },
              service.active,
            )
        break
      case 'create-offerings':
        if (cents !== null) {
          action = () =>
            configurationApi.createOffering(barberId, {
              serviceId: value(form, 'serviceId'),
              durationMinutes: Number(value(form, 'duration')),
              priceCents: cents,
              validFrom: value(form, 'from'),
              ...(value(form, 'to') ? { validTo: value(form, 'to') } : {}),
            })
          extra = [['offerings', barberId]]
        }
        break
      case 'create-products':
        if (cents !== null)
          action = () =>
            configurationApi.createProduct({
              name: value(form, 'name'),
              ...(value(form, 'brand') ? { brand: value(form, 'brand') } : {}),
              ...(value(form, 'sku') ? { sku: value(form, 'sku') } : {}),
              salePriceCents: cents,
              minimumStock: Number(value(form, 'minimum')),
            })
        break
      case 'edit-products':
        if (product && cents !== null)
          action = () =>
            configurationApi.updateProduct(
              {
                ...product,
                name: value(form, 'name'),
                brand: value(form, 'brand'),
                sku: value(form, 'sku'),
                salePriceCents: cents,
                minimumStock: Number(value(form, 'minimum')),
              },
              product.active,
            )
        break
      case 'create-commissions': {
        const points = percentToBasisPoints(value(form, 'rate'))
        if (points === null) {
          setLocalError('Escribe un porcentaje entre 0 y 100 con hasta dos decimales.')
          return
        }
        action = () =>
          configurationApi.createCommissionRule(barberId, {
            kind: value(form, 'kind'),
            rateBasisPoints: points,
            validFrom: value(form, 'from'),
            ...(value(form, 'to') ? { validTo: value(form, 'to') } : {}),
          })
        extra = [['commission-rules', barberId]]
        break
      }
      case 'create-expenses':
        action = () => configurationApi.createExpenseCategory(value(form, 'name'))
        break
      case 'edit-expenses':
        if (expense)
          action = () =>
            configurationApi.updateExpenseCategory(
              { ...expense, name: value(form, 'name') },
              expense.active,
            )
        break
      case 'create-users': {
        const roles = form.getAll('roles').map(String)
        if (!roles.length) {
          setLocalError('Selecciona al menos un rol.')
          return
        }
        action = () =>
          configurationApi.createUser({
            userName: value(form, 'name'),
            password: value(form, 'password'),
            roles,
          })
        break
      }
      case 'roles-users': {
        const roles = form.getAll('roles').map(String)
        if (!roles.length) {
          setLocalError('Selecciona al menos un rol.')
          return
        }
        if (user) action = () => configurationApi.replaceUserRoles(user.id, roles)
        break
      }
      case 'password-users':
        if (value(form, 'password') !== value(form, 'confirm')) {
          setLocalError('Las contraseñas no coinciden.')
          return
        }
        if (user)
          action = () => configurationApi.resetUserPassword(user.id, value(form, 'password'))
        break
    }
    if (!action) {
      setLocalError('Revisa el precio y los campos obligatorios.')
      return
    }
    void onSave(action, extra)
  }

  const priceInput = (initial = '') => (
    <Field
      label="Precio Bs"
      name="price"
      defaultValue={initial}
      inputMode="decimal"
      placeholder="60,00"
      required
    />
  )
  const durationInput = (initial = 45) => (
    <Field
      label="Duración (minutos)"
      name="duration"
      type="number"
      min="5"
      max="480"
      defaultValue={String(initial)}
      required
    />
  )
  const validity = (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Desde" name="from" type="date" defaultValue={todayInBusinessTime()} required />
      <Field label="Hasta (opcional)" name="to" type="date" />
    </div>
  )
  const roles = (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-xs font-bold">Roles</legend>
      {(['OWNER', 'ADMIN', 'BARBER'] as const).map((role) => (
        <label
          key={role}
          className="flex items-center gap-3 rounded-xl border border-lou-fog px-4 py-3 text-sm"
        >
          <input
            type="checkbox"
            name="roles"
            value={role}
            defaultChecked={
              panel.kind === 'roles-users' ? user?.roles.includes(role) : role === 'BARBER'
            }
            className="h-5 w-5 accent-lou-ink"
          />
          {{ OWNER: 'Dueño', ADMIN: 'Administrador', BARBER: 'Barbero' }[role]}
        </label>
      ))}
    </fieldset>
  )

  return (
    <AgendaDialog label={title[panel.kind]}>
      <div className="flex items-start justify-between gap-4 border-b border-lou-fog pb-5">
        <div>
          <p className="text-xs font-bold tracking-[0.17em] text-lou-graphite/45 uppercase">
            Configuración
          </p>
          <h2 className="mt-1 font-display text-3xl font-bold">{title[panel.kind]}</h2>
          <p className="mt-2 text-sm leading-6 text-lou-graphite/60">{show}</p>
        </div>
        <button
          type="button"
          className="rounded-lg px-3 py-2 text-sm font-bold hover:bg-lou-paper"
          onClick={onClose}
          aria-label="Cerrar panel"
        >
          Cerrar
        </button>
      </div>
      <form onSubmit={submit} className="mt-5 space-y-4 pb-8">
        {panel.kind === 'create-team' && (
          <>
            <SelectField
              label="Cuenta disponible"
              name="userId"
              options={availableUsers.map((item) => ({ value: item.id, label: item.userName }))}
              required
            />
            <Field label="Nombre visible" name="name" maxLength={120} required />
            <Field label="Teléfono (opcional)" name="phone" inputMode="tel" />
          </>
        )}
        {panel.kind === 'edit-team' && staff && (
          <>
            <Field
              label="Nombre visible"
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
        {panel.kind === 'create-barber' && (
          <>
            <SelectField
              label="Persona"
              name="staffId"
              defaultValue={panel.id ?? ''}
              options={availableStaff.map((item) => ({ value: item.id, label: item.displayName }))}
              required
            />
            <SelectField
              label="Tipo laboral"
              name="employmentType"
              options={[
                { value: 'CONTRACTOR', label: 'Contratado' },
                { value: 'OWNER', label: 'Dueño' },
              ]}
            />
            <SelectField
              label="Liquidación"
              name="frequency"
              options={[
                { value: 'BIWEEKLY', label: 'Quincenal' },
                { value: 'MONTHLY', label: 'Mensual' },
              ]}
            />
            <Field label="Color de agenda" name="color" type="color" defaultValue="#A55F32" />
          </>
        )}
        {panel.kind === 'edit-barber' && barber && (
          <>
            <p className="text-sm font-bold">{nameFor(barber.staffProfileId)}</p>
            <SelectField
              label="Tipo laboral"
              name="employmentType"
              defaultValue={barber.employmentType}
              options={[
                { value: 'CONTRACTOR', label: 'Contratado' },
                { value: 'OWNER', label: 'Dueño' },
              ]}
            />
            <SelectField
              label="Liquidación"
              name="frequency"
              defaultValue={barber.settlementFrequency}
              options={[
                { value: 'BIWEEKLY', label: 'Quincenal' },
                { value: 'MONTHLY', label: 'Mensual' },
              ]}
            />
            <Field
              label="Color de agenda"
              name="color"
              type="color"
              defaultValue={barber.color || '#A55F32'}
            />
          </>
        )}
        {(panel.kind === 'create-services' || panel.kind === 'edit-services') && (
          <>
            <Field label="Nombre" name="name" defaultValue={service?.name ?? ''} required />
            <div className="grid gap-3 sm:grid-cols-2">
              {durationInput(service?.defaultDurationMinutes)}
              {priceInput(service ? (service.defaultPriceCents / 100).toFixed(2) : '')}
            </div>
            <p className="rounded-xl bg-lou-paper p-4 text-xs leading-5 text-lou-graphite/60">
              El precio de referencia sólo se aplicará a futuras condiciones; una cita confirmada
              conserva su importe.
            </p>
          </>
        )}
        {panel.kind === 'create-offerings' && (
          <>
            <p className="text-sm font-semibold">
              Para {selectedBarber ? nameFor(selectedBarber.staffProfileId) : 'barbero'}
            </p>
            <SelectField
              label="Servicio"
              name="serviceId"
              options={data.services
                .filter((item) => item.active)
                .map((item) => ({ value: item.id, label: item.name }))}
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {durationInput()}
              {priceInput()}
            </div>
            {validity}
          </>
        )}
        {(panel.kind === 'create-products' || panel.kind === 'edit-products') && (
          <>
            <Field label="Nombre" name="name" defaultValue={product?.name ?? ''} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Marca" name="brand" defaultValue={product?.brand ?? ''} />
              <Field label="SKU" name="sku" defaultValue={product?.sku ?? ''} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {priceInput(product ? (product.salePriceCents / 100).toFixed(2) : '')}
              <Field
                label="Stock mínimo"
                name="minimum"
                type="number"
                min="0"
                defaultValue={String(product?.minimumStock ?? 0)}
                required
              />
            </div>
            <p className="rounded-xl bg-lou-paper p-4 text-xs leading-5 text-lou-graphite/60">
              El stock se registra mediante movimientos en Inventario, no aquí.
            </p>
          </>
        )}
        {panel.kind === 'create-commissions' && (
          <>
            <p className="text-sm font-semibold">
              Para {selectedBarber ? nameFor(selectedBarber.staffProfileId) : 'barbero'}
            </p>
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
              placeholder="50,00"
              required
            />
            {validity}
          </>
        )}
        {(panel.kind === 'create-expenses' || panel.kind === 'edit-expenses') && (
          <Field
            label="Nombre de categoría"
            name="name"
            defaultValue={expense?.name ?? ''}
            required
          />
        )}
        {panel.kind === 'create-users' && (
          <>
            <Field label="Usuario" name="name" autoComplete="off" maxLength={100} required />
            <Field
              label="Contraseña inicial"
              name="password"
              type="password"
              minLength={12}
              autoComplete="new-password"
              required
            />
            {roles}
          </>
        )}
        {panel.kind === 'roles-users' && (
          <>
            <p className="text-sm font-bold">{user?.userName}</p>
            {roles}
          </>
        )}
        {panel.kind === 'password-users' && (
          <>
            <p className="text-sm font-bold">{user?.userName}</p>
            <Field
              label="Nueva contraseña"
              name="password"
              type="password"
              minLength={12}
              autoComplete="new-password"
              required
            />
            <Field
              label="Confirmar contraseña"
              name="confirm"
              type="password"
              minLength={12}
              autoComplete="new-password"
              required
            />
          </>
        )}
        {(localError || error) && (
          <p className={cn(errorClassName, 'mt-3')} role="alert">
            {localError || error}
          </p>
        )}
        <div className="flex flex-wrap gap-2 border-t border-lou-fog pt-5">
          <Button type="submit" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar cambio'}
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </AgendaDialog>
  )
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }
const Field = ({ label, name, ...props }: FieldProps) => (
  <label className={labelClassName}>
    {label}
    <input className={fieldClassName} name={name} {...props} />
  </label>
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
      <option value="">Selecciona…</option>
      {options.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  </label>
)
