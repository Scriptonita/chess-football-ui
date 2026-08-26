import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { GrassOverlay, PitchMarkings, PitchSurface, isGoalAreaSquare, pitchSquareClass, GOAL_AREA_SHADE_CLASS } from './pitch'

describe('GrassOverlay', () => {
  it('is a decorative, click-through layer', () => {
    const { container } = render(<GrassOverlay />)
    const root = container.firstElementChild as HTMLElement
    expect(root.getAttribute('aria-hidden')).toBe('true')
    expect(root.className).toContain('pointer-events-none')
    expect(root.className).toContain('absolute')
    expect(root.className).toContain('inset-0')
  })

  it('paints a tiled noise grain blended over the squares (not a flat colour)', () => {
    const { container } = render(<GrassOverlay />)
    const grain = container.querySelector('[data-layer="grain"]') as HTMLElement
    expect(grain).not.toBeNull()
    expect(grain.style.backgroundImage).toMatch(/^url\(/)
    expect(grain.style.backgroundImage).toContain('feTurbulence')
    expect(grain.className).toContain('mix-blend-overlay')
  })
})

describe('PitchMarkings', () => {
  it('renders a decorative SVG that scales with the 9x12 board', () => {
    const { container } = render(<PitchMarkings />)
    const svg = container.querySelector('svg') as SVGSVGElement
    expect(svg).not.toBeNull()
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('viewBox')).toBe('0 0 9 12')
    expect(svg.classList.contains('pointer-events-none')).toBe(true)
  })

  it('draws the lines through a chalk filter (roughened edges + powdery coverage)', () => {
    const { container } = render(<PitchMarkings />)
    const filter = container.querySelector('filter') as SVGFilterElement
    expect(filter).not.toBeNull()
    expect(filter.querySelector('feTurbulence')).not.toBeNull()
    expect(filter.querySelector('feDisplacementMap')).not.toBeNull()
    const chalk = container.querySelector('[data-layer="chalk"]') as SVGGElement
    expect(chalk.getAttribute('filter')).toBe(`url(#${filter.id})`)
  })

  it('uses unique filter ids so several boards can coexist on one page', () => {
    const { container } = render(<><PitchMarkings /><PitchMarkings /></>)
    const ids = Array.from(container.querySelectorAll('filter')).map(f => f.id)
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
  })

  it('keeps every pitch marking: touchline, goal boxes, halfway line, centre circle and spots', () => {
    const { container } = render(<PitchMarkings />)
    const chalk = container.querySelector('[data-layer="chalk"]') as SVGGElement
    // touchline + 2 goal boxes
    expect(chalk.querySelectorAll('rect').length).toBe(3)
    // halfway line
    expect(chalk.querySelectorAll('line').length).toBe(1)
    // centre circle + centre spot + 2 penalty spots
    expect(chalk.querySelectorAll('circle').length).toBe(4)
    // the two "D" arcs
    expect(chalk.querySelectorAll('path').length).toBe(2)
  })
})

describe('PitchSurface', () => {
  it('renders the 9x12 grid of squares with the shared square classes', () => {
    const { container } = render(<PitchSurface />)
    const grid = container.querySelector('[data-testid="pitch-squares"]') as HTMLElement
    expect(grid.children.length).toBe(9 * 12)
    const first = grid.children[0] as HTMLElement // x=0, y=11 (top-left)
    expect(first.className).toContain('aspect-square')
    expect(first.className).toMatch(/bg-field-green-[12]/)
  })

  it('darkens the goal boxes (x 2..6, ranks 1-2 and 11-12) — from the same helper GameBoard uses', () => {
    const { container } = render(<PitchSurface />)
    const grid = container.querySelector('[data-testid="pitch-squares"]') as HTMLElement
    const at = (x: number, y: number) => grid.children[(11 - y) * 9 + x] as HTMLElement
    expect(isGoalAreaSquare(4, 11)).toBe(true)
    expect(isGoalAreaSquare(1, 11)).toBe(false)
    expect(isGoalAreaSquare(4, 5)).toBe(false)
    expect(at(4, 11).className).toBe(pitchSquareClass(4, 11))
    // darker, but still the checkerboard: opponents move through the box square by square
    expect(at(4, 11).className).toContain(GOAL_AREA_SHADE_CLASS)
    expect(at(3, 11).className).toContain(GOAL_AREA_SHADE_CLASS)
    expect(at(4, 11).className).toMatch(/bg-field-green-[12]/)
    expect(at(3, 11).className).toMatch(/bg-field-green-[12]/)
    expect(at(4, 11).className.match(/bg-field-green-[12]/)![0]).not.toBe(at(3, 11).className.match(/bg-field-green-[12]/)![0])
    expect(at(0, 11).className).not.toContain(GOAL_AREA_SHADE_CLASS)
    expect(at(4, 11).className).not.toContain('bg-[#1a3a18]')
  })

  it('layers squares → grass → chalk → children, so every board looks the same', () => {
    const { container } = render(
      <PitchSurface>
        <div data-testid="my-pieces" />
      </PitchSurface>,
    )
    const root = container.firstElementChild as HTMLElement
    const order = Array.from(root.children)
    const idx = (sel: string) => order.indexOf(root.querySelector(sel)!)
    expect(root.style.containerType).toBe('inline-size')
    expect(idx('[data-testid="pitch-squares"]')).toBe(0)
    expect(idx('[data-testid="grass-overlay"]')).toBe(1)
    expect(idx('[data-testid="pitch-markings"]')).toBe(2)
    expect(idx('[data-testid="my-pieces"]')).toBe(3)
  })

  it('lets callers add per-square classes (highlights) without redefining the base look', () => {
    const { container } = render(
      <PitchSurface squareClassName={(x, y) => x === 4 && y === 6 && 'ring-2 ring-warning'} />,
    )
    const grid = container.querySelector('[data-testid="pitch-squares"]') as HTMLElement
    const centre = grid.children[(11 - 6) * 9 + 4] as HTMLElement
    expect(centre.className).toContain('ring-warning')
    expect(centre.className).toMatch(/bg-field-green-[12]/)
    expect((grid.children[0] as HTMLElement).className).not.toContain('ring-warning')
  })
})
