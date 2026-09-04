import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Customer } from '../../core/agenda/Agenda'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { ApiError } from '../../infrastructure/http/apiClient'

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
    <section className="customer-picker" aria-label="Seleccionar cliente">
      <h3>1. Cliente</h3>
      <form
        className="customer-search"
        onSubmit={(event) => {
          event.preventDefault()
          setSearch(query.trim())
        }}
      >
        <label>
          Buscar por nombre o teléfono
          <input value={query} maxLength={120} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button type="submit">Buscar cliente</button>
      </form>
      {customers.isPending && <p role="status">Buscando clientes…</p>}
      {customers.isError && (
        <p role="alert">
          No se pudieron cargar clientes.{' '}
          <button onClick={() => void customers.refetch()}>Reintentar búsqueda</button>
        </p>
      )}
      {customers.data?.length === 0 && <p>No hay coincidencias. Puedes crear un cliente.</p>}
      {Boolean(customers.data?.length) && (
        <label>
          Coincidencias (máximo 50)
          <select
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
        <p>
          Seleccionado: <strong>{selected.displayName}</strong> · {selected.phone}
        </p>
      )}
      <div className="row-actions">
        <button disabled={disabled} onClick={() => setEditing(null)}>
          Nuevo cliente
        </button>
        {selected && (
          <button disabled={disabled} onClick={() => setEditing(selected)}>
            Corregir cliente
          </button>
        )}
      </div>
      {editing !== undefined && (
        <form
          key={editing?.id ?? 'new'}
          className="compact-form"
          onSubmit={(event) => void save(event)}
        >
          <h4>{editing ? 'Corregir ficha' : 'Nuevo cliente'}</h4>
          <label>
            Nombre
            <input name="name" required maxLength={120} defaultValue={editing?.displayName} />
          </label>
          <label>
            Teléfono
            <input
              name="phone"
              type="tel"
              required
              maxLength={25}
              placeholder="71234567 o +59171234567"
              defaultValue={editing?.phone}
            />
          </label>
          <label>
            Nota interna (solo administración)
            <textarea name="notes" maxLength={1000} defaultValue={editing?.notes ?? ''} />
          </label>
          <button className="primary-button" disabled={disabled || busy}>
            {busy ? 'Guardando…' : 'Guardar cliente'}
          </button>
          <button type="button" onClick={() => setEditing(undefined)}>
            Cerrar ficha
          </button>
        </form>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  )
}
