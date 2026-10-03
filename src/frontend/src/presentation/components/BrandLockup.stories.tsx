import type { Meta, StoryObj } from '@storybook/react-vite'
import { BrandLockup } from './BrandLockup'

const meta = {
  title: 'Foundation/BrandLockup',
  component: BrandLockup,
  args: { linked: false },
  decorators: [
    (Story) => (
      <div
        style={{ background: 'var(--color-ink)', color: 'var(--color-on-ink)', padding: '24px' }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BrandLockup>

export default meta
type Story = StoryObj<typeof meta>

export const Complete: Story = {}
export const Compact: Story = { args: { compact: true } }
