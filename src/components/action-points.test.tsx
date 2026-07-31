import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'

vi.mock('framer-motion', () => {
  const make = (Tag: string) =>
    ({ children, ...domProps }: { children?: React.ReactNode; [key: string]: unknown }) => {
      const { animate, initial, transition, layout, ...rest } = domProps
      return <Tag {...rest}>{children}</Tag>
    }
  return { motion: new Proxy({}, { get: (_t, tag: string) => make(tag) }) }
})

import { ActionPoints } from './action-points'

afterEach(() => {
  vi.useRealTimers()
})

describe('ActionPoints — AP-spend micro-interaction (Story 4.2, plan §16)', () => {
  it('briefly marks the just-spent pip when remaining decreases', () => {
    vi.useFakeTimers()
    const { rerender } = render(<ActionPoints total={5} remaining={3} />)

    expect(screen.getByTestId('ap-pip-2')).not.toHaveAttribute('data-spent', 'true')

    rerender(<ActionPoints total={5} remaining={2} />)
    expect(screen.getByTestId('ap-pip-2')).toHaveAttribute('data-spent', 'true')

    act(() => { vi.advanceTimersByTime(400) })
    expect(screen.getByTestId('ap-pip-2')).not.toHaveAttribute('data-spent', 'true')
  })

  it('does not mark any pip when remaining increases or stays the same', () => {
    const { rerender } = render(<ActionPoints total={5} remaining={2} />)
    rerender(<ActionPoints total={5} remaining={3} />)
    expect(screen.getByTestId('ap-pip-2')).not.toHaveAttribute('data-spent', 'true')

    rerender(<ActionPoints total={5} remaining={3} />)
    expect(screen.getByTestId('ap-pip-2')).not.toHaveAttribute('data-spent', 'true')
  })
})
