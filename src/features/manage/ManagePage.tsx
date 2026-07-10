import { Tags } from 'lucide-react'
import { EmptyState } from '@/components/ui/misc'
import { useT } from '@/lib/i18n'

/** Platzhalter – wird in M2 mit Stammdaten-Verwaltung ausgebaut. */
export function ManagePage() {
  const t = useT()
  return (
    <div className="mx-auto max-w-7xl p-4">
      <h1 className="ui-chrome text-xl font-bold text-ink">{t('nav.manage')}</h1>
      <EmptyState icon={Tags} title="Stammdaten-Verwaltung folgt in M2" />
    </div>
  )
}
