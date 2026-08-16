import { test } from '@playwright/test'
import { captureResponsiveView, VISUAL_VIEWPORTS } from './visual-layout.js'

const PUBLIC_ROUTES = [
  { slug: 'brama-logowania', path: '/' },
  { slug: 'regulamin', path: '/regulamin' },
  { slug: 'prywatnosc', path: '/prywatnosc' },
]

test.describe('wizualna responsywność stron publicznych', () => {
  for (const viewport of VISUAL_VIEWPORTS) {
    test(`${viewport.width}px bez poziomego overflow`, async ({ page }, testInfo) => {
      test.setTimeout(90_000)
      for (const route of PUBLIC_ROUTES) {
        await captureResponsiveView(page, testInfo, route, viewport)
      }
    })
  }
})
