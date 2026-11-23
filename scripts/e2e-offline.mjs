import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const PORT = 4173
const URL = `http://127.0.0.1:${PORT}`

async function waitForServer(url, timeoutMs = 15000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // Server still booting
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Preview server did not become ready at ${url}`)
}

async function run() {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
    stdio: 'pipe',
  })

  try {
    await waitForServer(URL)

    const require = createRequire(import.meta.url)
    let playwright
    try {
      playwright = require('playwright')
    } catch {
      playwright = await import('playwright')
    }

    const browser = await playwright.chromium.launch({ headless: true })
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'fa-IR',
    })
    const page = await context.newPage()

    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    // 1. Load app online & wait for Service Worker control
    await page.goto(URL, { waitUntil: 'networkidle' })
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready
      }
    })
    await page.reload({ waitUntil: 'networkidle' })

    // 2. Log a Persian meal online
    await page.locator('#quick-food-input').fill('دو کفگیر قورمهسبزی و یک کف دست سنگک')
    await page.locator('#meal-type-lunch').click()
    await page.locator('#submit-meal-btn').click()
    await page.waitForTimeout(300)

    const onlineKcal = await page.locator('[data-testid="consumed-kcal"]').first().innerText()
    if (onlineKcal !== '۴۲۵') {
      throw new Error(`Expected ۴۲۵ online, got ${onlineKcal}`)
    }

    // 3. Go completely OFFLINE & reload — verify SW serves app shell & local data persists!
    await context.setOffline(true)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="consumed-kcal"]', { timeout: 10000 })

    const offlineKcal = await page.locator('[data-testid="consumed-kcal"]').first().innerText()
    if (offlineKcal !== '۴۲۵') {
      throw new Error(`Expected ۴۲۵ after offline reload, got ${offlineKcal}`)
    }

    if (errors.length > 0) {
      throw new Error(`Unexpected page errors: ${errors.join('; ')}`)
    }

    await browser.close()
    console.log('Offline PWA E2E passed: meal logged -> SW active -> offline reload -> ۴۲۵ persisted!')
  } finally {
    server.kill('SIGTERM')
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
