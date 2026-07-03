import { useMemo } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { cn } from '../../lib/utils'
import {
  ROUND_ORDER,
  type Competitor,
  type CompetitorDisplay,
  type RoundId,
  type TournamentMatch,
} from '../../tournament/model'
import { layoutRadialBracket, matchNodeIds, type LayoutConnector, type LayoutNode } from '../../tournament/layout'
import type { MatchResult, TournamentStatus } from '../../store/use-tournament-store'

export interface RadialBracketLabels {
  /** Placeholder shown on not-yet-revealed nodes/rounds. */
  tbd: string
  /** Accessible title per round, used to build match aria-labels. */
  rounds: Record<RoundId, string>
  /** aria-label of the whole SVG, e.g. "Tournament bracket". */
  bracket: string
}

export interface RadialBracketProps {
  /** Output of `createScriptedBracket` — the host app should memoize this. */
  bracket: TournamentMatch[]
  /** Resolves presentation metadata for a competitor (name/avatar/color). */
  getDisplay: (c: Competitor) => CompetitorDisplay
  currentRound: RoundId
  status: TournamentStatus
  playerResults: Record<RoundId, MatchResult>
  labels: RadialBracketLabels
  /** True → plays the initial draw animation (stagger the outer badges in). */
  animateDraw?: boolean
  className?: string
}

type NodeState = 'winner' | 'loser' | 'neutral' | 'current'

interface ResolvedMatch {
  homeState: NodeState
  awayState: NodeState
  homeScore: number | null
  awayScore: number | null
  isCurrent: boolean
  winner: 'home' | 'away' | null
}

/** Same resolution rules as the CrazyGames app's original `resolveMatch()`. */
function resolveMatchState(match: TournamentMatch, currentRound: RoundId, status: TournamentStatus, playerResults: Record<RoundId, MatchResult>): ResolvedMatch {
  if (match.isPlayerMatch) {
    const result = playerResults[match.round]
    const isCurrent = status === 'active' && currentRound === match.round && result === 'pending'

    let homeState: NodeState = 'neutral'
    let awayState: NodeState = 'neutral'
    if (result === 'won') { homeState = 'winner'; awayState = 'loser' }
    else if (result === 'lost') { homeState = 'loser'; awayState = 'winner' }
    else if (isCurrent) { homeState = 'current'; awayState = 'current' }

    return {
      homeState, awayState, homeScore: null, awayScore: null, isCurrent,
      winner: result === 'won' ? 'home' : result === 'lost' ? 'away' : null,
    }
  }

  const sim = match.sim!
  return {
    homeState: sim.winner === 'home' ? 'winner' : 'loser',
    awayState: sim.winner === 'away' ? 'winner' : 'loser',
    homeScore: sim.homeScore,
    awayScore: sim.awayScore,
    isCurrent: false,
    winner: sim.winner,
  }
}

/** Badge outer radius per ring depth (round of 16 → finalists), growing slightly inward. */
const BADGE_RADIUS: Record<RoundId, number> = { round16: 32, quarter: 36, semi: 40, final: 44 }

interface MatchInfo {
  match: TournamentMatch
  ids: { homeId: string; awayId: string; winnerId: string }
  resolved: ResolvedMatch
  /** Whether this match's winner (shown on the next ring) is currently revealed. */
  winnerRevealed: boolean
}

