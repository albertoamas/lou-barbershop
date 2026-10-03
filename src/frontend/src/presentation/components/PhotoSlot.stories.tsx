import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar } from './Avatar'
import { PhotoSlot } from './PhotoSlot'

const meta = {
  title: 'Foundation/PhotoSlot',
  component: PhotoSlot,
  args: { alt: 'Foto del local', ratio: '16 / 9' },
  decorators: [
    (Story) => (
      <div className="max-w-md bg-canvas p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PhotoSlot>

export default meta
type Story = StoryObj<typeof meta>

export const EmptyShop: Story = {}
export const EmptyBarber: Story = { args: { alt: 'Foto de Diego', ratio: '1 / 1' } }

export const Avatars: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Avatar name="Diego" tone="ink" />
      <Avatar name="Mateo" />
      <Avatar name="Pablo Suárez" tone="accent" size="lg" />
      <Avatar name="Jorge Mendoza" size="sm" />
    </div>
  ),
}
