import { describe, expect, it } from 'vitest'
import { createScriptedBracket, matchesFor, ROUND_ORDER, type ScriptedBracketConfig } from './model'

const CONFIG: ScriptedBracketConfig = {
  roundAi: {
    round16: 'ai-round16',
    quarter: 'ai-quarter',
    semi: 'ai-semi',
    final: 'ai-final',
  },
  fillerTeamIds: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11'],
}

describe('createScriptedBracket', () => {
  const bracket = createScriptedBracket(CONFIG)

  it('has fifteen matches', () => {
    expect(bracket).toHaveLength(15)
  })

  it('places the player in exactly four matches, always as home', () => {
    const playerMatches = bracket.filter(m => m.isPlayerMatch)
    expect(playerMatches).toHaveLength(4)
    expect(playerMatches.map(m => m.round).sort()).toEqual([...ROUND_ORDER].sort())
    for (const m of playerMatches) {
      expect(m.home).toEqual({ kind: 'player' })
      expect(m.playerOpponentAiId).toBe(CONFIG.roundAi[m.round])
      expect(m.away).toEqual({ kind: 'ai', aiId: CONFIG.roundAi[m.round] })
    }
  })

  it('has every non-player match resolve with a fixed sim winner', () => {
    for (const m of bracket) {
      if (m.isPlayerMatch) {
        expect(m.sim).toBeUndefined()
      } else {
        expect(m.sim).toBeDefined()
        expect(['home', 'away']).toContain(m.sim!.winner)
      }
    }
  })

  it('scripts each round AI to win every one of its non-player matches up to the player', () => {
    // Invariant: for every round, the AI the player faces there must be the
    // `sim.winner` of every match it appears in on the way to that round.
    for (const round of ROUND_ORDER) {
      const aiId = CONFIG.roundAi[round]
      const aiMatches = bracket.filter(m => !m.isPlayerMatch &&
        ((m.home.kind === 'ai' && m.home.aiId === aiId) || (m.away.kind === 'ai' && m.away.aiId === aiId)))
      for (const m of aiMatches) {
        const winnerCompetitor = m.sim!.winner === 'home' ? m.home : m.away
        expect(winnerCompetitor).toEqual({ kind: 'ai', aiId })
      }
    }
  })

  it('uses all eleven filler team ids', () => {
    const used = new Set<string>()
    for (const m of bracket) {
      for (const c of [m.home, m.away]) {
        if (c.kind === 'team') used.add(c.teamId)
      }
    }
    expect(used.size).toBe(11)
    for (const id of CONFIG.fillerTeamIds) expect(used.has(id)).toBe(true)
  })

  it('throws when fewer than 11 filler ids are provided', () => {
    expect(() => createScriptedBracket({ ...CONFIG, fillerTeamIds: ['f1'] })).toThrow()
  })
})

describe('matchesFor', () => {
  const bracket = createScriptedBracket(CONFIG)

  it('returns matches for a round/side sorted by index', () => {
    const left = matchesFor(bracket, 'round16', 'left')
    expect(left.map(m => m.index)).toEqual([4, 5, 6, 7])
    const right = matchesFor(bracket, 'round16', 'right')
    expect(right.map(m => m.index)).toEqual([0, 1, 2, 3])
  })

  it('the final has a single match', () => {
    expect(matchesFor(bracket, 'final', 'left')).toHaveLength(1)
    expect(matchesFor(bracket, 'final', 'right')).toHaveLength(0)
  })
})
