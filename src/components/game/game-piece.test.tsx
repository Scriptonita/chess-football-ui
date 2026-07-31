import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { getInitialBoardState } from '@scriptonita/chess-football-engine'
import GamePiece from './game-piece'

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
})
