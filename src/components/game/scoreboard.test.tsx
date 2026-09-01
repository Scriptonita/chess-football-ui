import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Scoreboard from './scoreboard'
import { useGameStore, getInitialBoardState } from '../../store/use-game-store'

beforeEach(() => {
  useGameStore.setState({ boardState: getInitialBoardState('white') })
})

describe('Scoreboard', () => {
  it('shows each side\'s score, not just a pulse dot', () => {
    useGameStore.setState({
      boardState: { ...getInitialBoardState('white'), score: { white: 2, black: 1 } } as never,
    })
    render(<Scoreboard creatorUsername="Ana" opponentUsername="Leo" userSide="white" />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('reads the score as one sentence with both names, announced politely', () => {
    // "2" "—" "1" read cell by cell says nothing about whose is whose.
    useGameStore.setState({
      boardState: { ...getInitialBoardState('white'), score: { white: 2, black: 1 } } as never,
    })
    render(<Scoreboard creatorUsername="Ana" opponentUsername="Leo" userSide="white" />)
    const live = screen.getByRole('status')
    expect(live).toHaveAttribute('aria-live', 'polite')
    expect(live).toHaveTextContent('scoreAriaLabel')
  })

  it('orients the board around the viewer: black sees their own score first', () => {
    useGameStore.setState({
      boardState: { ...getInitialBoardState('white'), score: { white: 2, black: 1 } } as never,
    })
    const { container } = render(
      <Scoreboard creatorUsername="Ana" opponentUsername="Leo" userSide="black" />,
    )
    const scores = Array.from(container.querySelectorAll('.tabular-nums')).map(e => e.textContent)
    expect(scores).toEqual(['1', '2'])
  })
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
