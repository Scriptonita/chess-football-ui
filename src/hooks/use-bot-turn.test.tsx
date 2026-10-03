import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { StrictMode, useState } from 'react'
import { act, render, renderHook } from '@testing-library/react'
import { applyEndTurn, applyMove, getInitialBoardState, getValidMoves } from '@scriptonita/chess-football-engine'
import type { BoardState, Side } from '@scriptonita/chess-football-engine'
import {
    useBotTurn, BOT_TURN_START_DELAY_MS, BOT_TURN_STEP_MS, BOT_TURN_SETTLE_MS,
    type BotTurnPlayback, type UseBotTurnOptions,
} from './use-bot-turn'

/** A black turn of `moves` real moves, optionally closed by a bare end-of-turn. */
function blackTurn(moves: number, closedByEndTurn = true): { start: BoardState; turn: BotTurnPlayback } {
    const start = getInitialBoardState('black')
    const states: BoardState[] = []
    let s = start
    for (const piece of start.pieces.filter((p) => p.side === 'black')) {
        if (states.length === moves) break
        const to = getValidMoves(piece, s)[0]
        if (!to) continue
        s = applyMove(s, piece.id, to).boardState
        states.push(s)
    }
    expect(states).toHaveLength(moves)
    if (closedByEndTurn) states.push(applyEndTurn(s))
    return { start, turn: { states, closedByEndTurn, goalScored: null } }
}

/** Mounts the hook wired to a tiny board holder, the way an app wires it to the store. */
function mount(start: BoardState, extra: Partial<UseBotTurnOptions> & Pick<UseBotTurnOptions, 'getTurn'>) {
    const applied: BoardState[] = []
    const hook = renderHook((props: Partial<UseBotTurnOptions>) => {
        const [board, setBoard] = useState<BoardState | null>(start)
        const result = useBotTurn({
            boardState: board,
            botSide: 'black',
            onApplyState: (s) => { applied.push(s); setBoard(s) },
            ...extra,
            ...props,
        })
        return { ...result, board, setBoard }
    }, { initialProps: {} })
    return { ...hook, applied }
}

const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('useBotTurn — pacing', () => {
    it('shows the first action after the start delay and one action per step', async () => {
        const { start, turn } = blackTurn(3)
        const { result, applied } = mount(start, { getTurn: () => turn })

        expect(result.current.botThinking).toBe(true)
        await advance(BOT_TURN_START_DELAY_MS - 1)
        expect(applied).toHaveLength(0)
        await advance(1)
        expect(applied).toEqual([turn.states[0]])
        await advance(BOT_TURN_STEP_MS)
        expect(applied).toEqual([turn.states[0], turn.states[1]])
    })

    it('a full 5-action turn ends in under 5 s', async () => {
        // The fifth action spends the last action point, so the engine has already
        // handed the turn over: there is no closing end-of-turn state.
        const { start, turn } = blackTurn(5, false)
        expect(turn.states[4].turn).toBe('white')
        const { result, applied } = mount(start, { getTurn: () => turn })

        const total = BOT_TURN_START_DELAY_MS + 4 * BOT_TURN_STEP_MS + BOT_TURN_SETTLE_MS
        // Half a second of slack for the search / the network, not a photo finish.
        expect(total).toBeLessThanOrEqual(4500)
        await advance(total - 1)
        expect(result.current.botThinking).toBe(true)
        await advance(1)
        expect(applied.slice(0, 5)).toEqual(turn.states)
        expect(result.current.board).toBe(turn.states[4])
        expect(result.current.botThinking).toBe(false)
    })

    it('applies the closing end-of-turn state without a step of its own', async () => {
        const { start, turn } = blackTurn(3)
        const { result, applied } = mount(start, { getTurn: () => turn })

        await advance(BOT_TURN_START_DELAY_MS + 2 * BOT_TURN_STEP_MS + BOT_TURN_SETTLE_MS - 1)
        expect(applied).toHaveLength(3)
        expect(result.current.botThinking).toBe(true)

        await advance(1)
        expect(result.current.board).toBe(turn.states[3])
        expect(result.current.board!.turn).toBe('white')
        expect(result.current.botThinking).toBe(false)
    })

    it('lets the last action land (settle) before handing the turn over', async () => {
        const { start, turn } = blackTurn(2, false)
        const { result, applied } = mount(start, { getTurn: () => turn })

        await advance(BOT_TURN_START_DELAY_MS + BOT_TURN_STEP_MS)
        expect(applied).toHaveLength(2)
        expect(result.current.botThinking).toBe(true)
        await advance(BOT_TURN_SETTLE_MS - 1)
        expect(result.current.botThinking).toBe(true)
        await advance(1)
        expect(result.current.botThinking).toBe(false)
    })

    it('waits for a slow provider instead of the start delay', async () => {
        const { start, turn } = blackTurn(1)
        let resolve!: (t: BotTurnPlayback) => void
        const { result, applied } = mount(start, { getTurn: () => new Promise<BotTurnPlayback>((r) => { resolve = r }) })

        await advance(2000)
        expect(applied).toHaveLength(0)
        expect(result.current.botThinking).toBe(true)
        await act(async () => { resolve(turn) })
        expect(applied).toEqual([turn.states[0]])
    })
})

