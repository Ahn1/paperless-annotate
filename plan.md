# Paperless Annotator – Anforderungskatalog

Vollwertiger Paperless-ngx-Client als PWA mit PDF-Annotationsfunktion (Stift + Textfelder) und Dokumentversionierung.

---

## 1. Projektziel

Eine Progressive Web App als vollwertiger Client für **Paperless-ngx v3**. Die App deckt alle Kernfunktionen von Paperless ab (Suche, Ansichten, Tags, Metadaten etc.) und ergänzt ein **PDF-Annotations-Feature**: Auf PDFs kann mit dem Stift (Apple Pencil, S-Pen) gezeichnet und mit verschiebbaren Textfeldern geschrieben werden. Jede Bearbeitung wird als **neue Dokumentversion** in Paperless hochgeladen. Annotationen bleiben als echte PDF-Annotation-Objekte editierbar (radierbar), da sie als eigene Ebene über dem Seiteninhalt liegen.

**Zielgeräte (Priorität in dieser Reihenfolge):**

1. iPad mit Apple Pencil (Safari, als PWA installiert) – Hauptgerät
2. Android-Tablets mit Stift
3. Desktop (Linux/Windows/macOS, Chrome/Firefox)
4. Smartphones (Lesen/Verwalten, Annotieren optional)

**Kein eigenes Backend.** Die App spricht ausschließlich mit der Paperless-ngx-REST-API des Nutzers.

---

## 2. Tech-Stack (Vorgabe)

| Bereich           | Technologie                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------- |
| Framework         | React 18+ mit TypeScript, Vite als Build-Tool                                             |
| PDF-Engine        | **EmbedPDF** (`@embedpdf/*`, MIT, PDFium/WASM) – headless-Variante für volle UI-Kontrolle |
| Styling           | **Tailwind CSS v4** (CSS-first-Konfiguration, `@theme`) – Themes über native CSS Custom Properties |
| UI-Komponenten    | **Radix UI** (Headless-Primitives: Dialog, Dropdown, Popover, …), gestylt mit Tailwind; shadcn/ui optional als Copy-in-Startpunkt (keine Laufzeit-Dependency) |
| State             | Zustand oder TanStack Query (Server-State) + leichtgewichtiger Client-State               |
| Lokale Persistenz | IndexedDB (via `idb`) für Cache & Einstellungen; Zugangsdaten siehe Kap. 8                |
| PWA               | `vite-plugin-pwa` (Workbox), Web App Manifest                                             |
| Routing           | React Router (oder TanStack Router), mit View-Transitions                                 |

Begründung EmbedPDF: unterstützt Ink- und FreeText-Annotationen inkl. Erstellen/Verschieben/Löschen, headless-API mit eigenen Handles, Annotation-Events zum Sync, Export/Save schreibt Annotationen als echte PDF-Objekte zurück.

Begründung Styling: Tailwind **v4** (nicht v3), weil das Theme-System (Hell/Dunkel/AMOLED + Akzentfarbschemata, Kap. 6.1) direkt auf dessen nativer CSS-Variablen-Architektur (`@theme`) aufsetzt – Akzentfarben-Umschaltung ist ein Variablen-Swap auf `:root`. Radix UI als Headless-Schicht, weil Tailwind nur Styling löst, nicht Verhalten/Barrierefreiheit (Dialoge, Dropdowns, Tag-Multiselects); Komponenten-Frameworks (MUI, Mantine) widersprechen der „keine Standard-Optik"-Vorgabe (Kap. 6.1), CSS-in-JS (styled-components/Emotion) den Performance-Zielen (Kap. 9, 60 fps / Lighthouse ≥ 90) wegen Runtime-Kosten.

---

## 3. Paperless-API-Integration

### 3.1 Grundlagen

