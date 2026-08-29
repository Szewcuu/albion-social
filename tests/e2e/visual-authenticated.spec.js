import { expect, test } from '@playwright/test'
import { captureResponsiveView, VISUAL_VIEWPORTS } from './visual-layout.js'
import {
  installVisualNetworkFixtures,
  seedVisualBuild,
  VISUAL_BUILD_ID,
  VISUAL_GUILD_ID,
  VISUAL_PROFILE_ID,
} from './visual-fixtures.js'

const AUTHENTICATED_ROUTES = [
  { slug: 'tawerna', path: '/' },
  { slug: 'gildie', path: '/gildie' },
  { slug: 'wyprawy', path: '/wyprawy' },
  { slug: 'buildy', path: '/buildy' },
  { slug: 'kreator-buildu', path: '/buildy/create' },
  { slug: 'rynek', path: '/rynek' },
  { slug: 'killboard', path: '/killboard' },
  { slug: 'podzial-lupow', path: '/loot-split' },
  { slug: 'timery', path: '/timery' },
  { slug: 'kalendarz', path: '/kalendarz' },
  { slug: 'profil', path: '/profil' },
  { slug: 'obserwowane', path: '/obserwowane' },
  { slug: 'skrzynka-handlowa', path: '/wiadomosci' },
  { slug: 'panel-administratora', path: '/admin', heading: 'Centrum moderacji' },
  { slug: 'kalkulator-rafinacji', path: '/kalkulator-craftingu', heading: 'Kalkulator Rafinacji' },
  { slug: 'szczegol-buildu', path: `/buildy/${VISUAL_BUILD_ID}`, heading: 'Strażnik Mglistych Bram' },
  { slug: 'centrum-gildii', path: `/gildie/${VISUAL_GUILD_ID}`, heading: 'Strażnicy Avalonu' },
  { slug: 'profil-publiczny', path: `/profil/${VISUAL_PROFILE_ID}`, heading: 'Strażnik Avalonu' },
]

test.describe('wizualna responsywność portalu po zalogowaniu', () => {
  let cleanupVisualBuild

  test.beforeAll(async () => {
    cleanupVisualBuild = await seedVisualBuild()
  })

  test.afterAll(async () => {
    await cleanupVisualBuild?.()
  })

  for (const viewport of VISUAL_VIEWPORTS) {
    test(`${viewport.width}px bez poziomego overflow`, async ({ page }, testInfo) => {
      test.setTimeout(240_000)
      await installVisualNetworkFixtures(page)
      for (const route of AUTHENTICATED_ROUTES) {
        await captureResponsiveView(page, testInfo, route, viewport)
        await expect(page.getByRole('button', { name: /Wejdź przez Discord/i })).toBeHidden()
      }
    })
  }
})
