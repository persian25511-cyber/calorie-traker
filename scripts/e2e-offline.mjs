import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

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
  const server = spawn(
    process.execPath,
    ['./node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--host', '127.0.0.1'],
    {
      stdio: 'ignore',
    },
  )

  try {
    await waitForServer(URL)

    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'fa-IR',
    })
    const page = await context.newPage()

    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    // 1. Load app ONCE online & wait for Service Worker installation + controller claim
    await page.goto(URL, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="onboarding-card"]', { timeout: 5000 })
    await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported')
      }
      await navigator.serviceWorker.ready
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
            once: true,
          })
        })
      }
    })

    // 2. Log a Persian meal online (also verifying non-blocking onboarding & SW claim)
    await page.locator('#quick-food-input').fill('دو کفگیر قورمه‌سبزی و یک کف دست سنگک')
    await page.locator('#meal-type-lunch').click()
    await page.locator('#submit-meal-btn').click()
    await page.waitForSelector('[data-testid="logged-meal-item"]', { timeout: 5000 })

    const onlineKcal = await page.locator('[data-testid="consumed-kcal"]').first().innerText()
    if (onlineKcal !== '۴۲۵') {
      throw new Error(`Expected ۴۲۵ online, got ${onlineKcal}`)
    }

    // Verify full built-in catalog is NOT dumped into localStorage (v3 user-layer architecture)
    const hasLegacyFullFoodsKey = await page.evaluate(
      () => window.localStorage.getItem('kalorishomar_v2_foods') !== null,
    )
    if (hasLegacyFullFoodsKey) {
      throw new Error('Expected kalorishomar_v2_foods NOT to be written in schema v3')
    }

    // 3. Go completely OFFLINE & reload — verify SW serves app shell, fonts & local data!
    await context.setOffline(true)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="consumed-kcal"]', { timeout: 10000 })

    const offlineKcal = await page.locator('[data-testid="consumed-kcal"]').first().innerText()
    if (offlineKcal !== '۴۲۵') {
      throw new Error(`Expected ۴۲۵ after offline reload, got ${offlineKcal}`)
    }

    // 4. Navigate to all lazy-loaded tabs while OFFLINE & verify Phase 0-3 features
    await page.locator('#mobile-nav-trends').click()
    await page.waitForSelector('[data-testid="weekly-trends-tab"]', { timeout: 8000 })
    await page.locator('#history-search-input').fill('قورمه')
    await page.waitForSelector('[data-testid="history-search-result-row"]', { timeout: 5000 })

    await page.locator('#mobile-nav-foods').click()
    await page.waitForSelector('[data-testid="food-database-tab"]', { timeout: 8000 })
    await page.waitForSelector('[data-testid="food-verified-badge"]', { timeout: 5000 })

    await page.locator('#mobile-nav-settings').click()
    await page.waitForSelector('[data-testid="settings-tab"]', { timeout: 8000 })
    await page.waitForSelector('[data-testid="local-beta-metrics-card"]', { timeout: 5000 })

    // Verify soft health warning for <1200 kcal manual goal
    await page.locator('#goal-kcal-input').fill('1000')
    await page.waitForSelector('[data-testid="low-calorie-soft-warning"]', { timeout: 5000 })

    // Toggle Light Mode & back to Dark Mode while offline
    await page.locator('#theme-light-btn').click()
    await page.locator('#theme-dark-btn').click()

    if (errors.length > 0) {
      throw new Error(`Unexpected page errors: ${errors.join('; ')}`)
    }

    await browser.close()
    console.log(
      'Offline PWA E2E passed: single-visit SW precache -> meal logged -> v3 user-layer storage -> offline reload -> history search, verified badges, low-kcal warning, beta metrics & theme verified with 0 errors!',
    )
  } finally {
    server.kill('SIGTERM')
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
