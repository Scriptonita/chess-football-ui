import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Football } from './football'
import { REQUIRED_TOKENS } from '../../tokens'

describe('Football', () => {
  it('takes its colour from the --ball-color token, not from the pass-highlight blue', () => {
    const { container } = render(<Football />)
    const html = container.innerHTML
    expect(html).toContain('var(--ball-color')
    // The old hardcoded sky-blue ramp shared its hue with --pass-highlight.
    for (const blue of ['#38bdf8', '#bae6fd', '#f0f9ff']) expect(html).not.toContain(blue)
  })

  it('lists --ball-color in the token contract apps assert', () => {
    expect(REQUIRED_TOKENS).toContain('--ball-color')
  })
})
