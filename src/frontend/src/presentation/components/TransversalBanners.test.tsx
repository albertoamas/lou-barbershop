import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { serviceWorkerUpdateSource } from '../../infrastructure/pwa/serviceWorkerUpdateSource'
import { ConnectivityBanner } from './ConnectivityBanner'
import { ServiceWorkerUpdateBanner } from './ServiceWorkerUpdateBanner'

vi.mock('../../infrastructure/pwa/serviceWorkerUpdateSource', () => ({
  serviceWorkerUpdateSource: {
    subscribe: vi.fn(() => () => {}),
    getSnapshot: vi.fn(() => true),
    apply: vi.fn(),
  },
}))

beforeEach(() => {
  vi.mocked(serviceWorkerUpdateSource.apply).mockResolvedValue(undefined)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('transversal banners', () => {
  it('identifies potentially stale content and blocks the idea of offline writes', () => {
    const { rerender } = render(<ConnectivityBanner connectivity="offline" />)
    expect(screen.getByRole('status')).toHaveTextContent('puede estar desactualizado')
    expect(screen.getByRole('status')).toHaveTextContent('no puedes reservar ni guardar cambios')
    rerender(<ConnectivityBanner connectivity="online" />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('lets a user defer an update without activating the service worker', async () => {
    render(<ServiceWorkerUpdateBanner />)
    await userEvent.click(screen.getByRole('button', { name: 'Más tarde' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(serviceWorkerUpdateSource.apply).not.toHaveBeenCalled()
  })

  it('shows a retryable message when applying an update fails', async () => {
    vi.mocked(serviceWorkerUpdateSource.apply).mockRejectedValueOnce(new Error('offline'))
    render(<ServiceWorkerUpdateBanner />)
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar ahora' }))
    expect(
      await screen.findByText('No se pudo actualizar. Intenta de nuevo cuando tengas conexión.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Actualizar ahora' })).toBeEnabled()
  })
})
