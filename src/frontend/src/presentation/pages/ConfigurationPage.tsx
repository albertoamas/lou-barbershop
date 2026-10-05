import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import {
  byActiveThenName,
  centsToBolivianos,
  staffFunction,
  type ConfigurationSnapshot,
} from '../../core/configuration/Configuration'
import { ApiError } from '../../infrastructure/http/apiClient'
import { authApi } from '../../infrastructure/http/authApi'
import { configurationApi } from '../../infrastructure/http/configurationApi'
import { AgendaDialog } from '../components/AgendaDialog'
import { AppIcon } from '../components/AppIcon'
import { Button } from '../components/Button'
import { Toast } from '../components/Toast'
import { AccountSheet } from '../components/configuration/AccountSheet'
import { ConfigList, type ConfigRow } from '../components/configuration/ConfigLists'
import { ConfigurationForm } from '../components/configuration/ConfigurationForm'
import { panelLabel, type Panel } from '../components/configuration/configPanels'
import { PersonSheet } from '../components/configuration/PersonSheet'
import { SheetHeader } from '../components/configuration/SheetHeader'
import { useConnectivity } from '../hooks/useConnectivity'
import { cn } from '../styles/cn'
import { errorClassName, warningClassName } from '../styles/formStyles'

type Section = 'team' | 'services' | 'products' | 'expenses'
const sections: { id: Section; param: string; label: string; create: string }[] = [
  { id: 'team', param: 'equipo', label: 'Equipo', create: 'Agregar persona' },
  { id: 'services', param: 'servicios', label: 'Servicios', create: 'Nuevo servicio' },
  { id: 'products', param: 'productos', label: 'Productos', create: 'Nuevo producto' },
  { id: 'expenses', param: 'gastos', label: 'Gastos', create: 'Nueva categoría' },
]
const createKind = {
  team: 'create-team',
  services: 'create-services',
  products: 'create-products',
  expenses: 'create-expenses',
} as const

const errorMessage = (error: unknown) =>
  error instanceof ApiError && (error.problem.detail ?? error.problem.title)
    ? (error.problem.detail ?? error.problem.title)
    : 'No se pudo guardar el cambio. Intenta otra vez.'

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

const rowsFor = (section: Section, data: ConfigurationSnapshot): ConfigRow[] => {
  if (section === 'team')
    return [...data.staff].sort(byActiveThenName((item) => item.displayName)).map((item) => ({
      id: item.id,
      title: item.displayName,
      detail: staffFunction(item, data.barbers, data.users),
      active: item.active,
    }))
  if (section === 'services')
    return [...data.services].sort(byActiveThenName((item) => item.name)).map((item) => ({
      id: item.id,
      title: item.name,
      detail: `${item.defaultDurationMinutes} min, precio por defecto`,
      aside: centsToBolivianos(item.defaultPriceCents),
      active: item.active,
    }))
  if (section === 'products')
    return [...data.products].sort(byActiveThenName((item) => item.name)).map((item) => ({
      id: item.id,
      title: item.name,
      detail:
        [item.brand, item.sku].filter(Boolean).join(', ') ||
        `Avisar con ${item.minimumStock} o menos`,
      aside: centsToBolivianos(item.salePriceCents),
      active: item.active,
    }))
  return [...data.expenseCategories].sort(byActiveThenName((item) => item.name)).map((item) => ({
    id: item.id,
    title: item.name,
    detail: 'Categoría de gasto',
    active: item.active,
  }))
}

const summaryFor = (section: Section, data: ConfigurationSnapshot) => {
  const active = <T extends { active: boolean }>(items: T[]) =>
    items.filter((item) => item.active).length
  if (section === 'team') {
    const barbers = data.barbers.filter((item) => item.active).length
    return `${plural(active(data.staff), 'persona activa', 'personas activas')}, ${plural(barbers, 'atiende', 'atienden')} como barbero.`
  }
  if (section === 'services')
    return `${plural(active(data.services), 'servicio activo', 'servicios activos')}. El precio de cada barbero se define en su ficha del Equipo.`
  if (section === 'products')
    return `${plural(active(data.products), 'producto activo', 'productos activos')}. Las existencias se manejan en Inventario.`
  return `${plural(active(data.expenseCategories), 'categoría activa', 'categorías activas')} para clasificar los gastos.`
}

