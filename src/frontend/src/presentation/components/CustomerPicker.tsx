import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Customer } from '../../core/agenda/Agenda'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { ApiError } from '../../infrastructure/http/apiClient'
import { cn } from '../styles/cn'
import { AppIcon } from './AppIcon'
import { Avatar } from './Avatar'
import { Button } from './Button'
import {
  errorClassName,
  fieldClassName,
  labelClassName,
  noticeClassName,
  successClassName,
} from '../styles/formStyles'

interface Props {
  selected: Customer | undefined
  onSelect: (customer: Customer) => void
  disabled: boolean
}

// Searching waits for a short pause in typing so each keystroke does not hit the API.
const searchDelayMs = 300

export const CustomerPicker = ({ selected, onSelect, disabled }: Props) => {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Customer | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), searchDelayMs)
    return () => window.clearTimeout(timer)
  }, [query])

  const customers = useQuery({
    queryKey: ['customers', search],
    queryFn: () => agendaApi.customers(search),
  })

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (disabled || busy) return
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setNotice('')
    try {
      const change = await agendaApi.saveCustomer(
        {
          displayName: String(form.get('name')),
          phone: String(form.get('phone')),
          notes: String(form.get('notes')) || null,
        },
        editing ?? undefined,
      )
      onSelect(change.customer)
      setEditing(undefined)
      setNotice(
        change.possibleDuplicates.length
          ? 'Guardado. Hay otros clientes con este teléfono; comprueba que elegiste a la persona correcta.'
          : 'Cliente guardado y seleccionado.',
      )
      await customers.refetch()
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? (error.problem.detail ?? error.message)
          : 'No se pudo guardar el cliente.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="grid gap-4" aria-labelledby="customer-step">
      <h3 id="customer-step" className="font-display text-2xl font-extrabold">
        1. Cliente
      </h3>

      {selected && editing === undefined ? (
        <div className={cn(successClassName, 'flex items-center justify-between gap-3')}>
          <span className="flex min-w-0 items-center gap-3">
            <Avatar name={selected.displayName} />
            <span className="min-w-0">
              <span className="block truncate">{selected.displayName}</span>
              <span className="block font-normal tabular-nums">{selected.phone}</span>
            </span>
          </span>
          <Button
            className="shrink-0"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => setEditing(selected)}
          >
            Corregir
          </Button>
        </div>
      ) : null}

      <label className={labelClassName}>
        Buscar por nombre o teléfono
        <input
          className={fieldClassName}
          type="search"
          name="customer-search"
          value={query}
          maxLength={120}
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {customers.isPending && (
        <p className="text-sm text-ink-muted" role="status">
          Buscando clientes...
        </p>
      )}
      {customers.isError && (
        <p className={errorClassName} role="alert">
          No se pudieron cargar clientes.{' '}
          <button className="font-bold underline" onClick={() => void customers.refetch()}>
            Reintentar búsqueda
          </button>
        </p>
      )}
      {customers.data?.length === 0 && (
        <p className="rounded-control bg-surface-muted p-4 text-sm text-ink-soft">
          No hay coincidencias. Puedes registrar un cliente nuevo.
        </p>
      )}
      {Boolean(customers.data?.length) && (
        <ul
          className="grid max-h-72 gap-1 overflow-y-auto rounded-panel bg-surface-muted p-1"
          aria-label="Coincidencias"
        >
          {customers.data?.map((customer) => {
            const isSelected = customer.id === selected?.id
            return (
              <li key={customer.id}>
                <button
                  type="button"
                  className={cn(
                    'flex min-h-14 w-full items-center gap-3 rounded-control px-3 text-left transition-colors',
                    isSelected ? 'bg-ink text-on-ink' : 'bg-surface hover:bg-surface-strong',
                  )}
                  aria-pressed={isSelected}
                  disabled={disabled}
                  onClick={() => {
                    onSelect(customer)
                    setNotice('')
                  }}
                >
                  <Avatar
                    name={customer.displayName}
                    size="sm"
                    tone={isSelected ? 'onInk' : 'neutral'}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{customer.displayName}</span>
                    <span className="block text-sm tabular-nums opacity-80">{customer.phone}</span>
                  </span>
                  {isSelected && <AppIcon name="check" size={18} />}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {editing === undefined && (
        <Button variant="secondary" disabled={disabled} onClick={() => setEditing(null)}>
          Registrar cliente nuevo
        </Button>
      )}

      {editing !== undefined && (
        <form
          key={editing?.id ?? 'new'}
          className="grid gap-4 rounded-panel bg-surface-muted p-4"
          onSubmit={(event) => void save(event)}
        >
          <h4 className="font-display text-xl font-extrabold">
            {editing ? 'Corregir datos del cliente' : 'Cliente nuevo'}
          </h4>
          <label className={labelClassName}>
            Nombre
            <input
              className={fieldClassName}
              name="name"
              required
              maxLength={120}
              autoComplete="off"
              defaultValue={editing?.displayName}
            />
          </label>
          <label className={labelClassName}>
            Teléfono
            <input
              className={fieldClassName}
              name="phone"
              type="tel"
              inputMode="tel"
              required
              maxLength={25}
              placeholder="71234567"
              defaultValue={editing?.phone}
            />
          </label>
          <label className={labelClassName}>
            Nota interna (solo administración)
            <textarea
              className={`${fieldClassName} min-h-24 py-3`}
              name="notes"
              maxLength={1000}
              defaultValue={editing?.notes ?? ''}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="ghost" onClick={() => setEditing(undefined)}>
              Volver
            </Button>
            <Button disabled={disabled || busy}>{busy ? 'Guardando...' : 'Guardar cliente'}</Button>
          </div>
        </form>
      )}

      {notice && (
        <p className={noticeClassName} role="status">
          {notice}
        </p>
      )}
    </section>
  )
}