- Basis-URL der Paperless-Instanz ist vom Nutzer konfigurierbar (inkl. Subpfad).
- Auth: **Token-Auth** (`Authorization: Token <token>`). Login-Flow: entweder Token direkt eingeben oder Username/Passwort einmalig an `POST /api/token/` senden und nur das Token speichern.
- API-Version pinnen: Header `Accept: application/json; version=10`.
- Beim Verbinden Kompatibilität prüfen: Response-Header `X-Api-Version` und `X-Version` auslesen; Warnung anzeigen, wenn Server < v3.
- Alle Listen paginiert laden (`page`, `page_size`), Infinite Scroll im UI.
- Fehlerbehandlung: 401 → zurück zum Login; 403 → Hinweis auf fehlende Berechtigung; Netzwerkfehler → Retry mit Backoff + Offline-Hinweis.

### 3.2 Genutzte Endpoints (Auswahl)

- Dokumente: `GET/PATCH /api/documents/`, `GET /api/documents/{id}/`
- Volltextsuche: `GET /api/documents/?query=...` sowie Filterparameter (Tags, Korrespondent, Dokumenttyp, Speicherpfad, Datum, Custom Fields)
- Autocomplete/Ähnliche: `GET /api/search/autocomplete/`, `more_like_id`
- Download: `GET /api/documents/{id}/download/?original=true` (**wichtig:** immer `original=true` für die Annotationsbearbeitung, nicht die Archiv-Datei), optional `&version={version_id}`
- Vorschau/Thumbnail: `/preview/`, `/thumb/` (jeweils `?version=` möglich)
- Metadaten: `GET /api/documents/{id}/metadata/`
- Notizen: `GET/POST/DELETE /api/documents/{id}/notes/`
- Upload neuer Dokumente: `POST /api/documents/post_document/`
- Stammdaten: `/api/tags/`, `/api/correspondents/`, `/api/document_types/`, `/api/storage_paths/`, `/api/custom_fields/`
- Gespeicherte Ansichten: `/api/saved_views/`
- Aufgaben/Konsum-Status: `/api/tasks/`
- Statistiken (Dashboard): `/api/statistics/`
- Bulk-Edit: `POST /api/documents/bulk_edit/`
- Papierkorb: `/api/trash/`

### 3.3 Dokumentversionen (v3-Feature, zentral für die App)

- Versionen hängen an einem Root-Dokument; Metadaten (Titel, Tags, Korrespondent, Custom Fields, Berechtigungen) bleiben am Root, Datei/Inhalt gehört zur Version.
- `POST /api/documents/{id}/update_version/` – Multipart-Upload, Feld `document` (PDF), optional `version_label`
- `PATCH /api/documents/{id}/versions/{version_id}/` – `version_label` ändern
- `DELETE /api/documents/{root_id}/versions/{version_id}/` – Version löschen (Root nicht löschbar)
- `GET /api/documents/{id}/?version={version_id}` bzw. `?version=` an Download/Preview/Thumb/Metadata

---

## 4. Funktionsumfang (Paperless-Kernfunktionen)

### 4.1 Dashboard

- Begrüßung, Statistiken (Dokumente gesamt, im Posteingang, Zeichen etc.)
- Gespeicherte Ansichten, die "auf dem Dashboard anzeigen" markiert sind, als Karten/Widgets
- Zuletzt hinzugefügte Dokumente
- Upload-Zone (Drag & Drop + Dateiauswahl + auf Mobilgeräten Kamera/Datei-Share)

### 4.2 Dokumentenliste

- Ansichtsmodi: Karten (Thumbnails), Kompaktliste, Tabelle – umschaltbar, Einstellung wird gemerkt
- Sortierung: Erstellungsdatum, Hinzugefügt, Titel, Korrespondent, ASN etc., auf-/absteigend
- Mehrfachauswahl mit Bulk-Aktionen: Tags setzen/entfernen, Korrespondent/Typ/Pfad setzen, löschen, zusammenführen
- Infinite Scroll, Skeleton-Loader, Pull-to-Refresh auf Touch-Geräten

### 4.3 Suche & Filter

