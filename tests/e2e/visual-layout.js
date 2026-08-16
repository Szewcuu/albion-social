import { expect } from '@playwright/test'

export const VISUAL_VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1280, height: 900 },
  { width: 1920, height: 1080 },
]

export async function captureResponsiveView(page, testInfo, route, viewport) {
  await page.setViewportSize(viewport)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(route.path, { waitUntil: 'domcontentloaded' })
  await page.locator('.auth-loading-screen').waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {})
  await expect(page.locator('#main-content')).toBeVisible()

  await page.addStyleTag({ content: `
    *, *::before, *::after {
      animation-delay: 0s !important;
      animation-duration: 0s !important;
      caret-color: transparent !important;
      transition-delay: 0s !important;
      transition-duration: 0s !important;
    }
  ` })
  await page.waitForTimeout(200)

  const layout = await page.evaluate(() => {
    const viewportWidth = window.innerWidth
    const rootWidth = document.documentElement.scrollWidth
    const bodyWidth = document.body.scrollWidth
    const overflow = Math.max(rootWidth, bodyWidth) - viewportWidth
    const offenders = overflow > 1
      ? [...document.querySelectorAll('body *')]
          .filter((element) => {
            const style = window.getComputedStyle(element)
            if (style.display === 'none' || style.visibility === 'hidden') return false
            if (element.closest('[data-visual-overflow-ok="true"]')) return false
            const rect = element.getBoundingClientRect()
            return rect.width > 1 && (rect.left < -1 || rect.right > viewportWidth + 1)
          })
          .slice(0, 8)
          .map((element) => {
            const rect = element.getBoundingClientRect()
            return {
              tag: element.tagName.toLowerCase(),
              className: typeof element.className === 'string' ? element.className.slice(0, 120) : '',
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
            }
          })
      : []

    return { viewportWidth, rootWidth, bodyWidth, overflow, offenders }
  })

  const screenshot = await page.screenshot({ animations: 'disabled', fullPage: true })
  await testInfo.attach(`${route.slug}-${viewport.width}px`, {
    body: screenshot,
    contentType: 'image/png',
  })

  expect(layout.overflow, `Poziomy overflow na ${route.path} przy ${viewport.width}px:\n${JSON.stringify(layout.offenders, null, 2)}`).toBeLessThanOrEqual(1)
}
