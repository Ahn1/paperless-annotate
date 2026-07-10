import { Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/misc'
import { useT } from '@/lib/i18n'

/** Platzhalter – wird in M2 mit Wiederherstellen/endgültig löschen ausgebaut. */
export function TrashPage() {
  const t = useT()
  return (
    <div className="mx-auto max-w-7xl p-4">
      <h1 className="ui-chrome text-xl font-bold text-ink">{t('nav.trash')}</h1>
      <EmptyState icon={Trash2} title="Papierkorb folgt in M2" />
    </div>
  )
}
