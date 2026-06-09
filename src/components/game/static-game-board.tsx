import { useMemo } from 'react'
import { getInitialBoardState } from '../../store/use-game-store'
import { cn } from '../../lib/utils'
import { Football } from './football'
import GamePiece from './game-piece'

const COLS = 9
const ROWS = 12

export function StaticGameBoard() {
    const boardState = useMemo(() => getInitialBoardState('white'), [])

    const renderSquares = () => {
        const squares = []
        for (let y = ROWS - 1; y >= 0; y--) {
            for (let x = 0; x < COLS; x++) {
                const isGoalArea =
                    (x >= 2 && x <= 6) && ((y >= 0 && y <= 1) || (y >= 10 && y <= 11))
                const isEven = (x + y) % 2 === 0
                squares.push(
                    <div
                        key={`${x}-${y}`}
                        className={cn(
                            "relative aspect-square w-full",
                            isEven ? "bg-[#2d5a27]" : "bg-[#356a2d]",
                            isGoalArea && "bg-[#1a3a18] ring-1 ring-inset ring-emerald-500/30",
                        )}
                    />
                )
            }
        }
        return squares
    }

    return (
        <div className="relative w-full overflow-hidden rounded-xl shadow-2xl border-4 border-[#1a3317] bg-[#1a3317]">
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
                    {boardState.pieces.map(piece => (
                        <div
                            key={piece.id}
                            style={{
                                position: 'absolute',
                                left: `${(piece.pos.x / COLS) * 100}%`,
                                top: `${((ROWS - 1 - piece.pos.y) / ROWS) * 100}%`,
                                width: `${100 / COLS}%`,
                                height: `${100 / ROWS}%`,
                            }}
                            className="flex items-center justify-center"
                        >
                            <GamePiece
                                piece={piece}
                                isSelected={false}
                                hasBall={boardState.ball.holderId === piece.id}
                                onClick={() => { }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Ball rendered OUTSIDE the containerType wrapper to escape its stacking context */}
            <div
                style={{
                    position: 'absolute',
                    left: `${(boardState.ball.pos.x / COLS) * 100}%`,
                    top: `${((ROWS - 1 - boardState.ball.pos.y) / ROWS) * 100}%`,
                    width: `${100 / COLS}%`,
                    height: `${100 / ROWS}%`,
                    zIndex: 50,
                }}
                className="flex items-center justify-center pointer-events-none"
            >
                <div className="w-[60%] h-[60%]">
                    <Football />
                </div>
            </div>
        </div>
    )
}
