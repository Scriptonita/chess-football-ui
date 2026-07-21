import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GameControls from './game-controls'
import { GameI18nProvider } from '../../i18n'
import { useGameStore, getInitialBoardState } from '../../store/use-game-store'

// Identity translator: rendered text equals the i18n key, so assertions read plainly.
const renderControls = (isMyTurn: boolean) =>
  render(
    <GameI18nProvider t={(k) => k}>
      <GameControls isMyTurn={isMyTurn} />
    </GameI18nProvider>,
  )

beforeEach(() => {
  useGameStore.setState({ boardState: null, selectedPieceId: null, interactionMode: null })
})

describe('GameControls', () => {
  it('renders nothing when there is no board state', () => {
    const { container } = renderControls(true)
    expect(container.firstChild).toBeNull()
  })

  describe('with a board state', () => {
    beforeEach(() => {
      useGameStore.setState({ boardState: getInitialBoardState('white') })
    })

    it('shows the end-turn button on my turn', () => {
      renderControls(true)
      expect(screen.getByText('endTurn')).toBeInTheDocument()
      expect(screen.queryByText('waitingRival')).not.toBeInTheDocument()
    })

    it('shows the waiting-rival indicator when it is not my turn', () => {
      renderControls(false)
      expect(screen.getByText('waitingRival')).toBeInTheDocument()
      expect(screen.queryByText('endTurn')).not.toBeInTheDocument()
    })

    it('opens the confirm dialog when ending a turn with >= 2 action points', () => {
      // getInitialBoardState starts with 5 action points.
      renderControls(true)
      fireEvent.click(screen.getByText('endTurn'))
      expect(screen.getByText('endTurnConfirmYes')).toBeInTheDocument()
    })

    it('ends the turn immediately (no dialog) when fewer than 2 action points remain', () => {
      useGameStore.setState({ boardState: { ...getInitialBoardState('white'), actionPoints: 1 } })
      renderControls(true)
      fireEvent.click(screen.getByText('endTurn'))
      expect(screen.queryByText('endTurnConfirmYes')).not.toBeInTheDocument()
      expect(useGameStore.getState().boardState!.turn).toBe('black')
    })
  })
})
