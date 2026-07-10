import { expect, test, type Page, type Route } from '@playwright/test'

/**
 * Smoke-E2E (Kap. 9): Login → Dokument öffnen → annotieren → Version hochladen.
 * Die Paperless-API wird vollständig gemockt (page.route), es ist kein Server nötig.
 */

const BASE = 'https://mock.paperless.test'

/** Minimales, valides Einseiten-PDF mit korrekt berechneter xref-Tabelle. */
function buildMinimalPdf(): Buffer {
  const header = '%PDF-1.4\n'
  const objects = [
    '1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n',
    '2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n',
    '3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<<>>>>\nendobj\n',
  ]
  let body = header
  const offsets: number[] = []
  for (const object of objects) {
    offsets.push(body.length)
    body += object
  }
  const xrefStart = body.length
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) xref += `${String(offset).padStart(10, '0')} 00000 n \n`
  const trailer = `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF\n`
  return Buffer.from(body + xref + trailer, 'latin1')
}

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const document1 = {
  id: 1,
  title: 'Testdokument',
  content: 'Hallo Welt',
  created: '2026-01-15T00:00:00Z',
  modified: '2026-01-15T00:00:00Z',
  added: '2026-01-15T00:00:00Z',
  correspondent: null,
  document_type: null,
  storage_path: null,
  tags: [],
  archive_serial_number: null,
  original_file_name: 'test.pdf',
  custom_fields: [],
  notes: [],
  page_count: 1,
  versions: [{ id: 1, version_label: null, created: '2026-01-15T00:00:00Z', is_current: true }],
  root_document: null,
}

const emptyList = { count: 0, next: null, previous: null, results: [] }

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'X-Api-Version': '10', 'X-Version': '3.0.0' },
    body: JSON.stringify(body),
  })
}

async function mockPaperlessApi(page: Page, onVersionUpload: (postData: Buffer) => void) {
  const pdf = buildMinimalPdf()

  await page.route(`${BASE}/**`, async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const method = route.request().method()

    if (method === 'POST' && path === '/api/documents/1/update_version/') {
      onVersionUpload(route.request().postDataBuffer() ?? Buffer.alloc(0))
      return json(route, { status: 'ok' })
    }
    if (path === '/api/documents/1/download/') {
      return route.fulfill({ status: 200, contentType: 'application/pdf', body: pdf })
    }
    if (/^\/api\/documents\/1\/(thumb|preview)\//.test(path)) {
      return route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1PX })
    }
    if (path === '/api/documents/1/metadata/') {
      return json(route, {
        original_checksum: 'abc',
        original_size: pdf.length,
        original_mime_type: 'application/pdf',
        media_filename: 'test.pdf',
        has_archive_version: false,
        original_metadata: [],
        archive_checksum: null,
        archive_media_filename: null,
        archive_size: null,
        archive_metadata: null,
        lang: 'de',
      })
    }
    if (path === '/api/documents/1/') return json(route, document1)
    if (path === '/api/documents/') {
      // more_like → leer; sonst die Ein-Dokument-Liste
      if (url.searchParams.has('more_like_id')) return json(route, emptyList)
      return json(route, { count: 1, next: null, previous: null, results: [document1] })
    }
    if (path === '/api/statistics/') {
      return json(route, { documents_total: 1, documents_inbox: 0, character_count: 10, tag_count: 0 })
    }
    if (path === '/api/tasks/') return json(route, [])
    if (path.startsWith('/api/')) return json(route, emptyList)
    return route.fulfill({ status: 404, body: 'not found' })
  })
}

test.use({ locale: 'de-DE', serviceWorkers: 'block', viewport: { width: 1280, height: 800 } })

test('Login → Dokument öffnen → annotieren → Version hochladen', async ({ page }) => {
  let uploadedBody: Buffer | null = null
  await mockPaperlessApi(page, (body) => {
    uploadedBody = body
  })

  // --- Onboarding: Server verbinden ---
  await page.goto('/')
  await expect(page.getByText('Mit Paperless verbinden')).toBeVisible()
  await page.getByPlaceholder('https://paperless.example.com').fill(BASE)
  await page.getByRole('button', { name: 'Verbindung prüfen' }).click()

  // --- Anmeldung per Token ---
  await page.getByRole('button', { name: 'Mit API-Token' }).click()
  await page.locator('form input').first().fill('test-token-1234')
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await page.getByRole('button', { name: 'Los geht’s' }).click()

  // --- Dashboard → Dokumentenliste → Detail ---
  await page.getByRole('link', { name: 'Dokumente' }).first().click()
  await page.getByText('Testdokument').first().click()
  await expect(page.getByRole('heading', { name: 'Testdokument' })).toBeVisible()

  // --- Editor öffnen und auf gerenderte PDF-Seite warten ---
  await page.getByRole('button', { name: 'Annotieren', exact: true }).click()
  const pageImage = page.locator('img[loading], img[src^="blob:"], canvas').first()
  await expect(pageImage).toBeVisible({ timeout: 45_000 })

  // --- Stift aktivieren und einen Strich zeichnen ---
  await page.getByRole('button', { name: 'Stift', exact: true }).click()
  const box = await pageImage.boundingBox()
  if (!box) throw new Error('PDF-Seite nicht gefunden')
  const startX = box.x + box.width * 0.3
  const startY = box.y + box.height * 0.3
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(startX + i * 12, startY + i * 8, { steps: 2 })
  }
  await page.mouse.up()
  // Ink-Tool committet Striche nach kurzem Delay
  await page.waitForTimeout(1500)

  // --- Speichern als neue Version ---
  await page.getByRole('button', { name: 'Speichern' }).click()
  const labelInput = page.getByRole('dialog').locator('input')
  await expect(labelInput).toHaveValue(/^Annotiert /)
  await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click()

  // Upload wurde ausgelöst und enthält ein PDF (Multipart mit %PDF-Signatur)
  await expect.poll(() => uploadedBody !== null, { timeout: 30_000 }).toBe(true)
  expect(uploadedBody!.toString('latin1')).toContain('%PDF')

  // Zurück im Dokumentdetail
  await expect(page.getByRole('heading', { name: 'Testdokument' })).toBeVisible({ timeout: 15_000 })
})
