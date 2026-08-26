import { useGameStore } from '../../store/use-game-store'
import { getValidMoves, getValidPasses, getPath, isInEnemyArea } from '@scriptonita/chess-football-engine'
import { cn } from '../../lib/utils'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import GamePiece from './game-piece'
import { BallHolderChip } from './ball-holder-chip'
import { KeyboardShortcutsList } from './keyboard-shortcuts'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Side, Position, MoveHistoryEntry } from '@scriptonita/chess-football-engine'
import { Football } from './football'
import { GrassOverlay, PitchMarkings, pitchSquareClass } from './pitch'
import { FILE_LABELS, RANK_LABELS } from '@scriptonita/chess-football-engine'
import { Move, HelpCircle } from 'lucide-react'
import { useGameT } from '../../i18n'

interface GameBoardProps {
    userSide: Side | null
    /** When true, render A-I / 1-12 coordinate guides around the board (tablet+ only). */
    showCoordinates?: boolean
    /** When true, the board is keyboard-operable (arrows move a cursor, Enter acts). */
    keyboardNav?: boolean
    /**
     * Desktop-only row above the grid with the ball-holder chip and the keyboard
     * shortcuts button. Pass `false` when the app renders `BallHolderChip` and
     * `KeyboardShortcutsList` itself (e.g. in a side panel) so nothing is shown twice.
     */
    toolbar?: boolean
}

// Board dimensions
const COLS = 9
const ROWS = 12

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

// Pieces and the ball are positioned with translate transforms instead of
// animating `left`/`top`: each wrapper is exactly one cell wide/tall, so a
// percentage translate of N×100% lands on cell N, and the animation runs on the
// compositor (no layout/paint per frame) — that is what makes the slide smooth.
const cellX = (x: number) => `${x * 100}%`
const cellY = (y: number) => `${(ROWS - 1 - y) * 100}%`

// Critically-damped springs (ratio ≈ 1.0): a firm push-off, a long glide and
// a soft landing with no bounce — a chip sliding across turf, not a rubber
// ball. Settles in roughly half a second regardless of distance, so a long
// rook run still reads as one motion. A carried ball uses the piece's curve
// so it never drifts ahead of or behind its holder; a free ball (pass) is
// lighter and snappier.
const PIECE_SLIDE = { type: 'spring' as const, stiffness: 190, damping: 28, mass: 1 }
const BALL_SLIDE  = { type: 'spring' as const, stiffness: 300, damping: 26, mass: 0.6 }

