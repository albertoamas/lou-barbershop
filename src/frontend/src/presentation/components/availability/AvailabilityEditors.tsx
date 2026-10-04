import { useState, type FormEvent, type ReactNode } from 'react'
import {
  fitsOpeningWindow,
  shiftPresets,
  timedRange,
  wholeDayRange,
} from '../../../core/scheduling/Availability'
import {
  weekdayLabels,
  type ExceptionKind,
  type ScheduleUpdate,
  type WorkingSchedule,
} from '../../../core/scheduling/Scheduling'
import { cn } from '../../styles/cn'
import { errorClassName, fieldClassName, labelClassName } from '../../styles/formStyles'
import { AppIcon } from '../AppIcon'
import { Button } from '../Button'

const choiceClassName = (active: boolean) =>
  cn(
    'min-h-12 rounded-control border-2 px-3 font-semibold transition-colors duration-150',
    active ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface hover:border-line-control',
  )

const EditorHeader = ({ title, onClose }: { title: string; onClose: () => void }) => (
  <div className="flex items-start justify-between gap-3">
    <h2 className="font-display text-3xl font-extrabold">{title}</h2>
    <Button
      type="button"
      variant="ghost"
      className="w-12 px-0"
      aria-label="Cerrar"
      onClick={onClose}
    >
      <AppIcon name="close" size={22} />
    </Button>
  </div>
)

const Group = ({ label, children }: { label: string; children: ReactNode }) => (
  <fieldset className="grid gap-2">
    <legend className="mb-2 text-sm font-semibold text-ink-soft">{label}</legend>
    {children}
  </fieldset>
)

type ShiftChoice = (typeof shiftPresets)[number]['id'] | 'CUSTOM'

const presetFor = (start: string, end: string): ShiftChoice =>
  shiftPresets.find((item) => item.start === start && item.end === end)?.id ?? 'CUSTOM'

export const ShiftEditor = ({
  value,
  weekday: initialWeekday,
  today,
  busy,
  online,
  onClose,
  onSave,
}: {
  value: WorkingSchedule | undefined
  weekday: number
  today: string
  busy: boolean
  online: boolean
  onClose: () => void
  onSave: (input: ScheduleUpdate) => void
}) => {
  const [weekday, setWeekday] = useState(value?.weekday ?? initialWeekday)
  const [start, setStart] = useState(value?.startLocalTime.slice(0, 5) ?? '08:00')
  const [end, setEnd] = useState(value?.endLocalTime.slice(0, 5) ?? '13:00')
  const [choice, setChoice] = useState<ShiftChoice>(presetFor(start, end))
  const [validFrom, setValidFrom] = useState(value?.validFrom ?? today)
  const [validTo, setValidTo] = useState(value?.validTo ?? '')
  const [active, setActive] = useState(value?.active ?? true)
  const validHours = fitsOpeningWindow(start, end)
  const validDates = !validTo || validTo >= validFrom

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (validHours && validDates)
      onSave({
        weekday,
        startLocalTime: start,
        endLocalTime: end,
        validFrom,
        ...(validTo ? { validTo } : {}),
        active,
      })
  }

  return (
    <form onSubmit={submit} className="grid gap-6">
      <EditorHeader title={value ? 'Editar turno' : 'Agregar turno'} onClose={onClose} />
      <Group label="Día">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7" role="radiogroup" aria-label="Día">
          {weekdayLabels.map((label, index) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={weekday === index + 1}
              aria-label={label}
              className={choiceClassName(weekday === index + 1)}
              onClick={() => setWeekday(index + 1)}
            >
              {label.slice(0, 3)}
            </button>
          ))}
        </div>
      </Group>
      <Group label="Horario">
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Horario">
          {shiftPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={choice === preset.id}
              className={cn(choiceClassName(choice === preset.id), 'flex flex-col py-2')}
              onClick={() => {
                setChoice(preset.id)
                setStart(preset.start)
                setEnd(preset.end)
              }}
            >
              {preset.label}
              <span className="text-sm font-normal tabular-nums opacity-80">
                {preset.start} a {preset.end}
              </span>
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={choice === 'CUSTOM'}
            className={choiceClassName(choice === 'CUSTOM')}
            onClick={() => setChoice('CUSTOM')}
          >
            Personalizado
          </button>
        </div>
        {choice === 'CUSTOM' && (
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label className={labelClassName}>
              Desde las
              <input
                className={fieldClassName}
                type="time"
                name="shift-start"
                step="1800"
                value={start}
                onChange={(event) => setStart(event.target.value)}
                required
              />
            </label>
            <label className={labelClassName}>
              Hasta las
              <input
                className={fieldClassName}
                type="time"
                name="shift-end"
                step="1800"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
                required
              />
            </label>
          </div>
        )}
        {!validHours && (
          <p className={errorClassName} role="alert">
            El turno debe quedar dentro de 08:00 a 13:00 o de 15:00 a 21:00.
          </p>
        )}
      </Group>
      <details className="rounded-control bg-surface-muted" open={Boolean(value?.validTo)}>
        <summary className="flex min-h-12 cursor-pointer items-center px-4 font-semibold">
          Más opciones
        </summary>
        <div className="grid gap-4 px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClassName}>
              Vigente desde
              <input
                className={fieldClassName}
                type="date"
                name="valid-from"
                value={validFrom}
                onChange={(event) => setValidFrom(event.target.value)}
                required
              />
            </label>
            <label className={labelClassName}>
              Hasta, opcional
              <input
                className={fieldClassName}
                type="date"
                name="valid-to"
                min={validFrom}
                value={validTo}
                onChange={(event) => setValidTo(event.target.value)}
              />
            </label>
          </div>
          {!validDates && (
            <p className={errorClassName} role="alert">
              La fecha final no puede ser anterior al inicio.
            </p>
          )}
          {value && (
            <label className="flex min-h-12 items-center gap-3 font-semibold">
              <input
                type="checkbox"
                name="active"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
                className="size-6 accent-ink"
              />
              Turno activo
            </label>
          )}
        </div>
      </details>
      <Button
        type="submit"
        size="lg"
        width="full"
        disabled={!online || busy || !validHours || !validDates}
      >
        {busy ? 'Guardando' : value ? 'Guardar cambios' : 'Agregar turno'}
      </Button>
    </form>
  )
}

