import { create } from 'zustand'
import type { BoardState, Piece, Side, Position, PieceType } from '@scriptonita/chess-football-engine'
import { applyMove, applyPass, applyEndTurn } from '@scriptonita/chess-football-engine'

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

export const getInitialBoardState = (servingSide: Side, currentScore = { white: 0, black: 0 }, maxActionPoints = 5): BoardState => {
    const pieces: Piece[] = []

    const addPiece = (type: PieceType, side: Side, x: number, y: number) => {
        pieces.push({ id: `${side}_${type}_${x}_${y}`, type, side, pos: { x, y }, hasMovedThisTurn: false })
    }

    // White pieces (bottom)
    // King at row 1 (front area row). Bishops at y=2 (outside area). Queens at y=5 (kickoff row).
    addPiece('rook',   'white', 0, 1)
    addPiece('rook',   'white', 8, 1)
    addPiece('bishop', 'white', 3, 2)
    addPiece('bishop', 'white', 5, 2)
    addPiece('king',   'white', 4, 1)
    addPiece('queen',  'white', 4, 5)
    addPiece('knight', 'white', 2, 4)
    addPiece('knight', 'white', 6, 4)

    // Black pieces (top, symmetric)
    // King at row 10 (front area row). Bishops at y=9 (outside area). Queens at y=6 (kickoff row).
    addPiece('rook',   'black', 0, 10)
    addPiece('rook',   'black', 8, 10)
    addPiece('bishop', 'black', 3, 9)
    addPiece('bishop', 'black', 5, 9)
    addPiece('king',   'black', 4, 10)
    addPiece('queen',  'black', 4, 6)
    addPiece('knight', 'black', 2, 7)
    addPiece('knight', 'black', 6, 7)

    const servingQueen = pieces.find(p => p.side === servingSide && p.type === 'queen')!

    return {
        pieces,
        ball: { pos: { ...servingQueen.pos }, holderId: servingQueen.id },
        score: currentScore,
        actionPoints: maxActionPoints,
        maxActionPoints,
        turn: servingSide,
        moveHistory: [],
        turnNumber: 1,
    }
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
