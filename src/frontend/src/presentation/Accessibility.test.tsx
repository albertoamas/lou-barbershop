import axe from 'axe-core'
import { cleanup, render } from '@testing-library/react'
import { Link, MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MotionProvider } from './components/MotionProvider'
import { SystemStateCard } from './components/SystemStateCard'
import { AppShell } from './layout/AppShell'
import { InternalNavigation } from './layout/InternalNavigation'

vi.mock('./components/ServiceWorkerUpdateBanner', () => ({
  ServiceWorkerUpdateBanner: () => null,
}))

afterEach(cleanup)

const expectNoSeriousViolations = async (container: HTMLElement) => {
  const result = await axe.run(container, {
    rules: {
      // jsdom does not calculate layout and contrast; real colors are checked visually.
      'color-contrast': { enabled: false },
    },
  })
  const violations = result.violations.filter(
    ({ impact }) => impact === 'serious' || impact === 'critical',
  )
  expect(violations, violations.map(({ id, help }) => `${id}: ${help}`).join('\n')).toEqual([])
}

describe('shared accessibility baseline', () => {
  it('keeps the public shell and system states free of serious violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <AppShell>
          <main>
            <SystemStateCard
              eyebrow="Página no encontrada"
              title="Este enlace no existe"
              message="Vuelve al inicio para continuar."
            >
              <Link to="/">Volver al inicio</Link>
            </SystemStateCard>
          </main>
        </AppShell>
      </MemoryRouter>,
    )

    await expectNoSeriousViolations(container)
  })

  it('keeps the internal navigation free of serious violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <MotionProvider>
          <InternalNavigation
            roles={['OWNER', 'BARBER']}
            userName="owner.demo"
            onLogout={vi.fn().mockResolvedValue(undefined)}
          />
        </MotionProvider>
      </MemoryRouter>,
    )

    await expectNoSeriousViolations(container)
  })
})
