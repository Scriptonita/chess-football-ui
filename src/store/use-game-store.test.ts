import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore, getInitialBoardState } from './use-game-store'
import { getValidMoves, getValidPasses } from '@scriptonita/chess-football-engine'

const clear = () =>
  useGameStore.setState({ boardState: null, selectedPieceId: null, interactionMode: null })

beforeEach(clear)

describe('useGameStore — initial state & setters', () => {
  it('starts empty', () => {
    const s = useGameStore.getState()
    expect(s.boardState).toBeNull()
    expect(s.selectedPieceId).toBeNull()
    expect(s.interactionMode).toBeNull()
  })

  it('setBoardState / setSelectedPieceId / setInteractionMode update state', () => {
    const bs = getInitialBoardState('white')
    useGameStore.getState().setBoardState(bs)
    expect(useGameStore.getState().boardState).toBe(bs)

    useGameStore.getState().setSelectedPieceId('white_rook_0_1')
    expect(useGameStore.getState().selectedPieceId).toBe('white_rook_0_1')

    useGameStore.getState().setInteractionMode('pass')
    expect(useGameStore.getState().interactionMode).toBe('pass')
  })
})

describe('useGameStore — movePiece', () => {
  it('is a no-op when there is no board', () => {
    useGameStore.getState().movePiece('white_rook_0_1', { x: 0, y: 2 })
    expect(useGameStore.getState().boardState).toBeNull()
  })

  it('is a no-op when action points are exhausted', () => {
    const bs = { ...getInitialBoardState('white'), actionPoints: 0 }
    useGameStore.setState({ boardState: bs })
    const rook = bs.pieces.find(p => p.id === 'white_rook_0_1')!
    const target = getValidMoves(rook, bs)[0]!
    useGameStore.getState().movePiece(rook.id, target)
    expect(useGameStore.getState().boardState).toBe(bs)
  })

  it('is a no-op for an unknown piece', () => {
    const bs = getInitialBoardState('white')
    useGameStore.setState({ boardState: bs })
    useGameStore.getState().movePiece('does_not_exist', { x: 0, y: 2 })
    expect(useGameStore.getState().boardState).toBe(bs)
  })

  it('is a no-op when the piece already moved this turn', () => {
    const base = getInitialBoardState('white')
    const rook = base.pieces.find(p => p.id === 'white_rook_0_1')!
    const target = getValidMoves(rook, base)[0]!
    const bs = {
      ...base,
      pieces: base.pieces.map(p => (p.id === rook.id ? { ...p, hasMovedThisTurn: true } : p)),
    }
    useGameStore.setState({ boardState: bs })
    useGameStore.getState().movePiece(rook.id, target)
    expect(useGameStore.getState().boardState).toBe(bs)
  })

  it('applies a legal move, spends an action point and clears selection + mode', () => {
    const bs = getInitialBoardState('white')
    const rook = bs.pieces.find(p => p.id === 'white_rook_0_1')!
    const target = getValidMoves(rook, bs)[0]!
    useGameStore.setState({ boardState: bs, selectedPieceId: rook.id, interactionMode: 'move' })

    useGameStore.getState().movePiece(rook.id, target)

    const s = useGameStore.getState()
    expect(s.boardState).not.toBe(bs)
    expect(s.boardState!.actionPoints).toBeLessThan(bs.actionPoints)
    const moved = s.boardState!.pieces.find(p => p.id === rook.id)!
    expect(moved.pos).toEqual(target)
    expect(s.selectedPieceId).toBeNull()
    expect(s.interactionMode).toBeNull()
  })
})

describe('useGameStore — passBall', () => {
  it('is a no-op when there is no board', () => {
    useGameStore.getState().passBall({ x: 4, y: 6 })
    expect(useGameStore.getState().boardState).toBeNull()
  })

  it('is a no-op when nobody holds the ball', () => {
    const base = getInitialBoardState('white')
    const bs = { ...base, ball: { ...base.ball, holderId: null } }
    useGameStore.setState({ boardState: bs })
    useGameStore.getState().passBall({ x: 4, y: 6 })
    expect(useGameStore.getState().boardState).toBe(bs)
  })

  it('is a no-op when action points are exhausted', () => {
    const bs = { ...getInitialBoardState('white'), actionPoints: 0 }
    useGameStore.setState({ boardState: bs })
    const holder = bs.pieces.find(p => p.id === bs.ball.holderId)!
    const target = getValidPasses(holder, bs)[0]!
    useGameStore.getState().passBall(target)
    expect(useGameStore.getState().boardState).toBe(bs)
  })

  it('applies a legal pass, spends an action point and keeps the selection/mode invariant', () => {
    const bs = getInitialBoardState('white')
    const holder = bs.pieces.find(p => p.id === bs.ball.holderId)!
    const target = getValidPasses(holder, bs)[0]!
    useGameStore.setState({ boardState: bs })

    useGameStore.getState().passBall(target)

    const s = useGameStore.getState()
    expect(s.boardState).not.toBe(bs)
    expect(s.boardState!.actionPoints).toBeLessThan(bs.actionPoints)
    // The store only keeps a selection alongside the 'pass' interaction mode.
    if (s.interactionMode === 'pass') {
      expect(s.selectedPieceId).toBe(s.boardState!.ball.holderId)
    } else {
      expect(s.interactionMode).toBeNull()
      expect(s.selectedPieceId).toBeNull()
    }
  })
})

describe('useGameStore — endTurn & resetTurn', () => {
  it('endTurn is a no-op with no board', () => {
    useGameStore.getState().endTurn()
    expect(useGameStore.getState().boardState).toBeNull()
  })

  it('endTurn hands the turn to the opponent', () => {
    useGameStore.setState({ boardState: getInitialBoardState('white') })
    useGameStore.getState().endTurn()
    expect(useGameStore.getState().boardState!.turn).toBe('black')
  })

  it('resetTurn restores action points and clears hasMovedThisTurn', () => {
    const base = getInitialBoardState('white')
    const bs = {
      ...base,
      actionPoints: 1,
      pieces: base.pieces.map(p => ({ ...p, hasMovedThisTurn: true })),
    }
    useGameStore.setState({ boardState: bs })

    useGameStore.getState().resetTurn()

    const s = useGameStore.getState()
    expect(s.boardState!.actionPoints).toBe(bs.maxActionPoints ?? 5)
    expect(s.boardState!.pieces.every(p => !p.hasMovedThisTurn)).toBe(true)
  })
})

describe('useGameStore — reset', () => {
    it('returns the store to its initial state', () => {
        useGameStore.setState({
            boardState: getInitialBoardState('white'),
            selectedPieceId: 'white_rook_0_1',
            interactionMode: 'move',
        })

        useGameStore.getState().reset()

        const s = useGameStore.getState()
        expect(s.boardState).toBeNull()
        expect(s.selectedPieceId).toBeNull()
        expect(s.interactionMode).toBeNull()
    })

    it('clears the previous match so a new one cannot re-detect its final goal', () => {
        // The store is a module-global singleton: without reset, a new match
        // mounts on the last board — which ended on a goal (webapp PR #42).
        useGameStore.setState({ boardState: getInitialBoardState('white') })
        useGameStore.getState().reset()
        expect(useGameStore.getState().boardState).toBeNull()
    })
})
