import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import { ApiError } from '../../infrastructure/http/apiClient'
import { authApi } from '../../infrastructure/http/authApi'
import { configurationApi } from '../../infrastructure/http/configurationApi'
import { Button } from '../components/Button'
import { ConfigurationEditor, type ConfigurationPanel } from '../components/ConfigurationEditor'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConnectivity } from '../hooks/useConnectivity'
import { cn } from '../styles/cn'
import {
  errorClassName,
  fieldClassName,
  noticeClassName,
  panelClassName,
} from '../styles/formStyles'

type Section = 'team' | 'services' | 'offerings' | 'products' | 'commissions' | 'expenses' | 'users'
const sections: ReadonlyArray<{ id: Section; label: string; noun: string }> = [
  { id: 'team', label: 'Equipo', noun: 'persona' },
  { id: 'services', label: 'Servicios', noun: 'servicio' },
  { id: 'offerings', label: 'Ofertas', noun: 'oferta' },
  { id: 'products', label: 'Productos', noun: 'producto' },
  { id: 'commissions', label: 'Comisiones', noun: 'regla' },
  { id: 'expenses', label: 'Gastos', noun: 'categoría' },
  { id: 'users', label: 'Usuarios', noun: 'usuario' },
]
const isSection = (value: string | null): value is Section =>
  sections.some((item) => item.id === value)
const roleLabel = (role: string) =>
  ({ OWNER: 'Dueño', ADMIN: 'Administrador', BARBER: 'Barbero' })[role] ?? role
const percent = (basisPoints: number) =>
  `${new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(basisPoints / 100)} %`
const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? (error.problem.detail ?? error.problem.title)
    : 'No se pudo guardar el cambio. Intenta nuevamente.'