- Globale Volltextsuche mit Autocomplete-Vorschlägen
- Filterleiste: Tags (mit/ohne, verschachtelt), Korrespondent, Dokumenttyp, Speicherpfad, Datum (erstellt/hinzugefügt, Bereiche, relative Angaben wie "letzte 30 Tage"), Custom Fields, Besitzer, "im Posteingang"
- Erweiterte Suchsyntax von Paperless durchreichen (z. B. `correspondent:amazon created:[2025 to 2026]`)
- Aktive Filter als entfernbare Chips anzeigen
- Filterkombinationen als **gespeicherte Ansicht** speichern (inkl. Sortierung, Anzeige auf Dashboard/Sidebar)

### 4.4 Dokumentdetail

- Zwei-Spalten-Layout (Tablet/Desktop): links Metadaten, rechts PDF-Vorschau; auf dem Phone Tabs
- Metadaten bearbeiten: Titel, Erstellungsdatum, Korrespondent, Dokumenttyp, Speicherpfad, ASN, Tags (Mehrfachauswahl mit Suche + Inline-Neuanlage), Custom Fields (alle Feldtypen inkl. Select, Doclink, Monetär), Besitzer/Berechtigungen
- Notizen lesen/anlegen/löschen
- OCR-Inhalt einsehen (read-only mit Copy)
- Metadaten-Panel: Dateigröße, Checksummen, Mime-Type, Seitenzahl
- Ähnliche Dokumente ("more like this")
- Aktionen: Download (Original/Archiv), Teilen-Link erstellen, Löschen (in Papierkorb), Neu verarbeiten

### 4.5 Versionsverwaltung (UI)

- Versions-Timeline im Dokumentdetail: alle Versionen mit Label, Datum, "aktuell"-Badge
- Version ansehen (Preview), herunterladen, Label umbenennen, löschen (mit Bestätigung)
- Vergleichsansicht: zwei Versionen nebeneinander (einfaches Side-by-Side reicht)
- Button "Diese Version annotieren" → öffnet Editor auf Basis dieser Version

### 4.6 Stammdaten-Verwaltung

- Eigene Verwaltungsseiten für Tags (inkl. Farbe, Verschachtelung), Korrespondenten, Dokumenttypen, Speicherpfade, Custom Fields
- Jeweils: Liste mit Suche, Dokumentanzahl, Anlegen/Bearbeiten/Löschen, Matching-Regeln (Algorithmus + Pattern)

### 4.7 Upload & Posteingang

- Upload mit optionalen Vorab-Metadaten (Titel, Tags, Korrespondent, Typ)
- Task-Status der Verarbeitung live anzeigen (Polling auf `/api/tasks/`)
- Posteingang-Ansicht (Dokumente mit Inbox-Tags) mit schnellem "Abarbeiten"-Flow: Metadaten setzen → Inbox-Tag entfernen → nächstes Dokument

### 4.8 Papierkorb

- Gelöschte Dokumente anzeigen, wiederherstellen, endgültig löschen

---

## 5. Annotations-Feature (Kernstück)

### 5.1 Editor-Grundlagen

- Vollbild-Editor auf Basis von EmbedPDF (headless), eigene Toolbar
- Geladen wird immer die **Originaldatei der gewählten Version** (`original=true`)
- Seitenavigation: Daumenkino/Thumbnail-Leiste, Pinch-Zoom, Doppeltipp-Zoom, flüssiges Scrollen

### 5.2 Werkzeuge

1. **Stift (Ink):** Freihandzeichnen; Farbe (Palette + frei wählbar), Strichstärke, Deckkraft; Striche werden als PDF-Ink-Annotationen gespeichert
2. **Textmarker:** Ink mit Transparenz oder Highlight-Annotation auf Textauswahl
3. **Textfeld (FreeText):** per Tipp platzieren, Tastatureingabe, **frei verschiebbar und in der Größe änderbar** (Drag-Handles), Schriftgröße/-farbe einstellbar
4. **Radierer:** tippt/streicht Annotation-Objekte an und entfernt sie einzeln; lange Striche beim Speichern optional in kleinere Ink-Objekte segmentieren, damit partielles Radieren möglich ist
5. **Auswahl-Werkzeug:** bestehende Annotationen (auch aus früheren Versionen) antippen → verschieben, Eigenschaften ändern, löschen
6. Undo/Redo (History-Plugin von EmbedPDF)

