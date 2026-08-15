import { expect, test as base } from '@playwright/test'

const IGNORED_CONSOLE_FRAGMENTS = [
  '/_vercel/speed-insights/',
  'Failed to load resource:',
]

function shouldIgnoreConsole(message) {
  return IGNORED_CONSOLE_FRAGMENTS.some((fragment) => message.includes(fragment))
}

export const test = base.extend({
  browserHealth: [async ({ page, baseURL }, use) => {
    const issues = []
    const trackedOrigins = new Set([
      new URL(baseURL).origin,
      'https://render.albiononline.com',
    ])

    const onPageError = (error) => {
      issues.push(`pageerror: ${error.message}`)
    }
    const onConsole = (message) => {
      if (message.type() === 'error' && !shouldIgnoreConsole(message.text())) {
        issues.push(`console: ${message.text()}`)
      }
    }
    const onResponse = (response) => {
      if (response.headers()['x-e2e-expected-error'] === 'true') return
      if (response.status() < 400) return
      const responseUrl = new URL(response.url())
      if (responseUrl.pathname.startsWith('/_vercel/speed-insights/')) return
      if (trackedOrigins.has(responseUrl.origin)) {
        issues.push(`response: ${response.status()} ${response.url()}`)
      }
    }
    const onRequestFailed = (request) => {
      const requestUrl = new URL(request.url())
      const failure = request.failure()?.errorText || 'unknown error'
      if (requestUrl.pathname.startsWith('/_vercel/speed-insights/')) return
      // Next.js may cancel speculative RSC prefetches when a component rerenders or
      // navigation changes. Chromium reports those intentional cancellations as a
      // failed request even though the visible navigation succeeds.
      if (failure === 'net::ERR_ABORTED' && requestUrl.searchParams.has('_rsc')) return
      if (trackedOrigins.has(requestUrl.origin)) {
        issues.push(`requestfailed: ${failure} ${request.url()}`)
      }
    }

    page.on('pageerror', onPageError)
    page.on('console', onConsole)
    page.on('response', onResponse)
    page.on('requestfailed', onRequestFailed)

    await use()

    page.off('pageerror', onPageError)
    page.off('console', onConsole)
    page.off('response', onResponse)
    page.off('requestfailed', onRequestFailed)
    expect(issues, `Nieoczekiwane błędy przeglądarki:\n${issues.join('\n')}`).toEqual([])
  }, { auto: true }],
})

export { expect }
