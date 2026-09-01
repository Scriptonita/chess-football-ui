import { create } from 'zustand'
import type { BoardState, Position } from '@scriptonita/chess-football-engine'
import { applyMove, applyPass, applyEndTurn } from '@scriptonita/chess-football-engine'

// The canonical kickoff position lives in the engine (rules-adjacent). Re-exported
// here so app imports from `@scriptonita/chess-football-ui/store` keep working.
export { getInitialBoardState } from '@scriptonita/chess-football-engine'

/**
 * Fallback when a board predates configurable action points. `maxActionPoints`
 * is optional on `BoardState`, and every consumer was inventing its own `?? 5`
 * — except `TurnBanner`, which had none and rendered "3/" on an old match.
 */
export const DEFAULT_MAX_AP = 5

interface GameStore {
    boardState: BoardState | null
    selectedPieceId: string | null
    interactionMode: 'move' | 'pass' | null
    setBoardState: (state: BoardState) => void
    setSelectedPieceId: (id: string | null) => void
    setInteractionMode: (mode: 'move' | 'pass' | null) => void
    resetTurn: () => void
    /** Return the store to its initial state. */
    reset: () => void
    movePiece: (pieceId: string, to: Position) => void
    passBall: (to: Position) => void
    endTurn: () => void
}

const INITIAL = {
    boardState: null,
    selectedPieceId: null,
    interactionMode: null,
} satisfies Pick<GameStore, 'boardState' | 'selectedPieceId' | 'interactionMode'>

export const useGameStore = create<GameStore>((set) => ({
    ...INITIAL,

    setBoardState: (state) => set({ boardState: state }),
    setSelectedPieceId: (id) => set({ selectedPieceId: id }),
    setInteractionMode: (mode) => set({ interactionMode: mode }),

    /**
     * The store is a module-global singleton, so a new match opens on the
     * previous match's final board — which ended on a goal, and was therefore
     * re-detected as a fresh goal (the bug behind webapp PR #42). Apps were
     * each reaching for `useGameStore.setState({...})` by hand to work around
     * it; this makes the intent explicit and keeps the shape in one place.
     */
    reset: () => set({ ...INITIAL }),

    resetTurn: () => set((state) => {
        if (!state.boardState) return state
        return {
            boardState: {
                ...state.boardState,
                actionPoints: state.boardState.maxActionPoints ?? DEFAULT_MAX_AP,
                pieces: state.boardState.pieces.map(p => ({ ...p, hasMovedThisTurn: false })),
            },
        }
    }),

    movePiece: (pieceId, to) => set((state) => {
        if (!state.boardState || state.boardState.actionPoints <= 0) return state
        const piece = state.boardState.pieces.find(p => p.id === pieceId)
        if (!piece || piece.hasMovedThisTurn) return state

        const { boardState } = applyMove(state.boardState, pieceId, to)
        return { boardState, selectedPieceId: null, interactionMode: null }
    }),

    passBall: (to) => set((state) => {
        if (!state.boardState || state.boardState.actionPoints <= 0 || !state.boardState.ball.holderId) return state
        const holder = state.boardState.pieces.find(p => p.id === state.boardState!.ball.holderId)
        if (!holder) return state

        const { boardState, forcedTurnEnd } = applyPass(state.boardState, to)
        const keepSelection = !forcedTurnEnd && boardState.ball.holderId
        return {
            boardState,
            selectedPieceId: keepSelection ? boardState.ball.holderId : null,
            interactionMode: keepSelection ? 'pass' : null,
        }
    }),

    endTurn: () => set((state) => {
        if (!state.boardState) return state
        return { boardState: applyEndTurn(state.boardState) }
    }),
}))