export default function GameBoard({ userSide, showCoordinates = false, keyboardNav = true, toolbar = true }: GameBoardProps) {
    const t = useGameT()
    const prefersReducedMotion = useReducedMotion()
    const {
        boardState,
        selectedPieceId,
        setSelectedPieceId,
        setInteractionMode,
        movePiece,
        passBall
    } = useGameStore()

    const [cursor, setCursor] = useState<Position | null>(null)
    const [disambiguateAt, setDisambiguateAt] = useState<Position | null>(null)
    const [shortcutsOpen, setShortcutsOpen] = useState(false)
    const shortcutsRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!shortcutsOpen) return
        const onPointerDown = (e: MouseEvent) => {
            if (shortcutsRef.current && !shortcutsRef.current.contains(e.target as Node)) {
                setShortcutsOpen(false)
            }
        }
        document.addEventListener('mousedown', onPointerDown)
        return () => document.removeEventListener('mousedown', onPointerDown)
    }, [shortcutsOpen])
    const [invalidClickAt, setInvalidClickAt] = useState<(Position & { nonce: number }) | null>(null)
    const invalidClickNonceRef = useRef(0)
    const triggerInvalidClickShake = (x: number, y: number) => {
        invalidClickNonceRef.current += 1
        setInvalidClickAt({ x, y, nonce: invalidClickNonceRef.current })
    }
    const [hoveredPassAt, setHoveredPassAt] = useState<Position | null>(null)

    // Pieces currently travelling between squares (framer-motion drives the
    // slide; this only toggles the lift/shadow cue on GamePiece).
    const [movingIds, setMovingIds] = useState<ReadonlySet<string>>(() => new Set())
    const setMoving = (id: string, moving: boolean) =>
        setMovingIds(prev => {
            if (prev.has(id) === moving) return prev
            const next = new Set(prev)
            if (moving) next.add(id); else next.delete(id)
            return next
        })

    useEffect(() => {
        if (!invalidClickAt) return
        const id = setTimeout(() => setInvalidClickAt(null), 100)
        return () => clearTimeout(id)
    }, [invalidClickAt])

    const prevBallRef = useRef(boardState?.ball)
    const prevBall = prevBallRef.current
    useEffect(() => {
        prevBallRef.current = boardState?.ball
    })

    // §4: sequential replay of a just-finished opponent turn — when the turn
    // hands back to userSide and the opponent recorded more than one action,
    // briefly step through each origin/destination before settling on the
    // real last move, so a multi-action turn doesn't read as a single jump.
    const prevTurnRef = useRef(boardState?.turn)
    const [replay, setReplay] = useState<{ steps: MoveHistoryEntry[]; index: number } | null>(null)
    useEffect(() => {
        const prevTurn = prevTurnRef.current
        prevTurnRef.current = boardState?.turn
        if (!boardState || prevTurn === boardState.turn) return

        // Turn moved on again before a replay finished (e.g. a very fast
        // opponent turn) — the in-flight replay is now stale, drop it.
        if (boardState.turn !== userSide) {
            setReplay(null)
            return
        }
        if (prefersReducedMotion || userSide === null) return

        const lastEntry = boardState.moveHistory.at(-1)
        if (!lastEntry) return
        const steps = boardState.moveHistory.filter(
            m => m.turnNumber === lastEntry.turnNumber && m.pieceSide !== userSide,
        )
        if (steps.length > 1) setReplay({ steps, index: 0 })
    }, [boardState, userSide, prefersReducedMotion])

    useEffect(() => {
        if (!replay) return
        if (replay.index >= replay.steps.length - 1) {
            const id = setTimeout(() => setReplay(null), 350)
            return () => clearTimeout(id)
        }
        const id = setTimeout(() => setReplay(r => (r ? { ...r, index: r.index + 1 } : null)), 350)
        return () => clearTimeout(id)
    }, [replay])

    const validMoves = useMemo(() => {
        if (!boardState) return []
        const sp = boardState.pieces.find(p => p.id === selectedPieceId)
        if (sp && !sp.hasMovedThisTurn) {
            return getValidMoves(sp, boardState)
        }
        return []
    }, [boardState, selectedPieceId])

    const validPasses = useMemo(() => {
        if (!boardState) return []
        const sp = boardState.pieces.find(p => p.id === selectedPieceId)
        if (sp && boardState.ball.holderId === sp.id) {
            return getValidPasses(sp, boardState)
        }
        return []
    }, [boardState, selectedPieceId])

    if (!boardState) return null

    const lastMove = boardState.lastMove
    const ball = boardState.ball
    const ballMoved =
        !!prevBall &&
        (prevBall.pos.x !== ball.pos.x || prevBall.pos.y !== ball.pos.y)
    const isPickupOnMove =
        !!prevBall &&
        !prevBall.holderId &&
        !!ball.holderId &&
        lastMove?.type === 'move' &&
        lastMove?.playerId === ball.holderId &&
        ballMoved

    const PICKUP_DURATION = 0.5
    const pickupCarrierId = isPickupOnMove ? ball.holderId : null
    let pickupProportion = 0.5
    if (isPickupOnMove && prevBall && lastMove?.from) {
        const totalSteps = Math.max(
            Math.abs(lastMove.to.x - lastMove.from.x),
            Math.abs(lastMove.to.y - lastMove.from.y),
        )
        const stepsToBall = Math.max(
            Math.abs(prevBall.pos.x - lastMove.from.x),
            Math.abs(prevBall.pos.y - lastMove.from.y),
        )
        pickupProportion = totalSteps > 0
            ? Math.min(0.85, Math.max(0.15, stepsToBall / totalSteps))
            : 0.5
    }

    // §8: Offside risk — ball carrier (non-king) in enemy area during user's turn
    const ballCarrier = ball.holderId
        ? boardState.pieces.find(p => p.id === ball.holderId) ?? null
        : null
    const isOffsideRisk =
        !!ballCarrier &&
        ballCarrier.type !== 'king' &&
        userSide !== null &&
        ballCarrier.side === userSide &&
        boardState.turn === userSide &&
        isInEnemyArea(ballCarrier.pos, ballCarrier.side)

    // §16: pass-trajectory preview — dashed line from the ball carrier to the
    // hovered valid-pass square, red if an opposing piece would intercept it.
    // Mirrors applyPass's own rules (game-engine.ts): the path INCLUDES the
    // destination (an enemy sitting there still intercepts/scores), and a
    // knight's pass only ever checks the destination — no traversal, since a
    // knight throw doesn't travel the straight/diagonal line getPath assumes.
    const passCarrier = boardState.pieces.find(p => p.id === selectedPieceId && boardState.ball.holderId === p.id) ?? null
    const trajectoryPath = (hoveredPassAt && passCarrier)
        ? (passCarrier.type === 'knight' ? [hoveredPassAt] : getPath(passCarrier.pos, hoveredPassAt))
        : null
    const trajectoryIntercepted = !!(trajectoryPath && passCarrier && trajectoryPath
        .some(sq => boardState.pieces.some(p => p.pos.x === sq.x && p.pos.y === sq.y && p.side !== passCarrier.side)))

    const handleSquareClick = (x: number, y: number) => {
        if (replay) return // §4: don't act while the opponent-turn replay is playing
        setCursor(null)
        const isValidMove = validMoves.some(m => m.x === x && m.y === y)
        const isValidPass = validPasses.some(p => p.x === x && p.y === y)

        if (isValidMove && isValidPass) {
            setDisambiguateAt({ x, y })
            return
        }
        if (isValidMove && selectedPieceId) {
            movePiece(selectedPieceId, { x, y })
            setDisambiguateAt(null)
            setInvalidClickAt(null)
        } else if (isValidPass) {
            passBall({ x, y })
            setDisambiguateAt(null)
            setInvalidClickAt(null)
        } else {
            // §16: subtle shake when a piece is selected but the target square
            // isn't a legal move/pass — no-op clicks on empty board stay silent.
            if (selectedPieceId) {
                triggerInvalidClickShake(x, y)
            }
            setDisambiguateAt(null)
        }
    }

    const handlePieceClick = (pieceId: string, x: number, y: number, e: React.MouseEvent) => {
        e.stopPropagation()
        if (replay) return // §4: don't act while the opponent-turn replay is playing
        const pieceAt = boardState.pieces.find(p => p.id === pieceId)
        if (!pieceAt) return

        const isValidMove = validMoves.some(m => m.x === x && m.y === y)
        const isValidPass = validPasses.some(p => p.x === x && p.y === y)

        if (isValidMove || isValidPass) {
            handleSquareClick(x, y)
        } else if (boardState.turn === pieceAt.side && userSide === pieceAt.side) {
            if (selectedPieceId === pieceAt.id) {
                setSelectedPieceId(null)
            } else {
                setSelectedPieceId(pieceAt.id)
            }
            setDisambiguateAt(null)
            setInvalidClickAt(null)
        } else if (selectedPieceId) {
            // §16: clicking an occupied square (own non-selectable or opponent
            // piece) that isn't a legal target is just as "invalid" as clicking
            // an illegal empty square — keep the feedback consistent.
            triggerInvalidClickShake(x, y)
            setDisambiguateAt(null)
        }
    }

    const defaultCursor = (): Position => {
        const sel = boardState.pieces.find(p => p.id === selectedPieceId)
        return sel ? { ...sel.pos } : { ...boardState.ball.pos }
    }

    const activate = (x: number, y: number) => {
        const pieceAt = boardState.pieces.find(p => p.pos.x === x && p.pos.y === y)
        if (pieceAt) {
            handlePieceClick(pieceAt.id, x, y, { stopPropagation() {} } as React.MouseEvent)
        } else {
            handleSquareClick(x, y)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!keyboardNav || replay) return
        const step = (dx: number, dy: number) => {
            e.preventDefault()
            setCursor(c => {
                const base = c ?? defaultCursor()
                return { x: clamp(base.x + dx, 0, COLS - 1), y: clamp(base.y + dy, 0, ROWS - 1) }
            })
        }
        switch (e.key) {
            case 'ArrowUp':    step(0, 1); break
            case 'ArrowDown':  step(0, -1); break
            case 'ArrowLeft':  step(-1, 0); break
            case 'ArrowRight': step(1, 0); break
            case 'Enter':
            case ' ': {
                e.preventDefault()
                const c = cursor ?? defaultCursor()
                setCursor(c)
                activate(c.x, c.y)
                break
            }
            case 'm': case 'M':
                if (disambiguateAt && selectedPieceId) {
                    movePiece(selectedPieceId, disambiguateAt)
                    setDisambiguateAt(null)
                }
                break
            case 'p': case 'P':
                if (disambiguateAt) {
                    passBall(disambiguateAt)
                    setDisambiguateAt(null)
                }
                break
            case 'Escape':
                if (shortcutsOpen) {
                    setShortcutsOpen(false)
                } else if (disambiguateAt) {
                    setDisambiguateAt(null)
                } else {
                    setSelectedPieceId(null)
                    setInteractionMode(null)
                }
                break
        }
    }

    const renderSquares = () => {
        const squares = []
        for (let y = ROWS - 1; y >= 0; y--) {
            for (let x = 0; x < COLS; x++) {
                const isValidMove = validMoves.some(m => m.x === x && m.y === y)
                const isValidPass = validPasses.some(p => p.x === x && p.y === y)
                const isAmbiguous = isValidMove && isValidPass

                // §4: while a sequential replay is in progress, the highlighted
                // origin/destination trail follows the current replay step
                // instead of the real last move.
                const displayedLastMove = replay ? replay.steps[replay.index] : lastMove
                const isLastMoveOrigin = displayedLastMove?.from && displayedLastMove.from.x === x && displayedLastMove.from.y === y
                const isLastMoveDest   = displayedLastMove?.to   && displayedLastMove.to.x   === x && displayedLastMove.to.y   === y
                const isLastMove = isLastMoveOrigin || isLastMoveDest

                // §8: enemy goal area for offside warning
                const isEnemyGoalArea = userSide !== null
                    && (x >= 2 && x <= 6)
                    && (userSide === 'white' ? (y >= 10 && y <= 11) : (y >= 0 && y <= 1))

                const pieceAt = boardState.pieces.find(p => p.pos.x === x && p.pos.y === y)
                const isCursor = keyboardNav && cursor?.x === x && cursor?.y === y
                const isDisambiguateTarget = disambiguateAt?.x === x && disambiguateAt?.y === y

                squares.push(
                    <div
                        key={`${x}-${y}`}
                        onClick={() => handleSquareClick(x, y)}
                        onMouseEnter={() => { if (isValidPass) setHoveredPassAt({ x, y }) }}
                        onMouseLeave={() => setHoveredPassAt(null)}
                        className={cn(
                            pitchSquareClass(x, y),
                            "flex items-center justify-center cursor-pointer",
                            !isValidMove && !isValidPass && isLastMove && "bg-last-move-highlight/20",
                            // §8: pulsing warning ring on enemy goal area
                            isOffsideRisk && isEnemyGoalArea && !isValidMove && !isValidPass && "ring-2 ring-inset ring-warning/60",
                            isAmbiguous && "ring-[3px] ring-inset ring-yellow-400/90 bg-yellow-400/20",
                            !isAmbiguous && isValidMove && "ring-[3px] ring-inset ring-yellow-400/80 bg-yellow-400/15",
                            !isAmbiguous && isValidPass && "ring-[3px] ring-inset ring-sky-400/80 bg-sky-400/15",
                        )}
                    >
                        {!isAmbiguous && isValidMove && !pieceAt && (
                            <div className="w-3 h-3 rounded-full bg-yellow-400/65" />
                        )}
                        {!isAmbiguous && isValidPass && !pieceAt && (
                            <div className="w-3 h-3 rounded-full bg-sky-400/65" />
                        )}
                        {isAmbiguous && !pieceAt && (
                            <div className="flex gap-0.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                                <div className="w-2.5 h-2.5 rounded-full bg-sky-400/80" />
                            </div>
                        )}

                        {isCursor && (
                            <div className="absolute inset-0 ring-2 ring-inset ring-white pointer-events-none z-20" aria-hidden="true" />
                        )}

                        {isDisambiguateTarget && selectedPieceId && (
                            <div
                                className={cn(
                                    "absolute z-50 flex gap-1 bg-bg-secondary border border-border-subtle rounded-md p-1 shadow-xl pointer-events-auto whitespace-nowrap",
                                    // The board container is `overflow-hidden` (for its rounded
                                    // corners), so a popover that spills past an edge gets clipped.
                                    // Anchor it inside the board on edge columns / the top row.
                                    y === ROWS - 1 ? "top-full mt-1" : "bottom-full mb-1",
                                    x === 0
                                        ? "left-0"
                                        : x === COLS - 1
                                            ? "right-0"
                                            : "left-1/2 -translate-x-1/2",
                                )}
                                onClick={e => e.stopPropagation()}
                            >
                                <button
                                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold font-inter text-move-highlight bg-move-highlight/10 hover:bg-move-highlight/20 transition-colors"
                                    onClick={() => { movePiece(selectedPieceId, { x, y }); setDisambiguateAt(null) }}
                                >
                                    <Move size={11} strokeWidth={2} />
                                    {t('move')}
                                </button>
                                <button
                                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold font-inter text-pass-highlight bg-pass-highlight/10 hover:bg-pass-highlight/20 transition-colors"
                                    onClick={() => { passBall({ x, y }); setDisambiguateAt(null) }}
                                >
                                    <span className="w-3 h-3 inline-flex"><Football /></span>
                                    {t('pass')}
                                </button>
                            </div>
                        )}
                    </div>
                )
            }
        }
        return squares
    }

    const board = (
        <div
            className={cn(
                // §6: Mobile edge-to-edge — thin 2px margin, no border, no radius
                "w-full mx-0.5 bg-[#1a3317] overflow-hidden",
                // §5+§6: Desktop — centered, rounded, bordered, height-based max-width
                "md:mx-auto md:rounded-xl md:shadow-2xl md:border-4 md:border-[#1a3317]",
                "md:max-w-[min(700px,calc((100dvh_-_150px)*0.75))]",
                keyboardNav && "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
            )}
            {...(keyboardNav
                ? {
                    tabIndex: 0,
                    role: 'application',
                    'aria-label': 'Game board — arrow keys to move the cursor, Enter to act',
                    onKeyDown: handleKeyDown,
                }
                : {})}
        >
            {/* §12: desktop-only board toolbar — sits in its own row above the grid so
                nothing here ever overlaps a playable square. Left: persistent ball-holder
                chip. Right: keyboard-shortcuts legend, when the board is keyboard-operable.
                Apps with a side panel can opt out (toolbar={false}) and place both
                components themselves. */}
            {toolbar && (
                <div className="hidden md:flex items-center justify-between gap-2 px-2.5 py-1" data-testid="board-toolbar">
                    <BallHolderChip />

                    {keyboardNav && (
                        <div
                            ref={shortcutsRef}
                            className="relative"
                            onKeyDown={e => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setShortcutsOpen(o => !o) }}
                                aria-label={t('shortcuts.buttonLabel')}
                                aria-expanded={shortcutsOpen}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-secondary/80 border border-border-subtle text-fg-muted hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green"
                            >
                                <HelpCircle size={16} strokeWidth={2} aria-hidden="true" />
                            </button>
                            {shortcutsOpen && (
                                <div
                                    className="absolute top-full right-0 mt-1 z-50 w-max max-w-[220px] bg-bg-secondary border border-border-subtle rounded-md shadow-xl p-2.5 pointer-events-auto"
                                    onClick={e => e.stopPropagation()}
                                >
                                    <p className="font-inter text-[11px] font-semibold text-fg-primary mb-1.5">{t('shortcuts.title')}</p>
                                    <KeyboardShortcutsList />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="relative" style={{ containerType: 'inline-size' }}>
                <div className="grid grid-cols-9 gap-[1px]">
                    {renderSquares()}
                </div>

                {/* Turf grain + stadium light: decorative, click-through. */}
                <GrassOverlay />

                {/* Chalk pitch lines — static, so the browser caches the filter as its own layer. */}
                <PitchMarkings />

                {/* Dynamic board-space overlays live in their own <svg> so hover
                    repaints never re-run the chalk filter above. */}
                <svg
                    viewBox="0 0 9 12"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    aria-hidden="true"
                >
                    {hoveredPassAt && passCarrier && (
                        <line
                            data-testid="pass-trajectory-line"
                            x1={passCarrier.pos.x + 0.5}
                            y1={ROWS - 1 - passCarrier.pos.y + 0.5}
                            x2={hoveredPassAt.x + 0.5}
                            y2={ROWS - 1 - hoveredPassAt.y + 0.5}
                            stroke={trajectoryIntercepted ? 'var(--danger)' : 'var(--pass-highlight)'}
                            strokeWidth="0.08"
                            strokeDasharray="0.15 0.1"
                            strokeLinecap="round"
                        />
                    )}
                </svg>

                <div className="absolute inset-0 pointer-events-none" data-testid="pieces-layer">
                    <AnimatePresence mode="sync">
                        {boardState.pieces.map(piece => {
                            const isPickupCarrier = pickupCarrierId === piece.id
                            const pieceTransition = isPickupCarrier
                                ? { duration: PICKUP_DURATION, ease: 'linear' as const }
                                : PIECE_SLIDE
                            return (
                                <motion.div
                                    key={piece.id}
                                    data-piece-id={piece.id}
                                    initial={false}
                                    animate={{ x: cellX(piece.pos.x), y: cellY(piece.pos.y) }}
                                    transition={pieceTransition}
                                    onAnimationStart={() => setMoving(piece.id, true)}
                                    onAnimationComplete={() => setMoving(piece.id, false)}
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        width: `${100 / COLS}%`,
                                        height: `${100 / ROWS}%`,
                                        willChange: 'transform',
                                    }}
                                    className="flex items-center justify-center pointer-events-auto"
                                >
                                    <GamePiece
                                        piece={piece}
                                        isSelected={selectedPieceId === piece.id}
                                        hasBall={boardState.ball.holderId === piece.id}
                                        isMoving={movingIds.has(piece.id)}
                                        onClick={(e: React.MouseEvent) => handlePieceClick(piece.id, piece.pos.x, piece.pos.y, e)}
                                    />
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>

                    {(() => {
                        const targetX = cellX(ball.pos.x)
                        const targetY = cellY(ball.pos.y)
                        let animate: any
                        let transition: any
                        if (isPickupOnMove && prevBall) {
                            const prevX = cellX(prevBall.pos.x)
                            const prevY = cellY(prevBall.pos.y)
                            const pulseStart = Math.max(0.05, pickupProportion - 0.06)
                            animate = {
                                x: [prevX, prevX, prevX, targetX],
                                y: [prevY, prevY, prevY, targetY],
                                scale: [1, 1, 1.35, 1],
                            }
                            transition = { duration: PICKUP_DURATION, times: [0, pulseStart, pickupProportion, 1], ease: 'linear' }
                        } else {
                            animate = { x: targetX, y: targetY, scale: 1 }
                            transition = ball.holderId ? PIECE_SLIDE : BALL_SLIDE
                        }
                        return (
                            <motion.div
                                key="ball"
                                initial={false}
                                animate={animate}
                                transition={transition}
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    width: `${100 / COLS}%`,
                                    height: `${100 / ROWS}%`,
                                    zIndex: 50,
                                    willChange: 'transform',
                                }}
                                className="flex items-center justify-center pointer-events-none"
                            >
                                <div className="w-[60%] h-[60%]"><Football /></div>
                            </motion.div>
                        )
                    })()}

                    {/* §16: subtle shake feedback on an illegal move/pass target */}
                    {invalidClickAt && (
                        <motion.div
                            key={invalidClickAt.nonce}
                            data-testid="invalid-action-shake"
                            aria-hidden="true"
                            initial={false}
                            animate={prefersReducedMotion ? { opacity: [0.9, 0] } : { x: [0, -3, 3, -3, 3, 0] }}
                            transition={{ duration: 0.08 }}
                            style={{
                                position: 'absolute',
                                left: `${(invalidClickAt.x / COLS) * 100}%`,
                                top: `${((ROWS - 1 - invalidClickAt.y) / ROWS) * 100}%`,
                                width: `${100 / COLS}%`,
                                height: `${100 / ROWS}%`,
                            }}
                            className="ring-2 ring-inset ring-danger/70 rounded-sm"
                        />
                    )}
                </div>

                {/* §8: Offside warning chip overlaid on board bottom */}
                {isOffsideRisk && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 bg-warning/20 border border-warning/50 rounded-full font-inter text-xs font-semibold text-warning pointer-events-none whitespace-nowrap backdrop-blur-sm">
                        ⚠ {t('offsideWarning')}
                    </div>
                )}

            </div>
        </div>
    )

    if (!showCoordinates) return board

    const ranksTopToBottom = [...RANK_LABELS].reverse()
    return (
        <div className="w-full max-w-[540px] md:max-w-none mx-auto" aria-hidden="false">
            <div
                className="grid gap-1 select-none"
                style={{
                    gridTemplateColumns: '20px 1fr 20px',
                    gridTemplateRows: '14px 1fr 14px',
                }}
            >
                <span aria-hidden="true" />
                <FileRow files={FILE_LABELS} />
                <span aria-hidden="true" />

                <RankColumn ranks={ranksTopToBottom} />
                <div>{board}</div>
                <RankColumn ranks={ranksTopToBottom} />

                <span aria-hidden="true" />
                <FileRow files={FILE_LABELS} />
                <span aria-hidden="true" />
            </div>
        </div>
    )
}

function FileRow({ files }: { files: readonly string[] }) {
    return (
        <div className="grid grid-cols-9 gap-[1px] px-[2px]">
            {files.map(f => (
                <span key={f} aria-hidden="true" className="flex items-center justify-center font-mono text-[9px] text-fg-muted/80 uppercase tracking-[0.5px]">
                    {f}
                </span>
            ))}
        </div>
    )
}

function RankColumn({ ranks }: { ranks: readonly number[] }) {
    return (
        <div className="grid grid-rows-12 gap-[1px] py-[2px]">
            {ranks.map(r => (
                <span key={r} aria-hidden="true" className="flex items-center justify-center font-mono text-[9px] text-fg-muted/80 tabular-nums">
                    {r}
                </span>
            ))}
        </div>
    )
}
