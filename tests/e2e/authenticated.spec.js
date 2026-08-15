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

  test('zwraca zalogowanemu wątkowane komentarze buildu', async ({ page, request }) => {
    await page.goto('/')
    const accessToken = await page.evaluate(() => {
      const storageKey = Object.keys(window.localStorage)
        .find((key) => /^sb-.+-auth-token$/.test(key))
      if (!storageKey) return null
      return JSON.parse(window.localStorage.getItem(storageKey))?.access_token || null
    })
    expect(accessToken).toBeTruthy()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const buildsResponse = await request.get(`${supabaseUrl}/rest/v1/builds?select=id&status=eq.visible&order=created_at.desc&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    })
    expect(buildsResponse.status()).toBe(200)
    const [build] = await buildsResponse.json()
    expect(build?.id).toBeTruthy()

    const commentsResponse = await request.get(`/api/builds/${build.id}/comments`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(commentsResponse.status()).toBe(200)
    const payload = await commentsResponse.json()
    expect(Array.isArray(payload.comments)).toBe(true)
    expect(typeof payload.count).toBe('number')
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
