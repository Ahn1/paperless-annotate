import { LayoutDashboard } from 'lucide-react'
import { EmptyState } from '@/components/ui/misc'
import { useT } from '@/lib/i18n'

/** Platzhalter – wird in M2 mit Statistiken, Saved-View-Widgets und Upload-Zone ausgebaut. */
export function DashboardPage() {
  const t = useT()
  return (
    <div className="mx-auto max-w-7xl p-4">
      <h1 className="ui-chrome text-xl font-bold text-ink">{t('nav.dashboard')}</h1>
      <EmptyState icon={LayoutDashboard} title="Dashboard folgt in M2" />
    </div>
  )
}
