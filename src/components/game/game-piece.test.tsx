import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import GamePiece from './game-piece'
import { getInitialBoardState } from '../../store/use-game-store'

// Index 0 of the initial setup is a fixed, non-empty rook slot for either
// side — safe as a generic fixture; the tests below don't depend on piece type.
const piece = getInitialBoardState('white').pieces[0]

describe('GamePiece — prefers-reduced-motion', () => {
  it('disables the looping selection-ring pulse under motion-reduce', () => {
    const { container } = render(
      <GamePiece piece={piece} isSelected hasBall={false} onClick={() => {}} />,
    )
    const ring = container.querySelector('.animate-pulse')
    expect(ring).not.toBeNull()
    expect(ring?.className).toContain('motion-reduce:animate-none')
  })

  it('disables the selection scale transition under motion-reduce', () => {
    const { container } = render(
      <GamePiece piece={piece} isSelected hasBall={false} onClick={() => {}} />,
    )
    const root = container.firstElementChild
    expect(root?.className).toContain('transition-transform')
    expect(root?.className).toContain('motion-reduce:transition-none')
  })

  it('keeps the static ring + scale selection cue so state stays legible without animation', () => {
    // The pulse/scale-transition are decorative; the ring/scale VALUES themselves
    // are static and must survive regardless of motion-reduce (AC-1: no state
    // may be communicated solely by animation).
    const { container } = render(
      <GamePiece piece={piece} isSelected hasBall={false} onClick={() => {}} />,
    )
    const root = container.firstElementChild
    expect(root?.className).toContain('ring-4')
    expect(root?.className).toContain('ring-primary')
    expect(root?.className).toContain('scale-110')
  })
})

describe('GamePiece — relief above the pitch', () => {
  it('casts a soft ground shadow that is a separate, decorative layer beneath the chip', () => {
    const { container } = render(
      <GamePiece piece={piece} isSelected={false} hasBall={false} onClick={() => {}} />,
    )
    const root = container.firstElementChild as HTMLElement
    const shadow = container.querySelector('[data-testid="piece-shadow"]') as HTMLElement
    const chip = container.querySelector('[data-testid="piece-chip"]') as HTMLElement
    expect(shadow).not.toBeNull()
    expect(chip).not.toBeNull()
    expect(shadow.getAttribute('aria-hidden')).toBe('true')
    // shadow paints before (i.e. under) the chip
    expect(Array.from(root.children).indexOf(shadow)).toBeLessThan(Array.from(root.children).indexOf(chip))
    // the chip owns the face gradient; the wrapper stays transparent
    expect(chip.style.background).toContain('radial-gradient')
    expect(root.style.background).toBe('')
  })

  it('lifts the chip and pushes the shadow further away while moving', () => {
    const { container, rerender } = render(
      <GamePiece piece={piece} isSelected={false} hasBall={false} onClick={() => {}} />,
    )
    const root = container.firstElementChild as HTMLElement
    const shadow = container.querySelector('[data-testid="piece-shadow"]') as HTMLElement
    expect(root.className).not.toContain('scale-[1.08]')
    expect(shadow.getAttribute('data-lifted')).toBe('false')

    rerender(<GamePiece piece={piece} isSelected={false} hasBall={false} onClick={() => {}} isMoving />)
    expect(root.className).toContain('scale-[1.08]')
    expect(shadow.getAttribute('data-lifted')).toBe('true')
  })

  it('keeps the shadow transition off under motion-reduce', () => {
    const { container } = render(
      <GamePiece piece={piece} isSelected={false} hasBall={false} onClick={() => {}} />,
    )
    const shadow = container.querySelector('[data-testid="piece-shadow"]') as HTMLElement
    expect(shadow.className).toContain('motion-reduce:transition-none')
  })
})
