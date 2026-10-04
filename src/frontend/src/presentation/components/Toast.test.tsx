import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MotionProvider } from './MotionProvider'
import { Toast } from './Toast'

beforeEach(() => vi.useFakeTimers())

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Toast', () => {
  it('announces the message politely and closes it by itself', () => {
    const onDone = vi.fn()
    render(
      <MotionProvider>
        <Toast message="Cambio guardado" onDone={onDone} durationMs={4000} />
      </MotionProvider>,
    )

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent('Cambio guardado')

    act(() => vi.advanceTimersByTime(3999))
    expect(onDone).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('keeps the live region mounted and silent without a message', () => {
    const onDone = vi.fn()
    render(
      <MotionProvider>
        <Toast message="" onDone={onDone} />
      </MotionProvider>,
    )

    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    act(() => vi.advanceTimersByTime(10_000))
    expect(onDone).not.toHaveBeenCalled()
  })
})
