import { useT } from '@/lib/i18n'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent } from '@/components/ui/Dialog'

/**
 * Abfrage beim Verlassen des Editors mit ungespeicherten Annotationen.
 * Sie ersetzt den Systemdialog und greift auf jedem Weg hinaus: eigener Knopf,
 * Escape, Browser-Taste, Android-Taste, iOS-Wischgeste.
 */
export function LeaveDraftDialog({
  onSave,
  onDiscard,
  onCancel,
}: {
  /** Öffnet den Dialog zum Hochladen einer Version. */
  onSave: () => void
  /** Löscht den lokalen Entwurf und verlässt den Editor. */
  onDiscard: () => void
  /** Bleibt im Editor. */
  onCancel: () => void
}) {
  const t = useT()

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent title={t('editor.leaveTitle')} description={t('editor.leaveText')}>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button className="sm:flex-1" onClick={onSave}>
            {t('common.save')}
          </Button>
          <Button variant="danger" onClick={onDiscard}>
            {t('editor.leaveDiscard')}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            {t('editor.leaveStay')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
