import { Piece } from '@scriptonita/chess-football-engine'
import { cn } from '../../lib/utils'
import {
    ChessKing,
    ChessQueen,
    ChessRook,
    ChessBishop,
    ChessKnight,
    ShieldQuestion,
    type LucideIcon,
} from 'lucide-react'

interface GamePieceProps {
    piece: Piece
    isSelected: boolean
    hasBall: boolean
    onClick: (e: React.MouseEvent) => void
    /**
     * True while the piece is travelling between squares. The chip lifts
     * slightly and its ground shadow drops away, so the move reads as the
     * piece being picked up and slid across the turf rather than dragged.
     */
    isMoving?: boolean
}

const PIECE_ICON: Record<Piece['type'], LucideIcon> = {
    king: ChessKing,
    queen: ChessQueen,
    rook: ChessRook,
    bishop: ChessBishop,
    knight: ChessKnight,
}

// Embossed glyph: with the light source at the top-left (same as the chip's
// radial gradient), a raised figure catches a thin highlight on its upper edge
// and casts a short shadow below. Tuned per side so it reads on both chips.
const EMBOSS_FILTER: Record<Piece['side'], string> = {
    white: 'drop-shadow(0 -0.75px 0 rgba(255,255,255,0.65)) drop-shadow(0 1.25px 1px rgba(0,0,0,0.45))',
    black: 'drop-shadow(0 -0.5px 0 rgba(255,255,255,0.3)) drop-shadow(0 1.25px 1.5px rgba(0,0,0,0.8))',
}

export const PieceIcon = ({ type, side }: { type: Piece['type']; side: Piece['side'] }) => {
    const Icon = PIECE_ICON[type] ?? ShieldQuestion
    // Size scales with the board container width (cqw); clamp keeps the glyph
    // readable on small screens and avoids overflow on very large ones.
    const style: React.CSSProperties = {
        width: 'clamp(16px, 7.4cqw, 44px)',
        height: 'clamp(16px, 7.4cqw, 44px)',
        filter: EMBOSS_FILTER[side],
    }
    return <Icon style={style} strokeWidth={2} aria-hidden="true" />
}

// 3D piece styling: radial gradient for top-left light source + layered
// box-shadows (inner highlight, inner bottom shade, outer drop shadows) to
// suggest a chip floating slightly above the board. Used as-is by standalone
// chips (e.g. the ball-holder badge in the board toolbar).
export const WHITE_PIECE_STYLE: React.CSSProperties = {
    background: 'radial-gradient(circle at 30% 25%, #ffffff 0%, #f4f4f5 55%, #d4d4d8 100%)',
    boxShadow: [
        'inset 0 1.5px 1px rgba(255,255,255,0.95)',
        'inset 0 -2px 3px rgba(0,0,0,0.18)',
        '0 4px 6px rgba(0,0,0,0.45)',
        '0 1px 2px rgba(0,0,0,0.35)',
    ].join(', '),
    border: '1px solid rgba(0,0,0,0.18)',
    color: '#09090b',
}

export const BLACK_PIECE_STYLE: React.CSSProperties = {
    background: 'radial-gradient(circle at 30% 25%, #52525b 0%, #1c1c1f 55%, #050507 100%)',
    boxShadow: [
        'inset 0 1.5px 1px rgba(255,255,255,0.22)',
        'inset 0 -2px 3px rgba(0,0,0,0.6)',
        '0 4px 6px rgba(0,0,0,0.55)',
        '0 1px 2px rgba(0,0,0,0.4)',
    ].join(', '),
    border: '1px solid rgba(0,0,0,0.55)',
    color: '#fafafa',
}

// On the board the ground shadow is a separate blurred layer (see below), so
// the chip itself only keeps its bevel plus a tight contact edge — stacking the
// toolbar's drop shadows on top would double up and read as smudged.
const ON_BOARD_CHIP_STYLE: Record<Piece['side'], React.CSSProperties> = {
    white: {
        ...WHITE_PIECE_STYLE,
        boxShadow: [
            'inset 0 1.5px 1px rgba(255,255,255,0.95)',
            'inset 0 -2px 3px rgba(0,0,0,0.18)',
            '0 1px 1px rgba(0,0,0,0.35)',
        ].join(', '),
    },
    black: {
        ...BLACK_PIECE_STYLE,
        boxShadow: [
            'inset 0 1.5px 1px rgba(255,255,255,0.22)',
            'inset 0 -2px 3px rgba(0,0,0,0.6)',
            '0 1px 1px rgba(0,0,0,0.5)',
        ].join(', '),
    },
}

const MOVED_STYLE: React.CSSProperties = {
    filter: 'saturate(0.15) brightness(0.75)',
}

export default function GamePiece({ piece, isSelected, hasBall, onClick, isMoving = false }: GamePieceProps) {
    const chipStyle = ON_BOARD_CHIP_STYLE[piece.side]

    return (
        <div
            onClick={onClick}
            style={piece.hasMovedThisTurn ? MOVED_STYLE : undefined}
            className={cn(
                "relative w-[88%] h-[88%] rounded-full cursor-pointer z-10 transition-transform duration-200 ease-out motion-reduce:transition-none",
                isSelected && "ring-4 ring-primary scale-110 z-30",
                isMoving && "scale-[1.08] z-40",
                piece.hasMovedThisTurn && "opacity-70"
            )}
        >
            {/* Ground shadow — light comes from the top-left, so it falls to the
                bottom-right. While moving the chip is "lifted": the shadow drops
                further away, spreads and fades, then snaps back on landing. */}
            <div
                aria-hidden="true"
                data-testid="piece-shadow"
                data-lifted={isMoving ? 'true' : 'false'}
                className={cn(
                    "absolute inset-0 rounded-full bg-black pointer-events-none transition-all duration-200 ease-out motion-reduce:transition-none",
                    isMoving
                        ? "translate-x-[9%] translate-y-[24%] scale-[1.04] opacity-35 blur-[5px]"
                        : "translate-x-[4%] translate-y-[9%] scale-95 opacity-50 blur-[3px]",
                )}
            />

            <div
                data-testid="piece-chip"
                style={chipStyle}
                className="absolute inset-0 rounded-full flex items-center justify-center"
            >
                <PieceIcon type={piece.type} side={piece.side} />

                {hasBall && (
                    <div className="absolute inset-0 rounded-full ring-2 ring-orange-400 pointer-events-none" />
                )}

                {isSelected && (
                    <div className="absolute inset-0 rounded-full animate-pulse motion-reduce:animate-none ring-2 ring-yellow-400 ring-offset-2 ring-offset-transparent" />
                )}
            </div>
        </div>
    )
}
