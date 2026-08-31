import { expect, test, type Page, type Route } from '@playwright/test'

/** TEMPORÄR: Diagnose zu falsch gedrehten PDFs (/Rotate 90). Nach der Analyse löschen. */

const BASE = 'https://mock.paperless.test'

/** PDF mit MediaBox 400x800, /Rotate 90, rotem Feld links oben, blauem links unten. */
function buildRotatedPdf(rotate: number): Buffer {
  const content = '1 0 0 rg 0 700 100 100 re f\n0 0 1 rg 0 0 100 100 re f\n'
  const objects = [
    '1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n',
    '2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n',
    `3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 400 800]/Rotate ${rotate}/Resources<<>>/Contents 4 0 R>>\nendobj\n`,
    `4 0 obj\n<</Length ${content.length}>>\nstream\n${content}endstream\nendobj\n`,
  ]
  let body = '%PDF-1.4\n'
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

async function mockPaperlessApi(page: Page, pdf: Buffer) {
  const state = { pdf }
  await page.route(`${BASE}/**`, async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const method = route.request().method()

    if (method === 'POST' && path === '/api/documents/1/update_version/') {
      const body = route.request().postDataBuffer() ?? Buffer.alloc(0)
      const start = body.indexOf('%PDF')
      const end = body.lastIndexOf('%%EOF')
      state.pdf = body.subarray(start, end + 5)
      return json(route, { status: 'ok' })
    }

    if (path === '/api/documents/1/download/' || path === '/api/documents/1/preview/') {
      return route.fulfill({ status: 200, contentType: 'application/pdf', body: state.pdf })
    }
    if (path === '/api/documents/1/thumb/') {
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

async function signIn(page: Page) {
  await page.goto('/onboarding')
  await expect(page.getByText('Mit Paperless verbinden')).toBeVisible()
  await page.getByPlaceholder('https://paperless.example.com').fill(BASE)
  await page.getByRole('button', { name: 'Verbindung prüfen' }).click()
  await page.getByRole('button', { name: 'Mit API-Token' }).click()
  await page.locator('form input').first().fill('test-token-1234')
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await page.getByRole('button', { name: 'Los geht’s' }).click()
}

/** Bildschirmfarben an den oberen Ecken der dargestellten Seite auslesen. */
async function probe(page: Page, label: string) {
  const img = page.locator('img[src^="blob:"]').first()
  await expect(img).toBeVisible({ timeout: 45_000 })
  await page.waitForTimeout(1500)
  const box = (await img.boundingBox())!
  const shot = (await page.screenshot()).toString('base64')
  const points = {
    topLeft: { x: box.x + box.width * 0.08, y: box.y + box.height * 0.08 },
    topRight: { x: box.x + box.width * 0.92, y: box.y + box.height * 0.08 },
  }
  const colors = await page.evaluate(
    async ({ shot, points }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${shot}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const ratio = image.naturalWidth / window.innerWidth
      const at = (p: { x: number; y: number }) => {
        const d = ctx.getImageData(Math.round(p.x * ratio), Math.round(p.y * ratio), 1, 1).data
        return `${d[0]},${d[1]},${d[2]}`
      }
      return { topLeft: at(points.topLeft), topRight: at(points.topRight) }
    },
    { shot, points },
  )
  const result = { css: `${Math.round(box.width)}x${Math.round(box.height)}`, ...colors }
  console.log(`### ${label}: ${JSON.stringify(result)}`)
  return result
}

for (const rotate of [0, 90]) {
  test(`Rotate ${rotate}: Vorschau, Lesemodus und Editor`, async ({ page }) => {
    await mockPaperlessApi(page, buildRotatedPdf(rotate))
    await signIn(page)

    await page.getByRole('link', { name: 'Dokumente' }).first().click()
    await page.getByText('Testdokument').first().click()
    await expect(page.getByRole('heading', { name: 'Testdokument' })).toBeVisible()
    await probe(page, `rotate=${rotate} VORSCHAU`)

    await page.getByRole('button', { name: 'Lesemodus' }).click()
    await probe(page, `rotate=${rotate} LESEMODUS`)
    await page.goBack()

    await page.getByRole('button', { name: 'Annotieren', exact: true }).click()
    await probe(page, `rotate=${rotate} EDITOR`)
  })
}

for (const rotate of [0, 90]) {
test(`Rotate ${rotate}: Strich landet unter dem Zeiger`, async ({ page }) => {
  await mockPaperlessApi(page, buildRotatedPdf(rotate))
  await signIn(page)

  await page.getByRole('link', { name: 'Dokumente' }).first().click()
  await page.getByText('Testdokument').first().click()
  await page.getByRole('button', { name: 'Annotieren', exact: true }).click()

  const img = page.locator('img[src^="blob:"]').first()
  await expect(img).toBeVisible({ timeout: 45_000 })
  await page.waitForTimeout(1500)

  await page.getByRole('button', { name: 'Stift', exact: true }).click()
  const box = (await img.boundingBox())!
  const startX = box.x + box.width * 0.25
  const startY = box.y + box.height * 0.3
  const endX = box.x + box.width * 0.45
  const endY = box.y + box.height * 0.6
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(startX + ((endX - startX) * i) / 10, startY + ((endY - startY) * i) / 10, { steps: 2 })
  }
  await page.mouse.up()
  await page.waitForTimeout(300)

  const previewBox = await page.locator('[data-testid="ink-input-layer"] svg path').first().boundingBox()
  console.log(
    `### VORSCHAU-PFAD gezeichnet=(${Math.round(startX)},${Math.round(startY)})-(${Math.round(endX)},${Math.round(endY)}) pfad=${JSON.stringify(
      previewBox && {
        x: Math.round(previewBox.x),
        y: Math.round(previewBox.y),
        w: Math.round(previewBox.width),
        h: Math.round(previewBox.height),
      },
    )}`,
  )

  // Nach dem Commit übernimmt der AnnotationLayer
  await page.waitForTimeout(1500)
  const svgs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('svg')).map((svg) => {
      const r = svg.getBoundingClientRect()
      return `${svg.parentElement?.getAttribute('data-testid') ?? svg.parentElement?.className?.toString()?.slice(0, 30)}:${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}x${Math.round(r.height)}`
    }),
  )
  console.log(`### SVGs NACH COMMIT: ${JSON.stringify(svgs)}`)
  const shot = (await page.screenshot()).toString('base64')
  const mid = { x: (startX + endX) / 2, y: (startY + endY) / 2 }
  const color = await page.evaluate(
    async ({ shot, mid }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${shot}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const ratio = image.naturalWidth / window.innerWidth
      // Umgebung des Mittelpunkts nach nicht-weißen, nicht-blauen Pixeln absuchen
      const size = 40
      const data = ctx.getImageData(
        Math.round(mid.x * ratio) - size,
        Math.round(mid.y * ratio) - size,
        size * 2,
        size * 2,
      ).data
      let hits = 0
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
        if (r < 200 && g < 200 && b < 200) hits++
      }
      return hits
    },
    { shot, mid },
  )
  console.log(`### rotate=${rotate} STRICH-PIXEL um den Mittelpunkt: ${color}`)
})
}

