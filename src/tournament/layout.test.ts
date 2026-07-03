import { describe, expect, it } from 'vitest'
import { createScriptedBracket, type ScriptedBracketConfig } from './model'
import { layoutRadialBracket } from './layout'

const CONFIG: ScriptedBracketConfig = {
  roundAi: { round16: 'ai-round16', quarter: 'ai-quarter', semi: 'ai-semi', final: 'ai-final' },
  fillerTeamIds: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11'],
}

const bracket = createScriptedBracket(CONFIG)
const SIZE = 1000
const CENTER = SIZE / 2

/** Independent re-implementation of the slot-space → angle mapping, used to
 *  cross-check `layoutRadialBracket`'s output rather than its own internals. */
function expectedDeg(slotMid: number) {
  return -90 + slotMid * 22.5
}

describe('layoutRadialBracket', () => {
  const { nodes, connectors, center } = layoutRadialBracket(bracket)
  const nodeById = new Map(nodes.map(n => [n.id, n]))

  it('places 16 outer round16 slots equally spaced at 22.5°', () => {
    for (let k = 0; k < 16; k++) {
      const node = nodeById.get(`r16-slot-${k}`)
      expect(node).toBeDefined()
      const angle = Math.atan2(node!.y - center.y, node!.x - center.x) * (180 / Math.PI)
      const expected = expectedDeg(k + 0.5)
      // Normalize both to (-180, 180] before comparing.
      const norm = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180
      expect(norm(angle)).toBeCloseTo(norm(expected), 5)
    }
  })

  it('keeps every node inside the viewBox', () => {
    for (const node of nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.x).toBeLessThanOrEqual(SIZE)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeLessThanOrEqual(SIZE)
    }
  })

  it('places a winner node at the angular midpoint of its two children, in slot space', () => {
    // r16-e (index 0) spans slots [0,1] -> mid slot 1.
    const r16eWinner = nodeById.get('r16-e-winner')!
    const angle1 = Math.atan2(r16eWinner.y - center.y, r16eWinner.x - center.x) * (180 / Math.PI)
    expect(angle1).toBeCloseTo(expectedDeg(1), 5)

    // qf-right-top (index 0) is fed by r16-e (idx0) and r16-f (idx1) -> slots [0,3] -> mid slot 2.
    const qfWinner = nodeById.get('qf-right-top-winner')!
    const angle2 = Math.atan2(qfWinner.y - center.y, qfWinner.x - center.x) * (180 / Math.PI)
    expect(angle2).toBeCloseTo(expectedDeg(2), 5)

    // sf-right (index 0) fed by qf-right-top/bottom -> slots [0,7] -> mid slot 4.
    const sfWinner = nodeById.get('sf-right-winner')!
    const angle3 = Math.atan2(sfWinner.y - center.y, sfWinner.x - center.x) * (180 / Math.PI)
    expect(angle3).toBeCloseTo(expectedDeg(4), 5)
  })

  it('places the trophy at the exact center', () => {
    const trophy = nodeById.get('trophy')!
    expect(trophy.x).toBeCloseTo(center.x, 8)
    expect(trophy.y).toBeCloseTo(center.y, 8)
    expect(center).toEqual({ x: 500, y: 500 })
  })

  it('keeps the right half (slots 0-7) at x > center and the left half (slots 8-15) at x < center', () => {
    for (let k = 0; k < 8; k++) {
      expect(nodeById.get(`r16-slot-${k}`)!.x).toBeGreaterThan(center.x)
    }
    for (let k = 8; k < 16; k++) {
      expect(nodeById.get(`r16-slot-${k}`)!.x).toBeLessThan(center.x)
    }
  })

  it('produces two connectors per match, all referencing existing nodes', () => {
    expect(connectors).toHaveLength(bracket.length * 2)
    for (const conn of connectors) {
      expect(nodeById.has(conn.fromNodeId)).toBe(true)
      expect(nodeById.has(conn.toNodeId)).toBe(true)
    }
  })
})
