import { useGameStore, DEFAULT_MAX_AP } from '../../store/use-game-store'
import { cn } from '../../lib/utils'
import { useGameT } from '../../i18n'
import { Zap } from 'lucide-react'

interface TurnBannerProps {
    isMyTurn: boolean
    /** Override for the "not my turn" label (e.g. "Bot pensando…" in training mode). */
    waitingLabel?: string
    className?: string
}

/**
 * Full-width banner showing whose turn it is.
 * - My turn:  accent-green background + "TU TURNO" + AP counter
 * - Opponent: neutral background + waiting label
 *
 * Absorbs the floating "Bot pensando…" toast in training mode when waitingLabel is set.
 */
export function TurnBanner({ isMyTurn, waitingLabel, className }: TurnBannerProps) {
    const t = useGameT()
    const boardState = useGameStore(s => s.boardState)
    if (!boardState) return null

    const { actionPoints, turnNumber } = boardState
    const maxActionPoints = boardState.maxActionPoints ?? DEFAULT_MAX_AP

    return (
        <div
            className={cn(
                'w-full h-9 flex items-center justify-between px-4 shrink-0 transition-colors duration-300',
                isMyTurn
                    ? 'bg-accent-green/15 border-b border-accent-green/30'
                    : 'bg-bg-surface border-b border-border-subtle',
                className,
            )}
            aria-live="polite"
            aria-atomic="true"
        >
            <div className="flex items-baseline gap-2 min-w-0">
                <span
                    className={cn(
                        'font-anton text-sm tracking-[1.5px] uppercase truncate',
                        isMyTurn ? 'text-accent-green' : 'text-fg-muted',
                    )}
                >
                    {isMyTurn ? t('yourTurn') : (waitingLabel ?? t('waitingRival'))}
                </span>
                {/* In a correspondence game "you are on turn 14" is first-order
                    information. The engine exposes it and nothing rendered it. */}
                {typeof turnNumber === 'number' && (
                    <span className="font-mono text-[10px] text-fg-muted uppercase tracking-[0.5px] shrink-0">
                        {t('history.turn', { n: turnNumber })}
                    </span>
                )}
            </div>

            {isMyTurn && (
                <div className="flex items-center gap-1" aria-label={t('actionPointsAriaLabel', { remaining: actionPoints, total: maxActionPoints })}>
                    <Zap size={12} className="text-accent-green" aria-hidden="true" />
                    <span className="font-mono text-xs text-fg-secondary tabular-nums">
                        {actionPoints}/{maxActionPoints}
                    </span>
                </div>
            )}
        </div>
    )
}
