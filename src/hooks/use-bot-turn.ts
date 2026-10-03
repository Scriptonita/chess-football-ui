import { useCallback, useEffect, useRef, useState } from 'react'
import { checkGoal } from '@scriptonita/chess-football-engine'
import type { BoardState, Side } from '@scriptonita/chess-football-engine'

/**
 * Pause between the turn changing hands and the bot's first action. Long enough
 * for "the rival is playing" to register, short enough to stay under the ~400 ms
 * at which waiting starts to feel like waiting.
 */
export const BOT_TURN_START_DELAY_MS = 400

/**
 * How long each bot action stays on screen before the next one. The piece/ball
 * springs settle in 300–500 ms, so 900 ms leaves a clear beat between actions.
 */
export const BOT_TURN_STEP_MS = 900

/**
 * How long the LAST action stays before the turn is handed over. Nothing follows
 * it, so it only needs its animation to land — the board then stays as it is,
 * under the player's control. The closing end-of-turn state is applied at that
 * same moment, without a step of its own (nothing moves in it).
 *
 * A full 5-AP turn is 400 + 4 × 900 + 500 = 4.5 s, which leaves half a second
 * of slack under 5 s for a slow search or a slow network.
 */
export const BOT_TURN_SETTLE_MS = 500

// The turn provider is called a beat after the "bot is playing" state is set, so
// a synchronous (local) search cannot block the frame that paints that state.
const PROVIDER_DEFER_MS = 30

/**
 * What a turn provider must hand back. It is the shape of the engine's
 * `playBotTurn` result (engine ≥ 0.7.0), so a local provider returns that as-is;
 * a server-backed one rebuilds it from its response.
 */
export interface BotTurnPlayback {
    /** Board after each applied action, in order. Must not be empty. */
    states: BoardState[]
    /** True when the last state is a bare end-of-turn: it gets no display step. */
    closedByEndTurn?: boolean
    /** Side that scored during the turn, if any. */
    goalScored?: Side | null
}

export interface UseBotTurnOptions {
    /** Current board; the bot plays when `boardState.turn === botSide`. */
    boardState: BoardState | null
    /** The side the bot plays. */
    botSide: Side
    /**
     * Where the turn comes from. Local apps call the engine's `playBotTurn`;
     * server-backed apps fetch it. Rejecting (or throwing) surfaces `error`.
     */
    getTurn: (boardState: BoardState, botSide: Side) => BotTurnPlayback | Promise<BotTurnPlayback>
    /** Apply one board state (usually the store's `setBoardState`). */
    onApplyState: (state: BoardState) => void
    /** Extra gate on top of the turn check (match loaded, board installed…). Default true. */
    enabled?: boolean
    /** True once the match is decided: the bot must not play. */
    matchOver?: boolean
    /** True while a goal celebration is on screen: the bot waits for the kickoff. */
    goalPending?: boolean
    /** Called once the turn has fully played out, if the bot scored in it. */
    onGoal?: (scorer: Side, lastState: BoardState) => void
    /** Notified when the bot starts (true) / stops (false) playing. */
    onProcessingChange?: (processing: boolean) => void
    /** Override the default pacing (tests, debug). */
    startDelayMs?: number
    stepMs?: number
    settleMs?: number
}

export interface UseBotTurnResult {
    /** True from the moment the bot's turn starts until its last state is applied. */
    botThinking: boolean
    /** Set when the provider failed; the turn is still the bot's, so offer `retry`. */
    error: Error | null
    /** Clear the error and run the bot's turn again. */
    retry: () => void
    /** Jump straight to the end of the turn being replayed (a tap from an impatient player). */
    skip: () => void
}

/**
 * Owns a bot's turn end to end: the entry gates, the timed replay of its states,
 * cancellation on unmount, error + retry, and skip. It used to live once per app
 * (and, in one of them, once per route) with different timings in each copy.
 */
