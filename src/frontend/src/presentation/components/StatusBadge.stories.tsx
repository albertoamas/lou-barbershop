import type { Meta, StoryObj } from '@storybook/react-vite'
import { AppIcon } from './AppIcon'
import { StatusBadge } from './StatusBadge'

const meta = {
  title: 'Foundation/StatusBadge',
  component: StatusBadge,
  args: { children: 'Confirmada' },
  decorators: [
    (Story) => (
      <div className="bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StatusBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Neutral: Story = {}

export const AppointmentStates: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge tone="neutral">Confirmada</StatusBadge>
      <StatusBadge tone="info">Llegó 15:24</StatusBadge>
      <StatusBadge tone="inService">En atención</StatusBadge>
      <StatusBadge tone="success" icon={<AppIcon name="check" size={16} />}>
        Completada
      </StatusBadge>
      <StatusBadge tone="danger">No asistió</StatusBadge>
    </div>
  ),
}

export const BusinessStates: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge tone="success">Cobrado hoy Bs 150,00</StatusBadge>
      <StatusBadge tone="warning">Stock bajo</StatusBadge>
      <StatusBadge tone="warning">Comisión pendiente</StatusBadge>
      <StatusBadge tone="muted">Borrador</StatusBadge>
    </div>
  ),
}