### 5.3 Stift-Eingabe (kritisch für die UX)

- Pointer Events verwenden; im Zeichenmodus nur `pointerType === "pen"` zeichnet, Finger scrollt/zoomt (**Palm Rejection**)
- Umschaltbar: "Auch Finger zeichnet" für Geräte ohne Stift
- Druckstärke (`pressure`) auf Strichstärke mappen (abschaltbar)
- `touch-action: none` auf der Zeichenfläche, Low-Latency-Rendering (`desynchronized` Canvas wo möglich)
- iOS-Eigenheit: Scribble-Interferenz auf der Zeichenfläche unterbinden

### 5.4 Speichern → neue Version

- "Speichern"-Button: PDF mit eingebetteten Annotationen erzeugen (EmbedPDF-Export) → `POST /api/documents/{id}/update_version/`
- Dialog: `version_label` vorausgefüllt (z. B. "Annotiert 2026-07-10"), editierbar
- Fortschrittsanzeige beim Upload; danach zurück zum Dokumentdetail mit aktualisierter Versionsliste
- **Entwurfsschutz:** ungespeicherte Annotationen lokal in IndexedDB zwischenspeichern (Autosave alle 30 s + bei Verlassen); beim erneuten Öffnen Wiederherstellung anbieten
- Konflikthinweis: vor dem Upload prüfen, ob inzwischen eine neuere Version existiert → Nutzer entscheidet (trotzdem hochladen / abbrechen)

---

## 6. UI/UX

### 6.1 Gestaltung

- Modernes, aufgeräumtes Design; keine Standard-Bootstrap-Optik
- **Themes:** mindestens Hell, Dunkel, System-Automatik + 3–4 Farbschemata (Akzentfarben), live umschaltbar, persistiert; umgesetzt über CSS Custom Properties (via Tailwind v4 `@theme`; Akzentfarben-Umschaltung als Variablen-Swap auf `:root`)
- Optional: AMOLED-Schwarz-Theme
- Konsistente Icongrafik (z. B. Lucide), dezente Micro-Animationen

### 6.2 App-Gefühl statt Webseite

- Installierbare PWA: Manifest mit `display: standalone`, Icons (inkl. maskable), Splash/Theme-Color je Theme
- Keine sichtbaren Browser-Muster: kein Textcursor auf UI-Elementen, kein Pull-to-Refresh des Browsers (eigenes implementieren), keine Kontextmenüs des Browsers auf Interaktionsflächen, `user-select: none` auf UI-Chrome
- Seitenübergänge mit View Transitions API (Fallback: CSS-Transitions)
- Gesten: Swipe-Back für Navigation, Swipe-Aktionen auf Listenelementen (z. B. archivieren/taggen)
- Haptik wo verfügbar (`navigator.vibrate` auf Android)
- Safe-Areas (Notch/Home-Indicator) via `env(safe-area-inset-*)`
- 60-fps-Anspruch: Virtualisierte Listen, Bilder lazy, keine Layout-Shifts

### 6.3 Responsiveness

- **Phone (<640 px):** Bottom-Tab-Bar (Dashboard, Dokumente, Suche, Mehr), Detail als eigene Seite
- **Tablet (640–1280 px):** einklappbare Sidebar, Split-View im Detail (Liste ↔ Dokument), Editor im Vollbild
- **Desktop (>1280 px):** permanente Sidebar, Drei-Spalten wo sinnvoll, Tastaturkürzel (Suche `/`, Navigation, Speichern `Ctrl+S` im Editor)
- Touch-Ziele ≥ 44 px; Hover-Zustände nur auf Pointer-Geräten

### 6.4 Offline-Verhalten

