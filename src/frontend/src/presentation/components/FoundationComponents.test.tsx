import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'
import { PhotoSlot } from './PhotoSlot'
import { StatusBadge } from './StatusBadge'

afterEach(cleanup)

describe('PhotoSlot', () => {
  it('shows the photo with its description when a source exists', () => {
    render(<PhotoSlot alt="Foto del local" src="/media/local.webp" />)

    const image = screen.getByRole('img', { name: 'Foto del local' })
    expect(image).toHaveAttribute('loading', 'lazy')
  })

  it('loads the photo eagerly when it is a priority image', () => {
    render(<PhotoSlot alt="Foto del local" src="/media/local.webp" priority />)

    expect(screen.getByRole('img', { name: 'Foto del local' })).toHaveAttribute('loading', 'eager')
  })

  it('shows a labelled brand fill instead of a broken image when there is no photo', () => {
    render(<PhotoSlot alt="Foto de Diego" />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Foto de Diego')).toBeInTheDocument()
  })
})

describe('StatusBadge', () => {
  it('always names the state in text', () => {
    render(<StatusBadge tone="danger">No asistió</StatusBadge>)

    expect(screen.getByText('No asistió')).toBeInTheDocument()
  })
})

describe('Avatar', () => {
  it('is hidden from assistive technology because the name is shown beside it', () => {
    const { container } = render(<Avatar name="Pablo Suárez" />)

    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.firstChild).toHaveTextContent('PS')
  })
})
