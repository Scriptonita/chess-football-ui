import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// See game-board.test.tsx: framer-motion primitives can't run in jsdom.
vi.mock('framer-motion', () => {
  const make = (Tag: string) =>
    ({ children, className }: { children?: React.ReactNode; className?: string }) => (
      <Tag className={className}>{children}</Tag>
    )
  return {
    motion: new Proxy({}, { get: (_t, tag: string) => make(tag) }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

import { MobileHistory } from './mobile-history'
import { useGameStore, getInitialBoardState } from '../../store/use-game-store'

beforeEach(() => {
  const boardState = getInitialBoardState('white')
  boardState.moveHistory = [
    { type: 'move', pieceType: 'rook', pieceSide: 'white', to: { x: 1, y: 1 }, at: 0, turnNumber: 1 },
  ]
  useGameStore.setState({ boardState })
})

describe('MobileHistory — prefers-reduced-motion', () => {
  it('disables the chip press-scale transition under motion-reduce', () => {
    render(<MobileHistory />)
    const chip = screen.getByRole('button')
    expect(chip.className).toContain('active:scale-95')
    expect(chip.className).toContain('motion-reduce:transition-none')
  })
})
