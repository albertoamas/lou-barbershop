import type { Meta, StoryObj } from '@storybook/react-vite'
import { AppIcon } from './AppIcon'
import { Button } from './Button'

const meta = {
  title: 'Foundation/Button',
  component: Button,
  args: { children: 'Reservar cita' },
  decorators: [
    (Story) => (
      <div className="bg-canvas p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}
export const Money: Story = { args: { variant: 'money', children: 'Cobrar Bs 115,00' } }
export const Inverse: Story = {
  args: { variant: 'inverse', children: 'Reservar cita' },
  decorators: [
    (Story) => (
      <div className="bg-ink p-6">
        <Story />
      </div>
    ),
  ],
}
export const Secondary: Story = { args: { variant: 'secondary', children: 'Reprogramar' } }
export const Ghost: Story = { args: { variant: 'ghost', children: 'Más tarde' } }
export const Danger: Story = { args: { variant: 'danger', children: 'Cancelar cita' } }
export const DangerSoft: Story = { args: { variant: 'dangerSoft', children: 'Cancelar cita' } }
export const Disabled: Story = { args: { disabled: true } }

export const AllVariants: Story = {
  render: () => (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button>
          <AppIcon name="calendar" />
          Nueva cita
        </Button>
        <Button variant="money">Cobrar Bs 115,00</Button>
        <Button variant="secondary">Ver reportes</Button>
        <Button variant="secondary">Reprogramar</Button>
        <Button variant="ghost">Más tarde</Button>
        <Button variant="dangerSoft">Cancelar cita</Button>
        <Button variant="danger">Sí, cancelar</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm">Pequeño</Button>
        <Button size="md">Mediano</Button>
        <Button size="lg">Grande</Button>
      </div>
      <Button variant="money" size="lg" width="full">
        Cobrar Bs 115,00
      </Button>
    </div>
  ),
}
