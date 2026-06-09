import {
    ChessKing,
    ChessQueen,
    ChessRook,
    ChessBishop,
    ChessKnight,
    ShieldQuestion,
    type LucideIcon,
} from 'lucide-react'
import { useGameStore } from '../../store/use-game-store'
import { Football } from './football'
import { cn } from '../../lib/utils'
import { LONG_KEY, squareName } from '@scriptonita/chess-football-engine'
import type { Piece, PieceType } from '@scriptonita/chess-football-engine'
import { useGameT } from '../../i18n'

const PIECE_ICON: Record<PieceType, LucideIcon> = {
    king: ChessKing,
    queen: ChessQueen,
    rook: ChessRook,
    bishop: ChessBishop,
    knight: ChessKnight,
}

interface SelectedPieceDetailProps {
    isMyTurn: boolean
    className?: string
}

/**
 * Compact card that surfaces the selected piece's identity, position and current state.
 * Renders below the board on tablet/desktop to put the empty space to use.
 */
export function SelectedPieceDetail({ isMyTurn, className }: SelectedPieceDetailProps) {
    const t = useGameT()
    const { boardState, selectedPieceId } = useGameStore()

    if (!boardState) return null

    const piece: Piece | undefined = boardState.pieces.find(p => p.id === selectedPieceId)

    if (!piece) {
        return (
            <div
                className={cn(
                    'rounded-xl bg-bg-surface/40 border border-dashed border-border-subtle',
                    'px-4 py-3 flex items-center gap-3',
                    className,
                )}
            >
                <ShieldQuestion size={20} className="text-fg-muted shrink-0" aria-hidden="true" />
                <span className="font-mono text-[11px] text-fg-muted">
                    {t('selectedPiece.empty')}
                </span>
            </div>
        )
    }

    const Icon = PIECE_ICON[piece.type] ?? ShieldQuestion
    const longName = t(`pieces.${LONG_KEY[piece.type]}`)
    const square = squareName(piece.pos)
    const hasBall = boardState.ball.holderId === piece.id
    const movedThisTurn = piece.hasMovedThisTurn && isMyTurn

    return (
        <div
            className={cn(
                'rounded-xl bg-bg-surface border border-border-subtle',
                'px-4 py-3 flex items-center gap-4',
                className,
            )}
            role="status"
            aria-live="polite"
            aria-label={`${longName} ${square}`}
        >
            <div
                className={cn(
                    'w-12 h-12 shrink-0 rounded-full flex items-center justify-center',
                    piece.side === 'white' ? 'bg-white text-black' : 'bg-fg-primary/90 text-bg-primary',
                )}
            >
                <Icon size={26} strokeWidth={1.75} aria-hidden="true" />
            </div>

            <div className="flex flex-col min-w-0 flex-1">
                <span className="font-anton text-base text-fg-primary leading-none uppercase tracking-[0.5px]">
                    {longName}
                </span>
                <span className="font-mono text-[11px] text-fg-muted mt-1">
                    {t('selectedPiece.atSquare', { square })}
                </span>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
                {hasBall && (
                    <span className="flex items-center gap-1.5 font-mono text-[10px] text-pass-highlight uppercase tracking-[0.5px]">
                        <span className="w-3 h-3 inline-flex">
                            <Football />
                        </span>
                        {t('selectedPiece.hasBall')}
                    </span>
                )}
                {movedThisTurn && (
                    <span className="font-mono text-[10px] text-fg-muted uppercase tracking-[0.5px]">
                        {t('selectedPiece.alreadyMoved')}
                    </span>
                )}
            </div>
        </div>
    )
}
