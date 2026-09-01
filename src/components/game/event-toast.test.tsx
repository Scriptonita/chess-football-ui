import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: () => ({ children, animate: _a, initial: _i, exit: _e, transition: _t, ...rest }: {
      children?: React.ReactNode; [k: string]: unknown
    }) => <div {...rest}>{children}</div>,
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { EventToast } from './event-toast'
import { useGameStore, getInitialBoardState } from '../../store/use-game-store'
import type { MoveHistoryEntry } from '@scriptonita/chess-football-engine'

function withLastMove(type: MoveHistoryEntry['type']) {
  const base = getInitialBoardState('white')
  useGameStore.setState({
    boardState: {
      ...base,
      lastMove: { ...(base.moveHistory[0] ?? {}), type, at: Date.now() } as MoveHistoryEntry,
    },
  })
}

beforeEach(() => {
  useGameStore.setState({ boardState: null })
})

describe('EventToast', () => {
  it('announces the toast politely', () => {
    withLastMove('interception')
    render(<EventToast />)
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
  })

  it('toasts a goal — the event the whole game builds towards', () => {
    withLastMove('goal')
    render(<EventToast />)
    expect(screen.getByText('eventToast.goal')).toBeInTheDocument()
  })

  it.each(['interception', 'offside', 'tackle'] as const)('toasts %s', (type) => {
    withLastMove(type)
    render(<EventToast />)
    expect(screen.getByText(`eventToast.${type}`)).toBeInTheDocument()
  })

  it('stays silent for an ordinary move', () => {
    withLastMove('move')
    render(<EventToast />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
})
