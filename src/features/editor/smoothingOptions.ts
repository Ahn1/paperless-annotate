import { useT } from '@/lib/i18n'
import type { SegmentedOption } from '@/components/ui/SegmentedControl'
import { SMOOTHING_LEVELS, type SmoothingLevel } from './inkSmoothing'

/** Die Glättungsstufen mit ihren übersetzten Namen – gleich in Einstellungen und Werkzeug-Popover. */
export function useSmoothingOptions(): SegmentedOption<SmoothingLevel>[] {
  const t = useT()
  return SMOOTHING_LEVELS.map((level) => ({ value: level, label: t(`settings.pen.smoothing.${level}`) }))
}
