import { useGameStore } from '../../store/use-game-store'
import { getValidMoves, getValidPasses, isInEnemyArea } from '@scriptonita/chess-football-engine'
import { cn } from '../../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import GamePiece from './game-piece'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Side, Position } from '@scriptonita/chess-football-engine'
import { Football } from './football'
import { FILE_LABELS, RANK_LABELS } from '@scriptonita/chess-football-engine'
import { Move } from 'lucide-react'
import { useGameT } from '../../i18n'

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

export default function GameBoard({ userSide, showCoordinates = false, keyboardNav = true }: GameBoardProps) {
    const t = useGameT()
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

    const prevBallRef = useRef(boardState?.ball)
    const prevBall = prevBallRef.current
    useEffect(() => {
        prevBallRef.current = boardState?.ball
    })

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

    const handleSquareClick = (x: number, y: number) => {
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
        } else if (isValidPass) {
            passBall({ x, y })
            setDisambiguateAt(null)
        } else {
            setDisambiguateAt(null)
        }
    }

    const handlePieceClick = (pieceId: string, x: number, y: number, e: React.MouseEvent) => {
        e.stopPropagation()
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
        if (!keyboardNav) return
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
                if (disambiguateAt) {
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
                const isGoalArea =
                    (x >= 2 && x <= 6) && ((y >= 0 && y <= 1) || (y >= 10 && y <= 11))
                const isEven = (x + y) % 2 === 0

                const isValidMove = validMoves.some(m => m.x === x && m.y === y)
                const isValidPass = validPasses.some(p => p.x === x && p.y === y)
                const isAmbiguous = isValidMove && isValidPass

                const isLastMoveOrigin = lastMove?.from && lastMove.from.x === x && lastMove.from.y === y
                const isLastMoveDest   = lastMove?.to   && lastMove.to.x   === x && lastMove.to.y   === y
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
                        className={cn(
                            "relative aspect-square w-full flex items-center justify-center cursor-pointer",
                            isEven ? "bg-field-green-1" : "bg-field-green-2",
                            isGoalArea && "bg-[#1a3a18] ring-1 ring-inset ring-emerald-500/30",
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
            <div className="relative" style={{ containerType: 'inline-size' }}>
                <div className="grid grid-cols-9 gap-[1px]">
                    {renderSquares()}
                </div>

                <svg
                    viewBox="0 0 9 12"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    aria-hidden="true"
                >
                    <rect x="2" y="0" width="5" height="2" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="0.05" />
                    <rect x="2" y="10" width="5" height="2" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="0.05" />
                    <line x1="0" y1="6" x2="9" y2="6" stroke="white" strokeOpacity="0.35" strokeWidth="0.05" />
                    <circle cx="4.5" cy="6" r="1.5" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="0.05" />
                    <circle cx="4.5" cy="6" r="0.12" fill="white" fillOpacity="0.5" />
                    <circle cx="4.5" cy="1.5" r="0.1" fill="white" fillOpacity="0.5" />
                    <circle cx="4.5" cy="10.5" r="0.1" fill="white" fillOpacity="0.5" />
                    <path d="M 3.086,2 A 1.5,1.5 0 0 0 5.914,2" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="0.05" />
                    <path d="M 3.086,10 A 1.5,1.5 0 0 1 5.914,10" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="0.05" />
                </svg>

                <div className="absolute inset-0 pointer-events-none">
                    <AnimatePresence mode="sync">
                        {boardState.pieces.map(piece => {
                            const isPickupCarrier = pickupCarrierId === piece.id
                            const pieceTransition = isPickupCarrier
                                ? { duration: PICKUP_DURATION, ease: 'linear' as const }
                                : { type: 'spring' as const, stiffness: 200, damping: 25, mass: 1 }
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
                            transition = { duration: PICKUP_DURATION, times: [0, pulseStart, pickupProportion, 1], ease: 'linear' }
                        } else {
                            animate = { left: `${targetX}%`, top: `${targetY}%`, scale: 1 }
                            transition = { type: 'spring', stiffness: 300, damping: 30, mass: 0.5 }
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
                                <div className="w-[60%] h-[60%]"><Football /></div>
                            </motion.div>
                        )
                    })()}
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
