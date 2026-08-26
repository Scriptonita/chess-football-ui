import { useGameStore } from '../../store/use-game-store'
import { PieceIcon, WHITE_PIECE_STYLE, BLACK_PIECE_STYLE } from './game-piece'
import { Football } from './football'
import { useGameT } from '../../i18n'
import { cn } from '../../lib/utils'

interface BallHolderChipProps {
    className?: string
}

/**
 * §12b: a persistent, always-visible answer to "whose ball is it" — the piece
 * type currently holding the ball, drawn as a mini chip. Additive to the subtle
 * per-piece ring on the board. Renders nothing while the ball is loose.
 *
 * GameBoard shows it in its own toolbar by default; apps with a side panel can
 * pass `toolbar={false}` to the board and place this chip wherever it reads best.
 */
export function BallHolderChip({ className }: BallHolderChipProps) {
    const t = useGameT()
    const boardState = useGameStore(s => s.boardState)
    const holder = boardState?.pieces.find(p => p.id === boardState.ball.holderId) ?? null
    if (!holder) return null

    return (
        <div className={cn('flex items-center gap-1.5 min-h-[1.75rem]', className)} aria-live="polite">
            <div
                style={holder.side === 'white' ? WHITE_PIECE_STYLE : BLACK_PIECE_STYLE}
                className="relative w-7 h-7 flex items-center justify-center rounded-full shrink-0"
            >
                <PieceIcon type={holder.type} side={holder.side} />
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-bg-secondary border border-border-subtle">
                    <div className="w-2.5 h-2.5"><Football /></div>
                </div>
            </div>
            <span className="font-inter text-[11px] text-fg-secondary">
                {t('ballHolder')}: {t(`pieces.${holder.type}`)}
            </span>
        </div>
    )
}
