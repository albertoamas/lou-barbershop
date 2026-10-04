import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../components/Button'
import { Stripes } from '../components/Stripes'
import {
  errorClassName,
  fieldClassName,
  labelClassName,
  noticeClassName,
  panelClassName,
  successClassName,
  warningClassName,
} from './formStyles'

const meta = {
  title: 'Foundation/Tokens',
  decorators: [
    (Story) => (
      <div className="bg-canvas p-6 text-ink">
        <Story />
      </div>
    ),
  ],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const swatches = [
  ['Tinta', 'bg-ink'],
  ['Papel', 'bg-surface'],
  ['Acero 50', 'bg-canvas'],
  ['Acero 100', 'bg-surface-muted'],
  ['Acero 200', 'bg-surface-strong'],
  ['Acero 400', 'bg-line-control'],
  ['Acero 600', 'bg-ink-muted'],
  ['Acero 800', 'bg-ink-soft'],
  ['Éxito', 'bg-success'],
  ['Información', 'bg-info'],
  ['Advertencia', 'bg-warning'],
  ['Peligro', 'bg-danger'],
] as const

export const Colors: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {swatches.map(([name, className]) => (
        <div key={name} className="overflow-hidden rounded-panel bg-surface shadow-raised">
          <div className={`h-16 ${className}`} />
          <p className="p-3 text-sm font-semibold">{name}</p>
        </div>
      ))}
    </div>
  ),
}

export const Typography: Story = {
  render: () => (
    <div className="grid max-w-2xl gap-4">
      <p className="font-display text-6xl leading-none font-extrabold">Agenda</p>
      <p className="font-display text-4xl leading-none font-extrabold">
        Entra, siéntate y sal como nuevo.
      </p>
      <p className="font-display text-5xl font-extrabold tabular-nums">Bs 115,00</p>
      <p className="text-lg font-semibold">Sábado 3 de octubre. 7 citas hoy y Andrés ya llegó.</p>
      <p className="leading-7 text-ink-soft">
        Abrimos todos los días de 08:00 a 13:00 y de 15:00 a 21:00. Elige servicio, barbero y
        horario.
      </p>
      <p className="text-sm text-ink-muted">Texto auxiliar de 14 px, el mínimo permitido.</p>
    </div>
  ),
}

export const FormAndSurfaces: Story = {
  render: () => (
    <div className={`grid max-w-md gap-4 ${panelClassName}`}>
      <label className={labelClassName}>
        Nombre del cliente
        <input className={fieldClassName} placeholder="Nombre o teléfono" />
      </label>
      <label className={labelClassName}>
        Barbero
        <select className={fieldClassName} defaultValue="diego">
          <option value="diego">Diego</option>
          <option value="mateo">Mateo</option>
        </select>
      </label>
      <label className={labelClassName}>
        Monto recibido
        <input className={fieldClassName} inputMode="decimal" defaultValue="Bs 120,00" />
      </label>
      <label className={labelClassName}>
        Campo bloqueado
        <input className={fieldClassName} disabled defaultValue="Sin conexión" />
      </label>
      <p className={noticeClassName}>Andrés llegó y está esperando a Mateo.</p>
      <p className={successClassName}>Cobro registrado.</p>
      <p className={warningClassName}>Quedan 2 unidades de cera mate.</p>
      <p className={errorClassName}>No se pudo guardar. Revisa la conexión e intenta de nuevo.</p>
      <Button width="full">Guardar</Button>
    </div>
  ),
}

export const BrandStripes: Story = {
  render: () => (
    <div className="flex gap-4">
      <Stripes className="h-24 w-24 rounded-panel" />
      <Stripes tone="soft" className="h-24 w-24 rounded-panel" />
    </div>
  ),
}