export default function RadialBracket({
  bracket, getDisplay, currentRound, status, playerResults, labels, animateDraw = false, className,
}: RadialBracketProps) {
  const layout = useMemo(() => layoutRadialBracket(bracket), [bracket])
  const nodeMap = useMemo(() => new Map(layout.nodes.map(n => [n.id, n])), [layout])

  const currentIdx = ROUND_ORDER.indexOf(currentRound)
  const isRevealed = (r: RoundId) => ROUND_ORDER.indexOf(r) <= currentIdx
  const justRevealed = (r: RoundId) => !animateDraw && r === currentRound && currentIdx > 0 && status !== 'eliminated'

  const matchInfos = useMemo<MatchInfo[]>(() => bracket.map((match) => {
    const ids = matchNodeIds(bracket, match)
    const resolved = resolveMatchState(match, currentRound, status, playerResults)
    const depth = ROUND_ORDER.indexOf(match.round)
    const nextRound = ROUND_ORDER[depth + 1]
    const winnerRevealed = match.round === 'final' ? status === 'champion' : isRevealed(nextRound)
    return { match, ids, resolved, winnerRevealed }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [bracket, currentRound, status, playerResults])

  const matchById = useMemo(() => new Map(matchInfos.map(mi => [mi.match.id, mi])), [matchInfos])

  const entrantOwner = useMemo(() => {
    const map = new Map<string, { match: TournamentMatch; side: 'home' | 'away'; resolved: ResolvedMatch }>()
    for (const mi of matchInfos) {
      if (mi.match.round !== 'round16') continue
      map.set(mi.ids.homeId, { match: mi.match, side: 'home', resolved: mi.resolved })
      map.set(mi.ids.awayId, { match: mi.match, side: 'away', resolved: mi.resolved })
    }
    return map
  }, [matchInfos])

  const winnerOwner = useMemo(() => {
    const map = new Map<string, MatchInfo>()
    for (const mi of matchInfos) {
      if (mi.match.round === 'final') continue
      map.set(mi.ids.winnerId, mi)
    }
    return map
  }, [matchInfos])

  const trophyNode = nodeMap.get('trophy')!
  const finalMatchInfo = matchById.get('final')

  /** Stagger index for the initial draw, in outer-slot order. */
  const drawIndex = (nodeId: string) => {
    const m = nodeId.match(/^r16-slot-(\d+)$/)
    return m ? Number(m[1]) : 0
  }

  return (
    <MotionConfig reducedMotion="user">
      <svg
        viewBox="0 0 1000 1000"
        role="img"
        aria-label={labels.bracket}
        className={cn('w-full h-auto', className)}
      >
        <title>{labels.bracket}</title>

        <g aria-hidden="true">
          {layout.connectors.map((conn) => {
            const mi = matchById.get(conn.matchId)
            if (!mi) return null
            return (
              <ConnectorLine
                key={`${conn.fromNodeId}->${conn.toNodeId}`}
                conn={conn}
                matchInfo={mi}
                getDisplay={getDisplay}
                animateDraw={animateDraw && mi.match.round === 'round16'}
                delay={animateDraw && mi.match.round === 'round16' ? drawIndex(conn.fromNodeId) * 0.08 : 0}
              />
            )
          })}
        </g>

        <TrophyBadge node={trophyNode} status={status} finalMatchInfo={finalMatchInfo} getDisplay={getDisplay} />

        <g role="list">
          {layout.nodes.map((node) => {
            if (node.id === 'trophy') return null

            const entrant = entrantOwner.get(node.id)
            if (entrant) {
              const state = entrant.side === 'home' ? entrant.resolved.homeState : entrant.resolved.awayState
              const competitor = entrant.side === 'home' ? entrant.match.home : entrant.match.away
              const score = entrant.side === 'home' ? entrant.resolved.homeScore : entrant.resolved.awayScore
              const display = getDisplay(competitor)
              return (
                <MatchBadge
                  key={node.id}
                  node={node}
                  round={entrant.match.round}
                  display={display}
                  state={state}
                  score={score}
                  isPlayer={competitor.kind === 'player'}
                  revealed
                  animateDraw={animateDraw}
                  delay={animateDraw ? drawIndex(node.id) * 0.08 : 0}
                  reveal={false}
                  ariaLabel={ariaLabelForEntrant(labels, entrant.match, display, state, score)}
                />
              )
            }

            const winnerMi = winnerOwner.get(node.id)
            if (winnerMi) {
              const { match, resolved, winnerRevealed } = winnerMi
              const winnerCompetitor = resolved.winner === 'home' ? match.home : resolved.winner === 'away' ? match.away : null
              const display = winnerCompetitor ? getDisplay(winnerCompetitor) : null
              const nextRound = ROUND_ORDER[ROUND_ORDER.indexOf(match.round) + 1]
              return (
                <MatchBadge
                  key={node.id}
                  node={node}
                  round={nextRound}
                  display={display}
                  state="neutral"
                  score={null}
                  isPlayer={winnerCompetitor?.kind === 'player'}
                  revealed={winnerRevealed && !!display}
                  animateDraw={false}
                  delay={0}
                  reveal={winnerRevealed && justRevealed(nextRound)}
                  tbdLabel={labels.tbd}
                  ariaLabel={winnerRevealed && display
                    ? `${labels.rounds[nextRound] ?? nextRound}: ${display.name}`
                    : `${labels.rounds[nextRound] ?? nextRound}: ${labels.tbd}`}
                />
              )
            }

            return null
          })}
        </g>
      </svg>
    </MotionConfig>
  )
}

function ariaLabelForEntrant(labels: RadialBracketLabels, match: TournamentMatch, display: CompetitorDisplay, state: NodeState, score: number | null): string {
  const roundLabel = labels.rounds[match.round] ?? match.round
  const suffix = state === 'current' ? ', pending' : score !== null ? `, ${score}` : ''
  return `${roundLabel}: ${display.name}${suffix}`
}

function TrophyBadge({ node, status, finalMatchInfo, getDisplay }: {
  node: LayoutNode
  status: TournamentStatus
  finalMatchInfo?: MatchInfo
  getDisplay: (c: Competitor) => CompetitorDisplay
}) {
  const isChampion = status === 'champion'
  const championDisplay = isChampion && finalMatchInfo?.resolved.winner
    ? getDisplay(finalMatchInfo.resolved.winner === 'home' ? finalMatchInfo.match.home : finalMatchInfo.match.away)
    : null

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      <motion.g
        animate={isChampion ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={isChampion ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
      >
        <circle r={44} className={cn('fill-bg-surface', isChampion ? 'stroke-move-highlight' : 'stroke-border-subtle')} strokeWidth={2} />
        <foreignObject x={-16} y={-16} width={32} height={32}>
          <Trophy className={cn('w-8 h-8', isChampion ? 'text-move-highlight' : 'text-fg-muted')} aria-hidden="true" />
        </foreignObject>
      </motion.g>
      {championDisplay && (
        <motion.g
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.3 }}
        >
          <circle r={22} cy={54} className="fill-accent-green/20 stroke-accent-green" strokeWidth={2} />
          <text y={54} textAnchor="middle" dominantBaseline="central" className="fill-fg-primary text-[16px] font-semibold" aria-hidden="true">
            {championDisplay.avatar}
          </text>
        </motion.g>
      )}
    </g>
  )
}

function MatchBadge({
  node, round, display, state, score, isPlayer, revealed, animateDraw, delay, reveal, tbdLabel, ariaLabel,
}: {
  node: LayoutNode
  round: RoundId
  display: CompetitorDisplay | null
  state: NodeState
  score: number | null
  isPlayer: boolean
  revealed: boolean
  animateDraw: boolean
  delay: number
  reveal: boolean
  tbdLabel?: string
  ariaLabel: string
}) {
  const radius = BADGE_RADIUS[round] ?? 28
  const initial = reveal
    ? { opacity: 0, scale: 0.9 }
    : animateDraw
      ? { opacity: 0, scale: 0.8 }
      : false

  // Positioning lives on a plain (non-motion) `<g>`: framer-motion manages the SVG
  // `transform` attribute itself whenever it animates a transform-like value (scale,
  // x, y, ...), which would silently overwrite a hand-set `transform="translate(...)"`
  // on the same element and collapse every badge back to the origin. Animating scale
  // on an inner `motion.g` instead keeps positioning and animation independent.
  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      <motion.g
        role="listitem"
        aria-label={ariaLabel}
        initial={initial}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay, duration: reveal ? 0.45 : 0.3, type: reveal || animateDraw ? 'spring' : 'tween', stiffness: 220, damping: 20 }}
        className={cn(state === 'loser' && 'opacity-40 grayscale', state === 'current' && 'animate-pulse')}
      >
        {!revealed || !display ? (
          <>
            <circle r={radius} className="fill-bg-surface/40 stroke-fg-muted" strokeWidth={1.5} strokeDasharray="4 3" />
            <text textAnchor="middle" dominantBaseline="central" className="fill-fg-muted text-[18px]" aria-hidden="true">
              {tbdLabel ?? '?'}
            </text>
          </>
        ) : (
          <>
            <circle
              r={radius}
              style={{ fill: display.color ? `${display.color}33` : undefined, stroke: display.color ?? undefined }}
              className={cn(!display.color && 'fill-bg-surface stroke-fg-muted', state === 'current' && 'stroke-accent-green')}
              strokeWidth={isPlayer ? 3 : 2}
            />
            {isPlayer && <circle r={radius + 4} className="fill-none stroke-accent-green/60" strokeWidth={1.5} />}
            <text textAnchor="middle" dominantBaseline="central" className="fill-fg-primary text-[20px] font-semibold" aria-hidden="true">
              {display.avatar}
            </text>
            {score !== null && (
              <text y={radius + 20} textAnchor="middle" className="fill-fg-muted text-[13px] font-mono tabular-nums" aria-hidden="true">
                {score}
              </text>
            )}
          </>
        )}
      </motion.g>
    </g>
  )
}

