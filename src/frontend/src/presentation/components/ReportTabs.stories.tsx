import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReportTabs } from './ReportTabs'

const meta = {
  title: 'Navigation/ReportTabs',
  component: ReportTabs,
  args: { active: 'operation', onChange: () => undefined },
  decorators: [
    (Story) => (
      <div style={{ background: 'var(--color-canvas)', padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ReportTabs>

export default meta
type Story = StoryObj<typeof meta>

export const Operation: Story = {}
export const Commissions: Story = { args: { active: 'commissions' } }
