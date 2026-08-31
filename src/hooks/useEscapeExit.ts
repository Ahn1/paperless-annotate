import { useEffect } from 'react'

/** Radix-Layer (Dialog, Popover, Menü, Auswahlliste), die Escape zuerst abfangen. */
const overlaySelector =
  '[data-radix-popper-content-wrapper], [role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'

/**
 * Escape verlässt eine Vollbild-Ansicht auf demselben Weg wie der Zurück-Knopf.
 * Ein offenes Popover oder ein offener Dialog fängt Escape zuerst ab, ebenso ein
 * Texteingabefeld.
 */
export function useEscapeExit(onExit: () => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      const target = event.target as HTMLElement | null
      if (target?.closest?.('input, textarea, [contenteditable="true"]')) return
      if (window.document.querySelector(overlaySelector)) return
      onExit()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onExit])
}
