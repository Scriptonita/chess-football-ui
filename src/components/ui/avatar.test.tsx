import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Avatar, AvatarImage, AvatarFallback } from './avatar'

const renderAvatar = (src?: string) =>
  render(
    <Avatar>
      <AvatarImage src={src} alt="Ana" />
      <AvatarFallback>AN</AvatarFallback>
    </Avatar>,
  )

describe('Avatar', () => {
  it('shows the fallback when there is no image', () => {
    renderAvatar(undefined)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('AN')).toBeInTheDocument()
  })

  it('shows the image when the src loads', () => {
    renderAvatar('https://example.test/a.png')
    expect(screen.getByRole('img', { name: 'Ana' })).toBeInTheDocument()
  })

  it('drops a broken image so the initials underneath become visible', () => {
    // Without onError the empty <img> box stays stacked over the fallback and
    // the user sees a blank circle instead of their initials.
    renderAvatar('https://example.test/gone.png')
    fireEvent.error(screen.getByRole('img'))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('AN')).toBeInTheDocument()
  })
})
