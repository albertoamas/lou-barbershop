import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../infrastructure/http/apiClient'
import { ErrorBoundary } from './ErrorBoundary'

const FailingView = () => {
  throw new ApiError({ status: 500, title: 'Error', requestId: 'request-123' })
}
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('offers recovery and the safe request identifier after a render failure', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <FailingView />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('heading', { name: 'Algo salió mal' })).toBeInTheDocument()
    expect(screen.getByText(/no se guardó nada/)).toBeInTheDocument()
    expect(screen.getByText('request-123')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument()
  })
})
