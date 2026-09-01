import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TurnBanner } from './turn-banner'
import { useGameStore, getInitialBoardState, DEFAULT_MAX_AP } from '../../store/use-game-store'

const setBoard = (patch: Record<string, unknown> = {}) =>
  useGameStore.setState({ boardState: { ...getInitialBoardState('white'), ...patch } as never })

beforeEach(() => useGameStore.setState({ boardState: null }))

describe('TurnBanner', () => {
  it('renders nothing without a board', () => {
    const { container } = render(<TurnBanner isMyTurn />)
    expect(container.firstChild).toBeNull()
  })

  it('announces the turn politely', () => {
    setBoard()
    render(<TurnBanner isMyTurn />)
    const banner = screen.getByText('yourTurn').closest('[aria-live]')
    expect(banner).toHaveAttribute('aria-live', 'polite')
  })

  it('falls back to the default AP cap on a board saved before it existed', () => {
    // maxActionPoints is optional on BoardState. This component had no fallback
    // and rendered "3/" — a bare slash — on an older match.
    setBoard({ actionPoints: 3, maxActionPoints: undefined })
    render(<TurnBanner isMyTurn />)
    expect(screen.getByText(`3/${DEFAULT_MAX_AP}`)).toBeInTheDocument()
  })

  it('honours an explicit AP cap', () => {
    setBoard({ actionPoints: 1, maxActionPoints: 2 })
    render(<TurnBanner isMyTurn />)
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  it('shows the turn number — first-order information in a correspondence game', () => {
    setBoard({ turnNumber: 14 })
    render(<TurnBanner isMyTurn />)
    expect(screen.getByText('history.turn')).toBeInTheDocument()
  })

  it('shows the waiting label instead of the AP counter on the opponent turn', () => {
    setBoard({ actionPoints: 4 })
    render(<TurnBanner isMyTurn={false} waitingLabel="Bot pensando…" />)
    expect(screen.getByText('Bot pensando…')).toBeInTheDocument()
    expect(screen.queryByText('4/5')).not.toBeInTheDocument()
  })
})
