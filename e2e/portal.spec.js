import { test, expect } from '@playwright/test'

test.describe('Albion Social Portal E2E Flow Verification', () => {
  test('Powinna wczytywać się strona główna Tawerny', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Albion Online Polska Portal/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('Powinna działać Zbrojownia Buildów i porównywarka', async ({ page }) => {
    await page.goto('/buildy')
    await expect(page.locator('h1')).toContainText(/Zbrojownia Buildów/i)
  })

  test('Powinien wczytywać się Rynek P2P', async ({ page }) => {
    await page.goto('/rynek')
    await expect(page.locator('h1')).toContainText(/Rynek P2P/i)
  })

  test('Powinien działać Kalkulator Craftingu z opcją miast', async ({ page }) => {
    await page.goto('/kalkulator-craftingu')
    await expect(page.locator('h1')).toContainText(/Kalkulator Craftingu/i)
  })

  test('Powinien wczytywać się Kalkulator Podziału Łupów (Loot Split)', async ({ page }) => {
    await page.goto('/loot-split')
    await expect(page.locator('h1')).toContainText(/Kalkulator Podziału Łupów/i)
  })
})
