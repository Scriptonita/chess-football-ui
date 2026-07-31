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
