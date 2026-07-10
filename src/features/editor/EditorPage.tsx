import { PenTool } from 'lucide-react'
import { EmptyState } from '@/components/ui/misc'

/** Platzhalter – wird in M4 mit dem EmbedPDF-Annotation-Editor ausgebaut. */
export function EditorPage() {
  return (
    <div className="flex h-dvh items-center justify-center bg-surface">
      <EmptyState icon={PenTool} title="Annotation-Editor folgt in M4" />
    </div>
  )
}
