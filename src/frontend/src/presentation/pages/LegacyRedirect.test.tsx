import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { LegacyRedirect } from './LegacyRedirect'

afterEach(cleanup)

const LocationProbe = () => {
  const location = useLocation()
  return <output>{`${location.pathname}${location.hash}`}</output>
}

describe('LegacyRedirect', () => {
  it('preserves the private fragment when migrating an old management link', () => {
    render(
      <MemoryRouter initialEntries={['/book/manage#private-token']}>
        <Routes>
          <Route path="/book/manage" element={<LegacyRedirect to="/mi-cita" preserveHash />} />
          <Route path="/mi-cita" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('/mi-cita#private-token')).toBeInTheDocument()
  })
})
