import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

// framer-motion drives layout animations that jsdom can't run; replace its
// primitives with plain elements so rendering is deterministic. Only DOM-safe
// props are forwarded (motion-only props like `layout`/`animate` are dropped).
vi.mock('framer-motion', () => {
  const make = (Tag: string) =>
    ({ children, animate: _animate, initial: _initial, transition: _transition, layout: _layout, ...domProps }: {
      children?: React.ReactNode
      [key: string]: unknown
    }) => <Tag {...domProps}>{children}</Tag>
  return {
    motion: new Proxy({}, { get: (_t, tag: string) => make(tag) }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    MotionConfig: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: vi.fn(() => false),
  }
})

// Spy on move/pass validity so specific tests can force deterministic
// "no legal destination" scenarios without depending on real board geometry.
vi.mock('@scriptonita/chess-football-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@scriptonita/chess-football-engine')>()
  return { ...actual, getValidMoves: vi.fn(actual.getValidMoves), getValidPasses: vi.fn(actual.getValidPasses) }
})

import GameBoard from './game-board'
import { useGameStore, getInitialBoardState } from '../../store/use-game-store'
import { getValidMoves, getValidPasses } from '@scriptonita/chess-football-engine'
import { useReducedMotion } from 'framer-motion'

beforeEach(() => {
  useGameStore.setState({ boardState: null, selectedPieceId: null, interactionMode: null })
})

afterEach(() => {
  vi.restoreAllMocks()
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

describe('GameBoard — keyboard shortcuts tooltip (§12)', () => {
  it('shows a shortcuts button when keyboardNav is enabled', () => {
    useGameStore.setState({ boardState: getInitialBoardState('white') })
    render(<GameBoard userSide="white" />)
    expect(screen.getByRole('button', { name: 'shortcuts.buttonLabel' })).toBeInTheDocument()
  })

  it('does not show a shortcuts button when keyboardNav is disabled', () => {
    useGameStore.setState({ boardState: getInitialBoardState('white') })
    render(<GameBoard userSide="white" keyboardNav={false} />)
    expect(screen.queryByRole('button', { name: 'shortcuts.buttonLabel' })).not.toBeInTheDocument()
  })

  it('reveals the shortcut list on click and hides it again on a second click', () => {
    useGameStore.setState({ boardState: getInitialBoardState('white') })
    render(<GameBoard userSide="white" />)

    expect(screen.queryByText('shortcuts.title')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'shortcuts.buttonLabel' }))
    expect(screen.getByText('shortcuts.title')).toBeInTheDocument()
    expect(screen.getByText('shortcuts.move')).toBeInTheDocument()
    expect(screen.getByText('shortcuts.pass')).toBeInTheDocument()
    expect(screen.getByText('shortcuts.cancel')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'shortcuts.buttonLabel' }))
    expect(screen.queryByText('shortcuts.title')).not.toBeInTheDocument()
  })
})

describe('GameBoard — invalid-action shake (§16)', () => {
  beforeEach(() => {
    vi.mocked(getValidMoves).mockReturnValue([])
    vi.mocked(getValidPasses).mockReturnValue([])
  })

  it('briefly shows shake feedback when clicking an illegal destination with a piece selected', () => {
    vi.useFakeTimers()
    useGameStore.setState({
      boardState: getInitialBoardState('white'),
      selectedPieceId: 'white_rook_0_1',
    })
    const { container } = render(<GameBoard userSide="white" />)

    const squares = container.querySelectorAll('.grid-cols-9 > div')
    expect(squares.length).toBeGreaterThan(0)
    fireEvent.click(squares[0])

    expect(screen.getByTestId('invalid-action-shake')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(200) })
    expect(screen.queryByTestId('invalid-action-shake')).not.toBeInTheDocument()

    vi.useRealTimers()
  })

  it('does not shake when clicking a square with no piece selected', () => {
    useGameStore.setState({ boardState: getInitialBoardState('white'), selectedPieceId: null })
    const { container } = render(<GameBoard userSide="white" />)

    const squares = container.querySelectorAll('.grid-cols-9 > div')
    fireEvent.click(squares[0])

    expect(screen.queryByTestId('invalid-action-shake')).not.toBeInTheDocument()
  })
})

