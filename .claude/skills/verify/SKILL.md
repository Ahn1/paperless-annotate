---
name: verify
description: App bauen, mit gemockter Paperless-API starten und Änderungen im echten Browser verifizieren.
---

# Verifikation paperless-annotator

Vite-React-PWA, Paperless-ngx-Client. Es ist **kein echter Paperless-Server nötig**:
`e2e/smoke.spec.ts` mockt die komplette API per `page.route()` (inkl. Mini-PDF-Generator
`buildMinimalPdf()` und Auth-Flow). Für Verifikationen einen temporären Spec in `e2e/`
anlegen, der `mockPaperlessApi` + Login-Schritte aus `smoke.spec.ts` kopiert, und danach löschen.

## Befehle

```bash
pnpm build                                  # tsc -b && vite build (Version via git describe injiziert)
pnpm exec playwright test <spec> --reporter=line
```

- Der Playwright-`webServer` (playwright.config.ts) baut selbst und startet `vite preview` auf :4173 — kein manueller Serverstart nötig.
- Passende Browser ggf. mit `pnpm exec playwright install chromium` nachziehen.

## Bewährte Rezepte

- **Onboarding im Test**: `goto('/onboarding')` (Root leitet ohne Profil auf `/welcome` um!) → URL füllen → „Verbindung prüfen“ → „Mit API-Token“ → Token → „Anmelden“ → „Los geht’s“.
- **Mobil**: `test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })`; Navigation über die Bottom-Tab-Bar („Dokumente“, „Mehr“ = Einstellungen).
- **PDF-Rendering** (EmbedPDF/PDFium): auf `canvas, img[src^="blob:"]` warten (Timeout großzügig, WASM-Start). Der Mock muss `/preview/` als `application/pdf` liefern, nicht als PNG.
- **Pinch-Zoom**: synthetische `TouchEvent`s mit zwei `Touch`-Objekten auf dem `overflow: auto`-Viewport-Container dispatchen, danach Breite des Canvas vergleichen.
- **SW-Update-Banner**: eigener describe-Block mit `serviceWorkers: 'allow'`, auf `navigator.serviceWorker.ready` warten, dann `dist/sw.js` per `fs.appendFile` byteweise ändern und `page.reload()` → Banner „Neue Version verfügbar“ erscheint.
- Sonstige Tests mit `serviceWorkers: 'block'` laufen lassen, sonst cached der SW zwischen Tests.