describe('useBotTurn — gates', () => {
    const gated = async (props: Partial<UseBotTurnOptions>, start = blackTurn(1).start) => {
        const getTurn = vi.fn(() => blackTurn(1).turn)
        const hook = mount(start, { getTurn, ...props })
        await advance(5000)
        return { getTurn, ...hook }
    }

    it('does not play on the human turn', async () => {
        const { getTurn, result } = await gated({}, getInitialBoardState('white'))
        expect(getTurn).not.toHaveBeenCalled()
        expect(result.current.botThinking).toBe(false)
    })

    it('does not play while disabled, with the match over, or during a goal celebration', async () => {
        for (const props of [{ enabled: false }, { matchOver: true }, { goalPending: true }]) {
            const { getTurn } = await gated(props)
            expect(getTurn, JSON.stringify(props)).not.toHaveBeenCalled()
        }
    })

    it('does not play over a board that still holds an uncelebrated goal', async () => {
        const start = getInitialBoardState('black')
        const goalBoard: BoardState = {
            ...start,
            lastMove: { type: 'goal', to: { x: 4, y: 11 }, playerId: 'white_queen_4_5', at: 1 },
        }
        const { getTurn } = await gated({}, goalBoard)
        expect(getTurn).not.toHaveBeenCalled()
    })

    it('starts once the goal celebration clears', async () => {
        const { start, turn } = blackTurn(1)
        const getTurn = vi.fn(() => turn)
        const { rerender, applied } = mount(start, { getTurn, goalPending: true })
        await advance(2000)
        expect(getTurn).not.toHaveBeenCalled()

        rerender({ goalPending: false })
        await advance(BOT_TURN_START_DELAY_MS)
        expect(applied).toEqual([turn.states[0]])
    })

    it('plays again when the turn comes back to the bot', async () => {
        const { start, turn } = blackTurn(1)
        const getTurn = vi.fn((_board: BoardState, _side: Side) => turn)
        const { result } = mount(start, { getTurn })
        await advance(5000)
        expect(getTurn).toHaveBeenCalledTimes(1)
        expect(result.current.board!.turn).toBe('white')

        act(() => { result.current.setBoard(applyEndTurn(result.current.board!)) })
        await advance(5000)
        expect(getTurn).toHaveBeenCalledTimes(2)
        expect(getTurn.mock.calls[1][1]).toBe('black')
    })
})

describe('useBotTurn — goal, skip, errors, lifecycle', () => {
    it('reports a bot goal only after its last state is on screen', async () => {
        const { start, turn } = blackTurn(2, false)
        const onGoal = vi.fn()
        mount(start, { getTurn: () => ({ ...turn, goalScored: 'black' }), onGoal })

        await advance(BOT_TURN_START_DELAY_MS + BOT_TURN_STEP_MS)
        expect(onGoal).not.toHaveBeenCalled()
        await advance(BOT_TURN_SETTLE_MS)
        expect(onGoal).toHaveBeenCalledExactlyOnceWith('black', turn.states[1])
    })

    it('skip jumps to the final state at once', async () => {
        const { start, turn } = blackTurn(4)
        const { result, applied } = mount(start, { getTurn: () => turn })
        await advance(BOT_TURN_START_DELAY_MS)
        expect(applied).toHaveLength(1)

        act(() => { result.current.skip() })
        expect(result.current.board).toBe(turn.states[4])
        expect(result.current.botThinking).toBe(false)

        // Nothing left running: the skipped steps must never be applied late.
        await advance(10_000)
        expect(applied).toEqual([turn.states[0], turn.states[4]])
    })

    it('skip before the turn has arrived applies the final state as soon as it does', async () => {
        const { start, turn } = blackTurn(3)
        const { result, applied } = mount(start, { getTurn: () => turn })
        act(() => { result.current.skip() })
        await advance(BOT_TURN_START_DELAY_MS)
        expect(applied).toEqual([turn.states[3]])
        expect(result.current.botThinking).toBe(false)
    })

    it('surfaces a provider failure and replays the turn on retry', async () => {
        const { start, turn } = blackTurn(1)
        const getTurn = vi.fn<UseBotTurnOptions['getTurn']>()
            .mockRejectedValueOnce(new Error('Bot not found'))
            .mockResolvedValue(turn)
        const onProcessingChange = vi.fn()
        const { result, applied } = mount(start, { getTurn, onProcessingChange })

        await advance(BOT_TURN_START_DELAY_MS)
        expect(result.current.error?.message).toBe('Bot not found')
        expect(result.current.botThinking).toBe(false)
        expect(onProcessingChange.mock.calls.map((c) => c[0])).toEqual([true, false])
        expect(applied).toHaveLength(0)

        act(() => { result.current.retry() })
        expect(result.current.error).toBeNull()
        await advance(5000)
        expect(applied.at(-1)).toBe(turn.states.at(-1))
    })

    it('treats an empty turn as a failure rather than hanging', async () => {
        const { result } = mount(blackTurn(1).start, { getTurn: () => ({ states: [] }) })
        await advance(BOT_TURN_START_DELAY_MS)
        expect(result.current.error).not.toBeNull()
        expect(result.current.botThinking).toBe(false)
    })

    it('applies nothing after unmount', async () => {
        const { start, turn } = blackTurn(3)
        const { unmount, applied } = mount(start, { getTurn: () => turn })
        await advance(BOT_TURN_START_DELAY_MS)
        expect(applied).toHaveLength(1)
        unmount()
        await advance(10_000)
        expect(applied).toHaveLength(1)
    })

    it('still plays under React StrictMode (mount → unmount → mount)', async () => {
        const { start, turn } = blackTurn(1)
        const applied: BoardState[] = []
        function Harness() {
            const [board, setBoard] = useState<BoardState | null>(start)
            useBotTurn({
                boardState: board,
                botSide: 'black',
                getTurn: () => turn,
                onApplyState: (s) => { applied.push(s); setBoard(s) },
            })
            return null
        }
        render(<StrictMode><Harness /></StrictMode>)
        await advance(5000)
        expect(applied).toEqual(turn.states)
    })
})
