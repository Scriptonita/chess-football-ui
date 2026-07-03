/**
 * Tournament bracket model — pure data/logic, no React.
 *
 * Generalizes the "AI Champions" Final-16 bracket that originally lived in the
 * CrazyGames app (`src/lib/tournament/bracket-data.ts`). The bracket is FIXED
 * ("scripted"): the player always occupies the same slot and always meets one
 * real engine AI per round; the other participants are filler teams supplied by
 * the host app, whose matches are pre-simulated with fixed scores arranged so
 * the AI the player must face next always "wins" its way through.
 *
 * Names, colors and avatars are NOT part of this model (see `CompetitorDisplay`)
 * — each host app resolves presentation for a `Competitor` on its own, since
 * brand-safety requirements differ per app (CrazyGames forbids third-party
 * brand names; other apps may not).
 */

export type RoundId = 'round16' | 'quarter' | 'semi' | 'final'

export const ROUND_ORDER: RoundId[] = ['round16', 'quarter', 'semi', 'final']

export type Competitor =
  | { kind: 'player' }
  | { kind: 'ai'; aiId: string }
  | { kind: 'team'; teamId: string }

/** Presentation metadata for a competitor, resolved by the host app. */
export interface CompetitorDisplay {
  name: string
  /** Emoji (player/AI) or initials (team). */
  avatar: string
  /** Accent color for the badge; optional (falls back to the theme). */
  color?: string
}

export interface TournamentMatch {
  id: string
  round: RoundId
  /**
   * Index of the match within its round (0-based), in "slot space": for a round
   * with N matches, indices `0..N/2-1` belong to the right half of the bracket
   * and `N/2..N-1` to the left half (the player's half). A match's winner feeds
   * match `floor(index / 2)` of the next round — see `layoutRadialBracket` for
   * how this indexing maps directly to angular position.
   */
  index: number
  side: 'left' | 'right'
  home: Competitor
  away: Competitor
  /** Fixed scoreline for pre-simulated (non-player) matches. */
  sim?: { homeScore: number; awayScore: number; winner: 'home' | 'away' }
  /** True when one of the competitors is the player (resolves live). */
  isPlayerMatch: boolean
  /** Which engine AI the player faces here (only set on player matches). */
  playerOpponentAiId?: string
}

export interface ScriptedBracketConfig {
  /** Engine AI the player faces in each round, in ascending difficulty. */
  roundAi: Record<RoundId, string>
  /** Ids of the 11 filler teams; order fixes the crosses (see below). */
  fillerTeamIds: string[]
  /** Goals needed to win a match. Informative for the host app; default 3. */
  goalsToWin?: number
}

const player = (): Competitor => ({ kind: 'player' })
const ai = (aiId: string): Competitor => ({ kind: 'ai', aiId })
const team = (teamId: string): Competitor => ({ kind: 'team', teamId })

/**
 * Builds the fifteen matches of the Final-16 scripted bracket.
 *
 * This is a direct 1:1 port of the CrazyGames app's original `BRACKET` table,
 * parametrized on `config.roundAi` / `config.fillerTeamIds` instead of hardcoded
 * ids. The scores are copied verbatim from that table — they are part of the
 * tournament's "script", not derived. NOT written as a generic power-of-2
 * generator: v1 targets 16 participants only, ported literally as instructed.
 */
