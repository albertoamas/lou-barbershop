import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReportTabs } from './ReportTabs'

afterEach(cleanup)

describe('ReportTabs', () => {
  it('identifies the active report and requests a section change', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ReportTabs active="operation" onChange={onChange} />)

    expect(screen.getByRole('tab', { name: 'Operación' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: 'Caja' }))

    expect(onChange).toHaveBeenCalledWith('cash')
  })
})
