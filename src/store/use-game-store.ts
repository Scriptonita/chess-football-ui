import { create } from 'zustand'
import type { BoardState, Position } from '@scriptonita/chess-football-engine'
import { applyMove, applyPass, applyEndTurn } from '@scriptonita/chess-football-engine'

// The canonical kickoff position lives in the engine (rules-adjacent). Re-exported
// here so app imports from `@scriptonita/chess-football-ui/store` keep working.
export { getInitialBoardState } from '@scriptonita/chess-football-engine'

interface GameStore {
    boardState: BoardState | null
    selectedPieceId: string | null
    interactionMode: 'move' | 'pass' | null
    setBoardState: (state: BoardState) => void
    setSelectedPieceId: (id: string | null) => void
    setInteractionMode: (mode: 'move' | 'pass' | null) => void
    resetTurn: () => void
    movePiece: (pieceId: string, to: Position) => void
    passBall: (to: Position) => void
    endTurn: () => void
}

export const useGameStore = create<GameStore>((set) => ({
    boardState: null,
    selectedPieceId: null,
    interactionMode: null,

    setBoardState: (state) => set({ boardState: state }),
    setSelectedPieceId: (id) => set({ selectedPieceId: id }),
    setInteractionMode: (mode) => set({ interactionMode: mode }),

    resetTurn: () => set((state) => {
        if (!state.boardState) return state
        return {
            boardState: {
                ...state.boardState,
                actionPoints: state.boardState.maxActionPoints ?? 5,
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
