import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SocialLinks } from './SocialLinks'

afterEach(cleanup)

describe('SocialLinks', () => {
  it('shows the four recognizable networks without inventing profile links', () => {
    render(<SocialLinks />)

    for (const network of ['Facebook', 'WhatsApp', 'Instagram', 'TikTok']) {
      expect(
        screen.getByRole('img', { name: `${network}; enlace pendiente de configuración` }),
      ).toBeInTheDocument()
    }
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})
