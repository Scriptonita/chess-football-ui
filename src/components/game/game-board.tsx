import { useGameStore } from '../../store/use-game-store'
import { getValidMoves, getValidPasses } from '@scriptonita/chess-football-engine'
import { cn } from '../../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import GamePiece from './game-piece'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Side, Position } from '@scriptonita/chess-football-engine'
import { Football } from './football'
import { FILE_LABELS, RANK_LABELS } from '@scriptonita/chess-football-engine'

interface GameBoardProps {
    userSide: Side | null
    /** When true, render A-I / 1-12 coordinate guides around the board (tablet+ only). */
    showCoordinates?: boolean
    /** When true, the board is keyboard-operable (arrows move a cursor, Enter acts). */
    keyboardNav?: boolean
}

// Board dimensions
const COLS = 9
const ROWS = 12

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export default function GameBoard({ userSide, showCoordinates = false, keyboardNav = false }: GameBoardProps) {
    const {
        boardState,
        selectedPieceId,
        setSelectedPieceId,
        interactionMode,
        setInteractionMode,
        movePiece,
        passBall
    } = useGameStore()

    // Keyboard cursor (only used when keyboardNav). Null until the board is focused.
    const [cursor, setCursor] = useState<Position | null>(null)

    const prevBallRef = useRef(boardState?.ball)
    const prevBall = prevBallRef.current
    useEffect(() => {
        prevBallRef.current = boardState?.ball
    })

    // Hooks must run unconditionally and in a stable order, so these memos are
    // computed (null-safe) BEFORE any early return. They recompute the selected
    // piece internally to avoid a hook running after a conditional return.
    const validMoves = useMemo(() => {
        if (!boardState) return []
        const sp = boardState.pieces.find(p => p.id === selectedPieceId)
        if (sp && interactionMode === 'move' && !sp.hasMovedThisTurn) {
            return getValidMoves(sp, boardState)
        }
        return []
    }, [boardState, selectedPieceId, interactionMode])

    const validPasses = useMemo(() => {
        if (!boardState) return []
        const sp = boardState.pieces.find(p => p.id === selectedPieceId)
        if (sp && interactionMode === 'pass') {
            return getValidPasses(sp, boardState)
        }
        return []
    }, [boardState, selectedPieceId, interactionMode])

    if (!boardState) return null

    // Detect ball pickup-during-move so we can synchronize the ball pulse with the
    // carrier piece. Both the carrier and the ball use the same linear tween below.
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

    const handleSquareClick = (x: number, y: number) => {
        if (interactionMode === 'move' && selectedPieceId) {
            if (validMoves.some(m => m.x === x && m.y === y)) {
                movePiece(selectedPieceId, { x, y })
            }
        } else if (interactionMode === 'pass' && selectedPieceId) {
            if (validPasses.some(p => p.x === x && p.y === y)) {
                passBall({ x, y })
            }
        }
    }

    const handlePieceClick = (pieceId: string, x: number, y: number, e: React.MouseEvent) => {
        e.stopPropagation()
        const pieceAt = boardState.pieces.find(p => p.id === pieceId)
        if (!pieceAt) return

        const isValidDest = validMoves.some(m => m.x === x && m.y === y) ||
            validPasses.some(p => p.x === x && p.y === y)

        // Rule: If it's a valid destination (Pass or Tackle), perform the action first
        if (isValidDest) {
            handleSquareClick(x, y)
        }
        // Otherwise, allow selection of your own pieces on your turn
        else if (boardState.turn === pieceAt.side && userSide === pieceAt.side) {
            if (selectedPieceId === pieceAt.id) {
                // Toggle mode if piece has ball
                if (boardState.ball.holderId === pieceAt.id) {
                    setInteractionMode(interactionMode === 'move' ? 'pass' : 'move')
                }
            } else {
                // New selection: default to move
                setSelectedPieceId(pieceAt.id)
                setInteractionMode('move')
            }
        }
    }

    // ── Keyboard navigation (opt-in) ──────────────────────────────────────────
    // A focused board is operated with arrows (move cursor), Enter/Space (act on the
    // cursor square, mirroring a click), M/P (toggle move/pass) and Escape (deselect).
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
        if (!keyboardNav) return
        const step = (dx: number, dy: number) => {
            e.preventDefault()
            setCursor(c => {
                const base = c ?? defaultCursor()
                return { x: clamp(base.x + dx, 0, COLS - 1), y: clamp(base.y + dy, 0, ROWS - 1) }
            })
        }
        switch (e.key) {
            case 'ArrowUp':    step(0, 1); break    // visually up = higher rank (y grows toward the top)
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
            case 'm': case 'M': setInteractionMode('move'); break
            case 'p': case 'P': setInteractionMode('pass'); break
            case 'Escape': setSelectedPieceId(null); setInteractionMode(null); break
        }
    }

    // Render only the squares (no pieces inside them)
    const renderSquares = () => {
        const squares = []
        for (let y = ROWS - 1; y >= 0; y--) { // Render from top to bottom
            for (let x = 0; x < COLS; x++) {
                // Interior of both 5×2 penalty areas is painted in a distinct green
                const isGoalArea =
                    (x >= 2 && x <= 6) && ((y >= 0 && y <= 1) || (y >= 10 && y <= 11))
                const isEven = (x + y) % 2 === 0
                const isValidDest = validMoves.some(m => m.x === x && m.y === y) ||
                    validPasses.some(p => p.x === x && p.y === y)
                const pieceAt = boardState.pieces.find(p => p.pos.x === x && p.pos.y === y)
                const isCursor = keyboardNav && cursor?.x === x && cursor?.y === y

                squares.push(
                    <div
                        key={`${x}-${y}`}
                        onClick={() => handleSquareClick(x, y)}
                        className={cn(
                            "relative aspect-square w-full flex items-center justify-center cursor-pointer",
                            isEven ? "bg-[#2d5a27]" : "bg-[#356a2d]",
                            isGoalArea && "bg-[#1a3a18] ring-1 ring-inset ring-emerald-500/30",
                            isValidDest && (interactionMode === 'move'
                                ? "ring-2 ring-inset ring-yellow-400/50 bg-yellow-400/10"
                                : "ring-2 ring-inset ring-sky-400/50 bg-sky-400/10")
                        )}
                    >
                        {/* Valid move indicator (only when no piece) */}
                        {isValidDest && !pieceAt && (
                            <div className={cn(
                                "w-3 h-3 rounded-full",
                                interactionMode === 'move' ? "bg-yellow-400/40" : "bg-sky-400/40"
                            )} />
                        )}
                        {/* Keyboard cursor */}
                        {isCursor && (
                            <div className="absolute inset-0 ring-2 ring-inset ring-white pointer-events-none z-20" aria-hidden="true" />
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
                "w-full max-w-[500px] mx-auto overflow-hidden rounded-xl shadow-2xl border-4 border-[#1a3317] bg-[#1a3317]",
                keyboardNav && "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
            )}
            {...(keyboardNav
                ? {
                    tabIndex: 0,
                    role: 'application',
                    'aria-label': 'Game board — arrow keys to move the cursor, Enter to act',
                    onKeyDown: handleKeyDown,
                    onFocus: () => setCursor(c => c ?? defaultCursor()),
                }
                : {})}
        >
            <div className="relative" style={{ containerType: 'inline-size' }}>
                {/* Grid of squares */}
                <div className="grid grid-cols-9 gap-[1px]">
                    {renderSquares()}
                </div>

                {/* Football field lines overlay */}
                <svg
                    viewBox="0 0 9 12"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    aria-hidden="true"
                >
                    {/* Penalty areas (5×2) — these are the king's zones */}
                    <rect x="2" y="0" width="5" height="2" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="0.05" />
                    <rect x="2" y="10" width="5" height="2" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="0.05" />
                    {/* Center line */}
                    <line x1="0" y1="6" x2="9" y2="6" stroke="white" strokeOpacity="0.35" strokeWidth="0.05" />
                    {/* Center circle */}
                    <circle cx="4.5" cy="6" r="1.5" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="0.05" />
                    {/* Center spot */}
                    <circle cx="4.5" cy="6" r="0.12" fill="white" fillOpacity="0.5" />
                    {/* Penalty spots */}
                    <circle cx="4.5" cy="1.5" r="0.1" fill="white" fillOpacity="0.5" />
                    <circle cx="4.5" cy="10.5" r="0.1" fill="white" fillOpacity="0.5" />
                    {/* Penalty arcs (D) */}
                    <path d="M 3.086,2 A 1.5,1.5 0 0 0 5.914,2" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="0.05" />
                    <path d="M 3.086,10 A 1.5,1.5 0 0 1 5.914,10" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="0.05" />
                </svg>

                {/* Pieces layer - rendered separately with absolute positioning */}
                <div className="absolute inset-0 pointer-events-none">
                    <AnimatePresence mode="sync">
                        {boardState.pieces.map(piece => {
                            const isPickupCarrier = pickupCarrierId === piece.id
                            const pieceTransition = isPickupCarrier
                                ? { duration: PICKUP_DURATION, ease: 'linear' as const }
                                : {
                                    type: 'spring' as const,
                                    stiffness: 200,
                                    damping: 25,
                                    mass: 1,
                                }
                            return (
                                <motion.div
                                    key={piece.id}
                                    layout
                                    initial={false}
                                    animate={{
                                        left: `${(piece.pos.x / COLS) * 100}%`,
                                        top: `${((ROWS - 1 - piece.pos.y) / ROWS) * 100}%`,
                                    }}
                                    transition={pieceTransition}
                                    style={{
                                        position: 'absolute',
                                        width: `${100 / COLS}%`,
                                        height: `${100 / ROWS}%`,
                                    }}
                                    className="flex items-center justify-center pointer-events-auto"
                                >
                                    <GamePiece
                                        piece={piece}
                                        isSelected={selectedPieceId === piece.id}
                                        hasBall={boardState.ball.holderId === piece.id}
                                        onClick={(e: React.MouseEvent) => handlePieceClick(piece.id, piece.pos.x, piece.pos.y, e)}
                                    />
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>

                    {/* Ball - orchestrated to wait for the carrying piece on pickup-during-move */}
                    {(() => {
                        const targetX = (ball.pos.x / COLS) * 100
                        const targetY = ((ROWS - 1 - ball.pos.y) / ROWS) * 100

                        let animate: any
                        let transition: any

                        if (isPickupOnMove && prevBall) {
                            const prevX = (prevBall.pos.x / COLS) * 100
                            const prevY = ((ROWS - 1 - prevBall.pos.y) / ROWS) * 100
                            const pulseStart = Math.max(0.05, pickupProportion - 0.06)

                            animate = {
                                left: [`${prevX}%`, `${prevX}%`, `${prevX}%`, `${targetX}%`],
                                top:  [`${prevY}%`, `${prevY}%`, `${prevY}%`, `${targetY}%`],
                                scale: [1, 1, 1.35, 1],
                            }
                            transition = {
                                duration: PICKUP_DURATION,
                                times: [0, pulseStart, pickupProportion, 1],
                                ease: 'linear',
                            }
                        } else {
                            animate = {
                                left: `${targetX}%`,
                                top: `${targetY}%`,
                                scale: 1,
                            }
                            transition = {
                                type: 'spring',
                                stiffness: 300,
                                damping: 30,
                                mass: 0.5,
                            }
                        }

                        return (
                            <motion.div
                                key="ball"
                                initial={false}
                                animate={animate}
                                transition={transition}
                                style={{
                                    position: 'absolute',
                                    width: `${100 / COLS}%`,
                                    height: `${100 / ROWS}%`,
                                    zIndex: 50,
                                }}
                                className="flex items-center justify-center pointer-events-none"
                            >
                                <div className="w-[60%] h-[60%]">
                                    <Football />
                                </div>
                            </motion.div>
                        )
                    })()}
                </div>
            </div>
        </div>
    )

    if (!showCoordinates) return board

    // Tablet+ : wrap the board with a coordinate guide (files on top/bottom, ranks on sides).
    // Files render in display order (A → I, left → right). Ranks display from top (12) to bottom (1)
    // because the board itself renders y = ROWS-1 → 0 from top to bottom.
    const ranksTopToBottom = [...RANK_LABELS].reverse()
    return (
        <div className="w-full max-w-[540px] mx-auto" aria-hidden="false">
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
                <span
                    key={f}
                    aria-hidden="true"
                    className="flex items-center justify-center font-mono text-[9px] text-fg-muted/80 uppercase tracking-[0.5px]"
                >
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
                <span
                    key={r}
                    aria-hidden="true"
                    className="flex items-center justify-center font-mono text-[9px] text-fg-muted/80 tabular-nums"
                >
                    {r}
                </span>
            ))}
        </div>
    )
}
