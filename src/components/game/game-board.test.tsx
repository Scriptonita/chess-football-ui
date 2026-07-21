import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// framer-motion drives layout animations that jsdom can't run; replace its
// primitives with plain elements so rendering is deterministic. Only DOM-safe
// props are forwarded (motion-only props like `layout`/`animate` are dropped).
vi.mock('framer-motion', () => {
  const make = (Tag: string) =>
    ({ children, className, style, onClick }: {
      children?: React.ReactNode
      className?: string
      style?: React.CSSProperties
      onClick?: React.MouseEventHandler
    }) => <Tag className={className} style={style} onClick={onClick}>{children}</Tag>
  return {
    motion: new Proxy({}, { get: (_t, tag: string) => make(tag) }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    MotionConfig: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

import GameBoard from './game-board'
import { useGameStore, getInitialBoardState } from '../../store/use-game-store'

beforeEach(() => {
  useGameStore.setState({ boardState: null, selectedPieceId: null, interactionMode: null })
})

describe('GameBoard', () => {
  it('renders nothing without a board state', () => {
    const { container } = render(<GameBoard userSide="white" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the interactive board region when a board state is present', () => {
    useGameStore.setState({ boardState: getInitialBoardState('white') })
    render(<GameBoard userSide="white" />)
    expect(screen.getByRole('application')).toBeInTheDocument()
  })

  it('is not a keyboard application when keyboardNav is disabled', () => {
    useGameStore.setState({ boardState: getInitialBoardState('white') })
    render(<GameBoard userSide="white" keyboardNav={false} />)
    expect(screen.queryByRole('application')).not.toBeInTheDocument()
  })

  it('renders coordinate guides when showCoordinates is set', () => {
    useGameStore.setState({ boardState: getInitialBoardState('white') })
    render(<GameBoard userSide="white" showCoordinates />)
    // RANK_LABELS run 1..12; the guides render them around the board.
    expect(screen.getAllByText('12').length).toBeGreaterThan(0)
  })

  it('clears the current selection and interaction mode on Escape', () => {
    useGameStore.setState({
      boardState: getInitialBoardState('white'),
      selectedPieceId: 'white_rook_0_1',
      interactionMode: 'move',
    })
    render(<GameBoard userSide="white" />)

    fireEvent.keyDown(screen.getByRole('application'), { key: 'Escape' })

    const s = useGameStore.getState()
    expect(s.selectedPieceId).toBeNull()
    expect(s.interactionMode).toBeNull()
  })
})