function ConnectorLine({ conn, matchInfo, getDisplay, animateDraw, delay }: {
  conn: LayoutConnector
  matchInfo: MatchInfo
  getDisplay: (c: Competitor) => CompetitorDisplay
  animateDraw: boolean
  delay: number
}) {
  const { resolved, winnerRevealed } = matchInfo
  const winnerCompetitor = resolved.winner === 'home' ? matchInfo.match.home : resolved.winner === 'away' ? matchInfo.match.away : null
  const color = winnerRevealed && winnerCompetitor ? getDisplay(winnerCompetitor).color : undefined

  return (
    <motion.path
      d={conn.d}
      fill="none"
      strokeWidth={resolved.isCurrent ? 3 : 1.5}
      style={color ? { stroke: color } : undefined}
      className={cn(
        // fg-muted (not border-subtle) so the bracket's structural lines stay
        // clearly visible even before a match is decided — only the winning
        // path's color and the current match's glow should stand out further.
        !color && 'stroke-fg-muted',
        resolved.isCurrent && 'stroke-accent-green animate-pulse',
      )}
      initial={animateDraw ? { pathLength: 0, opacity: 0 } : false}
      animate={{ pathLength: 1, opacity: winnerRevealed || resolved.isCurrent ? 1 : 0.6 }}
      transition={{ delay, duration: 0.4 }}
    />
  )
}
