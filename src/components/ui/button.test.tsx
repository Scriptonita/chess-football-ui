import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { Button } from './button'

describe('Button', () => {
  it('rests on the dark green so white label text clears WCAG AA', () => {
    render(<Button>Play</Button>)
    // Guards the contrast fix: `bg-accent-green` alone is 4.27:1 with Anton 400.
    expect(screen.getByRole('button')).toHaveClass('bg-accent-green-dark')
  })

  it('keeps every size at or above the 44px touch target', () => {
    const sizes = ['default', 'sm', 'lg', 'icon'] as const
    const minima = { default: 44, sm: 36, lg: 52, icon: 44 }
    sizes.forEach(size => {
      const { unmount } = render(<Button size={size}>x</Button>)
      expect(screen.getByRole('button').className).toContain(`min-h-[${minima[size]}px]`)
      unmount()
    })
  })

  it('forwards its ref so callers can focus it', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Play</Button>)
    expect(ref.current).toBe(screen.getByRole('button'))
  })

  it('does not fire while disabled', () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Play</Button>)
    screen.getByRole('button').click()
    expect(onClick).not.toHaveBeenCalled()
  })
})
