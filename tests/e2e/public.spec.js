import { expect, test } from '@playwright/test'

test.describe('publiczna bramka portalu', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (error) => console.error(`[browser pageerror] ${error.message}`))
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().includes('/_vercel/speed-insights/')) {
        console.error(`[browser console] ${message.text()}`)
      }
    })
  })

  test('pokazuje wyłącznie ekran powitalny i logowanie', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('button', { name: /Wejdź przez Discord/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Regulamin', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Prywatność', exact: true })).toBeVisible()
  })

  test('udostępnia regulamin bez logowania', async ({ page }) => {
    await page.goto('/regulamin')

    await expect(page).toHaveURL(/\/regulamin$/)
    await expect(page.getByRole('heading', { name: /Wspólny portal wymaga/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Zaloguj przez Discord/i })).toBeVisible()
  })

  test('udostępnia politykę prywatności bez logowania', async ({ page }) => {
    await page.goto('/prywatnosc')

    await expect(page).toHaveURL(/\/prywatnosc$/)
    await expect(page.getByRole('heading', { name: /Twoje dane mają służyć Tobie/i })).toBeVisible()
  })

  test('odrzuca anonimowe wywołania endpointów personelu i usuwania konta', async ({ request }) => {
    const healthRead = await request.get('/api/admin/health')
    const healthRun = await request.post('/api/admin/health')
    const moderationQueue = await request.get('/api/admin/content')
    const roleManagement = await request.get('/api/admin/roles')
    const profileVerification = await request.post('/api/profile/verify', {
      data: { playerId: 'anonymous-test', region: 'europe' },
    })
    const accountDelete = await request.delete('/api/profile/account', {
      data: { confirmation: 'USUŃ KONTO' },
    })

    expect(healthRead.status()).toBe(401)
    expect(healthRun.status()).toBe(401)
    expect(moderationQueue.status()).toBe(401)
    expect(roleManagement.status()).toBe(401)
    expect(profileVerification.status()).toBe(401)
    expect(accountDelete.status()).toBe(401)
  })

  for (const path of ['/buildy', '/gildie', '/killboard', '/loot-split', '/wyprawy', '/admin']) {
    test(`blokuje gościom ${path}`, async ({ page }) => {
      await page.goto(path)

      await expect(page).toHaveURL(/\/$/)
      await expect(page.getByRole('button', { name: /Wejdź przez Discord/i })).toBeVisible()
    })
  }
})