- App-Shell komplett offline (Precache)
- Thumbnails und zuletzt geöffnete Dokumente/PDFs cachen (Stale-While-Revalidate, Cache-Limit konfigurierbar)
- Offline-Banner; schreibende Aktionen offline blockieren mit klarer Meldung (keine komplexe Sync-Queue in v1)

---

## 7. Onboarding & Einstellungen

- **Ersteinrichtung:** Server-URL eingeben → Verbindungstest (Erreichbarkeit, API-Version, CORS-Fehler verständlich erklären) → Token oder Login → fertig
- Ersteinrichtung am besten als "wizard" (bitte nicht so nennen), also schritt für schritt mit jeweils prüfung, ob was fehlerhaft ist.
- Mehrere Server-Profile unterstützen (umschaltbar)
- Einstellungen: Theme, Standard-Dokumentansicht, Seitenformat Datum, Sprache (i18n-Grundgerüst, DE + EN), Stift-Optionen, Cache leeren, Abmelden (löscht Zugangsdaten lokal)

---

## 8. Sicherheit & Datenhaltung

- **Zugangsdaten ausschließlich lokal**, kein eigener Account, keine Drittserver, keine Telemetrie
- Token in IndexedDB; optional mit App-PIN verschlüsselt (WebCrypto, Schlüssel aus PIN abgeleitet); "PIN beim Start abfragen" als Option
- Nur HTTPS-Server-URLs zulassen (Ausnahme: lokale IPs/`.local` mit Warnhinweis)
- Keine Zugangsdaten in URLs oder Logs
- Hinweisseite in den Einstellungen: Paperless-Server braucht CORS-Freigabe für die PWA-Origin (`PAPERLESS_CORS_ALLOWED_HOSTS`), mit Copy-Paste-Beispie -> Mit guter Fehlermeldung/Anleitung, wenn bei der Einrichtung auffällt, dass dies nicht gesetzt ist

---

## 9. Nicht-funktionale Anforderungen

- TypeScript strikt, ESLint + Prettier
- Komponenten-/API-Schicht sauber getrennt (API-Client als eigenes Modul mit typisierten Endpunkten)
- Unit-Tests für API-Client und Annotations-Serialisierung; Smoke-E2E (Playwright) für Login → Dokument öffnen → annotieren → Version hochladen (gegen Mock)
- Lighthouse-PWA-Score ≥ 90
- Bundle-Splitting: PDF-Engine (WASM) lazy laden, erst beim Öffnen eines Dokuments (wenn möglich cachen)
- docker compose von paperless 3 im projekt zum testen ergänzen

---

## 10. Ausdrücklich außerhalb des Umfangs (v1)

- Kein eigener Backend-/Sync-Dienst, keine Konten
- Keine Offline-Schreib-Queue
- Keine E-Mail-Regeln-/Workflow-Verwaltung
- Kein Mehrbenutzer-Echtzeit-Editing
- Keine Bearbeitung des Seiteninhalts selbst (kein PDF-Editor: kein Seiten drehen/löschen in v1)

---

## 11. Meilensteine (Vorschlag für die Umsetzung)

1. **M1 – Grundgerüst:** Projekt-Setup, Theme-System, Onboarding/Login, API-Client, Dokumentenliste + Suche
2. **M2 – Verwaltung:** Dokumentdetail mit Metadaten-Editing, Stammdaten-Seiten, gespeicherte Ansichten, Dashboard, Upload/Posteingang
3. **M3 – Versionen:** Versions-Timeline, Version-Download/-Preview, Label/Löschen
4. **M4 – Annotation-Editor:** EmbedPDF-Integration, Stift/Radierer/Textfelder, Autosave-Entwürfe, Upload als neue Version
5. **M5 – Polish:** PWA/Offline, Gesten, Übergänge, Tastaturkürzel, Tests, Performance

---

## 12. Umsetzungsstand (Fortschritts-Log)

