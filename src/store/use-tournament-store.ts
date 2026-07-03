import { create } from 'zustand'
import { ROUND_ORDER, type RoundId, type ScriptedBracketConfig } from '../tournament/model'

export type TournamentStatus = 'active' | 'eliminated' | 'champion'
export type MatchResult = 'pending' | 'won' | 'lost'

export interface PlayerMatch {
  round: RoundId
  aiId: string
  result: MatchResult
}

interface TournamentState {
  /** Whether a tournament has been started and not reset. */
  exists: boolean
  status: TournamentStatus
  currentRound: RoundId
  /** Per-round result of the player's own matches. */
  playerMatches: Record<RoundId, PlayerMatch>
  /** True until the draw animation has played once for the current tournament. */
  drawn: boolean
  /** Config the tournament was started with — the host app rebuilds the bracket from it. */
  config: ScriptedBracketConfig | null

  startTournament: (config: ScriptedBracketConfig) => void
  markDrawn: () => void
  reportResult: (won: boolean) => void
  /** Reverts the current elimination to replay the same round. The host app decides
   *  when to call this (e.g. after a rewarded ad) — this store has no ad/retry gating. */
  revertElimination: () => void
  reset: () => void
}

function freshMatches(config: ScriptedBracketConfig): Record<RoundId, PlayerMatch> {
  return ROUND_ORDER.reduce((acc, round) => {
    acc[round] = { round, aiId: config.roundAi[round], result: 'pending' }
    return acc
  }, {} as Record<RoundId, PlayerMatch>)
}

const EMPTY_MATCHES = ROUND_ORDER.reduce((acc, round) => {
  acc[round] = { round, aiId: '', result: 'pending' as MatchResult }
  return acc
}, {} as Record<RoundId, PlayerMatch>)

export const useTournamentStore = create<TournamentState>()((set, get) => ({
  exists: false,
  status: 'active',
  currentRound: 'round16',
  playerMatches: EMPTY_MATCHES,
  drawn: false,
  config: null,

  startTournament: (config) =>
    set({
      exists: true,
      status: 'active',
      currentRound: 'round16',
      playerMatches: freshMatches(config),
      drawn: false,
      config,
    }),

  markDrawn: () => set({ drawn: true }),

  reportResult: (won) => {
    const { currentRound, playerMatches } = get()
    const matches = {
      ...playerMatches,
      [currentRound]: { ...playerMatches[currentRound], result: won ? 'won' : 'lost' as MatchResult },
    }

    if (!won) {
      set({ playerMatches: matches, status: 'eliminated' })
      return
    }

    const idx = ROUND_ORDER.indexOf(currentRound)
    const isFinal = idx === ROUND_ORDER.length - 1
    if (isFinal) {
      set({ playerMatches: matches, status: 'champion' })
      return
    }

    set({
      playerMatches: matches,
      currentRound: ROUND_ORDER[idx + 1],
      status: 'active',
    })
  },

  revertElimination: () => {
    const { status, currentRound, playerMatches } = get()
    if (status !== 'eliminated') return
    set({
      status: 'active',
      playerMatches: {
        ...playerMatches,
        [currentRound]: { ...playerMatches[currentRound], result: 'pending' },
      },
    })
  },

  reset: () =>
    set({
      exists: false,
      status: 'active',
      currentRound: 'round16',
      playerMatches: EMPTY_MATCHES,
      drawn: false,
      config: null,
    }),
}))
