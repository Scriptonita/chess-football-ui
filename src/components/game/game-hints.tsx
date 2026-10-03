import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { Side } from '@scriptonita/chess-football-engine'
import { useGameStore } from '../../store/use-game-store'
import { useGameT } from '../../i18n'
import { cn } from '../../lib/utils'

/**
 * The situations a first-time player gets one sentence about, the first time
 * each one happens. Ordered from most to least specific: when several apply at
 * once, the first one not yet seen wins.
 */
export const GAME_HINT_IDS = ['lastActionPoint', 'hasBall', 'selectPiece', 'start'] as const

export type GameHintId = (typeof GAME_HINT_IDS)[number]

interface GameHintsProps {
    /** The side the player controls; hints only show on that side's turn. */
    userSide: Side | null
    /** Hints the player has already been shown — the app owns where this lives. */
    seen: readonly GameHintId[]
    /** Called once per hint, when it is dismissed or its situation has passed. */
    onSeen: (id: GameHintId) => void
    className?: string
}

/**
 * Contextual, dismissible one-liners that teach the game while it is being
 * played, instead of asking a new player to read the rules first. Reads the
 * game store to recognise each situation; the host app decides when to mount
 * it (e.g. only during the first match) and where to persist `seen`.
 */
export function GameHints({ userSide, seen, onSeen, className }: GameHintsProps) {
    const t = useGameT()
    const boardState = useGameStore(s => s.boardState)
    const selectedPieceId = useGameStore(s => s.selectedPieceId)
    // Closed or outlived during this mount. Kept locally as well as reported, so a
    // hint never flickers back while the app persists `seen` asynchronously.
    const [done, setDone] = useState<readonly GameHintId[]>([])

    const myTurn = !!boardState && userSide !== null && boardState.turn === userSide
    const selected = myTurn ? boardState.pieces.find(p => p.id === selectedPieceId) : undefined
    const applies: Record<GameHintId, boolean> = {
        lastActionPoint: myTurn && boardState.actionPoints === 1,
        hasBall: !!selected && boardState?.ball.holderId === selected.id,
        selectPiece: !!selected,
        start: myTurn && !selected,
    }
    const current = GAME_HINT_IDS.find(id => applies[id] && !seen.includes(id) && !done.includes(id)) ?? null

    const onSeenRef = useRef(onSeen)
    onSeenRef.current = onSeen
    const markSeen = (id: GameHintId) => {
        setDone(d => (d.includes(id) ? d : [...d, id]))
        onSeenRef.current(id)
    }

    // A hint whose situation has passed did its job: the player has now seen
    // what it described, so it must not come back the next time.
    const shownRef = useRef<GameHintId | null>(null)
    useEffect(() => {
        const prev = shownRef.current
        shownRef.current = current
        if (prev && prev !== current && !done.includes(prev)) markSeen(prev)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current])

    return (
        <div role="status" aria-live="polite" aria-atomic="true" className={cn('pointer-events-none flex justify-center', className)}>
            {current && (
                <div
                    data-testid="game-hint"
                    data-hint={current}
                    className="pointer-events-auto flex items-center gap-1 max-w-sm pl-4 pr-0.5 rounded-xl bg-bg-secondary/95 border border-border-subtle shadow-lg backdrop-blur-sm"
                >
                    <p className="py-2 font-inter text-sm leading-snug text-fg-primary">{t(`hints.${current}`)}</p>
                    <button
                        type="button"
                        onClick={() => markSeen(current)}
                        aria-label={t('hints.dismiss')}
                        className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-fg-muted hover:text-fg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green"
                    >
                        <X size={16} aria-hidden="true" />
                    </button>
                </div>
            )}
        </div>
    )
}
