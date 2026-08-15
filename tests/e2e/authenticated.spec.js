import { expect, test } from './browser-health.js'

test.describe('kluczowe przepływy zalogowanego użytkownika', () => {
  test('odrzuca konto bez roli personelu z API moderacji i ról', async ({ page, request }) => {
    await page.goto('/')
    const accessToken = await page.evaluate(() => {
      const storageKey = Object.keys(window.localStorage)
        .find((key) => /^sb-.+-auth-token$/.test(key))
      if (!storageKey) return null

      try {
        return JSON.parse(window.localStorage.getItem(storageKey))?.access_token || null
      } catch {
        return null
      }
    })

    expect(accessToken).toBeTruthy()
    const headers = { Authorization: `Bearer ${accessToken}` }
    const moderationQueue = await request.get('/api/admin/content', { headers })
    const roleManagement = await request.get('/api/admin/roles', { headers })

    expect(moderationQueue.status()).toBe(403)
    expect(roleManagement.status()).toBe(403)
  })

  test('otwiera czat społeczności', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Tawerna społeczności' })).toBeVisible()
    await expect(page.getByLabel('Napisz wiadomość w tawernie')).toBeVisible()
  })

  test('otwiera formularz publikacji buildu', async ({ page }) => {
    await page.goto('/buildy/create')
    await expect(page.getByLabel('Nazwa buildu *')).toBeVisible()
    await expect(page.getByLabel('Specjalizacja (Mastery):')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Opublikuj build' })).toBeVisible()
  })

  test('otwiera wątkowaną Radę wojowników z sortowaniem', async ({ page }) => {
    await page.goto('/buildy')
    const buildLink = page.getByRole('link', { name: /Otwórz build:/ }).first()
    await expect(buildLink).toBeVisible()
    await buildLink.click()

    await expect(page.getByRole('heading', { name: 'Rada wojowników' })).toBeVisible()
    await expect(page.getByText('Sortowanie dyskusji')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ostatnio aktywne' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Opublikuj komentarz' })).toBeVisible()
  })

  test('otwiera formularze wyprawy i rynku', async ({ page }) => {
    await page.goto('/wyprawy')
    await expect(page.getByLabel('Cel / Tytuł Wyprawy *')).toBeVisible()
    await expect(page.getByLabel('Min. IP *')).toBeVisible()
    await expect(page.getByLabel('Tank')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ogłoś Wyprawę' })).toBeVisible()

    await page.goto('/rynek')
    await expect(page.getByText('Tytuł Oferty *')).toBeVisible()
    await expect(page.getByPlaceholder(/Sprzedam Mamuta Transportowego/i)).toBeVisible()
  })

  test('otwiera Wartownię obserwowanych elementów', async ({ page }) => {
    await page.goto('/obserwowane')
    await expect(page.getByRole('heading', { name: 'Obserwowane' })).toBeVisible()
    await expect(page.getByText(/Buildy, gildie, oferty i gracze/)).toBeVisible()
  })

  test('zapisuje i przywraca lokalny szkic podziału łupów', async ({ page }) => {
    await page.goto('/loot-split')
    await page.getByLabel('Nazwa rozliczenia').fill('E2E Ava Roads')
    await page.getByLabel('Łączna wartość łupu').fill('1000000')
    await page.getByText('Nicki graczy').locator('textarea').fill('Tank\nHealer\nDPS')
    await page.getByRole('button', { name: 'Zapisz szkic' }).click()

    await expect(page.getByText(/Szkic zapisano/)).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Nazwa rozliczenia')).toHaveValue('E2E Ava Roads')
    await expect(page.getByLabel('Łączna wartość łupu')).toHaveValue('1000000')
  })
})
