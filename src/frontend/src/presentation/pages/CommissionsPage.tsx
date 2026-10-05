import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  barberDebts,
  debtSummary,
  personalBalance,
  type Settlement,
} from '../../core/commissions/Commissions'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import type { PaymentMethod } from '../../core/sales/Sales'
import { todayInBusinessTime } from '../../core/scheduling/Scheduling'
import { authApi } from '../../infrastructure/http/authApi'
import { commissionApi } from '../../infrastructure/http/commissionApi'
import { configurationApi } from '../../infrastructure/http/configurationApi'
import { AgendaDialog } from '../components/AgendaDialog'
import { AppIcon } from '../components/AppIcon'
import { Button } from '../components/Button'
import { Toast } from '../components/Toast'
import { DebtList } from '../components/commissions/DebtList'
import { MovementList } from '../components/commissions/MovementList'
import { PrepareSheet } from '../components/commissions/PrepareSheet'
import { SettlementList } from '../components/commissions/SettlementList'
import { SettlementSheet } from '../components/commissions/SettlementSheet'
import { plural } from '../components/commissions/commissionText'
import { useConnectivity } from '../hooks/useConnectivity'
import { cn } from '../styles/cn'
import { errorClassName, warningClassName } from '../styles/formStyles'

type Tab = 'debts' | 'movements' | 'history'
type Panel = { type: 'settlement'; settlement: Settlement } | { type: 'prepare'; barberId: string }

const Loading = ({ label }: { label: string }) => (
  <div
    className="h-48 animate-pulse rounded-control bg-surface-muted"
    role="status"
    aria-label={label}
  />
)

const Failed = ({ text, onRetry }: { text: string; onRetry: () => void }) => (
  <div
    className={cn(errorClassName, 'flex flex-wrap items-center justify-between gap-3')}
    role="alert"
  >
    {text}
    <Button variant="secondary" size="sm" onClick={onRetry}>
      Reintentar
    </Button>
  </div>
)

const byNewest = (a: Settlement, b: Settlement) => b.periodEnd.localeCompare(a.periodEnd)

