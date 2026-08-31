import { describe, expect, it } from 'vitest'
import { groupStrokesByWidth, strokePressure, strokeWidthForPressure } from './penPressure'

const BASE = 2.5

describe('strokePressure', () => {
  it('meldet ohne Werte keinen Druck', () => {
    expect(strokePressure([])).toBeNull()
  })

  it('wertet lauter Nullen als „kein Druck“', () => {
    expect(strokePressure([0, 0, 0])).toBeNull()
  })

  it('nimmt den Median', () => {
    expect(strokePressure([0.2, 0.9, 0.5])).toBe(0.5)
    expect(strokePressure([0.2, 0.4, 0.6, 0.8])).toBeCloseTo(0.5)
  })

  it('lässt sich von Aufsetzen und Abheben nicht stören', () => {
    expect(strokePressure([0.01, 0.8, 0.82, 0.78, 0.8, 0])).toBeGreaterThan(0.7)
  })
})

describe('strokeWidthForPressure', () => {
  it('nimmt ohne Druckwerte die eingestellte Stiftbreite', () => {
    expect(strokeWidthForPressure([], BASE)).toBe(BASE)
  })

  it('nimmt bei neutralem Druck genau die eingestellte Stiftbreite', () => {
    expect(strokeWidthForPressure([0.5, 0.5, 0.5], BASE)).toBeCloseTo(BASE)
  })

  it('macht den Strich bei festem Druck dicker', () => {
    expect(strokeWidthForPressure([0.9, 0.95, 0.9], BASE)).toBeGreaterThan(BASE)
  })

  it('macht den Strich bei leichtem Druck dünner', () => {
    expect(strokeWidthForPressure([0.15, 0.2, 0.15], BASE)).toBeLessThan(BASE)
  })

  it('bleibt in einem sinnvollen Rahmen um die Stiftbreite', () => {
    for (let pressure = 0; pressure <= 1.0001; pressure += 0.05) {
      const width = strokeWidthForPressure([pressure], BASE)
      expect(width).toBeGreaterThan(BASE * 0.5)
      expect(width).toBeLessThan(BASE * 2)
    }
  })

  it('wird auch bei kleinstem Druck nie 0', () => {
    expect(strokeWidthForPressure([0.0001], BASE)).toBeGreaterThan(0)
  })

  it('steigt mit dem Druck', () => {
    const light = strokeWidthForPressure([0.2], BASE)
    const middle = strokeWidthForPressure([0.5], BASE)
    const firm = strokeWidthForPressure([0.9], BASE)
    expect(light).toBeLessThan(middle)
    expect(middle).toBeLessThan(firm)
  })

  it('fängt Werte außerhalb von 0 bis 1 ab', () => {
    expect(strokeWidthForPressure([5], BASE)).toBe(strokeWidthForPressure([1], BASE))
    expect(strokeWidthForPressure([Number.NaN], BASE)).toBe(BASE)
  })

  it('verändert die Druckwerte nicht', () => {
    const pressures = [0.9, 0.1, 0.5]
    strokeWidthForPressure(pressures, BASE)
    expect(pressures).toEqual([0.9, 0.1, 0.5])
  })
})

describe('groupStrokesByWidth', () => {
  const a = [{ x: 0, y: 0 }]
  const b = [{ x: 1, y: 1 }]
  const c = [{ x: 2, y: 2 }]

  it('bündelt gleich starke Striche in eine Annotation', () => {
    expect(
      groupStrokesByWidth([
        { points: a, width: 2.5 },
        { points: b, width: 2.5 },
      ]),
    ).toEqual([{ width: 2.5, strokes: [a, b] }])
  })

  it('gibt jeder Stärke eine eigene Annotation', () => {
    expect(
      groupStrokesByWidth([
        { points: a, width: 2.1 },
        { points: b, width: 3.4 },
        { points: c, width: 2.1 },
      ]),
    ).toEqual([
      { width: 2.1, strokes: [a] },
      { width: 3.4, strokes: [b] },
      { width: 2.1, strokes: [c] },
    ])
  })

  it('gibt ohne Striche nichts zurück', () => {
    expect(groupStrokesByWidth([])).toEqual([])
  })
})