> Dieses Kapitel wird nach jedem Meilenstein aktualisiert, damit die Arbeit jederzeit fortgesetzt werden kann. Ein Commit pro Meilenstein.

### ✅ M1 – Grundgerüst (fertig, 2026-07-10)

**Umgesetzt:**

- Projekt-Setup: Vite 6 + React 19 + TypeScript strict, Tailwind v4 (`@tailwindcss/vite`), vite-plugin-pwa, Pfad-Alias `@/ → src/`
- Theme-System: Hell/Dunkel/AMOLED/System + 4 Akzentfarben, live umschaltbar, CSS-Variablen in [src/index.css](src/index.css), Logik in [src/lib/theme.ts](src/lib/theme.ts)
- i18n DE/EN: [src/lib/i18n.ts](src/lib/i18n.ts) (flacher Key-Katalog, `useT()`-Hook)
- IndexedDB-Layer via `idb`: [src/lib/db.ts](src/lib/db.ts) (Stores: `profiles`, `kv`, `drafts`)
- API-Client: [src/api/client.ts](src/api/client.ts) (Token-Auth, `Accept: application/json; version=10`, X-Api-Version/X-Version-Erfassung, Fehlerklassen, Retry mit Backoff bei GET, `probeServer()` mit CORS-Diagnose, `obtainToken()`); typisierte Endpunkte in [src/api/paperless.ts](src/api/paperless.ts); Typen in [src/api/types.ts](src/api/types.ts)
- Session/Profile: [src/stores/session.ts](src/stores/session.ts) (mehrere Serverprofile, Umschalten, 401→Login); WebCrypto-PIN-Verschlüsselung vorbereitet in [src/lib/crypto.ts](src/lib/crypto.ts) (UI dafür kommt in M5)
- Onboarding als Schritt-Flow: [src/features/onboarding/OnboardingPage.tsx](src/features/onboarding/OnboardingPage.tsx) (URL-Prüfung inkl. HTTPS-Regel, Verbindungstest mit CORS-Fehlererklärung + Copy-Beispiel, Version-Warnung < v3, Token- oder Login-Flow mit Validierung)
- App-Shell: [src/features/shell/AppShell.tsx](src/features/shell/AppShell.tsx) (einklappbare Sidebar ≥640px, Bottom-Tab-Bar auf Phones, Offline-Banner, Saved-Views in der Sidebar)
- Dokumentenliste: [src/features/documents/DocumentListPage.tsx](src/features/documents/DocumentListPage.tsx) – Karten/Liste/Tabelle (persistiert), Sortierung, Infinite Scroll (IntersectionObserver), Skeletons, Mehrfachauswahl mit Bulk-Aktionen ([BulkActionsBar.tsx](src/features/documents/BulkActionsBar.tsx): Tags, Korrespondent, Typ, Löschen)
- Suche: [SearchBar.tsx](src/features/documents/SearchBar.tsx) mit Autocomplete; Filterpanel ([FilterPanel.tsx](src/features/documents/FilterPanel.tsx)): Tags/Korrespondent/Typ/Pfad/Datum/Posteingang, aktive Filter als Chips, „Als Ansicht speichern“; Saved-View↔Filter-Mapping in [documentQuery.ts](src/features/documents/documentQuery.ts)
- Thumbnails mit Auth-Header: [src/components/AuthImage.tsx](src/components/AuthImage.tsx) (Blob + Object-URL, Query-Cache)
- Einstellungen: Theme, Akzent, Sprache, Standardansicht, Stift-Optionen, Profil-Verwaltung, CORS-Hilfe, Cache leeren

**Bewusst verschoben:** Dashboard, Dokumentdetail, Stammdaten-Seiten, Papierkorb (Platzhalter-Routen existieren) → M2; Editor → M4; PIN-UI, verschachtelte Tags im Picker, Pull-to-Refresh, View Transitions → M5.

### ✅ M2 – Verwaltung (fertig, 2026-07-10)

**Umgesetzt:**

