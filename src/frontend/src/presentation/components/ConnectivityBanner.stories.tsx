import type { Meta, StoryObj } from '@storybook/react-vite'
import { ConnectivityBanner } from './ConnectivityBanner'

const meta = {
  title: 'Foundation/ConnectivityBanner',
  component: ConnectivityBanner,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ConnectivityBanner>

export default meta
type Story = StoryObj<typeof meta>

export const Offline: Story = { args: { connectivity: 'offline' } }
export const Online: Story = { args: { connectivity: 'online' } }
