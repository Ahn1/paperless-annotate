/**
 * Eine Ink-Annotation im PDF trägt genau eine Strichstärke. Eine Stärke, die sich
 * innerhalb eines Strichs ändert, lässt sich so nicht speichern. Deshalb bekommt
 * jeder Strich eine Stärke, abgeleitet aus dem Druck während dieses Strichs.
 */

/** Schmalste Stärke, als Anteil der eingestellten Stiftbreite. */
const MIN_FACTOR = 0.6
/** Breiteste Stärke, als Anteil der eingestellten Stiftbreite. */
const MAX_FACTOR = 1.7
/** Druck ohne Sensor: die Pointer-Events-Spezifikation meldet 0.5 bei gedrücktem Knopf. */
const NEUTRAL_PRESSURE = 0.5

/**
 * Mittlerer Druck eines Strichs, oder `null`, wenn es keinen brauchbaren Wert gibt.
 *
 * Der Median statt des Mittelwerts: Aufsetzen und Abheben liefern regelmäßig sehr
 * kleine Werte, die den Strich sonst dünner machen, als er sich anfühlt. Werte von
 * genau 0 fallen weg – so meldet der Browser „kein Druck", nicht „ganz leicht".
 */
export function strokePressure(pressures: readonly number[]): number | null {
  const usable = pressures.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b)
  if (usable.length === 0) return null
  const middle = Math.floor(usable.length / 2)
  return usable.length % 2 === 1 ? usable[middle] : (usable[middle - 1] + usable[middle]) / 2
}

/**
 * Bildet die Druckwerte eines Strichs auf eine Strichstärke ab.
 *
 * Neutraler Druck ergibt exakt die eingestellte Stiftbreite. Fester Druck macht den
 * Strich dicker, leichter Druck dünner. Das Ergebnis bleibt zwischen
 * {@link MIN_FACTOR} und {@link MAX_FACTOR} der Stiftbreite – nie 0, nie extrem dick.
 * Ohne brauchbare Druckwerte (Maus, Finger, Stift ohne Sensor) bleibt es bei der
 * eingestellten Stiftbreite.
 */
export function strokeWidthForPressure(pressures: readonly number[], baseWidth: number): number {
  const pressure = strokePressure(pressures)
  if (pressure === null) return baseWidth
  const clamped = Math.max(0, Math.min(1, pressure))
  const factor =
    clamped <= NEUTRAL_PRESSURE
      ? MIN_FACTOR + (1 - MIN_FACTOR) * (clamped / NEUTRAL_PRESSURE)
      : 1 + (MAX_FACTOR - 1) * ((clamped - NEUTRAL_PRESSURE) / (1 - NEUTRAL_PRESSURE))
  return baseWidth * factor
}

/** Ein fertiger Strich zusammen mit seiner Strichstärke. */
export interface SizedStroke<P> {
  points: P[]
  width: number
}

/** Striche, die zusammen in eine Ink-Annotation gehen. */
export interface StrokeGroup<P> {
  width: number
  strokes: P[][]
}

/**
 * Bündelt aufeinanderfolgende Striche gleicher Stärke zu je einer Annotation.
 *
 * Ohne Druck haben alle Striche die eingestellte Stiftbreite und landen wie bisher
 * in einer einzigen Annotation. Mit Druck hat praktisch jeder Strich seine eigene
 * Stärke und damit seine eigene Annotation.
 */
export function groupStrokesByWidth<P>(strokes: readonly SizedStroke<P>[]): StrokeGroup<P>[] {
  const groups: StrokeGroup<P>[] = []
  for (const stroke of strokes) {
    const last = groups[groups.length - 1]
    if (last && last.width === stroke.width) last.strokes.push(stroke.points)
    else groups.push({ width: stroke.width, strokes: [stroke.points] })
  }
  return groups
}