- Dashboard ([src/features/dashboard/DashboardPage.tsx](src/features/dashboard/DashboardPage.tsx)): Statistik-Karten (`/api/statistics/`), Saved-View-Widgets (show_on_dashboard) mit Top-5-Dokumenten, „Zuletzt hinzugefügt“-Reihe, Upload-Zone
- Upload ([UploadZone.tsx](src/features/dashboard/UploadZone.tsx)): Drag & Drop + Dateiauswahl, optionale Vorab-Metadaten (Titel/Tags/Korrespondent/Typ), Task-Verfolgung mit Polling auf `/api/tasks/` (3-s-Intervall solange Tasks laufen)
- Dokumentdetail ([DocumentDetailPage.tsx](src/features/documents/detail/DocumentDetailPage.tsx)): Zwei-Spalten ≥768px / Tabs auf Phone; PDF-Vorschau als Blob-iframe ([PreviewPane.tsx](src/features/documents/detail/PreviewPane.tsx)); Metadaten-Formular mit Dirty-Tracking ([MetadataForm.tsx](src/features/documents/detail/MetadataForm.tsx)); Custom-Fields-Editor für alle Feldtypen ([CustomFieldsEditor.tsx](src/features/documents/detail/CustomFieldsEditor.tsx)); Notizen, OCR-Inhalt mit Copy, Datei-Infos (`/metadata/`), ähnliche Dokumente (`more_like_id`); Aktionen: Download Original/Archiv, Löschen, „Annotieren“-Button (Editor-Route), Inbox-„Erledigt“-Flow (entfernt Inbox-Tags, springt zurück zum Posteingang)
- Stammdaten ([ManagePage.tsx](src/features/manage/ManagePage.tsx) + [CrudPage.tsx](src/features/manage/CrudPage.tsx)): generisches CRUD für Tags (Farbe, Parent, Inbox-Flag), Korrespondenten, Dokumenttypen, Speicherpfade – je mit Suche, Dokumentanzahl (verlinkt auf gefilterte Liste), Matching-Regeln (Algorithmus + Muster + Groß/klein); Custom Fields separat ([CustomFieldsPage.tsx](src/features/manage/CustomFieldsPage.tsx), inkl. Select-Optionen)
- Papierkorb ([TrashPage.tsx](src/features/trash/TrashPage.tsx)): Auflisten, Wiederherstellen, Papierkorb leeren

**Anmerkungen:** Besitzer/Berechtigungen-Editing und „Neu verarbeiten“ sind noch offen (kleiner Umfang, bei Bedarf in M5 nachziehen). „Teilen-Link“ hängt von Share-Links-API ab → M5-Kandidat.

### ⬜ M3 – Versionen

### ⬜ M4 – Annotation-Editor

### ⬜ M5 – Polish

**Fortsetzungshinweise:**

- Befehle: `npm run dev` (Entwicklung), `npm run build` (tsc + vite build), `npm run typecheck`, `npm test`
- Routing ist HashRouter (PWA-freundlich ohne Server-Rewrites); Routen in [src/App.tsx](src/App.tsx)
- Neue API-Aufrufe immer in [src/api/paperless.ts](src/api/paperless.ts) ergänzen, Komponenten nutzen `useApi()` aus [src/stores/session.ts](src/stores/session.ts)
- Query-Keys beginnen mit `api.client.baseUrl`, damit Profilwechsel den Cache sauber trennt

---

## 13. Offene Punkte / vom Entwickler zu verifizieren

- Paperless v3 ist zum Zeitpunkt dieses Dokuments Beta; exakte Feldnamen der Versions-API (z. B. `versions`-Array im Dokument-Serializer, `root_document`) gegen das OpenAPI-Schema der Zielinstanz (`/api/schema/view/`) prüfen
- Verhalten von `?version=` bei `download` mit `original=true` testen
- EmbedPDF: prüfen, ob FreeText-Editing im verwendeten Release vollständig ist; sonst FreeText über die headless-Annotation-API + eigene Move/Resize-Handles umsetzen