export const ConfigurationPage = () => {
  const [params, setParams] = useSearchParams()
  const section = sections.find((item) => item.param === params.get('seccion'))?.id ?? 'team'
  const [panel, setPanel] = useState<Panel | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const clearNotice = useCallback(() => setNotice(''), [])
  const queryClient = useQueryClient()
  const online = useConnectivity() === 'online'
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

  const open = (next: Panel | null) => {
    setError('')
    setPanel(next)
  }
  const close = () => !busy && open(null)
  const save = async (
    action: () => Promise<unknown>,
    refresh: string[][] = [],
    after: Panel | null = null,
  ) => {
    setBusy(true)
    setError('')
    try {
      await action()
      await queryClient.invalidateQueries({ queryKey: ['configuration'] })
      for (const key of refresh) await queryClient.invalidateQueries({ queryKey: key })
      setPanel(after)
      setNotice('Cambio guardado')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  if (session.isPending || (isOwner && snapshot.isPending))
    return (
      <main
        className="mx-auto w-full max-w-360 px-4 py-6"
        role="status"
        aria-label="Cargando configuración"
      >
        <div className="h-96 animate-pulse rounded-panel bg-surface-strong" />
      </main>
    )
  if (session.isError || snapshot.isError || (isOwner && !snapshot.data))
    return (
      <main className="mx-auto w-full max-w-360 px-4 py-6">
        <div
          className={cn(errorClassName, 'flex flex-wrap items-center justify-between gap-3')}
          role="alert"
        >
          No pudimos cargar la configuración.
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void (session.isError ? session.refetch() : snapshot.refetch())}
          >
            Reintentar
          </Button>
        </div>
      </main>
    )
  if (!isOwner) return <Navigate to="/app/acceso-denegado" replace />
  const data = snapshot.data!

  const current = sections.find((item) => item.id === section)!
  const rows = rowsFor(section, data)
  const looseAccounts = data.users.filter(
    (user) => !data.staff.some((person) => person.userId === user.id),
  )
  const disabled = busy || !online
  const openRow = (id: string) => {
    if (section === 'team') return open({ kind: 'person', staffId: id })
    if (section === 'services') return open({ kind: 'edit-services', id })
    if (section === 'products') return open({ kind: 'edit-products', id })
    return open({ kind: 'edit-expenses', id })
  }
  const changeSection = (next: (typeof sections)[number]) => {
    const nextParams = new URLSearchParams(params)
    nextParams.set('seccion', next.param)
    setParams(nextParams, { replace: true })
  }

  // Deactivating a catalog record from its edit form.
  const toggleFooter = (id: string | undefined, target: Panel) => {
    const record =
      section === 'services'
        ? data.services.find((item) => item.id === id)
        : section === 'products'
          ? data.products.find((item) => item.id === id)
          : data.expenseCategories.find((item) => item.id === id)
    if (!record) return undefined
    const noun =
      section === 'services' ? 'servicio' : section === 'products' ? 'producto' : 'categoría'
    const action = () =>
      section === 'services'
        ? configurationApi.updateService(
            data.services.find((item) => item.id === record.id)!,
            !record.active,
          )
        : section === 'products'
          ? configurationApi.updateProduct(
              data.products.find((item) => item.id === record.id)!,
              !record.active,
            )
          : configurationApi.updateExpenseCategory(
              data.expenseCategories.find((item) => item.id === record.id)!,
              !record.active,
            )
    const label = `${record.active ? 'Desactivar' : 'Activar'} ${noun}`
    return (
      <div className="mt-2 grid justify-items-start gap-2 border-t border-line pt-4">
        <p className="text-pretty text-ink-soft">
          {record.active
            ? 'Deja de ofrecerse desde ahora. Lo registrado antes se conserva.'
            : 'Vuelve a estar disponible.'}
        </p>
        <Button
          type="button"
          variant={record.active ? 'dangerSoft' : 'secondary'}
          size="sm"
          disabled={disabled}
          onClick={() =>
            open({
              kind: 'confirm',
              title: label,
              detail: record.active
                ? `${record.name} dejará de estar disponible. Las citas, ventas y gastos anteriores no cambian.`
                : `${record.name} volverá a estar disponible.`,
              confirmLabel: label,
              action,
              back: target,
            })
          }
        >
          {label}
        </Button>
      </div>
    )
  }

  const renderPanel = (value: Panel) => {
    if (value.kind === 'person')
      return (
        <PersonSheet
          staffId={value.staffId}
          data={data}
          disabled={disabled}
          onClose={close}
          onOpen={open}
        />
      )
    if (value.kind === 'account')
      return (
        <AccountSheet
          userId={value.userId}
          data={data}
          disabled={disabled}
          onClose={close}
          onOpen={open}
        />
      )
    if (value.kind === 'confirm')
      return (
        <div className="grid gap-5">
          <SheetHeader title={value.title} busy={busy} onClose={close} />
          <p className="text-pretty">{value.detail}</p>
          {error && (
            <p className={errorClassName} role="alert">
              {error}
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="ghost" disabled={busy} onClick={() => open(value.back ?? null)}>
              Volver
            </Button>
            <Button
              disabled={disabled}
              onClick={() => void save(value.action, value.refresh, value.back ?? null)}
            >
              {busy ? 'Guardando' : value.confirmLabel}
            </Button>
          </div>
        </div>
      )
    const editing =
      value.kind === 'edit-services' ||
      value.kind === 'edit-products' ||
      value.kind === 'edit-expenses'
    return (
      <ConfigurationForm
        kind={value.kind}
        id={value.id}
        barberId={value.barberId}
        data={data}
        busy={busy}
        online={online}
        error={error}
        footer={editing ? toggleFooter(value.id, value) : undefined}
        onBack={value.back ? () => open(value.back ?? null) : undefined}
        onClose={close}
        onCreateAccount={() => open({ kind: 'create-users', back: value })}
        onSave={(action, refresh) =>
          void save(action, refresh, value.kind === 'create-team' ? null : (value.back ?? null))
        }
      />
    )
  }

  return (
    <main className="mx-auto w-full max-w-360 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-5xl leading-none font-extrabold text-balance sm:text-6xl">
            Configuración
          </h1>
          <p className="mt-2 max-w-3xl text-lg text-pretty text-ink-soft">
            {summaryFor(section, data)}
          </p>
        </div>
        <Button
          className="max-sm:w-full"
          disabled={disabled}
          onClick={() => open({ kind: createKind[section] })}
        >
          <AppIcon name="plus" size={20} />
          {current.create}
        </Button>
      </header>

      {!online && (
        <p className={cn(warningClassName, 'mt-4')} role="status">
          Sin conexión. Puedes consultar, pero no guardar cambios.
        </p>
      )}

      <div
        className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        role="tablist"
        aria-label="Secciones de configuración"
      >
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`config-tab-${item.id}`}
            aria-controls={`config-panel-${item.id}`}
            aria-selected={section === item.id}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center rounded-full border-2 px-4 font-semibold transition-colors duration-150',
              section === item.id
                ? 'border-ink bg-ink text-on-ink'
                : 'border-transparent bg-surface shadow-raised hover:border-line-control',
            )}
            onClick={() => changeSection(item)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section
        id={`config-panel-${section}`}
        role="tabpanel"
        aria-labelledby={`config-tab-${section}`}
        className="mt-4 grid gap-4 rounded-panel bg-surface p-3 shadow-raised sm:p-4"
      >
        <ConfigList
          rows={rows}
          people={section === 'team'}
          inactiveLabel={
            section === 'team' || section === 'expenses' ? 'Desactivada' : 'Desactivado'
          }
          empty={`Todavía no hay registros. Usa "${current.create}" para empezar.`}
          onOpen={openRow}
        />
        {section === 'team' && looseAccounts.length > 0 && (
          <div className="border-t border-line px-3 pt-4">
            <h2 className="font-display text-xl font-extrabold">Cuentas sin persona</h2>
            <p className="mb-2 text-ink-soft">
              Cuentas de acceso que todavía no están asignadas a nadie del equipo.
            </p>
            <ConfigList
              rows={looseAccounts.map((user) => ({
                id: user.id,
                title: user.userName,
                detail: 'Cuenta de acceso',
                active: user.active,
              }))}
              inactiveLabel="Desactivada"
              empty=""
              onOpen={(userId) => open({ kind: 'account', userId })}
            />
          </div>
        )}
      </section>

      {panel && (
        <AgendaDialog label={panelLabel(panel)} onClose={close}>
          {/* Each new view starts at the top of the sheet. */}
          <div
            key={`${panel.kind}-${'id' in panel ? panel.id : ''}-${panelLabel(panel)}`}
            ref={(element) => element?.parentElement?.scrollTo?.({ top: 0 })}
          >
            {renderPanel(panel)}
          </div>
        </AgendaDialog>
      )}
      <Toast message={notice} onDone={clearNotice} />
    </main>
  )
}