export const CommissionsPage = () => {
  const today = todayInBusinessTime()
  const online = useConnectivity() === 'online'
  const session = useQuery({ queryKey: ['auth', 'session'], queryFn: authApi.current })
  const isOwner = session.data?.roles.includes('OWNER') ?? false
  const configuration = useQuery({
    queryKey: ['configuration'],
    queryFn: configurationApi.load,
    enabled: isOwner,
  })
  // The API scopes both lists to the barber's own data when the caller is not the owner.
  const commissions = useQuery({
    queryKey: ['commissions'],
    queryFn: () => commissionApi.commissions(),
  })
  const settlements = useQuery({
    queryKey: ['settlements'],
    queryFn: () => commissionApi.settlements(),
  })
  const [tab, setTab] = useState<Tab>()
  const [panel, setPanel] = useState<Panel>()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const clearNotice = useCallback(() => setNotice(''), [])
  const [busy, setBusy] = useState(false)

  const barbers = useMemo(
    () =>
      configuration.data?.barbers
        .filter((item) => item.active && item.employmentType === 'CONTRACTOR')
        .map((barber) => ({
          id: barber.id,
          name:
            configuration.data.staff.find((item) => item.id === barber.staffProfileId)
              ?.displayName ?? 'Barbero',
        })) ?? [],
    [configuration.data],
  )
  const entries = commissions.data ?? []
  const allSettlements = [...(settlements.data ?? [])].sort(byNewest)
  const debts = barberDebts(barbers, entries, allSettlements)
  const summary = debtSummary(debts)
  const personal = personalBalance(entries, allSettlements)
  const currentTab: Tab = tab ?? (isOwner ? 'debts' : 'movements')

  const open = (next: Panel) => {
    setError('')
    setPanel(next)
  }
  const close = () => !busy && setPanel(undefined)
  const run = async (action: () => Promise<Settlement>, message: string) => {
    setBusy(true)
    setError('')
    try {
      const settlement = await action()
      await Promise.all([commissions.refetch(), settlements.refetch()])
      setPanel({ type: 'settlement', settlement })
      setNotice(message)
      return true
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : 'No se pudo guardar.')
      return false
    } finally {
      setBusy(false)
    }
  }

  if (session.isPending)
    return (
      <main
        className="mx-auto w-full max-w-360 px-4 py-6"
        role="status"
        aria-label="Cargando comisiones"
      >
        <div className="h-96 animate-pulse rounded-panel bg-surface-strong" />
      </main>
    )

  const tabs: { id: Tab; label: string; badge?: number }[] = isOwner
    ? [
        {
          id: 'debts',
          label: 'Por pagar',
          ...(summary.readyToPay > 0 ? { badge: summary.readyToPay } : {}),
        },
        { id: 'movements', label: 'Movimientos' },
        { id: 'history', label: 'Historial' },
      ]
    : [
        { id: 'movements', label: 'Movimientos' },
        { id: 'history', label: 'Mis liquidaciones' },
      ]
  const loading = commissions.isPending || settlements.isPending
  const failed = commissions.isError || settlements.isError
  const retry = () => void Promise.all([commissions.refetch(), settlements.refetch()])
  const ownerSentence =
    summary.totalCents > 0
      ? `Debes ${centsToBolivianos(summary.totalCents)} a ${plural(summary.barbers, 'barbero', 'barberos')}.${
          summary.readyToPay > 0
            ? ` ${plural(summary.readyToPay, 'liquidación está lista', 'liquidaciones están listas')} para pagar.`
            : ''
        }`
      : 'No hay comisiones pendientes de pago.'

  return (
    <main className="mx-auto w-full max-w-360 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-5xl leading-none font-extrabold text-balance sm:text-6xl">
            {isOwner ? 'Comisiones' : 'Mis comisiones'}
          </h1>
          {isOwner && !loading && !failed && (
            <p className="mt-2 text-lg text-pretty text-ink-soft">{ownerSentence}</p>
          )}
        </div>
        {isOwner && (
          <Button
            className="max-sm:w-full"
            disabled={!online || barbers.length === 0}
            onClick={() => open({ type: 'prepare', barberId: '' })}
          >
            <AppIcon name="plus" size={20} />
            Preparar liquidación
          </Button>
        )}
      </header>

      {!online && (
        <p className={cn(warningClassName, 'mt-4')} role="status">
          Sin conexión. Puedes consultar, pero no preparar, cerrar ni pagar liquidaciones.
        </p>
      )}

      {!isOwner && !loading && !failed && (
        <section
          className="mt-5 grid gap-4 rounded-panel bg-ink p-5 text-on-ink sm:p-6"
          aria-labelledby="personal-balance"
        >
          <div>
            <h2 id="personal-balance" className="text-lg font-semibold text-on-ink-muted">
              Te deben
            </h2>
            <p className="font-display text-5xl leading-none font-extrabold tabular-nums sm:text-6xl">
              {centsToBolivianos(personal.owedCents)}
            </p>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-control bg-ink-soft p-4">
              <dt className="text-on-ink-muted">En tu próxima liquidación</dt>
              <dd className="text-2xl font-bold tabular-nums">
                {centsToBolivianos(personal.inSettlementCents)}
              </dd>
            </div>
            <div className="rounded-control bg-ink-soft p-4">
              <dt className="text-on-ink-muted">Aún por liquidar</dt>
              <dd className="text-2xl font-bold tabular-nums">
                {centsToBolivianos(personal.looseCents)}
              </dd>
            </div>
          </dl>
          {personal.ready && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-surface p-4 text-ink">
              <p className="font-semibold text-pretty">
                Tu pago de {centsToBolivianos(personal.ready.payableTotalCents)} está listo.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  personal.ready && open({ type: 'settlement', settlement: personal.ready })
                }
              >
                Ver detalle
              </Button>
            </div>
          )}
        </section>
      )}

      <div
        className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        role="tablist"
        aria-label="Secciones"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`commissions-tab-${item.id}`}
            aria-controls={`commissions-panel-${item.id}`}
            aria-selected={currentTab === item.id}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 px-4 font-semibold transition-colors duration-150',
              currentTab === item.id
                ? 'border-ink bg-ink text-on-ink'
                : 'border-transparent bg-surface shadow-raised hover:border-line-control',
            )}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.badge !== undefined && (
              <span className="rounded-full bg-info-soft px-2 text-sm text-info-ink tabular-nums">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <section
        id={`commissions-panel-${currentTab}`}
        role="tabpanel"
        aria-labelledby={`commissions-tab-${currentTab}`}
        className="mt-4 rounded-panel bg-surface p-5 shadow-raised sm:p-6"
      >
        {loading ? (
          <Loading label="Cargando comisiones" />
        ) : failed ? (
          <Failed text="No pudimos cargar las comisiones." onRetry={retry} />
        ) : (
          <>
            {currentTab === 'debts' && (
              <DebtList
                debts={debts}
                disabled={!online}
                onPrepare={(barberId) => open({ type: 'prepare', barberId })}
                onOpen={(settlement) => open({ type: 'settlement', settlement })}
              />
            )}
            {currentTab === 'movements' && (
              <MovementList entries={entries} today={today} {...(isOwner ? { barbers } : {})} />
            )}
            {currentTab === 'history' && (
              <SettlementList
                settlements={
                  isOwner ? allSettlements.filter((item) => item.status === 'PAID') : allSettlements
                }
                showBarber={isOwner}
                empty={
                  isOwner
                    ? 'Todavía no hay liquidaciones pagadas.'
                    : 'Todavía no tienes liquidaciones.'
                }
                onOpen={(settlement) => open({ type: 'settlement', settlement })}
              />
            )}
          </>
        )}
      </section>

      {panel?.type === 'settlement' && (
        <AgendaDialog label="Detalle de liquidación" onClose={close}>
          <SettlementSheet
            key={`${panel.settlement.id}-${panel.settlement.version}`}
            settlement={panel.settlement}
            isOwner={isOwner}
            online={online}
            busy={busy}
            error={error}
            onClose={close}
            onAdjust={(amountCents, reason) =>
              run(
                () => commissionApi.adjust(panel.settlement, amountCents, reason),
                'Ajuste agregado',
              )
            }
            onCloseSettlement={() =>
              void run(() => commissionApi.close(panel.settlement), 'Liquidación cerrada')
            }
            onPay={(method: PaymentMethod) =>
              void run(() => commissionApi.pay(panel.settlement, today, method), 'Pago registrado')
            }
          />
        </AgendaDialog>
      )}
      {panel?.type === 'prepare' && isOwner && (
        <AgendaDialog label="Preparar liquidación" onClose={close}>
          <PrepareSheet
            barbers={barbers}
            initialBarberId={panel.barberId}
            entries={entries}
            today={today}
            online={online}
            busy={busy}
            error={error}
            onClose={close}
            onCreate={(barberId, cutoff) =>
              void run(() => commissionApi.create(barberId, cutoff), 'Borrador creado')
            }
          />
        </AgendaDialog>
      )}
      <Toast message={notice} onDone={clearNotice} />
    </main>
  )
}
