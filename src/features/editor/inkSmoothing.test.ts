import { describe, expect, it } from 'vitest'
import { smoothStroke } from './inkSmoothing'

/** Größter Abstand eines Punktes von der Geraden durch Anfang und Ende. */
function maxOffsetFromLine(points: { x: number; y: number }[]): number {
  const start = points[0]
  const end = points[points.length - 1]
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  return Math.max(...points.map((p) => Math.abs((p.x - start.x) * dy - (p.y - start.y) * dx) / length))
}

/** Summe der Richtungsänderungen zwischen den Segmenten, in Bogenmaß. */
function totalTurn(points: { x: number; y: number }[]): number {
  let sum = 0
  for (let i = 1; i < points.length - 1; i++) {
    const before = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x)
    const after = Math.atan2(points[i + 1].y - points[i].y, points[i + 1].x - points[i].x)
    let turn = after - before
    while (turn > Math.PI) turn -= 2 * Math.PI
    while (turn < -Math.PI) turn += 2 * Math.PI
    sum += Math.abs(turn)
  }
  return sum
}

/** Wie oft der Strich seine vertikale Richtung wechselt. */
function directionChanges(points: { x: number; y: number }[]): number {
  let changes = 0
  let previous = 0
  for (let i = 1; i < points.length; i++) {
    const step = points[i].y - points[i - 1].y
    if (Math.abs(step) < 1e-6) continue
    const sign = Math.sign(step)
    if (previous !== 0 && sign !== previous) changes++
    previous = sign
  }
  return changes
}

const line = Array.from({ length: 40 }, (_, i) => ({ x: i * 2, y: i * 2 }))
const zigzag = Array.from({ length: 40 }, (_, i) => ({ x: i * 3, y: i % 2 === 0 ? 0 : 12 }))

describe('smoothStroke', () => {
  it('lässt einen einzelnen Punkt unverändert', () => {
    const point = [{ x: 5, y: 7 }]
    expect(smoothStroke(point, 'light')).toEqual(point)
    expect(smoothStroke(point, 'medium')).toEqual(point)
  })

  it('lässt eine gerade Linie gerade', () => {
    for (const level of ['light', 'medium'] as const) {
      const result = smoothStroke(line, level)
      expect(maxOffsetFromLine(result)).toBeLessThan(1e-6)
      expect(result[0]).toEqual(line[0])
      expect(result[result.length - 1]).toEqual(line[line.length - 1])
    }
  })

  it('macht einen Zickzack weicher', () => {
    for (const level of ['light', 'medium'] as const) {
      const result = smoothStroke(zigzag, level)
      expect(totalTurn(result)).toBeLessThan(totalTurn(zigzag))
    }
  })

  it('behält die Richtungswechsel eines Zickzacks', () => {
    for (const level of ['light', 'medium'] as const) {
      expect(directionChanges(smoothStroke(zigzag, level))).toBe(directionChanges(zigzag))
    }
  })

  it('erzeugt nie mehr Punkte als der rohe Strich', () => {
    for (const level of ['light', 'medium'] as const) {
      for (const stroke of [line, zigzag]) {
        expect(smoothStroke(stroke, level).length).toBeLessThanOrEqual(stroke.length)
      }
    }
  })

  it('behält Anfang und Ende, damit die Linie an der Stiftspitze endet', () => {
    const result = smoothStroke(zigzag, 'medium')
    expect(result[0]).toEqual(zigzag[0])
    expect(result[result.length - 1]).toEqual(zigzag[zigzag.length - 1])
  })

  it('gibt auf "off" genau den rohen Strich zurück', () => {
    expect(smoothStroke(zigzag, 'off')).toBe(zigzag)
  })

  it('verändert den rohen Strich nicht', () => {
    const copy = zigzag.map((p) => ({ ...p }))
    smoothStroke(zigzag, 'medium')
    expect(zigzag).toEqual(copy)
  })

  it('glättet mittel stärker als leicht', () => {
    expect(totalTurn(smoothStroke(zigzag, 'medium'))).toBeLessThan(totalTurn(smoothStroke(zigzag, 'light')))
  })

  it('behält enge Ecken kleiner Buchstaben als erkennbaren Knick', () => {
    // Ein „v“ von 8 PDF-Punkten Höhe, wie in kleiner Handschrift
    const v = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 6 },
      { x: 4, y: 8 },
      { x: 5, y: 6 },
      { x: 6, y: 4 },
      { x: 7, y: 2 },
      { x: 8, y: 0 },
    ]
    const result = smoothStroke(v, 'light')
    expect(Math.max(...result.map((p) => p.y))).toBeGreaterThan(7)
    expect(directionChanges(result)).toBe(1)
  })
})