const reasons = ['Vacaciones', 'Enfermedad', 'Trámite', 'Capacitación']

export interface ExceptionInput {
  startsAt: string
  endsAt: string
  kind: ExceptionKind
  reason: string
}

export const ExceptionEditor = ({
  kind: initialKind,
  today,
  busy,
  online,
  onClose,
  onSave,
}: {
  kind: ExceptionKind
  today: string
  busy: boolean
  online: boolean
  onClose: () => void
  onSave: (input: ExceptionInput) => void
}) => {
  const [kind, setKind] = useState<ExceptionKind>(initialKind)
  const [wholeDay, setWholeDay] = useState(initialKind === 'UNAVAILABLE')
  const [firstDate, setFirstDate] = useState(today)
  const [lastDate, setLastDate] = useState(today)
  const [start, setStart] = useState('15:00')
  const [end, setEnd] = useState('18:00')
  const [reason, setReason] = useState('')
  const absence = kind === 'UNAVAILABLE'
  const allDay = absence && wholeDay
  const validDates = !allDay || lastDate >= firstDate
  const validHours = allDay || (start < end && (absence || fitsOpeningWindow(start, end)))
  const ready = validDates && validHours && reason.trim().length > 0

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!ready) return
    onSave({
      ...(allDay ? wholeDayRange(firstDate, lastDate) : timedRange(firstDate, start, end)),
      kind,
      reason: reason.trim(),
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-6">
      <EditorHeader title={absence ? 'Registrar ausencia' : 'Horario especial'} onClose={onClose} />
      <Group label="Tipo">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo">
          {(
            [
              ['UNAVAILABLE', 'Ausencia', 'No atiende'],
              ['AVAILABLE_OVERRIDE', 'Horario especial', 'Atiende fuera de su turno'],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={kind === value}
              className={cn(choiceClassName(kind === value), 'flex flex-col py-2')}
              onClick={() => {
                setKind(value)
                setWholeDay(value === 'UNAVAILABLE')
              }}
            >
              {label}
              <span className="text-sm font-normal opacity-80">{hint}</span>
            </button>
          ))}
        </div>
      </Group>

      {absence && (
        <label className="flex min-h-12 items-center gap-3 rounded-control bg-surface-muted px-4 font-semibold">
          <input
            type="checkbox"
            name="whole-day"
            checked={wholeDay}
            onChange={(event) => setWholeDay(event.target.checked)}
            className="size-6 accent-ink"
          />
          Todo el día
        </label>
      )}

      {allDay ? (
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClassName}>
            Desde el día
            <input
              className={fieldClassName}
              type="date"
              name="first-date"
              min={today}
              value={firstDate}
              onChange={(event) => {
                setFirstDate(event.target.value)
                if (lastDate < event.target.value) setLastDate(event.target.value)
              }}
              required
            />
          </label>
          <label className={labelClassName}>
            Hasta el día
            <input
              className={fieldClassName}
              type="date"
              name="last-date"
              min={firstDate}
              value={lastDate}
              onChange={(event) => setLastDate(event.target.value)}
              required
            />
          </label>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={labelClassName}>
            Día
            <input
              className={fieldClassName}
              type="date"
              name="date"
              min={today}
              value={firstDate}
              onChange={(event) => setFirstDate(event.target.value)}
              required
            />
          </label>
          <label className={labelClassName}>
            Desde las
            <input
              className={fieldClassName}
              type="time"
              name="start"
              step="1800"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              required
            />
          </label>
          <label className={labelClassName}>
            Hasta las
            <input
              className={fieldClassName}
              type="time"
              name="end"
              step="1800"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              required
            />
          </label>
        </div>
      )}
      {!validHours && (
        <p className={errorClassName} role="alert">
          {absence
            ? 'La hora final debe ser posterior a la inicial.'
            : 'El horario especial debe quedar dentro de 08:00 a 13:00 o de 15:00 a 21:00.'}
        </p>
      )}

      <Group label="Motivo">
        <div className="flex flex-wrap gap-2">
          {reasons.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={reason === item}
              className={cn(choiceClassName(reason === item), 'rounded-full px-4')}
              onClick={() => setReason(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <label className={labelClassName}>
          <span className="sr-only">Motivo</span>
          <input
            className={fieldClassName}
            name="reason"
            maxLength={300}
            placeholder="O escribe otro motivo"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      </Group>

      <p className="text-ink-soft">
        Si hay citas en ese horario, te avisamos para revisarlas. Nunca se cancelan solas.
      </p>
      <Button type="submit" size="lg" width="full" disabled={!online || busy || !ready}>
        {busy ? 'Guardando' : absence ? 'Guardar ausencia' : 'Guardar horario especial'}
      </Button>
    </form>
  )
}
