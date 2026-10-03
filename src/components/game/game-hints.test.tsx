import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { GameHints, type GameHintId } from './game-hints'
import { useGameStore, getInitialBoardState } from '../../store/use-game-store'
import { GameI18nProvider, GAME_I18N_KEYS } from '../../i18n'

const board = getInitialBoardState('white')
const holder = board.pieces.find(p => p.id === board.ball.holderId)!
const other = board.pieces.find(p => p.side === 'white' && p.id !== holder.id)!

const shown = () => screen.queryByTestId('game-hint')?.getAttribute('data-hint') ?? null

function setup(initialSeen: GameHintId[] = []) {
    const onSeen = vi.fn()
    function Host() {
        const [seen, setSeen] = useState<GameHintId[]>(initialSeen)
        return (
            <GameI18nProvider t={(key) => key}>
                <GameHints userSide="white" seen={seen} onSeen={(id) => { onSeen(id); setSeen(s => [...s, id]) }} />
            </GameI18nProvider>
        )
    }
    render(<Host />)
    return onSeen
}

beforeEach(() => {
    useGameStore.setState({ boardState: board, selectedPieceId: null, interactionMode: null })
})

describe('GameHints', () => {
    it('opens with the objective hint on the player\'s first turn', () => {
        setup()
        expect(shown()).toBe('start')
        expect(screen.getByText('hints.start')).toBeInTheDocument()
    })

    it('moves on to the piece hint when a piece is selected, and marks the previous one seen', () => {
        const onSeen = setup()
        act(() => { useGameStore.setState({ selectedPieceId: other.id }) })
        expect(shown()).toBe('selectPiece')
        expect(onSeen).toHaveBeenCalledExactlyOnceWith('start')
    })

    it('explains passing the first time the selected piece holds the ball', () => {
        setup(['start'])
        act(() => { useGameStore.setState({ selectedPieceId: holder.id }) })
        expect(shown()).toBe('hasBall')
    })

    it('warns on the last action point', () => {
        setup(['start'])
        act(() => { useGameStore.setState({ boardState: { ...board, actionPoints: 1 } }) })
        expect(shown()).toBe('lastActionPoint')
    })

    it('can be dismissed, reports it once and does not come back', () => {
        const onSeen = setup()
        fireEvent.click(screen.getByRole('button', { name: 'hints.dismiss' }))
        expect(onSeen).toHaveBeenCalledExactlyOnceWith('start')
        expect(shown()).toBeNull()
    })

    it('never repeats a hint already seen', () => {
        setup(['start', 'selectPiece', 'hasBall', 'lastActionPoint'])
        expect(shown()).toBeNull()
        act(() => { useGameStore.setState({ selectedPieceId: holder.id, boardState: { ...board, actionPoints: 1 } }) })
        expect(shown()).toBeNull()
    })

    it('stays silent on the rival\'s turn', () => {
        useGameStore.setState({ boardState: { ...board, turn: 'black' } })
        const onSeen = setup()
        expect(shown()).toBeNull()
        expect(onSeen).not.toHaveBeenCalled()
    })

    it('is a polite live region with a 44px dismiss target', () => {
        setup()
        expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
        const dismiss = screen.getByRole('button', { name: 'hints.dismiss' })
        expect(dismiss.className).toContain('w-11')
        expect(dismiss.className).toContain('h-11')
    })

    it('every hint text is part of the i18n manifest', () => {
        for (const key of ['hints.start', 'hints.selectPiece', 'hints.hasBall', 'hints.lastActionPoint', 'hints.dismiss']) {
            expect(GAME_I18N_KEYS).toContain(key)
        }
    })
})
