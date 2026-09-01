import { useEffect, useRef } from 'react'
import { useGameStore } from '../../store/use-game-store'
import { cn } from '../../lib/utils'
import { squareName, SHORT_KEY } from '@scriptonita/chess-football-engine'
import type { MoveHistoryEntry } from '@scriptonita/chess-football-engine'
import { useGameT } from '../../i18n'

interface MoveHistoryProps {
    /** When false, renders without the inner scroll wrapper (handy in tablet panels). */
    scrollable?: boolean
    /** Cap the number of entries displayed; useful in compact tablet panels. */
    limit?: number
    className?: string
}

/**
 * Move history list — chess-style notation grouped by turn.
 * Reads `boardState.moveHistory` and auto-scrolls to the latest entry.
 */
export function MoveHistory({ scrollable = true, limit, className }: MoveHistoryProps) {
    const t = useGameT()
    const boardState = useGameStore(s => s.boardState)
    const scrollRef = useRef<HTMLOListElement>(null)

    const history: MoveHistoryEntry[] = boardState?.moveHistory ?? []
    const visible = limit ? history.slice(-limit) : history
    // Latest at top of the list — easier to scan in narrow panels
    const ordered = [...visible].reverse()

    useEffect(() => {
        if (!scrollable) return
        if (scrollRef.current) scrollRef.current.scrollTop = 0
    }, [history.length, scrollable])

    if (ordered.length === 0) {
        return (
            <p
                className={cn(
                    'font-mono text-[11px] text-fg-muted text-center py-3 px-3',
                    'bg-bg-surface/40 rounded-md',
                    className,
                )}
            >
                {t('history.empty')}
            </p>
        )
    }

    return (
        <ol
            ref={scrollRef}
            aria-label={t('history.title')}
            className={cn(
                'flex flex-col gap-1',
                scrollable && 'h-full overflow-y-auto pr-1',
                className,
            )}
        >
            {ordered.map((entry, i) => {
                const isLatest = i === 0
                const prev = ordered[i - 1]
                const showTurnDivider = !prev || prev.turnNumber !== entry.turnNumber
                return (
                    <li key={`${entry.at}-${i}`} className="flex flex-col gap-1">
                        {showTurnDivider && (
                            <div
                                className="flex items-center gap-2 pt-1"
                                aria-hidden={prev ? 'true' : undefined}
                            >
                                <span className="font-mono text-[9px] tracking-[1px] text-fg-muted uppercase">
                                    {t('history.turn', { n: entry.turnNumber })}
                                </span>
                                <span className="flex-1 h-px bg-border-subtle/60" />
                            </div>
                        )}
                        <HistoryRow entry={entry} isLatest={isLatest} />
                    </li>
                )
            })}
        </ol>
    )
}

interface HistoryRowProps {
    entry: MoveHistoryEntry
    isLatest: boolean
}

function HistoryRow({ entry, isLatest }: HistoryRowProps) {
    const t = useGameT()
    const fromSq = entry.from ? squareName(entry.from) : '—'
    const toSq = squareName(entry.to)
    const pieceShort = t(`pieces.${SHORT_KEY[entry.pieceType]}`)

    let label: string
    switch (entry.type) {
        case 'pass':
            label = t('history.pass', { to: toSq })
            break
        case 'tackle':
            label = t('history.tackle', { to: toSq })
            break
        case 'interception':
            label = t('history.interception', { to: toSq })
            break
        case 'goal':
            label = t('history.goal', { from: fromSq, to: toSq })
            break
        case 'offside':
            label = t('history.offside', { from: fromSq })
            break
        case 'move':
        default:
            label = t('history.move', { piece: pieceShort, from: fromSq, to: toSq })
    }

    const dotColor =
        entry.type === 'goal'         ? 'bg-accent-green' :
        entry.type === 'pass'         ? 'bg-pass-highlight' :
        entry.type === 'interception' ? 'bg-danger' :
        entry.type === 'tackle'       ? 'bg-danger/80' :
        entry.type === 'offside'      ? 'bg-warning' :
                                        'bg-move-highlight'

    return (
        <div
            className={cn(
                'flex items-center gap-2.5 min-h-[32px] px-3 py-1.5 rounded-md',
                'font-mono text-[11px] leading-tight',
                isLatest
                    ? 'bg-bg-surface-elevated text-fg-primary'
                    : 'bg-bg-surface/60 text-fg-secondary',
                entry.pieceSide === 'black' && 'border-l-2 border-l-fg-primary/30',
                entry.pieceSide === 'white' && 'border-l-2 border-l-fg-primary/80',
            )}
        >
            <span
                aria-hidden="true"
                className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColor)}
            />
            <span className="truncate flex-1">{label}</span>
            {entry.type === 'goal' && (
                <span className="font-anton text-[10px] tracking-[1px] uppercase text-accent-green">
                    GOL
                </span>
            )}
        </div>
    )
}
