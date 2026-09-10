import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Customer } from '../../core/agenda/Agenda'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { ApiError } from '../../infrastructure/http/apiClient'
import { Button } from './Button'
import {
  errorClassName,
  fieldClassName,
  labelClassName,
  noticeClassName,
} from '../styles/formStyles'

interface Props {
  selected: Customer | undefined
  onSelect: (customer: Customer) => void
  disabled: boolean
}
export const CustomerPicker = ({ selected, onSelect, disabled }: Props) => {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Customer | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
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
          ? 'Guardado. Atención: hay otros clientes con este teléfono; comprueba que elegiste a la persona correcta.'
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
    <section className="grid gap-4" aria-label="Seleccionar cliente">
      <div>
        <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
          Paso 1
        </p>
        <h3 className="mt-1 font-display text-2xl font-bold">Elige al cliente</h3>
      </div>
      <form
        className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault()
          setSearch(query.trim())
        }}
      >
        <label className={labelClassName}>
          Buscar por nombre o teléfono
          <input
            className={fieldClassName}
            value={query}
            maxLength={120}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>
      {customers.isPending && (
        <p className="text-sm text-lou-graphite/60" role="status">
          Buscando clientes…
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
        <p className="rounded-xl border border-dashed border-lou-steel p-4 text-sm text-lou-graphite/60">
          No hay coincidencias. Puedes crear un cliente.
        </p>
      )}
      {Boolean(customers.data?.length) && (
        <label className={labelClassName}>
          Coincidencias (máximo 50)
          <select
            className={fieldClassName}
            value={selected?.id ?? ''}
            onChange={(event) => {
              const customer = customers.data?.find((item) => item.id === event.target.value)
              if (customer) onSelect(customer)
            }}
          >
            <option value="">Selecciona una persona</option>
            {selected && !customers.data?.some((item) => item.id === selected.id) && (
              <option value={selected.id}>
                {selected.displayName} · {selected.phone}
              </option>
            )}
            {customers.data?.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.displayName} · {customer.phone}
              </option>
            ))}
          </select>
        </label>
      )}
      {selected && (
        <p className="rounded-xl border border-emerald-800/15 bg-emerald-50 p-3 text-sm text-emerald-950">
          Cliente seleccionado: <strong>{selected.displayName}</strong> · {selected.phone}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => setEditing(null)}
        >
          Nuevo cliente
        </Button>
        {selected && (
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={() => setEditing(selected)}
          >
            Corregir cliente
          </Button>
        )}
      </div>
      {editing !== undefined && (
        <form
          key={editing?.id ?? 'new'}
          className="grid gap-4 rounded-2xl border border-lou-fog bg-lou-paper p-4"
          onSubmit={(event) => void save(event)}
        >
          <h4 className="font-display text-xl font-bold">
            {editing ? 'Corregir ficha' : 'Nuevo cliente'}
          </h4>
          <label className={labelClassName}>
            Nombre
            <input
              className={fieldClassName}
              name="name"
              required
              maxLength={120}
              defaultValue={editing?.displayName}
            />
          </label>
          <label className={labelClassName}>
            Teléfono
            <input
              className={fieldClassName}
              name="phone"
              type="tel"
              required
              maxLength={25}
              placeholder="71234567 o +59171234567"
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
          <div className="flex flex-wrap gap-2">
            <Button disabled={disabled || busy}>{busy ? 'Guardando…' : 'Guardar cliente'}</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(undefined)}>
              Cerrar ficha
            </Button>
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
