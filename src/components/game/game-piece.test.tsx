import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import GamePiece, { BLACK_PIECE_STYLE, MOVED_GLYPH_COLOR } from './game-piece'
import { getInitialBoardState } from '../../store/use-game-store'

// Index 0 of the initial setup is a fixed, non-empty rook slot for either
// side — safe as a generic fixture; the tests below don't depend on piece type.
const piece = getInitialBoardState('white').pieces[0]

describe('GamePiece — prefers-reduced-motion', () => {
  it('disables the looping selection-ring pulse under motion-reduce', () => {
    const { container } = render(
      <GamePiece piece={piece} isSelected hasBall={false} onClick={() => {}} />,
    )
    const ring = container.querySelector('.animate-pulse')
    expect(ring).not.toBeNull()
    expect(ring?.className).toContain('motion-reduce:animate-none')
  })

  it('disables the selection scale transition under motion-reduce', () => {
    const { container } = render(
      <GamePiece piece={piece} isSelected hasBall={false} onClick={() => {}} />,
    )
    const root = container.firstElementChild
    expect(root?.className).toContain('transition-transform')
    expect(root?.className).toContain('motion-reduce:transition-none')
  })

  it('keeps the static ring + scale selection cue so state stays legible without animation', () => {
    // The pulse/scale-transition are decorative; the ring/scale VALUES themselves
    // are static and must survive regardless of motion-reduce (AC-1: no state
    // may be communicated solely by animation).
    const { container } = render(
      <GamePiece piece={piece} isSelected hasBall={false} onClick={() => {}} />,
    )
    const root = container.firstElementChild
    expect(root?.className).toContain('ring-4')
    expect(root?.className).toContain('ring-accent-green')
    expect(root?.className).toContain('scale-110')
  })
})

describe('GamePiece — relief above the pitch', () => {
  it('casts a soft ground shadow that is a separate, decorative layer beneath the chip', () => {
    const { container } = render(
      <GamePiece piece={piece} isSelected={false} hasBall={false} onClick={() => {}} />,
    )
    const root = container.firstElementChild as HTMLElement
    const shadow = container.querySelector('[data-testid="piece-shadow"]') as HTMLElement
    const chip = container.querySelector('[data-testid="piece-chip"]') as HTMLElement
    expect(shadow).not.toBeNull()
    expect(chip).not.toBeNull()
    expect(shadow.getAttribute('aria-hidden')).toBe('true')
    // shadow paints before (i.e. under) the chip
    expect(Array.from(root.children).indexOf(shadow)).toBeLessThan(Array.from(root.children).indexOf(chip))
    // the chip owns the face gradient; the wrapper stays transparent
    expect(chip.style.background).toContain('radial-gradient')
    expect(root.style.background).toBe('')
  })

  it('lifts the chip and pushes the shadow further away while moving', () => {
    const { container, rerender } = render(
      <GamePiece piece={piece} isSelected={false} hasBall={false} onClick={() => {}} />,
    )
    const root = container.firstElementChild as HTMLElement
    const shadow = container.querySelector('[data-testid="piece-shadow"]') as HTMLElement
    expect(root.className).not.toContain('scale-[1.08]')
    expect(shadow.getAttribute('data-lifted')).toBe('false')

    rerender(<GamePiece piece={piece} isSelected={false} hasBall={false} onClick={() => {}} isMoving />)
    expect(root.className).toContain('scale-[1.08]')
    expect(shadow.getAttribute('data-lifted')).toBe('true')
  })

  it('keeps the shadow transition off under motion-reduce', () => {
    const { container } = render(
      <GamePiece piece={piece} isSelected={false} hasBall={false} onClick={() => {}} />,
    )
    const shadow = container.querySelector('[data-testid="piece-shadow"]') as HTMLElement
    expect(shadow.className).toContain('motion-reduce:transition-none')
  })
})

// ── "Already moved" ───────────────────────────────────────────────────────────

// WCAG relative luminance / contrast ratio for #rrggbb colours.
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// Every pitch green either app ships (`--field-green-1` / `--field-green-2`).
const PITCH_GREENS = ['#2d5a27', '#356a2d', '#4A9960', '#2E7040']
// The chip face is a gradient; its mid stop is the colour it reads as.
const BLACK_CHIP = /#1c1c1f/.exec(BLACK_PIECE_STYLE.background as string)![0]

describe('GamePiece — already moved this turn', () => {
  const blackPiece = { ...getInitialBoardState('white').pieces.find((p) => p.side === 'black')!, hasMovedThisTurn: true }

  it('says it one way: the glyph fades, the chip stays opaque and unfiltered', () => {
    const { container } = render(
      <GamePiece piece={blackPiece} isSelected={false} hasBall={false} onClick={() => {}} />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.getAttribute('data-moved')).toBe('true')
    expect(root.className).not.toMatch(/opacity-/)
    expect(root.style.filter).toBe('')
    expect(root.style.opacity).toBe('')
    const glyph = container.querySelector('svg') as SVGElement
    expect(glyph.style.color).not.toBe('')
  })

  it('leaves the glyph in the chip colour until the piece has moved', () => {
    const { container } = render(
      <GamePiece piece={{ ...blackPiece, hasMovedThisTurn: false }} isSelected={false} hasBall={false} onClick={() => {}} />,
    )
    expect((container.firstElementChild as HTMLElement).getAttribute('data-moved')).toBe('false')
    expect((container.querySelector('svg') as SVGElement).style.color).toBe('')
  })

  it('keeps a moved black piece at 3:1 or better against every pitch green', () => {
    for (const green of PITCH_GREENS) {
      const best = Math.max(contrast(BLACK_CHIP, green), contrast(MOVED_GLYPH_COLOR.black, green))
      expect(best, `moved black piece on ${green}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('keeps the faded glyph readable on its own chip, for both sides', () => {
    expect(contrast(MOVED_GLYPH_COLOR.black, BLACK_CHIP)).toBeGreaterThanOrEqual(3)
    expect(contrast(MOVED_GLYPH_COLOR.white, '#f4f4f5')).toBeGreaterThanOrEqual(3)
  })
})
