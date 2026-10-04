import { AppIcon } from '../AppIcon'

const compactDate = (date: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T12:00:00Z`))

interface DateFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}

// A compact date button that still opens the device's native date picker: the real
// input covers the button invisibly, so it keeps native keyboard, touch and screen
// reader behavior while showing a short, readable date ("sáb, 3 oct").
export const DateField = ({ id, label, value, onChange }: DateFieldProps) => (
  <div className="relative min-w-0 flex-1 rounded-control has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-focus sm:flex-none">
    <span
      aria-hidden="true"
      className="flex min-h-11 items-center justify-between gap-2 rounded-control border border-line-control bg-surface px-3 font-semibold sm:px-4 first-letter:uppercase"
    >
      <span className="truncate">{compactDate(value)}</span>
      {/* Decorative; dropped on the narrowest phones so the date itself stays whole. */}
      <span className="contents max-[359px]:hidden">
        <AppIcon name="calendar" size={18} />
      </span>
    </span>
    <label className="sr-only" htmlFor={id}>
      {label}
    </label>
    <input
      id={id}
      name={id}
      className="absolute inset-0 size-full cursor-pointer opacity-0"
      type="date"
      required
      value={value}
      onChange={(event) => event.target.value && onChange(event.target.value)}
    />
  </div>
)
