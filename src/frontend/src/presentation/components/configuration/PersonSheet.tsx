import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { rateAsPercent } from '../../../core/commissions/Commissions'
import {
  centsToBolivianos,
  roleLabel,
  splitByValidity,
  staffFunction,
  type ConfigurationSnapshot,
} from '../../../core/configuration/Configuration'
import { configurationApi } from '../../../infrastructure/http/configurationApi'
import { errorClassName } from '../../styles/formStyles'
import { Button } from '../Button'
import { StatusBadge } from '../StatusBadge'
import type { Panel } from './configPanels'
import { validityText } from './configText'
import { SheetHeader } from '../SheetHeader'

const Block = ({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) => (
  <section className="border-t border-line pt-5" aria-label={title}>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-display text-xl font-extrabold">{title}</h3>
      {action}
    </div>
    {children}
  </section>
)

const Facts = ({ rows }: { rows: [string, ReactNode][] }) => (
  <dl className="grid gap-2">
    {rows.map(([label, value]) => (
      <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <dt className="text-ink-soft">{label}</dt>
        <dd className="text-right font-semibold">{value}</dd>
      </div>
    ))}
  </dl>
)

const Change = ({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled: boolean
}) => (
  <Button variant="secondary" size="sm" disabled={disabled} onClick={onClick}>
    {label}
  </Button>
)

const Loading = () => (
  <div
    className="h-24 animate-pulse rounded-control bg-surface-muted"
    role="status"
    aria-label="Cargando"
  />
)

export const PersonSheet = ({
  staffId,
  data,
  disabled,
  onClose,
  onOpen,
}: {
  staffId: string
  data: ConfigurationSnapshot
  disabled: boolean
  onClose: () => void
  onOpen: (panel: Panel) => void
}) => {
  const staff = data.staff.find((item) => item.id === staffId)
  const user = data.users.find((item) => item.id === staff?.userId)
  const barber = data.barbers.find((item) => item.staffProfileId === staffId)
  const barberId = barber?.id ?? ''
  const offerings = useQuery({
    queryKey: ['offerings', barberId],
    queryFn: () => configurationApi.listOfferings(barberId),
    enabled: Boolean(barberId),
  })
  const rules = useQuery({
    queryKey: ['commission-rules', barberId],
    queryFn: () => configurationApi.listCommissionRules(barberId),
    enabled: Boolean(barberId) && barber?.employmentType === 'CONTRACTOR',
  })
  if (!staff)
    return (
      <>
        <SheetHeader title="Persona no encontrada" onClose={onClose} />
        <p className="text-ink-soft">Esta persona ya no está en la lista.</p>
      </>
    )

  const back: Panel = { kind: 'person', staffId }
  const serviceName = (id: string) =>
    data.services.find((item) => item.id === id)?.name ?? 'Servicio'
  const prices = splitByValidity(offerings.data ?? [])
  const rates = splitByValidity(rules.data ?? [])
  const confirm = (
    title: string,
    detail: string,
    confirmLabel: string,
    action: () => Promise<unknown>,
    refresh?: string[][],
  ) =>
    onOpen({
      kind: 'confirm',
      title,
      detail,
      confirmLabel,
      action,
      back,
      ...(refresh ? { refresh } : {}),
    })

  return (
    <div className="grid gap-5">
      <SheetHeader title={staff.displayName} onClose={onClose}>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-ink-soft">
          {staffFunction(staff, data.barbers, data.users)}
          {!staff.active && <StatusBadge tone="muted">Desactivada</StatusBadge>}
        </p>
      </SheetHeader>

      <Block
        title="Datos"
        action={
          <Change
            label="Cambiar"
            disabled={disabled}
            onClick={() => onOpen({ kind: 'edit-team', id: staff.id, back })}
          />
        }
      >
        <Facts
          rows={[
            ['Nombre', staff.displayName],
            ['Teléfono', staff.phone || 'Sin registrar'],
          ]}
        />
      </Block>

      <Block title="Cuenta de acceso">
        {user ? (
          <>
            <Facts
              rows={[
                ['Usuario', user.userName],
                ['Rol', user.roles.map(roleLabel).join(', ') || 'Sin rol'],
                ['Estado', user.active ? 'Puede entrar' : 'Desactivada, no puede entrar'],
              ]}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Change
                label="Cambiar rol"
                disabled={disabled}
                onClick={() => onOpen({ kind: 'roles-users', id: user.id, back })}
              />
              <Change
                label="Cambiar contraseña"
                disabled={disabled}
                onClick={() => onOpen({ kind: 'password-users', id: user.id, back })}
              />
              <Change
                label={user.active ? 'Desactivar cuenta' : 'Activar cuenta'}
                disabled={disabled}
                onClick={() =>
                  confirm(
                    user.active ? 'Desactivar cuenta' : 'Activar cuenta',
                    user.active
                      ? `${staff.displayName} no podrá entrar a la aplicación. Su historial se conserva.`
                      : `${staff.displayName} podrá volver a entrar con su usuario.`,
                    user.active ? 'Desactivar cuenta' : 'Activar cuenta',
                    () => configurationApi.setUserActive(user.id, !user.active),
                  )
                }
              />
            </div>
          </>
        ) : (
          <p className="text-ink-soft">Sin cuenta de acceso.</p>
        )}
      </Block>

      <Block
        title="Como barbero"
        action={
          barber && (
            <Change
              label="Cambiar"
              disabled={disabled}
              onClick={() => onOpen({ kind: 'edit-barber', id: barber.id, back })}
            />
          )
        }
      >
        {barber ? (
          <Facts
            rows={[
              [
                'Tipo',
                barber.employmentType === 'OWNER'
                  ? 'Dueño, sin comisión'
                  : 'Contratado, genera comisión',
              ],
              ['Liquidación', barber.settlementFrequency === 'BIWEEKLY' ? 'Quincenal' : 'Mensual'],
              [
                'Color en la agenda',
                <span key="color" className="inline-flex items-center gap-2">
                  <span
                    role="img"
                    aria-label="Color elegido"
                    className="size-6 rounded-full border border-line"
                    style={{ backgroundColor: barber.color || '#2E3338' }}
                  />
                </span>,
              ],
              ['Estado', barber.active ? 'Atiende' : 'No atiende'],
            ]}
          />
        ) : (
          <div className="grid justify-items-start gap-3">
            <p className="text-ink-soft">Esta persona no atiende como barbero.</p>
            <Change
              label="Habilitar como barbero"
              disabled={disabled}
              onClick={() => onOpen({ kind: 'create-barber', id: staff.id, back })}
            />
          </div>
        )}
      </Block>

      {barber && (
        <Block
          title="Precios"
          action={
            <Change
              label="Nuevo precio"
              disabled={disabled}
              onClick={() => onOpen({ kind: 'create-offerings', barberId, back })}
            />
          }
        >
          {offerings.isPending ? (
            <Loading />
          ) : offerings.isError ? (
            <p className={errorClassName} role="alert">
              No pudimos cargar sus precios.
            </p>
          ) : prices.current.length ? (
            <ul className="divide-y divide-surface-strong">
              {prices.current.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{serviceName(item.serviceId)}</span>
                    <span className="block text-ink-soft">
                      {item.durationMinutes} min, {validityText(item.validFrom, item.validTo)}
                    </span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">
                    {centsToBolivianos(item.priceCents)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    aria-label={`Quitar precio de ${serviceName(item.serviceId)}`}
                    onClick={() =>
                      confirm(
                        `Quitar precio de ${serviceName(item.serviceId)}`,
                        `${staff.displayName} dejará de ofrecer este servicio a ${centsToBolivianos(item.priceCents)}. Las citas ya agendadas no cambian.`,
                        'Quitar precio',
                        () => configurationApi.deactivateOffering(item),
                        [['offerings', barberId]],
                      )
                    }
                  >
                    Quitar
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft">
              Sin precios vigentes. No aparecerá para reservar hasta que tenga al menos uno.
            </p>
          )}
          {prices.past.length > 0 && (
            <details className="mt-2 rounded-control bg-surface-muted">
              <summary className="flex min-h-11 cursor-pointer items-center px-4 font-semibold">
                Precios anteriores ({prices.past.length})
              </summary>
              <ul className="grid gap-2 px-4 pb-3">
                {prices.past.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3 text-ink-soft">
                    <span>
                      {serviceName(item.serviceId)}, {validityText(item.validFrom, item.validTo)}
                    </span>
                    <span className="tabular-nums">{centsToBolivianos(item.priceCents)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Block>
      )}

      {barber && (
        <Block
          title="Comisión"
          action={
            barber.employmentType === 'CONTRACTOR' && (
              <Change
                label="Nueva comisión"
                disabled={disabled}
                onClick={() => onOpen({ kind: 'create-commissions', barberId, back })}
              />
            )
          }
        >
          {barber.employmentType === 'OWNER' ? (
            <p className="text-ink-soft">El dueño no genera comisión por lo que atiende.</p>
          ) : rules.isPending ? (
            <Loading />
          ) : rules.isError ? (
            <p className={errorClassName} role="alert">
              No pudimos cargar su comisión.
            </p>
          ) : rates.current.length ? (
            <ul className="divide-y divide-surface-strong">
              {[...rates.current]
                .sort((a, b) => b.kind.localeCompare(a.kind))
                .map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">
                        {rateAsPercent(item.rateBasisPoints)} en{' '}
                        {item.kind === 'SERVICE' ? 'servicios' : 'productos'}
                      </span>
                      <span className="block text-ink-soft">
                        {validityText(item.validFrom, item.validTo)}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      aria-label={`Quitar comisión de ${item.kind === 'SERVICE' ? 'servicios' : 'productos'}`}
                      onClick={() =>
                        confirm(
                          'Quitar comisión',
                          `Lo que se cobre desde ahora no generará esta comisión de ${rateAsPercent(item.rateBasisPoints)}. Lo ya generado no cambia.`,
                          'Quitar comisión',
                          () => configurationApi.deactivateCommissionRule(item),
                          [['commission-rules', barberId]],
                        )
                      }
                    >
                      Quitar
                    </Button>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-ink-soft">Sin comisión vigente.</p>
          )}
          {rates.past.length > 0 && (
            <details className="mt-2 rounded-control bg-surface-muted">
              <summary className="flex min-h-11 cursor-pointer items-center px-4 font-semibold">
                Comisiones anteriores ({rates.past.length})
              </summary>
              <ul className="grid gap-2 px-4 pb-3">
                {rates.past.map((item) => (
                  <li key={item.id} className="text-ink-soft">
                    {rateAsPercent(item.rateBasisPoints)} en{' '}
                    {item.kind === 'SERVICE' ? 'servicios' : 'productos'},{' '}
                    {validityText(item.validFrom, item.validTo)}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Block>
      )}

      <Block title="Dar de baja">
        <div className="grid gap-4">
          {barber && (
            <div className="grid justify-items-start gap-2">
              <p className="text-pretty text-ink-soft">
                {barber.active
                  ? 'Deja de aparecer en la agenda y en la reserva en línea. Sigue pudiendo entrar a la aplicación.'
                  : 'Vuelve a aparecer en la agenda y en la reserva en línea.'}
              </p>
              <Button
                variant={barber.active ? 'dangerSoft' : 'secondary'}
                size="sm"
                disabled={disabled}
                onClick={() =>
                  confirm(
                    barber.active
                      ? 'Dejar de atender como barbero'
                      : 'Volver a atender como barbero',
                    barber.active
                      ? `${staff.displayName} dejará de aparecer en la agenda y en la reserva en línea. Sus citas y cobros anteriores se conservan.`
                      : `${staff.displayName} volverá a aparecer en la agenda y en la reserva en línea.`,
                    barber.active ? 'Dejar de atender' : 'Volver a atender',
                    () => configurationApi.updateBarber(barber, !barber.active),
                  )
                }
              >
                {barber.active ? 'Dejar de atender como barbero' : 'Volver a atender como barbero'}
              </Button>
            </div>
          )}
          <div className="grid justify-items-start gap-2">
            <p className="text-pretty text-ink-soft">
              {staff.active
                ? 'La persona sale del equipo. Su historial se conserva.'
                : 'La persona vuelve al equipo.'}
            </p>
            <Button
              variant={staff.active ? 'dangerSoft' : 'secondary'}
              size="sm"
              disabled={disabled}
              onClick={() =>
                confirm(
                  staff.active ? 'Desactivar persona' : 'Activar persona',
                  staff.active
                    ? `${staff.displayName} saldrá del equipo. Sus citas, cobros y comisiones anteriores se conservan.`
                    : `${staff.displayName} volverá al equipo.`,
                  staff.active ? 'Desactivar persona' : 'Activar persona',
                  () => configurationApi.updateStaff(staff, !staff.active),
                )
              }
            >
              {staff.active ? 'Desactivar persona' : 'Activar persona'}
            </Button>
          </div>
        </div>
      </Block>
    </div>
  )
}
