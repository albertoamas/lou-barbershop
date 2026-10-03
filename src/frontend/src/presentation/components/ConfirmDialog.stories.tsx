import type { Meta, StoryObj } from '@storybook/react-vite'
import { ConfirmDialog } from './ConfirmDialog'

const meta = {
  title: 'Foundation/ConfirmDialog',
  component: ConfirmDialog,
  args: {
    title: '¿Cancelar la cita de Pablo?',
    confirmLabel: 'Sí, cancelar',
    cancelLabel: 'Conservar cita',
    children:
      'La cita del sábado 3 de octubre a las 16:30 con Mateo quedará libre para otro cliente.',
    onCancel: () => undefined,
    onConfirm: () => undefined,
  },
} satisfies Meta<typeof ConfirmDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Busy: Story = { args: { busy: true } }
