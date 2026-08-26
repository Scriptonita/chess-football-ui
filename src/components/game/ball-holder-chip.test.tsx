import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BallHolderChip } from './ball-holder-chip'
import { KeyboardShortcutsList } from './keyboard-shortcuts'
import { useGameStore, getInitialBoardState } from '../../store/use-game-store'

beforeEach(() => {
  useGameStore.setState({ boardState: null, selectedPieceId: null, interactionMode: null })
})

describe('BallHolderChip', () => {
  it('names the piece that currently holds the ball', () => {
    useGameStore.setState({ boardState: getInitialBoardState('white') })
    render(<BallHolderChip />)
    // initial setup: the white queen kicks off
    expect(screen.getByText(/ballHolder: pieces\.queen/)).toBeInTheDocument()
  })

  it('renders nothing while the ball is loose', () => {
    const bs = getInitialBoardState('white')
    bs.ball = { ...bs.ball, holderId: null }
    useGameStore.setState({ boardState: bs })
    const { container } = render(<BallHolderChip />)
    expect(container).toBeEmptyDOMElement()
  })

  it('announces holder changes politely', () => {
    useGameStore.setState({ boardState: getInitialBoardState('white') })
    const { container } = render(<BallHolderChip />)
    expect(container.firstElementChild?.getAttribute('aria-live')).toBe('polite')
  })
})

describe('KeyboardShortcutsList', () => {
  it('lists the five board shortcuts', () => {
    render(<KeyboardShortcutsList />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(5)
    expect(items.map(li => li.querySelector('kbd')?.textContent)).toEqual(['↑↓←→', 'Enter', 'M', 'P', 'Esc'])
  })
})
