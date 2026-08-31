import type { Position } from '@embedpdf/models'

/**
 * Stärke der Strichglättung. Bewusst schwach gehalten: Handschrift bleibt lesbar,
 * auch kleine Buchstaben mit engen Ecken.
 */
export type SmoothingLevel = 'off' | 'light' | 'medium'

export const SMOOTHING_LEVELS: readonly SmoothingLevel[] = ['off', 'light', 'medium']

interface SmoothingProfile {
  /** Punkte, die näher als dieser Abstand liegen (PDF-Punkte), fallen weg. */
  minDistance: number
  /**
   * Anteil, um den ein Punkt Richtung Nachbar-Mittel rückt – dämpft Zittern.
   * Höchstens 0.5, denn genau bei 0.5 verschwindet ein Zickzack von Punkt zu Punkt
   * vollständig. Die Werte bleiben klar darunter, damit enge Ecken überleben.
   */
  damping: number
  /** Chaikin-Durchläufe, die Ecken abrunden. */
  rounds: number
  /** Toleranz beim Ausdünnen der abgerundeten Kurve (PDF-Punkte). */
  tolerance: number
}

/** Obergrenze für das Ausdünnen – schützt vor einer Endlosschleife bei Rundungsfehlern. */
const MAX_THINNING_ATTEMPTS = 24

const PROFILES: Record<Exclude<SmoothingLevel, 'off'>, SmoothingProfile> = {
  light: { minDistance: 1, damping: 0.25, rounds: 1, tolerance: 0.2 },
  medium: { minDistance: 2, damping: 0.3, rounds: 2, tolerance: 0.35 },
}

/**
 * Gibt einen weicheren Strich zurück. Reine Funktion – dieselbe Eingabe ergibt
 * dieselbe Ausgabe, ohne die Eingabe zu verändern.
 *
 * Die Glättung steckt bewusst in den Punkten und nicht nur im Rendering: EmbedPDF
 * zeichnet Ink-Annotationen als Polylinie, ein nur optisch geglätteter Strich wäre
 * nach dem Ablegen wieder eckig.
 *
 * Das Ergebnis hat nie mehr Punkte als der rohe Strich.
 */
export function smoothStroke(points: Position[], level: SmoothingLevel): Position[] {
  if (level === 'off' || points.length < 3) return points
  // Fällt zurück, falls eine alte gespeicherte Einstellung eine unbekannte Stufe nennt.
  const profile = PROFILES[level]
  if (!profile) return points

  let curve = decimate(points, profile.minDistance)
  curve = dampen(curve, profile.damping)
  for (let i = 0; i < profile.rounds; i++) curve = chaikin(curve)

  // Das Abrunden setzt Punkte hinzu. Die Kurve wird deshalb wieder ausgedünnt, bis
  // sie höchstens so viele Punkte hat wie der rohe Strich. Eine wachsende Toleranz
  // statt eines gleichmäßigen Rasters: gleichmäßiges Ausdünnen träfe bei feinen
  // Zacken immer dieselbe Phase und würde die Zacken auslöschen.
  let tolerance = profile.tolerance
  let result = simplify(curve, tolerance)
  for (let attempt = 0; attempt < MAX_THINNING_ATTEMPTS && result.length > points.length; attempt++) {
    tolerance *= 2
    result = simplify(curve, tolerance)
  }
  return result
}

/** Wirft zu dicht aufeinander folgende Punkte weg. Erster und letzter Punkt bleiben. */
function decimate(points: Position[], minDistance: number): Position[] {
  const minSquared = minDistance * minDistance
  const out: Position[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const last = out[out.length - 1]
    if (squaredDistance(points[i], last) >= minSquared) out.push(points[i])
  }
  out.push(points[points.length - 1])
  return out
}

/** Zieht jeden Punkt ein Stück auf die Mitte seiner Nachbarn zu. Endpunkte bleiben fest. */
function dampen(points: Position[], weight: number): Position[] {
  if (points.length < 3 || weight <= 0) return points
  const out: Position[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const point = points[i]
    const middleX = (points[i - 1].x + points[i + 1].x) / 2
    const middleY = (points[i - 1].y + points[i + 1].y) / 2
    out.push({ x: point.x + (middleX - point.x) * weight, y: point.y + (middleY - point.y) * weight })
  }
  out.push(points[points.length - 1])
  return out
}

/**
 * Chaikins Corner-Cutting: ersetzt jede Ecke durch zwei Punkte bei einem und drei
 * Vierteln der Kante. Endpunkte bleiben fest, damit die Linie an der Stiftspitze endet.
 */
function chaikin(points: Position[]): Position[] {
  if (points.length < 3) return points
  const out: Position[] = [points[0]]
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    out.push({ x: a.x + (b.x - a.x) * 0.25, y: a.y + (b.y - a.y) * 0.25 })
    out.push({ x: a.x + (b.x - a.x) * 0.75, y: a.y + (b.y - a.y) * 0.75 })
  }
  out.push(points[points.length - 1])
  return out
}

/**
 * Douglas-Peucker: entfernt Punkte, die kaum von der Verbindungslinie abweichen.
 * Gerade Stücke werden dünn, Kurven und Richtungswechsel behalten ihre Punkte.
 */
function simplify(points: Position[], tolerance: number): Position[] {
  if (points.length < 3) return points
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const toleranceSquared = tolerance * tolerance
  const stack: [number, number][] = [[0, points.length - 1]]

  while (stack.length > 0) {
    const [start, end] = stack.pop()!
    let farthest = -1
    let maxDistance = -1
    for (let i = start + 1; i < end; i++) {
      const distance = squaredDistanceToSegment(points[i], points[start], points[end])
      if (distance > maxDistance) {
        maxDistance = distance
        farthest = i
      }
    }
    if (farthest > 0 && maxDistance > toleranceSquared) {
      keep[farthest] = 1
      stack.push([start, farthest], [farthest, end])
    }
  }

  return points.filter((_, index) => keep[index] === 1)
}

function squaredDistance(a: Position, b: Position): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

function squaredDistanceToSegment(point: Position, start: Position, end: Position): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return squaredDistance(point, start)
  let t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
  t = Math.max(0, Math.min(1, t))
  return squaredDistance(point, { x: start.x + t * dx, y: start.y + t * dy })
}
