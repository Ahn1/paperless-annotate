import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initTheme } from './lib/theme'

initTheme()

// Browser-Kontextmenü auf UI-Chrome unterdrücken (App-Gefühl); in Eingabefeldern erlaubt
document.addEventListener('contextmenu', (e) => {
  const target = e.target as HTMLElement
  if (!target.closest('input, textarea, [contenteditable], .allow-context-menu')) e.preventDefault()
})

// Bewusst OHNE <StrictMode>: Der StrictMode-Doppel-Mount im Dev-Modus reißt den
// asynchronen Render-Task der PDFium/WASM-Engine (EmbedPDF) ab und lässt den
// Editor/Lesemodus leer. Im Production-Build tritt der Doppel-Mount nicht auf
// (E2E rendert dort korrekt). Die Bugs, die StrictMode aufgedeckt hatte
// (Object-URL-Revoke in AuthImage/PreviewPane), sind separat sauber behoben.
createRoot(document.getElementById('root')!).render(<App />)
