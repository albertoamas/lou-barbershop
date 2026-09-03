import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { bolivianosToCents, centsToBolivianos } from '../../core/configuration/Configuration'
import { ApiError } from '../../infrastructure/http/apiClient'
import { authApi } from '../../infrastructure/http/authApi'
import { configurationApi } from '../../infrastructure/http/configurationApi'
import { useConnectivity } from '../hooks/useConnectivity'

type Section = 'team' | 'services' | 'products' | 'expenses'

const messageFor = (error: unknown) =>
  error instanceof ApiError
    ? (error.problem.detail ?? error.problem.title)
    : 'No se pudo completar la acción. Intenta nuevamente.'

export const ConfigurationPage = () => {
  const session = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: authApi.current,
    retry: false,
  })
  const snapshot = useQuery({ queryKey: ['configuration'], queryFn: configurationApi.load })
  const queryClient = useQueryClient()
  const connectivity = useConnectivity()
  const [section, setSection] = useState<Section>('team')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  if (session.data && !session.data.roles.includes('OWNER'))
    return <Navigate to="/access-denied" replace />
  if (snapshot.isPending)
    return (
      <main className="content" aria-busy="true">
        <p className="eyebrow">Configuración</p>
        <h1>Cargando maestros…</h1>
      </main>
    )
  if (snapshot.isError || !snapshot.data)
    return (
      <main className="content">
        <p className="eyebrow">Configuración</p>
        <h1>No pudimos cargar los maestros.</h1>
        <button type="button" className="primary-button" onClick={() => void snapshot.refetch()}>
          Reintentar
        </button>
      </main>
    )

  const execute = async (action: () => Promise<unknown>, extraKeys: string[][] = []) => {
    if (connectivity !== 'online') {
      setNotice('Recupera la conexión para guardar cambios.')
      return
    }
    setBusy(true)
    setNotice('')
    try {
      await action()
      await queryClient.invalidateQueries({ queryKey: ['configuration'] })
      for (const key of extraKeys) await queryClient.invalidateQueries({ queryKey: key })
      setNotice('Cambio guardado correctamente.')
    } catch (error) {
      setNotice(messageFor(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="content configuration-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">R1 · Maestros operativos</p>
          <h1>Configura lo que Lou ofrece.</h1>
          <p className="lead">Personal, precios, duración y tasas con historia reproducible.</p>
        </div>
        <span className="history-badge">Los cambios no reescriben operaciones pasadas</span>
      </div>
      <nav className="section-tabs" aria-label="Secciones de configuración">
        {(
          [
            ['team', 'Personal'],
            ['services', 'Servicios y tasas'],
            ['products', 'Productos'],
            ['expenses', 'Gastos'],
          ] as const
        ).map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-current={section === id ? 'page' : undefined}
            onClick={() => setSection(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {notice && (
        <p
          className={notice.includes('correctamente') ? 'form-success' : 'form-error'}
          role="status"
        >
          {notice}
        </p>
      )}
      {section === 'team' && <TeamSection data={snapshot.data} busy={busy} execute={execute} />}
      {section === 'services' && (
        <ServicesSection data={snapshot.data} busy={busy} execute={execute} />
      )}
      {section === 'products' && (
        <ProductsSection data={snapshot.data} busy={busy} execute={execute} />
      )}
      {section === 'expenses' && (
        <ExpensesSection data={snapshot.data} busy={busy} execute={execute} />
      )}
    </main>
  )
}

type Snapshot = Awaited<ReturnType<typeof configurationApi.load>>
type Execute = (action: () => Promise<unknown>, extraKeys?: string[][]) => Promise<void>

const TeamSection = ({
  data,
  busy,
  execute,
}: {
  data: Snapshot
  busy: boolean
  execute: Execute
}) => {
  const [userId, setUserId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [staffId, setStaffId] = useState('')
  const [employmentType, setEmploymentType] = useState('CONTRACTOR')
  const [color, setColor] = useState('#A55F32')
  const availableUsers = data.users.filter(
    (user) => !data.staff.some((staff) => staff.userId === user.id),
  )
  const availableStaff = data.staff.filter(
    (staff) => staff.active && !data.barbers.some((barber) => barber.staffProfileId === staff.id),
  )
  const submitStaff = (event: FormEvent) => {
    event.preventDefault()
    void execute(() =>
      configurationApi.createStaff({ userId, displayName, ...(phone ? { phone } : {}) }),
    ).then(() => {
      setDisplayName('')
      setPhone('')
    })
  }
  const submitBarber = (event: FormEvent) => {
    event.preventDefault()
    void execute(() =>
      configurationApi.createBarber({
        staffProfileId: staffId,
        employmentType,
        settlementFrequency: 'BIWEEKLY',
        color,
      }),
    ).then(() => setStaffId(''))
  }
  return (
    <section className="master-layout">
      <div className="form-stack">
        <form className="master-form" onSubmit={submitStaff}>
          <div>
            <p className="step-number">01</p>
            <h2>Vincular persona</h2>
            <p>Una cuenta técnica corresponde a una sola persona.</p>
          </div>
          <label>
            Cuenta
            <select value={userId} onChange={(event) => setUserId(event.target.value)} required>
              <option value="">Selecciona…</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.userName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nombre visible
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={120}
              required
            />
          </label>
          <label>
            Teléfono opcional
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              inputMode="tel"
            />
          </label>
          <button className="primary-button" disabled={busy || !userId}>
            Crear perfil
          </button>
        </form>
        <form className="master-form" onSubmit={submitBarber}>
          <div>
            <p className="step-number">02</p>
            <h2>Habilitar barbero</h2>
            <p>El tipo laboral determina si genera deuda de comisión.</p>
          </div>
          <label>
            Persona
            <select value={staffId} onChange={(event) => setStaffId(event.target.value)} required>
              <option value="">Selecciona…</option>
              {availableStaff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.displayName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <select
              value={employmentType}
              onChange={(event) => setEmploymentType(event.target.value)}
            >
              <option value="CONTRACTOR">Contratado</option>
              <option value="OWNER">Dueño</option>
            </select>
          </label>
          <label>
            Color de agenda
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </label>
          <button className="primary-button" disabled={busy || !staffId}>
            Habilitar barbero
          </button>
        </form>
      </div>
      <div className="master-list">
        <div className="list-heading">
          <h2>Equipo</h2>
          <span>{data.staff.length} personas</span>
        </div>
        {data.staff.length === 0 ? (
          <EmptyState text="Aún no hay personal vinculado." />
        ) : (
          data.staff.map((staff) => {
            const barber = data.barbers.find((item) => item.staffProfileId === staff.id)
            return (
              <article className="master-row" key={staff.id}>
                <div>
                  <strong>{staff.displayName}</strong>
                  <small>
                    {barber
                      ? barber.employmentType === 'OWNER'
                        ? 'Dueño · barbero'
                        : 'Barbero contratado'
                      : 'Personal'}{' '}
                    · {staff.active ? 'Activo' : 'Inactivo'}
                  </small>
                </div>
                <div className="row-actions">
                  {barber && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void execute(() => configurationApi.updateBarber(barber, !barber.active))
                      }
                    >
                      {barber.active ? 'Desactivar barbería' : 'Activar barbería'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void execute(() => configurationApi.updateStaff(staff, !staff.active))
                    }
                  >
                    {staff.active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </article>
            )
          })
        )}
        <p className="context-note">
          Dueño y barbero pueden ser la misma cuenta. El dueño nunca genera comisión por pagar.
        </p>
      </div>
    </section>
  )
}

const ServicesSection = ({
  data,
  busy,
  execute,
}: {
  data: Snapshot
  busy: boolean
  execute: Execute
}) => {
  const [name, setName] = useState('')
  const [duration, setDuration] = useState('45')
  const [price, setPrice] = useState('')
  const [barberId, setBarberId] = useState(data.barbers.find((x) => x.active)?.id ?? '')
  const [serviceId, setServiceId] = useState('')
  const [overrideDuration, setOverrideDuration] = useState('45')
  const [overridePrice, setOverridePrice] = useState('')
  const [offeringValidFrom, setOfferingValidFrom] = useState(new Date().toISOString().slice(0, 10))
  const [offeringValidTo, setOfferingValidTo] = useState('')
  const [kind, setKind] = useState('SERVICE')
  const [rate, setRate] = useState('')
  const [ruleValidFrom, setRuleValidFrom] = useState(new Date().toISOString().slice(0, 10))
  const [ruleValidTo, setRuleValidTo] = useState('')
  const offerings = useQuery({
    queryKey: ['offerings', barberId],
    queryFn: () => configurationApi.listOfferings(barberId),
    enabled: Boolean(barberId),
  })
  const rules = useQuery({
    queryKey: ['commission-rules', barberId],
    queryFn: () => configurationApi.listCommissionRules(barberId),
    enabled: Boolean(barberId),
  })
  const selectedBarber = data.barbers.find((x) => x.id === barberId)
  const serviceName = (id: string) =>
    data.services.find((item) => item.id === id)?.name ?? 'Servicio'
  const createService = (event: FormEvent) => {
    event.preventDefault()
    const cents = bolivianosToCents(price)
    if (cents === null) return
    void execute(() =>
      configurationApi.createService({
        name,
        defaultDurationMinutes: Number(duration),
        defaultPriceCents: cents,
      }),
    ).then(() => {
      setName('')
      setPrice('')
    })
  }
  const createOffering = (event: FormEvent) => {
    event.preventDefault()
    const cents = bolivianosToCents(overridePrice)
    if (cents === null) return
    void execute(
      () =>
        configurationApi.createOffering(barberId, {
          serviceId,
          durationMinutes: Number(overrideDuration),
          priceCents: cents,
          validFrom: offeringValidFrom,
          ...(offeringValidTo ? { validTo: offeringValidTo } : {}),
        }),
      [['offerings', barberId]],
    ).then(() => setOverridePrice(''))
  }
  const createRule = (event: FormEvent) => {
    event.preventDefault()
    const basisPoints = Math.round(Number(rate.replace(',', '.')) * 100)
    void execute(
      () =>
        configurationApi.createCommissionRule(barberId, {
          kind,
          rateBasisPoints: basisPoints,
          validFrom: ruleValidFrom,
          ...(ruleValidTo ? { validTo: ruleValidTo } : {}),
        }),
      [['commission-rules', barberId]],
    ).then(() => setRate(''))
  }
  return (
    <>
      <section className="master-layout">
        <form className="master-form" onSubmit={createService}>
          <div>
            <p className="step-number">01</p>
            <h2>Nuevo servicio</h2>
            <p>La referencia se usa cuando no hay condición específica.</p>
          </div>
          <label>
            Nombre
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <div className="field-pair">
            <label>
              Duración
              <input
                type="number"
                min="5"
                max="480"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </label>
            <label>
              Precio Bs
              <input
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="60,00"
                required
              />
            </label>
          </div>
          <button className="primary-button" disabled={busy}>
            Crear servicio
          </button>
        </form>
        <div className="master-list">
          <div className="list-heading">
            <h2>Catálogo</h2>
            <span>{data.services.length} servicios</span>
          </div>
          {data.services.length === 0 ? (
            <EmptyState text="Crea el primer servicio para continuar." />
          ) : (
            data.services.map((service) => (
              <article className="master-row" key={service.id}>
                <div>
                  <strong>{service.name}</strong>
                  <small>
                    {service.defaultDurationMinutes} min ·{' '}
                    {centsToBolivianos(service.defaultPriceCents)} ·{' '}
                    {service.active ? 'Activo' : 'Inactivo'}
                  </small>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void execute(() => configurationApi.updateService(service, !service.active))
                  }
                >
                  {service.active ? 'Desactivar' : 'Activar'}
                </button>
              </article>
            ))
          )}
        </div>
      </section>
      <section className="version-panel">
        <div className="version-intro">
          <p className="eyebrow">Condiciones por fecha</p>
          <h2>Oferta y comisión vigentes</h2>
          <label>
            Barbero
            <select value={barberId} onChange={(e) => setBarberId(e.target.value)}>
              <option value="">Selecciona…</option>
              {data.barbers
                .filter((x) => x.active)
                .map((barber) => (
                  <option value={barber.id} key={barber.id}>
                    {data.staff.find((x) => x.id === barber.staffProfileId)?.displayName}
                  </option>
                ))}
            </select>
          </label>
          <p className="context-note">
            Para cambiar una condición, desactiva la anterior y crea otra vigencia. Así se puede
            reproducir cualquier fecha.
          </p>
        </div>
        <div className="version-columns">
          <form className="compact-form" onSubmit={createOffering}>
            <h3>Oferta específica</h3>
            <label>
              Servicio
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
                <option value="">Selecciona…</option>
                {data.services
                  .filter((x) => x.active)
                  .map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="field-pair">
              <label>
                Minutos
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={overrideDuration}
                  onChange={(e) => setOverrideDuration(e.target.value)}
                />
              </label>
              <label>
                Precio Bs
                <input
                  value={overridePrice}
                  onChange={(e) => setOverridePrice(e.target.value)}
                  inputMode="decimal"
                  required
                />
              </label>
            </div>
            <label>
              Desde
              <input
                type="date"
                value={offeringValidFrom}
                onChange={(e) => setOfferingValidFrom(e.target.value)}
                required
              />
            </label>
            <label>
              Hasta (opcional)
              <input
                type="date"
                min={offeringValidFrom}
                value={offeringValidTo}
                onChange={(e) => setOfferingValidTo(e.target.value)}
              />
            </label>
            <button className="secondary-button" disabled={busy || !barberId}>
              Agregar vigencia
            </button>
            {offerings.data?.map((item) => (
              <div className="period-row" key={item.id}>
                <span>
                  {serviceName(item.serviceId)}
                  <small>
                    {item.durationMinutes} min · {centsToBolivianos(item.priceCents)} · desde{' '}
                    {item.validFrom} {item.validTo ? `a ${item.validTo}` : 'en adelante'}
                  </small>
                </span>
                {item.active && (
                  <button
                    type="button"
                    onClick={() =>
                      void execute(
                        () => configurationApi.deactivateOffering(item),
                        [['offerings', barberId]],
                      )
                    }
                  >
                    Desactivar
                  </button>
                )}
              </div>
            ))}
          </form>
          <form className="compact-form" onSubmit={createRule}>
            <h3>Comisión</h3>
            {selectedBarber?.employmentType === 'OWNER' && (
              <p className="owner-rule">Este barbero es dueño: su producción no crea deuda.</p>
            )}
            <label>
              Tipo
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="SERVICE">Servicio</option>
                <option value="PRODUCT">Producto</option>
              </select>
            </label>
            <label>
              Porcentaje
              <input
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="50,00"
                required
              />
            </label>
            <label>
              Desde
              <input
                type="date"
                value={ruleValidFrom}
                onChange={(e) => setRuleValidFrom(e.target.value)}
                required
              />
            </label>
            <label>
              Hasta (opcional)
              <input
                type="date"
                min={ruleValidFrom}
                value={ruleValidTo}
                onChange={(e) => setRuleValidTo(e.target.value)}
              />
            </label>
            <button
              className="secondary-button"
              disabled={busy || !barberId || selectedBarber?.employmentType === 'OWNER'}
            >
              Agregar tasa
            </button>
            {rules.data?.map((rule) => (
              <div className="period-row" key={rule.id}>
                <span>
                  {rule.kind === 'SERVICE' ? 'Servicios' : 'Productos'}
                  <small>
                    {(rule.rateBasisPoints / 100).toFixed(2)} % · desde {rule.validFrom}{' '}
                    {rule.validTo ? `a ${rule.validTo}` : 'en adelante'}
                  </small>
                </span>
                {rule.active && (
                  <button
                    type="button"
                    onClick={() =>
                      void execute(
                        () => configurationApi.deactivateCommissionRule(rule),
                        [['commission-rules', barberId]],
                      )
                    }
                  >
                    Desactivar
                  </button>
                )}
              </div>
            ))}
          </form>
        </div>
      </section>
    </>
  )
}

const ProductsSection = ({
  data,
  busy,
  execute,
}: {
  data: Snapshot
  busy: boolean
  execute: Execute
}) => {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [minimumStock, setMinimumStock] = useState('0')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const cents = bolivianosToCents(price)
    if (cents === null) return
    void execute(() =>
      configurationApi.createProduct({
        name,
        ...(brand ? { brand } : {}),
        ...(sku ? { sku } : {}),
        salePriceCents: cents,
        minimumStock: Number(minimumStock),
      }),
    ).then(() => {
      setName('')
      setSku('')
      setPrice('')
    })
  }
  return (
    <section className="master-layout">
      <form className="master-form" onSubmit={submit}>
        <div>
          <p className="step-number">01</p>
          <h2>Nuevo producto</h2>
          <p>El stock real se derivará de movimientos; aquí sólo defines el mínimo.</p>
        </div>
        <label>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <div className="field-pair">
          <label>
            Marca
            <input value={brand} onChange={(e) => setBrand(e.target.value)} />
          </label>
          <label>
            SKU opcional
            <input value={sku} onChange={(e) => setSku(e.target.value)} />
          </label>
        </div>
        <div className="field-pair">
          <label>
            Precio Bs
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              required
            />
          </label>
          <label>
            Stock mínimo
            <input
              type="number"
              min="0"
              value={minimumStock}
              onChange={(e) => setMinimumStock(e.target.value)}
              required
            />
          </label>
        </div>
        <button className="primary-button" disabled={busy}>
          Crear producto
        </button>
      </form>
      <div className="master-list">
        <div className="list-heading">
          <h2>Productos</h2>
          <span>{data.products.length} productos</span>
        </div>
        {data.products.length === 0 ? (
          <EmptyState text="Aún no hay productos." />
        ) : (
          data.products.map((product) => (
            <article className="master-row" key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <small>
                  {product.brand || 'Sin marca'} · {centsToBolivianos(product.salePriceCents)} ·
                  mínimo {product.minimumStock}
                </small>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void execute(() => configurationApi.updateProduct(product, !product.active))
                }
              >
                {product.active ? 'Desactivar' : 'Activar'}
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

const ExpensesSection = ({
  data,
  busy,
  execute,
}: {
  data: Snapshot
  busy: boolean
  execute: Execute
}) => {
  const [name, setName] = useState('')
  const activeCount = useMemo(
    () => data.expenseCategories.filter((x) => x.active).length,
    [data.expenseCategories],
  )
  const submit = (event: FormEvent) => {
    event.preventDefault()
    void execute(() => configurationApi.createExpenseCategory(name)).then(() => setName(''))
  }
  return (
    <section className="master-layout">
      <form className="master-form" onSubmit={submit}>
        <div>
          <p className="step-number">01</p>
          <h2>Nueva categoría</h2>
          <p>Clasifica gastos sin crear un módulo contable complejo.</p>
        </div>
        <label>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <button className="primary-button" disabled={busy}>
          Crear categoría
        </button>
      </form>
      <div className="master-list">
        <div className="list-heading">
          <h2>Categorías</h2>
          <span>{activeCount} activas</span>
        </div>
        {data.expenseCategories.map((category) => (
          <article className="master-row" key={category.id}>
            <div>
              <strong>{category.name}</strong>
              <small>{category.active ? 'Activa' : 'Inactiva'}</small>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void execute(() =>
                  configurationApi.updateExpenseCategory(category, !category.active),
                )
              }
            >
              {category.active ? 'Desactivar' : 'Activar'}
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

const EmptyState = ({ text }: { text: string }) => (
  <div className="empty-state">
    <span aria-hidden="true">＋</span>
    <p>{text}</p>
  </div>
)