/** Rote Pixel (Stiftfarbe #e03131) rund um einen Bildschirmpunkt zählen. */
async function countPenPixels(page: Page, center: { x: number; y: number }) {
  const shot = (await page.screenshot()).toString('base64')
  return page.evaluate(
    async ({ shot, center }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${shot}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const ratio = image.naturalWidth / window.innerWidth
      const size = 40
      const data = ctx.getImageData(
        Math.round(center.x * ratio) - size,
        Math.round(center.y * ratio) - size,
        size * 2,
        size * 2,
      ).data
      let hits = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 170 && data[i + 1] < 130 && data[i + 2] < 130) hits++
      }
      return hits
    },
    { shot, center },
  )
}

for (const rotate of [0, 90]) {
  test(`Rotate ${rotate}: gespeicherter Strich sitzt im Lesemodus richtig`, async ({ page }) => {
    await mockPaperlessApi(page, buildRotatedPdf(rotate))
    await signIn(page)

    await page.getByRole('link', { name: 'Dokumente' }).first().click()
    await page.getByText('Testdokument').first().click()
    await page.getByRole('button', { name: 'Annotieren', exact: true }).click()

    const img = page.locator('img[src^="blob:"]').first()
    await expect(img).toBeVisible({ timeout: 45_000 })
    await page.waitForTimeout(1500)

    // Bahn im sichtbaren Teil der Seite, damit auch hohe Seiten getroffen werden
    const box = (await img.boundingBox())!
    const visibleHeight = Math.min(box.height, 800 - box.y - 40)
    const startX = box.x + box.width * 0.25
    const startY = box.y + visibleHeight * 0.2
    const endX = box.x + box.width * 0.55
    const endY = box.y + visibleHeight * 0.6

    await page.getByRole('button', { name: 'Stift', exact: true }).click()
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(startX + ((endX - startX) * i) / 12, startY + ((endY - startY) * i) / 12, { steps: 2 })
    }
    await page.mouse.up()
    await page.waitForTimeout(1500)

    const mid = { x: (startX + endX) / 2, y: (startY + endY) / 2 }
    const inEditor = await countPenPixels(page, mid)

    // Speichern → der Mock liefert das neue PDF ab jetzt bei /download/
    await page.getByRole('button', { name: 'Speichern' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByRole('heading', { name: 'Testdokument' })).toBeVisible({ timeout: 30_000 })

    // Lesemodus zeigt das gespeicherte PDF
    await page.getByRole('button', { name: 'Lesemodus' }).click()
    const readerImg = page.locator('img[src^="blob:"]').first()
    await expect(readerImg).toBeVisible({ timeout: 45_000 })
    await page.waitForTimeout(2000)
    const inReader = await countPenPixels(page, mid)

    console.log(`### rotate=${rotate} STRICH-PIXEL editor=${inEditor} lesemodus=${inReader} mitte=(${Math.round(mid.x)},${Math.round(mid.y)})`)
  })
}
