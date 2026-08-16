import { expect, test } from '@playwright/test'
import { captureResponsiveView, VISUAL_VIEWPORTS } from './visual-layout.js'

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
]

test.describe('wizualna responsywność portalu po zalogowaniu', () => {
  for (const viewport of VISUAL_VIEWPORTS) {
    test(`${viewport.width}px bez poziomego overflow`, async ({ page }, testInfo) => {
      test.setTimeout(180_000)
      for (const route of AUTHENTICATED_ROUTES) {
        await captureResponsiveView(page, testInfo, route, viewport)
        await expect(page.getByRole('button', { name: /Wejdź przez Discord/i })).toBeHidden()
      }
    })
  }
})
