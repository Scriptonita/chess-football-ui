import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import Scoreboard from './scoreboard'
import { useGameStore, getInitialBoardState } from '../../store/use-game-store'

beforeEach(() => {
  useGameStore.setState({ boardState: getInitialBoardState('white') })
})

describe('Scoreboard — prefers-reduced-motion', () => {
  it('disables the looping "active turn" dot pulse under motion-reduce', () => {
    const { container } = render(
      <Scoreboard creatorUsername="Ana" opponentUsername="Leo" />,
    )
    const dot = container.querySelector('.animate-pulse')
    expect(dot).not.toBeNull()
    expect(dot?.className).toContain('motion-reduce:animate-none')
  })
})
