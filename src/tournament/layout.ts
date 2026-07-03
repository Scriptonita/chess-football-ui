import { ROUND_ORDER, type RoundId, type TournamentMatch } from './model'

export interface RadialLayoutOptions {
  /** Side of the square viewBox. Default 1000. */
  size?: number
  /** Ring radii, outermost (round of 16) to innermost (finalists). Default [420, 300, 190, 95]. */
  ringRadii?: [number, number, number, number]
}

export interface LayoutNode {
  /** `r16-slot-0`..`r16-slot-15` | `<matchId>-winner` | `trophy`. */
  id: string
  x: number
  y: number
  round: RoundId | 'trophy'
}

export interface LayoutConnector {
  /** Straight-line SVG path, child (entrant) → parent (this match's winner slot). */
  d: string
  fromNodeId: string
  toNodeId: string
  matchId: string
}

const DEFAULT_SIZE = 1000
const DEFAULT_RING_RADII: [number, number, number, number] = [420, 300, 190, 95]

/** Round of 16 has 16 outer slots (2 competitors × 8 matches), 22.5° apart. */
const SLOT_COUNT = 16
const SLOT_ANGLE_DEG = 360 / SLOT_COUNT

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Angle (radians) of the center of outer slot `k` (0-15). Slot 0 starts at the
 * top (-90°) and slots proceed clockwise (SVG's Y axis grows downward, so a
 * positive angle step here already reads as clockwise on screen).
 */
function slotAngleRad(slot: number): number {
  return toRad(-90 + (slot + 0.5) * SLOT_ANGLE_DEG)
}

/**
 * Angular position, in continuous "slot space", of the winner of a match —
 * i.e. the midpoint between the centers of the two outer slots that
 * ultimately feed it. Computed with a closed form instead of walking the
 * match tree: a round at tree-depth `d` (0 = round of 16) covers `W = 2^(d+1)`
 * leaf slots per match, so match `index` at that round spans leaf slots
 * `[index·W, index·W + W - 1]` and its midpoint slot-space value is
 * `index·W + W/2`. Always comparing in slot space (never averaging raw
 * degrees) avoids wraparound artefacts at the 0°/360° seam.
 */
function winnerSlotMid(round: RoundId, index: number): number {
  const depth = ROUND_ORDER.indexOf(round)
  const width = 2 ** (depth + 1)
  return index * width + width / 2
}

function winnerAngleRad(round: RoundId, index: number): number {
  return toRad(-90 + winnerSlotMid(round, index) * SLOT_ANGLE_DEG)
}

function pointOnRing(center: number, radius: number, angleRad: number): { x: number; y: number } {
  return {
    x: center + radius * Math.cos(angleRad),
    y: center + radius * Math.sin(angleRad),
  }
}

/** Id of the node representing the winner of a round-of-16/quarter/semi match. */
function winnerNodeId(matchId: string): string {
  return `${matchId}-winner`
}

/**
 * Finds the round-`round`-minus-one match that feeds `side` (home/away) of the
 * match at `round`/`index`. Round of 16 matches have no child match — their
 * entrants are raw outer slots instead (see `entrantNode`).
 */
function childMatch(bracket: TournamentMatch[], round: RoundId, index: number, side: 'home' | 'away'): TournamentMatch {
  const prevRound = ROUND_ORDER[ROUND_ORDER.indexOf(round) - 1]
  const childIndex = side === 'home' ? index * 2 : index * 2 + 1
  const match = bracket.find(m => m.round === prevRound && m.index === childIndex)
  if (!match) {
    throw new Error(`layoutRadialBracket: missing ${prevRound} match at index ${childIndex} (feeds ${round}:${index}:${side})`)
  }
  return match
}

/** Resolves the node id + angle that a match's home/away entrant occupies. */
function entrantNode(bracket: TournamentMatch[], match: TournamentMatch, side: 'home' | 'away'): { id: string; angleRad: number } {
  if (match.round === 'round16') {
    const slot = side === 'home' ? match.index * 2 : match.index * 2 + 1
    return { id: `r16-slot-${slot}`, angleRad: slotAngleRad(slot) }
  }
  const child = childMatch(bracket, match.round, match.index, side)
  return { id: winnerNodeId(child.id), angleRad: winnerAngleRad(child.round, child.index) }
}

/**
 * Node ids a match occupies: its two entrants (home/away) and the node its
 * winner is projected onto (the next ring, or `trophy` for the final).
 * Exported so consumers (e.g. `RadialBracket`) can attach competitor data and
 * match state to the right nodes without re-deriving the id scheme.
 */
export function matchNodeIds(bracket: TournamentMatch[], match: TournamentMatch): { homeId: string; awayId: string; winnerId: string } {
  return {
    homeId: entrantNode(bracket, match, 'home').id,
    awayId: entrantNode(bracket, match, 'away').id,
    winnerId: match.round === 'final' ? 'trophy' : winnerNodeId(match.id),
  }
}

/**
 * Computes the (x, y) position of every bracket node and the straight-line
 * connectors between them, for rendering as a single radial SVG.
 *
 * Layout summary: round of 16 competitors sit on the outermost ring at their
 * raw slot angle; every other match's two entrants are literally the winner
 * nodes of the two round-minus-one matches that feed it (same node reused, no
 * duplication), placed one ring further in; the final's winners converge on a
 * single `trophy` node at the exact center instead of a fifth ring.
 */
export function layoutRadialBracket(
  bracket: TournamentMatch[],
  opts: RadialLayoutOptions = {},
): { nodes: LayoutNode[]; connectors: LayoutConnector[]; center: { x: number; y: number } } {
  const size = opts.size ?? DEFAULT_SIZE
  const ringRadii = opts.ringRadii ?? DEFAULT_RING_RADII
  const c = size / 2
  const center = { x: c, y: c }

  const nodes: LayoutNode[] = []
  const connectors: LayoutConnector[] = []
  const seenNodeIds = new Set<string>()

  const addNode = (node: LayoutNode) => {
    if (seenNodeIds.has(node.id)) return
    seenNodeIds.add(node.id)
    nodes.push(node)
  }

  // Outer ring: the 16 round-of-16 slots.
  for (let slot = 0; slot < SLOT_COUNT; slot++) {
    const { x, y } = pointOnRing(c, ringRadii[0], slotAngleRad(slot))
    addNode({ id: `r16-slot-${slot}`, x, y, round: 'round16' })
  }

  for (const round of ROUND_ORDER) {
    const depth = ROUND_ORDER.indexOf(round)
    const matches = bracket.filter(m => m.round === round)

    for (const match of matches) {
      const home = entrantNode(bracket, match, 'home')
      const away = entrantNode(bracket, match, 'away')

      const isFinal = round === 'final'
      const winnerRingRadius = ringRadii[depth + 1] // undefined for the final round
      const winnerAngle = winnerAngleRad(round, match.index)
      const winnerPoint = isFinal ? center : pointOnRing(c, winnerRingRadius, winnerAngle)
      const winnerId = isFinal ? 'trophy' : winnerNodeId(match.id)

      addNode({ id: winnerId, x: winnerPoint.x, y: winnerPoint.y, round: isFinal ? 'trophy' : round })

      for (const entrant of [home, away]) {
        const from = nodes.find(n => n.id === entrant.id)!
        connectors.push({
          d: `M ${from.x} ${from.y} L ${winnerPoint.x} ${winnerPoint.y}`,
          fromNodeId: entrant.id,
          toNodeId: winnerId,
          matchId: match.id,
        })
      }
    }
  }

  return { nodes, connectors, center }
}
