import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DateField } from './DateField'

afterEach(cleanup)

describe('DateField', () => {
  it('shows a short date while keeping a labelled native date input', () => {
    render(<DateField id="fecha" label="Ir a una fecha" value="2026-10-03" onChange={vi.fn()} />)

    expect(screen.getByText('sáb, 3 oct')).toBeInTheDocument()
    const input = screen.getByLabelText('Ir a una fecha')
    expect(input).toHaveAttribute('type', 'date')
    expect(input).toHaveValue('2026-10-03')
  })

  it('reports a chosen date and ignores a cleared one', () => {
    const onChange = vi.fn()
    render(<DateField id="fecha" label="Ir a una fecha" value="2026-10-03" onChange={onChange} />)
    const input = screen.getByLabelText('Ir a una fecha')

    fireEvent.change(input, { target: { value: '2026-10-10' } })
    expect(onChange).toHaveBeenCalledWith('2026-10-10')

    onChange.mockClear()
    fireEvent.change(input, { target: { value: '' } })
    expect(onChange).not.toHaveBeenCalled()
  })
})
