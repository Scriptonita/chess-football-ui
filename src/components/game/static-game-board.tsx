import { cn } from '../../lib/utils'
import { useMemo } from 'react'
import { getInitialBoardState } from '../../store/use-game-store'
import { Football } from './football'
import GamePiece from './game-piece'
import { PitchSurface } from './pitch'

const COLS = 9
const ROWS = 12

export function StaticGameBoard({ className }: { className?: string } = {}) {
    const boardState = useMemo(() => getInitialBoardState('white'), [])

    return (
        <div className={cn('relative w-full overflow-hidden rounded-xl shadow-2xl border-4 border-field-frame bg-field-frame', className)}>
            <PitchSurface>
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
            </PitchSurface>

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
