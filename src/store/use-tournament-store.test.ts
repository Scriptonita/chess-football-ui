import { beforeEach, describe, expect, it } from 'vitest'
import { useTournamentStore } from './use-tournament-store'
import type { ScriptedBracketConfig } from '../tournament/model'

const CONFIG: ScriptedBracketConfig = {
  roundAi: { round16: 'ai-round16', quarter: 'ai-quarter', semi: 'ai-semi', final: 'ai-final' },
  fillerTeamIds: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11'],
}

beforeEach(() => {
  useTournamentStore.getState().reset()
})

describe('useTournamentStore', () => {
  it('progresses won -> won -> won -> won to champion', () => {
    useTournamentStore.getState().startTournament(CONFIG)
    expect(useTournamentStore.getState().currentRound).toBe('round16')

    useTournamentStore.getState().reportResult(true)
    expect(useTournamentStore.getState().currentRound).toBe('quarter')
    expect(useTournamentStore.getState().status).toBe('active')

    useTournamentStore.getState().reportResult(true)
    expect(useTournamentStore.getState().currentRound).toBe('semi')

    useTournamentStore.getState().reportResult(true)
    expect(useTournamentStore.getState().currentRound).toBe('final')

    useTournamentStore.getState().reportResult(true)
    expect(useTournamentStore.getState().status).toBe('champion')
    expect(useTournamentStore.getState().playerMatches.final.result).toBe('won')
  })

  it('marks the run eliminated on a loss', () => {
    useTournamentStore.getState().startTournament(CONFIG)
    useTournamentStore.getState().reportResult(false)
    expect(useTournamentStore.getState().status).toBe('eliminated')
    expect(useTournamentStore.getState().playerMatches.round16.result).toBe('lost')
    expect(useTournamentStore.getState().currentRound).toBe('round16')
  })

  it('revertElimination returns to active with the round back to pending', () => {
    useTournamentStore.getState().startTournament(CONFIG)
    useTournamentStore.getState().reportResult(false)
    useTournamentStore.getState().revertElimination()
    expect(useTournamentStore.getState().status).toBe('active')
    expect(useTournamentStore.getState().playerMatches.round16.result).toBe('pending')
  })

  it('revertElimination is a no-op when not eliminated', () => {
    useTournamentStore.getState().startTournament(CONFIG)
    useTournamentStore.getState().revertElimination()
    expect(useTournamentStore.getState().status).toBe('active')
  })

  it('reset clears the run', () => {
    useTournamentStore.getState().startTournament(CONFIG)
    useTournamentStore.getState().reportResult(true)
    useTournamentStore.getState().reset()
    expect(useTournamentStore.getState().exists).toBe(false)
    expect(useTournamentStore.getState().currentRound).toBe('round16')
    expect(useTournamentStore.getState().config).toBeNull()
  })
})
