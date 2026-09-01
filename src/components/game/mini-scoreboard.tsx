import { useGameStore } from '../../store/use-game-store'
import { cn } from '../../lib/utils'
import { useGameT } from '../../i18n'

interface MiniScoreboardProps {
    creatorUsername: string
    opponentUsername: string
    userSide?: 'white' | 'black' | null
    className?: string
}

/**
 * Compact scoreboard shown above the board on tablet/desktop. Renders only the
 * grouped name + score per side — no avatars, since the side panels already show them.
 */
export function MiniScoreboard({
    creatorUsername,
    opponentUsername,
    userSide,
    className,
}: MiniScoreboardProps) {
    const t = useGameT()
    const { boardState } = useGameStore()
    if (!boardState?.score) return null

    const { score, turn } = boardState

    const myScore    = userSide === 'white' ? score.white : score.black
    const rivalScore = userSide === 'white' ? score.black : score.white
    const myName     = userSide === 'white' ? creatorUsername : opponentUsername
    const rivalName  = userSide === 'white' ? opponentUsername : creatorUsername
    const myTeam     = userSide === 'white' ? t('teamWhite') : t('teamBlack')
    const rivalTeam  = userSide === 'white' ? t('teamBlack') : t('teamWhite')
    const isMyTurn   = turn === userSide

    return (
        <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={cn(
                'w-full max-w-[540px] rounded-xl bg-bg-surface border border-border-subtle',
                'flex items-center justify-between gap-4 px-5 py-3',
                className,
            )}
        >
            {/* El bloque visual se oculta al lector y se sustituye por una única
                frase con nombres y marcador: leído celda a celda, "2" "vs" "1"
                no dice de quién es cada cifra. */}
            <div className="contents" aria-hidden="true">
                <SideCell name={myName} team={myTeam} score={myScore} isActive={isMyTurn} align="left" />

                <span className="font-anton text-base text-fg-muted uppercase tracking-[2px]">
                    vs
                </span>

                <SideCell name={rivalName} team={rivalTeam} score={rivalScore} isActive={!isMyTurn} align="right" />
            </div>

            <span className="sr-only">
                {t('scoreAriaLabel', { me: myName, myScore, rival: rivalName, rivalScore })}
            </span>
        </div>
    )
}

interface SideCellProps {
    name: string
    team: string
    score: number
    isActive: boolean
    align: 'left' | 'right'
}

function SideCell({ name, team, score, isActive, align }: SideCellProps) {
    return (
        <div className={cn('flex flex-col min-w-0', align === 'right' ? 'items-end' : 'items-start')}>
            <span className={cn(
                'font-mono text-[10px] uppercase tracking-[0.5px] truncate max-w-[160px]',
                isActive ? 'text-fg-secondary' : 'text-fg-muted',
            )}>
                {name} · {team}
            </span>
            <span className={cn(
                'font-anton text-[32px] leading-none tabular-nums',
                isActive ? 'text-fg-primary' : 'text-fg-secondary',
            )}>
                {score}
            </span>
        </div>
    )
}
