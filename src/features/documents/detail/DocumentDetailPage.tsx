import { useParams } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { EmptyState } from '@/components/ui/misc'

/** Platzhalter – wird in M2 mit Metadaten-Editing und PDF-Vorschau ausgebaut. */
export function DocumentDetailPage() {
  const { id } = useParams()
  return (
    <div className="mx-auto max-w-7xl p-4">
      <EmptyState icon={FileText} title={`Dokumentdetail #${id} folgt in M2`} />
    </div>
  )
}
