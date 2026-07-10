import { StrictMode } from 'react'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