describe('GameBoard — pass trajectory preview (§16)', () => {
  const ROWS = 12
  const COLS = 9
  const squareIndex = (x: number, y: number) => (ROWS - 1 - y) * COLS + x

  function setUpBallCarrierAt(x: number, y: number, extraPieces: ReturnType<typeof getInitialBoardState>['pieces'] = []) {
    const boardState = getInitialBoardState('white')
    const carrier = boardState.pieces[0]
    carrier.pos = { x, y }
    boardState.ball = { pos: { x, y }, holderId: carrier.id }
    boardState.pieces = [...boardState.pieces.filter(p => p.id !== carrier.id), carrier, ...extraPieces]
    useGameStore.setState({ boardState, selectedPieceId: carrier.id })
    return carrier
  }

  beforeEach(() => {
    vi.mocked(getValidMoves).mockReturnValue([])
    vi.mocked(getValidPasses).mockReturnValue([{ x: 3, y: 5 }])
  })

  it('shows a safe-colored dashed line from the carrier to a hovered pass target', () => {
    setUpBallCarrierAt(1, 5)
    const { container } = render(<GameBoard userSide="white" />)

    const squares = container.querySelectorAll('.grid-cols-9 > div')
    fireEvent.mouseEnter(squares[squareIndex(3, 5)])

    const line = screen.getByTestId('pass-trajectory-line')
    expect(line).toHaveAttribute('stroke', '#38bdf8')
  })

  it('shows a danger-colored line when an enemy piece sits on the path', () => {
    const interceptor = { id: 'black_interceptor', type: 'rook' as const, side: 'black' as const, pos: { x: 2, y: 5 }, hasMovedThisTurn: false }
    setUpBallCarrierAt(1, 5, [interceptor])
    const { container } = render(<GameBoard userSide="white" />)

    const squares = container.querySelectorAll('.grid-cols-9 > div')
    fireEvent.mouseEnter(squares[squareIndex(3, 5)])

    const line = screen.getByTestId('pass-trajectory-line')
    expect(line).toHaveAttribute('stroke', '#E54545')
  })

  it('hides the line on mouse leave', () => {
    setUpBallCarrierAt(1, 5)
    const { container } = render(<GameBoard userSide="white" />)

    const squares = container.querySelectorAll('.grid-cols-9 > div')
    const target = squares[squareIndex(3, 5)]
    fireEvent.mouseEnter(target)
    expect(screen.getByTestId('pass-trajectory-line')).toBeInTheDocument()

    fireEvent.mouseLeave(target)
    expect(screen.queryByTestId('pass-trajectory-line')).not.toBeInTheDocument()
  })
})

describe('GameBoard — sequential replay of a multi-action opponent turn (§4)', () => {
  const ROWS = 12
  const COLS = 9
  const squareIndex = (x: number, y: number) => (ROWS - 1 - y) * COLS + x
  const hasHighlight = (squares: NodeListOf<Element>, x: number, y: number) =>
    squares[squareIndex(x, y)].className.includes('bg-last-move-highlight/20')

  beforeEach(() => {
    vi.mocked(getValidMoves).mockReturnValue([])
    vi.mocked(getValidPasses).mockReturnValue([])
  })

  function opponentTurnBoardState() {
    const boardState = getInitialBoardState('white')
    boardState.turn = 'black'
    boardState.turnNumber = 3
    boardState.moveHistory = []
    return boardState
  }

  function finishedOpponentTurnBoardState(boardState: ReturnType<typeof getInitialBoardState>) {
    return {
      ...boardState,
      turn: 'white' as const,
      lastMove: { type: 'move' as const, from: { x: 4, y: 6 }, to: { x: 5, y: 6 }, playerId: 'black_piece', at: 2 },
      moveHistory: [
        { type: 'move' as const, pieceType: 'rook' as const, pieceSide: 'black' as const, from: { x: 2, y: 6 }, to: { x: 3, y: 6 }, at: 1, turnNumber: 3 },
        { type: 'move' as const, pieceType: 'rook' as const, pieceSide: 'black' as const, from: { x: 4, y: 6 }, to: { x: 5, y: 6 }, at: 2, turnNumber: 3 },
      ],
    }
  }

  it('reveals a multi-action opponent turn step by step before settling on the final move', () => {
    vi.useFakeTimers()
    const boardState = opponentTurnBoardState()
    useGameStore.setState({ boardState, selectedPieceId: null })
    const { container } = render(<GameBoard userSide="white" />)

    act(() => { useGameStore.setState({ boardState: finishedOpponentTurnBoardState(boardState) }) })

    const squares = container.querySelectorAll('.grid-cols-9 > div')
    expect(hasHighlight(squares, 2, 6)).toBe(true)
    expect(hasHighlight(squares, 3, 6)).toBe(true)
    expect(hasHighlight(squares, 4, 6)).toBe(false)

    act(() => { vi.advanceTimersByTime(400) })

    expect(hasHighlight(squares, 4, 6)).toBe(true)
    expect(hasHighlight(squares, 5, 6)).toBe(true)
    expect(hasHighlight(squares, 2, 6)).toBe(false)

    vi.useRealTimers()
  })

  it('skips straight to the final move when prefers-reduced-motion is set', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const boardState = opponentTurnBoardState()
    useGameStore.setState({ boardState, selectedPieceId: null })
    const { container } = render(<GameBoard userSide="white" />)

    act(() => { useGameStore.setState({ boardState: finishedOpponentTurnBoardState(boardState) }) })

    const squares = container.querySelectorAll('.grid-cols-9 > div')
    expect(hasHighlight(squares, 4, 6)).toBe(true)
    expect(hasHighlight(squares, 5, 6)).toBe(true)
    expect(hasHighlight(squares, 2, 6)).toBe(false)

    vi.mocked(useReducedMotion).mockReturnValue(false)
  })
})