export function useBotTurn(opts: UseBotTurnOptions): UseBotTurnResult {
    const [botThinking, setBotThinking] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const [retryNonce, setRetryNonce] = useState(0)

    // Read the latest options inside the narrowly-keyed effect so callbacks and
    // board values never go stale.
    const optsRef = useRef(opts)
    optsRef.current = opts

    // `pending` is a ref, not the `botThinking` state: React StrictMode replays
    // mount → unmount → mount while state survives, so gating on state would
    // leave the bot "thinking" forever after the simulated unmount cancelled it.
    const pending = useRef(false)
    const runId = useRef(0)
    const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
    const skipRef = useRef<(() => void) | null>(null)

    const clearTimers = () => {
        timers.current.forEach(clearTimeout)
        timers.current.clear()
    }

    // The game store is a module-global singleton: a timer that outlives this
    // screen would write the old match's board into the next one.
    useEffect(() => () => {
        runId.current++
        clearTimers()
        pending.current = false
        skipRef.current = null
    }, [])

    const { boardState, enabled = true, matchOver = false, goalPending = false } = opts

    useEffect(() => {
        const o = optsRef.current
        const board = o.boardState
        if (!board || !enabled || board.turn !== o.botSide) return
        if (pending.current || matchOver || goalPending) return
        // A goal is waiting to be celebrated and the board is about to reset:
        // playing over it would overwrite the kickoff.
        if (checkGoal(board)) return

        const run = ++runId.current
        const alive = () => runId.current === run
        const wait = (ms: number) => new Promise<void>((resolve) => {
            const id = setTimeout(() => { timers.current.delete(id); resolve() }, ms)
            timers.current.add(id)
        })
        const settle = () => {
            pending.current = false
            skipRef.current = null
            setBotThinking(false)
            optsRef.current.onProcessingChange?.(false)
        }

        pending.current = true
        setBotThinking(true)
        setError(null)
        o.onProcessingChange?.(true)

        let skipRequested = false
        skipRef.current = () => { skipRequested = true }

        const startDelay = o.startDelayMs ?? BOT_TURN_START_DELAY_MS
        const stepMs = o.stepMs ?? BOT_TURN_STEP_MS
        const settleMs = o.settleMs ?? BOT_TURN_SETTLE_MS

        ;(async () => {
            try {
                const [turn] = await Promise.all([
                    wait(Math.min(PROVIDER_DEFER_MS, startDelay)).then(() => o.getTurn(board, o.botSide)),
                    wait(startDelay),
                ])
                if (!alive()) return
                if (!turn?.states?.length) throw new Error('Bot turn returned no states')

                const { states } = turn
                const last = states[states.length - 1]
                // The closing end-of-turn state rides along with the finish instead
                // of taking a display step.
                const shown = turn.closedByEndTurn ? states.length - 1 : states.length

                const finish = () => {
                    clearTimers()
                    optsRef.current.onApplyState(last)
                    settle()
                    const scorer = turn.goalScored ?? null
                    if (scorer) optsRef.current.onGoal?.(scorer, last)
                }
                skipRef.current = () => { if (alive()) finish() }
                if (skipRequested) { finish(); return }

                for (let i = 0; i < shown; i++) {
                    optsRef.current.onApplyState(states[i])
                    await wait(i === shown - 1 ? settleMs : stepMs)
                    // `skip` and unmount both clear the timers, so a cancelled wait
                    // never resolves and this loop simply stops here.
                    if (!alive()) return
                }
                finish()
            } catch (err) {
                if (!alive()) return
                // The turn is still the bot's and nothing this effect depends on
                // changed, so it will not re-run by itself: without an error the
                // player can retry, the match would stall on the bot's turn.
                clearTimers()
                settle()
                setError(err instanceof Error ? err : new Error(String(err)))
            }
        })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boardState?.turn, enabled, matchOver, goalPending, retryNonce])

    const retry = useCallback(() => {
        setError(null)
        setRetryNonce((n) => n + 1)
    }, [])
    const skip = useCallback(() => { skipRef.current?.() }, [])

    return { botThinking, error, retry, skip }
}