export function createScriptedBracket(config: ScriptedBracketConfig): TournamentMatch[] {
  const { roundAi, fillerTeamIds: f } = config
  if (f.length < 11) {
    throw new Error(`createScriptedBracket requires at least 11 filler team ids, got ${f.length}`)
  }

  return [
    // ── Round of 16 — right half (indices 0-3; feeds the final from the
    //    opposite side of the player) ──
    {
      id: 'r16-e', round: 'round16', index: 0, side: 'right',
      home: ai(roundAi.final), away: team(f[4]),
      sim: { homeScore: 3, awayScore: 0, winner: 'home' }, // the eventual finalist advances
      isPlayerMatch: false,
    },
    {
      id: 'r16-f', round: 'round16', index: 1, side: 'right',
      home: team(f[5]), away: team(f[6]),
      sim: { homeScore: 2, awayScore: 0, winner: 'home' },
      isPlayerMatch: false,
    },
    {
      id: 'r16-g', round: 'round16', index: 2, side: 'right',
      home: team(f[7]), away: team(f[8]),
      sim: { homeScore: 1, awayScore: 0, winner: 'home' },
      isPlayerMatch: false,
    },
    {
      id: 'r16-h', round: 'round16', index: 3, side: 'right',
      home: team(f[9]), away: team(f[10]),
      sim: { homeScore: 2, awayScore: 1, winner: 'home' },
      isPlayerMatch: false,
    },

    // ── Round of 16 — left half (the player's half; indices 4-7) ──
    {
      id: 'r16-a', round: 'round16', index: 4, side: 'left',
      home: player(), away: ai(roundAi.round16),
      isPlayerMatch: true, playerOpponentAiId: roundAi.round16,
    },
    {
      id: 'r16-b', round: 'round16', index: 5, side: 'left',
      home: ai(roundAi.quarter), away: team(f[0]),
      sim: { homeScore: 3, awayScore: 1, winner: 'home' }, // advances to meet the player in QF
      isPlayerMatch: false,
    },
    {
      id: 'r16-c', round: 'round16', index: 6, side: 'left',
      home: ai(roundAi.semi), away: team(f[1]),
      sim: { homeScore: 3, awayScore: 0, winner: 'home' }, // advances to meet the player in SF
      isPlayerMatch: false,
    },
    {
      id: 'r16-d', round: 'round16', index: 7, side: 'left',
      home: team(f[2]), away: team(f[3]),
      sim: { homeScore: 2, awayScore: 1, winner: 'home' },
      isPlayerMatch: false,
    },

    // ── Quarterfinals — right half (indices 0-1) ──
    {
      id: 'qf-right-top', round: 'quarter', index: 0, side: 'right',
      home: ai(roundAi.final), away: team(f[5]),
      sim: { homeScore: 3, awayScore: 2, winner: 'home' },
      isPlayerMatch: false,
    },
    {
      id: 'qf-right-bottom', round: 'quarter', index: 1, side: 'right',
      home: team(f[7]), away: team(f[9]),
      sim: { homeScore: 1, awayScore: 0, winner: 'home' },
      isPlayerMatch: false,
    },

    // ── Quarterfinals — left half (indices 2-3) ──
    {
      id: 'qf-left-top', round: 'quarter', index: 2, side: 'left',
      home: player(), away: ai(roundAi.quarter),
      isPlayerMatch: true, playerOpponentAiId: roundAi.quarter,
    },
    {
      id: 'qf-left-bottom', round: 'quarter', index: 3, side: 'left',
      home: ai(roundAi.semi), away: team(f[2]),
      sim: { homeScore: 3, awayScore: 1, winner: 'home' }, // reaches the SF from the QF
      isPlayerMatch: false,
    },

    // ── Semifinals ──
    {
      id: 'sf-right', round: 'semi', index: 0, side: 'right',
      home: ai(roundAi.final), away: team(f[7]),
      sim: { homeScore: 3, awayScore: 2, winner: 'home' }, // reaches the final
      isPlayerMatch: false,
    },
    {
      id: 'sf-left', round: 'semi', index: 1, side: 'left',
      home: player(), away: ai(roundAi.semi),
      isPlayerMatch: true, playerOpponentAiId: roundAi.semi,
    },

    // ── Final ──
    {
      id: 'final', round: 'final', index: 0, side: 'left',
      home: player(), away: ai(roundAi.final),
      isPlayerMatch: true, playerOpponentAiId: roundAi.final,
    },
  ]
}

/** All matches for a given round + visual half, ordered by `index` ascending. */
export function matchesFor(bracket: TournamentMatch[], round: RoundId, side: 'left' | 'right'): TournamentMatch[] {
  return bracket
    .filter(m => m.round === round && m.side === side)
    .sort((a, b) => a.index - b.index)
}