export const ConfigurationPage = () => {
  const [params, setParams] = useSearchParams()
  const section: Section = isSection(params.get('seccion'))
    ? (params.get('seccion') as Section)
    : 'team'
  const [selectedId, setSelectedId] = useState('')
  const [selectedBarberId, setSelectedBarberId] = useState('')
  const [panel, setPanel] = useState<ConfigurationPanel | null>(null)
  const [confirm, setConfirm] = useState<{ label: string; action: () => Promise<unknown> } | null>(
    null,
  )
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null)
  const queryClient = useQueryClient()
  const connectivity = useConnectivity()
  const session = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: authApi.current,
    retry: false,
  })
  const isOwner = session.data?.roles.includes('OWNER') ?? false
  const snapshot = useQuery({
    queryKey: ['configuration'],
    queryFn: configurationApi.load,
    enabled: isOwner,
  })
  const data = snapshot.data
  const activeBarberId = selectedBarberId || data?.barbers.find((item) => item.active)?.id || ''
  const offerings = useQuery({
    queryKey: ['offerings', activeBarberId],
    queryFn: () => configurationApi.listOfferings(activeBarberId),
    enabled: isOwner && section === 'offerings' && Boolean(activeBarberId),
  })
  const rules = useQuery({
    queryKey: ['commission-rules', activeBarberId],
    queryFn: () => configurationApi.listCommissionRules(activeBarberId),
    enabled: isOwner && section === 'commissions' && Boolean(activeBarberId),
  })

  const save = async (action: () => Promise<unknown>, extra: string[][] = []) => {
    if (connectivity !== 'online') {
      setNotice({ text: 'Recupera la conexión para guardar cambios.', error: true })
      return false
    }
    setBusy(true)
    setNotice(null)
    try {
      await action()
      await queryClient.invalidateQueries({ queryKey: ['configuration'] })
      for (const key of extra) await queryClient.invalidateQueries({ queryKey: key })
      setNotice({ text: 'Cambio guardado. El historial anterior permanece intacto.', error: false })
      setPanel(null)
      setConfirm(null)
      return true
    } catch (error) {
      setNotice({ text: errorMessage(error), error: true })
      return false
    } finally {
      setBusy(false)
    }
  }
  const requestToggle = (label: string, action: () => Promise<unknown>) =>
    setConfirm({ label, action })
  const changeSection = (next: Section) => {
    const nextParams = new URLSearchParams(params)
    nextParams.set('seccion', next)
    setParams(nextParams, { replace: true })
    setSelectedId('')
    setNotice(null)
  }

  if (session.isPending) return <Loading title="Comprobando acceso" />
  if (session.isError)
    return (
      <main className="mx-auto max-w-360 px-4 py-8">
        <p className={errorClassName} role="alert">
          No se pudo comprobar tu sesión.{' '}
          <button className="font-bold underline" onClick={() => void session.refetch()}>
            Reintentar
          </button>
        </p>
      </main>
    )
  if (!isOwner) return <Navigate to="/app/acceso-denegado" replace />
  if (snapshot.isPending) return <Loading title="Cargando configuración" />
  if (snapshot.isError || !data)
    return (
      <main className="mx-auto max-w-360 px-4 py-8">
        <p className={errorClassName} role="alert">
          No se pudo cargar la configuración.{' '}
          <button className="font-bold underline" onClick={() => void snapshot.refetch()}>
            Reintentar
          </button>
        </p>
      </main>
    )

  const barber = data.barbers.find((item) => item.id === activeBarberId)
  const barberName = (staffId: string) =>
    data.staff.find((item) => item.id === staffId)?.displayName ?? 'Barbero'
  const sectionRows: Array<{ id: string; title: string; subtitle: string; active: boolean }> =
    section === 'team'
      ? data.staff.map((item) => ({
          id: item.id,
          title: item.displayName,
          subtitle: `${data.barbers.some((barber) => barber.staffProfileId === item.id) ? 'Barbero' : 'Personal'} · ${item.active ? 'Activo' : 'Inactivo'}`,
          active: item.active,
        }))
      : section === 'services'
        ? data.services.map((item) => ({
            id: item.id,
            title: item.name,
            subtitle: `${item.defaultDurationMinutes} min · ${centsToBolivianos(item.defaultPriceCents)}`,
            active: item.active,
          }))
        : section === 'offerings'
          ? (offerings.data ?? []).map((item) => ({
              id: item.id,
              title:
                data.services.find((service) => service.id === item.serviceId)?.name ?? 'Servicio',
              subtitle: `${centsToBolivianos(item.priceCents)} · desde ${item.validFrom}`,
              active: item.active,
            }))
          : section === 'products'
            ? data.products.map((item) => ({
                id: item.id,
                title: item.name,
                subtitle: `${item.brand || 'Sin marca'} · ${centsToBolivianos(item.salePriceCents)}`,
                active: item.active,
              }))
            : section === 'commissions'
              ? (rules.data ?? []).map((item) => ({
                  id: item.id,
                  title: item.kind === 'SERVICE' ? 'Servicios' : 'Productos',
                  subtitle: `${percent(item.rateBasisPoints)} · desde ${item.validFrom}`,
                  active: item.active,
                }))
              : section === 'expenses'
                ? data.expenseCategories.map((item) => ({
                    id: item.id,
                    title: item.name,
                    subtitle: item.active ? 'Activa' : 'Inactiva',
                    active: item.active,
                  }))
                : data.users.map((item) => ({
                    id: item.id,
                    title: item.userName,
                    subtitle: item.roles.map(roleLabel).join(' · '),
                    active: item.active,
                  }))
  const currentId = sectionRows.some((item) => item.id === selectedId)
    ? selectedId
    : (sectionRows[0]?.id ?? '')
  const current = sectionRows.find((item) => item.id === currentId)
  const selectedStaff = data.staff.find((item) => item.id === currentId)
  const selectedBarber = data.barbers.find((item) => item.staffProfileId === currentId)
  const selectedService = data.services.find((item) => item.id === currentId)
  const selectedOffering = offerings.data?.find((item) => item.id === currentId)
  const selectedProduct = data.products.find((item) => item.id === currentId)
  const selectedRule = rules.data?.find((item) => item.id === currentId)
  const selectedExpense = data.expenseCategories.find((item) => item.id === currentId)
  const selectedUser = data.users.find((item) => item.id === currentId)
  const createPanel: ConfigurationPanel = { kind: `create-${section}` }

  return (
    <main className="mx-auto w-full max-w-360 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <header className="border-b border-lou-fog pb-7">
        <p className="mb-2 text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">
          Gestión del dueño
        </p>
        <h1 className="font-display text-5xl leading-[0.9] font-bold sm:text-6xl">Configuración</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-lou-graphite/65">
          Personas y catálogo en un solo lugar. Las nuevas condiciones tienen vigencia; las
          operaciones pasadas no se reescriben.
        </p>
      </header>
      <nav
        className="mt-5 flex gap-1 overflow-x-auto rounded-2xl border border-lou-fog bg-white p-1.5 xl:grid xl:grid-cols-7"
        aria-label="Secciones de configuración"
      >
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={section === item.id ? 'page' : undefined}
            className={cn(
              'min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold whitespace-nowrap transition-colors duration-200 xl:px-3',
              section === item.id
                ? 'bg-lou-ink text-white'
                : 'text-lou-graphite/60 hover:bg-lou-paper hover:text-lou-ink',
            )}
            onClick={() => changeSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {notice && (
        <p
          className={cn('mt-4', notice.error ? errorClassName : noticeClassName)}
          role={notice.error ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      )}
      {(section === 'offerings' || section === 'commissions') && (
        <section className={cn(panelClassName, 'mt-5')} aria-label="Barbero seleccionado">
          <label className="grid max-w-sm gap-1.5 text-xs font-bold text-lou-graphite">
            Barbero
            <select
              className={fieldClassName}
              value={activeBarberId}
              onChange={(event) => {
                setSelectedBarberId(event.target.value)
                setSelectedId('')
              }}
            >
              {data.barbers
                .filter((item) => item.active)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {barberName(item.staffProfileId)}
                  </option>
                ))}
            </select>
          </label>
          {barber?.employmentType === 'OWNER' && section === 'commissions' && (
            <p className="mt-3 text-sm text-lou-graphite/60">
              El dueño también atiende, pero su producción no genera deuda de comisión.
            </p>
          )}
        </section>
      )}
      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.6fr)]">
        <section
          className={panelClassName}
          aria-label={`Lista de ${sections.find((item) => item.id === section)?.label.toLowerCase()}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold">
                {sections.find((item) => item.id === section)?.label}
              </h2>
              <p className="text-xs text-lou-graphite/50">
                {sectionRows.length} {sectionRows.length === 1 ? 'registro' : 'registros'}
              </p>
            </div>
            <Button
              variant="secondary"
              disabled={
                busy ||
                ((section === 'offerings' || section === 'commissions') && !activeBarberId) ||
                (section === 'commissions' && barber?.employmentType === 'OWNER')
              }
              onClick={() => setPanel(createPanel)}
            >
              Crear
            </Button>
          </div>
          {(section === 'offerings' && offerings.isPending) ||
          (section === 'commissions' && rules.isPending) ? (
            <div className="mt-5 space-y-2" role="status" aria-label="Cargando condiciones">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-xl bg-lou-paper" />
              ))}
            </div>
          ) : (section === 'offerings' && offerings.isError) ||
            (section === 'commissions' && rules.isError) ? (
            <p className={cn('mt-4', errorClassName)} role="alert">
              No se pudo cargar esta lista.{' '}
              <button
                className="font-bold underline"
                onClick={() =>
                  void (section === 'offerings' ? offerings.refetch() : rules.refetch())
                }
              >
                Reintentar
              </button>
            </p>
          ) : sectionRows.length ? (
            <div className="mt-4 space-y-1" aria-label="Registros">
              {sectionRows.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-current={currentId === item.id ? 'true' : undefined}
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    'w-full rounded-xl border px-4 py-3 text-left transition-colors duration-200',
                    currentId === item.id
                      ? 'border-lou-ink bg-lou-paper'
                      : 'border-transparent hover:bg-lou-paper/60',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <strong className="text-sm">{item.title}</strong>
                    <span
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        item.active ? 'bg-emerald-600' : 'bg-lou-steel',
                      )}
                      aria-label={item.active ? 'Activo' : 'Inactivo'}
                    />
                  </span>
                  <span className="mt-1 block text-xs text-lou-graphite/55">{item.subtitle}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-lou-paper p-5 text-sm text-lou-graphite/60">
              Aún no hay {sections.find((item) => item.id === section)?.noun}s. Usa Crear para
              añadir el primero.
            </p>
          )}
        </section>
        <section className={panelClassName} aria-label="Detalle seleccionado">
          {current ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-lou-fog pb-5">
                <div>
                  <p className="text-xs font-bold tracking-[0.16em] text-lou-graphite/45 uppercase">
                    Detalle
                  </p>
                  <h2 className="mt-1 font-display text-3xl font-bold">{current.title}</h2>
                  <p className="mt-1 text-sm text-lou-graphite/55">{current.subtitle}</p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-bold',
                    current.active
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-lou-paper text-lou-graphite/60',
                  )}
                >
                  {current.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="mt-5 space-y-5 text-sm">
                {selectedStaff && section === 'team' && (
                  <>
                    <Detail
                      label="Cuenta"
                      value={
                        data.users.find((user) => user.id === selectedStaff.userId)?.userName ??
                        'Sin cuenta'
                      }
                    />
                    <Detail label="Teléfono" value={selectedStaff.phone || 'No registrado'} />
                    <Detail
                      label="Función"
                      value={
                        selectedBarber
                          ? selectedBarber.employmentType === 'OWNER'
                            ? 'Dueño y barbero'
                            : 'Barbero contratado'
                          : 'Personal'
                      }
                    />
                    {selectedBarber && (
                      <Detail
                        label="Liquidación"
                        value={
                          selectedBarber.settlementFrequency === 'BIWEEKLY'
                            ? 'Quincenal'
                            : 'Mensual'
                        }
                      />
                    )}
                  </>
                )}
                {selectedService && section === 'services' && (
                  <>
                    <Detail
                      label="Precio de referencia"
                      value={centsToBolivianos(selectedService.defaultPriceCents)}
                    />
                    <Detail
                      label="Duración"
                      value={`${selectedService.defaultDurationMinutes} min`}
                    />
                    <p className="rounded-xl bg-lou-paper p-4 text-xs leading-5 text-lou-graphite/60">
                      Cambiar esta referencia no modifica reservas, atenciones ni precios
                      históricos.
                    </p>
                  </>
                )}
                {selectedOffering && section === 'offerings' && (
                  <>
                    <Detail
                      label="Barbero"
                      value={barber ? barberName(barber.staffProfileId) : '—'}
                    />
                    <Detail
                      label="Precio acordado"
                      value={centsToBolivianos(selectedOffering.priceCents)}
                    />
                    <Detail label="Duración" value={`${selectedOffering.durationMinutes} min`} />
                    <Detail
                      label="Vigencia"
                      value={`${selectedOffering.validFrom} — ${selectedOffering.validTo || 'sin fin'}`}
                    />
                    <HistoryHint />
                  </>
                )}
                {selectedProduct && section === 'products' && (
                  <>
                    <Detail
                      label="Marca / SKU"
                      value={`${selectedProduct.brand || 'Sin marca'} · ${selectedProduct.sku || 'Sin SKU'}`}
                    />
                    <Detail
                      label="Precio de venta"
                      value={centsToBolivianos(selectedProduct.salePriceCents)}
                    />
                    <Detail
                      label="Stock mínimo"
                      value={`${selectedProduct.minimumStock} unidades`}
                    />
                    <p className="rounded-xl bg-lou-paper p-4 text-xs leading-5 text-lou-graphite/60">
                      Las existencias y movimientos reales se gestionan en Inventario.
                    </p>
                  </>
                )}
                {selectedRule && section === 'commissions' && (
                  <>
                    <Detail
                      label="Tipo"
                      value={selectedRule.kind === 'SERVICE' ? 'Servicio' : 'Producto'}
                    />
                    <Detail label="Tasa" value={percent(selectedRule.rateBasisPoints)} />
                    <Detail
                      label="Vigencia"
                      value={`${selectedRule.validFrom} — ${selectedRule.validTo || 'sin fin'}`}
                    />
                    <HistoryHint />
                  </>
                )}
                {selectedExpense && section === 'expenses' && (
                  <p className="text-lou-graphite/60">
                    Esta categoría clasifica gastos; desactivarla no modifica los gastos ya
                    registrados.
                  </p>
                )}
                {selectedUser && section === 'users' && (
                  <>
                    <Detail label="Roles" value={selectedUser.roles.map(roleLabel).join(', ')} />
                    <p className="rounded-xl bg-lou-paper p-4 text-xs leading-5 text-lou-graphite/60">
                      Cambiar roles, contraseña o estado revoca las sesiones existentes de esta
                      cuenta.
                    </p>
                  </>
                )}
              </div>
              <div className="mt-7 flex flex-wrap gap-2 border-t border-lou-fog pt-5">
                {section === 'team' && selectedStaff && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => setPanel({ kind: 'edit-team', id: selectedStaff.id })}
                    >
                      Editar persona
                    </Button>
                    {selectedBarber ? (
                      <Button
                        variant="secondary"
                        onClick={() => setPanel({ kind: 'edit-barber', id: selectedBarber.id })}
                      >
                        Editar barbero
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => setPanel({ kind: 'create-barber', id: selectedStaff.id })}
                      >
                        Habilitar barbero
                      </Button>
                    )}
                  </>
                )}
                {section === 'services' && (
                  <Button
                    variant="secondary"
                    onClick={() => setPanel({ kind: 'edit-services', id: currentId })}
                  >
                    Editar servicio
                  </Button>
                )}
                {section === 'products' && (
                  <Button
                    variant="secondary"
                    onClick={() => setPanel({ kind: 'edit-products', id: currentId })}
                  >
                    Editar producto
                  </Button>
                )}
                {section === 'expenses' && (
                  <Button
                    variant="secondary"
                    onClick={() => setPanel({ kind: 'edit-expenses', id: currentId })}
                  >
                    Editar categoría
                  </Button>
                )}
                {section === 'users' && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => setPanel({ kind: 'roles-users', id: currentId })}
                    >
                      Cambiar roles
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setPanel({ kind: 'password-users', id: currentId })}
                    >
                      Nueva contraseña
                    </Button>
                  </>
                )}
                {section === 'team' && selectedBarber && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      requestToggle(
                        `${selectedBarber.active ? 'Desactivar' : 'Activar'} barbería de ${current.title}`,
                        () => configurationApi.updateBarber(selectedBarber, !selectedBarber.active),
                      )
                    }
                  >
                    {selectedBarber.active ? 'Desactivar barbería' : 'Activar barbería'}
                  </Button>
                )}
                {section === 'team' && selectedStaff && (
                  <ToggleButton
                    active={selectedStaff.active}
                    disabled={busy}
                    onClick={() =>
                      requestToggle(
                        `${selectedStaff.active ? 'Desactivar' : 'Activar'} a ${current.title}`,
                        () => configurationApi.updateStaff(selectedStaff, !selectedStaff.active),
                      )
                    }
                  />
                )}
                {section === 'services' && selectedService && (
                  <ToggleButton
                    active={selectedService.active}
                    disabled={busy}
                    onClick={() =>
                      requestToggle(
                        `${selectedService.active ? 'Desactivar' : 'Activar'} ${current.title}`,
                        () =>
                          configurationApi.updateService(selectedService, !selectedService.active),
                      )
                    }
                  />
                )}
                {section === 'offerings' && selectedOffering?.active && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      requestToggle(`Desactivar oferta de ${current.title}`, () =>
                        configurationApi.deactivateOffering(selectedOffering),
                      )
                    }
                  >
                    Desactivar vigencia
                  </Button>
                )}
                {section === 'products' && selectedProduct && (
                  <ToggleButton
                    active={selectedProduct.active}
                    disabled={busy}
                    onClick={() =>
                      requestToggle(
                        `${selectedProduct.active ? 'Desactivar' : 'Activar'} ${current.title}`,
                        () =>
                          configurationApi.updateProduct(selectedProduct, !selectedProduct.active),
                      )
                    }
                  />
                )}
                {section === 'commissions' && selectedRule?.active && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      requestToggle(`Desactivar tasa de ${current.title}`, () =>
                        configurationApi.deactivateCommissionRule(selectedRule),
                      )
                    }
                  >
                    Desactivar vigencia
                  </Button>
                )}
                {section === 'expenses' && selectedExpense && (
                  <ToggleButton
                    active={selectedExpense.active}
                    disabled={busy}
                    onClick={() =>
                      requestToggle(
                        `${selectedExpense.active ? 'Desactivar' : 'Activar'} ${current.title}`,
                        () =>
                          configurationApi.updateExpenseCategory(
                            selectedExpense,
                            !selectedExpense.active,
                          ),
                      )
                    }
                  />
                )}
                {section === 'users' && selectedUser && (
                  <ToggleButton
                    active={selectedUser.active}
                    disabled={busy}
                    onClick={() =>
                      requestToggle(
                        `${selectedUser.active ? 'Desactivar' : 'Activar'} cuenta ${current.title}`,
                        () => configurationApi.setUserActive(selectedUser.id, !selectedUser.active),
                      )
                    }
                  />
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-lou-graphite/55">
              Selecciona un registro para ver sus detalles.
            </p>
          )}
        </section>
      </div>
      {panel && (
        <ConfigurationEditor
          key={`${panel.kind}-${panel.id ?? ''}`}
          panel={panel}
          data={data}
          barberId={activeBarberId}
          busy={busy}
          error={notice?.error ? notice.text : undefined}
          onClose={() => setPanel(null)}
          onSave={save}
        />
      )}
      {confirm && (
        <ConfirmDialog
          busy={busy}
          title={confirm.label}
          confirmLabel="Confirmar cambio"
          cancelLabel="Cancelar"
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            void save(
              confirm.action,
              section === 'offerings'
                ? [['offerings', activeBarberId]]
                : section === 'commissions'
                  ? [['commission-rules', activeBarberId]]
                  : [],
            )
          }
        >
          <p>Revisa el registro antes de continuar. Los cambios no reescriben el historial.</p>
          {notice?.error && (
            <p className={cn('mt-3', errorClassName)} role="alert">
              {notice.text}
            </p>
          )}
        </ConfirmDialog>
      )}
    </main>
  )
}

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-lou-fog pb-3">
    <span className="text-lou-graphite/55">{label}</span>
    <strong className="text-right">{value}</strong>
  </div>
)
const HistoryHint = () => (
  <p className="rounded-xl bg-lou-paper p-4 text-xs leading-5 text-lou-graphite/60">
    Una condición nueva requiere otra vigencia. Desactivar ésta no modifica citas ni operaciones
    históricas.
  </p>
)
const ToggleButton = ({
  active,
  disabled,
  onClick,
}: {
  active: boolean
  disabled: boolean
  onClick: () => void
}) => (
  <Button variant="secondary" disabled={disabled} onClick={onClick}>
    {active ? 'Desactivar' : 'Activar'}
  </Button>
)
const Loading = ({ title }: { title: string }) => (
  <main className="mx-auto max-w-360 px-4 py-8" role="status" aria-label={title}>
    <div className="h-12 w-52 animate-pulse rounded-xl bg-lou-fog" />
    <div className="mt-8 grid gap-4 lg:grid-cols-2">
      <div className="h-80 animate-pulse rounded-2xl bg-lou-fog" />
      <div className="h-80 animate-pulse rounded-2xl bg-lou-fog" />
    </div>
  </main>
)
