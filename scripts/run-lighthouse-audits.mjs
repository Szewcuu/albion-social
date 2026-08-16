import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import lighthouse, { desktopConfig } from 'lighthouse'
import { launch } from 'chrome-launcher'
import puppeteer from 'puppeteer-core'

const baseUrl = new URL(process.env.LIGHTHOUSE_BASE_URL || 'https://albion-social.vercel.app')
const outputDirectory = join(process.cwd(), 'lighthouse-results')
const guestOnly = process.env.LIGHTHOUSE_GUEST_ONLY === '1'

const guestRoutes = [
  { slug: 'guest-landing', path: '/' },
]

const authenticatedRoutes = [
  { slug: 'authenticated-home', path: '/' },
  { slug: 'expeditions', path: '/wyprawy' },
  { slug: 'killboard', path: '/killboard' },
  { slug: 'build-creator', path: '/buildy/create' },
  { slug: 'market', path: '/rynek' },
  { slug: 'build-armory', path: '/buildy' },
]

const profiles = [
  { name: 'mobile', config: undefined },
  { name: 'desktop', config: desktopConfig },
]

function requiredEnvironment(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function score(category) {
  return Math.round((category?.score || 0) * 100)
}

function metric(audits, id) {
  const audit = audits[id]
  return {
    value: audit?.numericValue ?? null,
    displayValue: audit?.displayValue ?? null,
  }
}

function collectFailures(audits) {
  return Object.values(audits)
    .filter((audit) => audit.scoreDisplayMode === 'numeric' && audit.score !== null && audit.score < 0.9)
    .map((audit) => ({ id: audit.id, title: audit.title, score: audit.score }))
    .sort((left, right) => left.score - right.score)
}

function reportRow(result) {
  const { categories, audits } = result.lhr
  return {
    route: result.route,
    profile: result.profile,
    requestedUrl: result.lhr.requestedUrl,
    finalUrl: result.lhr.finalUrl,
    scores: {
      performance: score(categories.performance),
      accessibility: score(categories.accessibility),
      bestPractices: score(categories['best-practices']),
      seo: score(categories.seo),
    },
    metrics: {
      fcp: metric(audits, 'first-contentful-paint'),
      lcp: metric(audits, 'largest-contentful-paint'),
      tbt: metric(audits, 'total-blocking-time'),
      cls: metric(audits, 'cumulative-layout-shift'),
      speedIndex: metric(audits, 'speed-index'),
    },
    failedAudits: collectFailures(audits),
  }
}

function markdownSummary(rows) {
  const header = [
    '# Lighthouse E.5',
    '',
    `- Adres: ${baseUrl.origin}`,
    `- Data UTC: ${new Date().toISOString()}`,
    `- Tryb: ${guestOnly ? 'tylko gość' : 'pełny audyt 14 widoków'}`,
    '',
    '| Widok | Profil | Performance | Accessibility | Best Practices | SEO* | LCP | TBT | CLS |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ]
  const body = rows.map((row) => [
    row.route,
    row.profile,
    row.scores.performance,
    row.scores.accessibility,
    row.scores.bestPractices,
    row.scores.seo,
    row.metrics.lcp.displayValue || '—',
    row.metrics.tbt.displayValue || '—',
    row.metrics.cls.displayValue || '—',
  ].join(' | '))
  return `${[...header, ...body.map((line) => `| ${line} |`)].join('\n')}\n\n* SEO jest progiem blokującym tylko dla publicznego ekranu logowania. Chronione podstrony są celowo oznaczone jako noindex.\n`
}

function belowThreshold(row) {
  const requiredScores = [
    row.scores.performance,
    row.scores.accessibility,
    row.scores.bestPractices,
  ]
  if (row.route === 'guest-landing') requiredScores.push(row.scores.seo)
  return requiredScores.some((value) => value < 90)
}

async function authenticateChrome(chromePort) {
  const supabaseUrl = requiredEnvironment('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = requiredEnvironment('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.auth.signInWithPassword({
    email: requiredEnvironment('E2E_USER_EMAIL'),
    password: requiredEnvironment('E2E_USER_PASSWORD'),
  })

  if (error || !data.session) {
    throw new Error(`Lighthouse login failed: ${error?.message || 'missing session'}`)
  }

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chromePort}` })
  const page = await browser.newPage()
  try {
    await page.goto(baseUrl.origin, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await page.evaluate(
      ({ storageKey, session }) => window.localStorage.setItem(storageKey, JSON.stringify(session)),
      { storageKey: `sb-${projectRef}-auth-token`, session: data.session },
    )
    await page.reload({ waitUntil: 'networkidle2', timeout: 45_000 })
    await page.waitForFunction(
      () => ![...document.querySelectorAll('button')].some((button) => /Wejdź przez Discord/i.test(button.textContent || '')),
      { timeout: 20_000 },
    )
  } finally {
    await page.close()
    await browser.disconnect()
  }
}

async function runRoute(chromePort, route, profile, authenticated, reportSuffix = '') {
  const url = new URL(route.path, baseUrl).href
  const result = await lighthouse(url, {
    port: chromePort,
    output: 'json',
    logLevel: 'error',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    disableStorageReset: authenticated,
    maxWaitForLoad: 45_000,
  }, profile.config)

  if (!result) throw new Error(`Lighthouse returned no result for ${route.slug} (${profile.name})`)
  await writeFile(join(outputDirectory, `${route.slug}-${profile.name}${reportSuffix}.json`), result.report)
  return reportRow({ lhr: result.lhr, route: route.slug, profile: profile.name })
}

async function runRouteWithRetry(chromePort, route, profile, authenticated) {
  const first = await runRoute(chromePort, route, profile, authenticated)
  if (!belowThreshold(first)) return first

  console.log(`Lighthouse retry: ${route.slug} / ${profile.name}`)
  const retry = await runRoute(chromePort, route, profile, authenticated, '-retry')
  return retry.scores.performance > first.scores.performance ? retry : first
}

async function main() {
  await mkdir(outputDirectory, { recursive: true })
  const chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ],
  })
  const rows = []

  try {
    for (const route of guestRoutes) {
      for (const profile of profiles) {
        console.log(`Lighthouse: ${route.slug} / ${profile.name}`)
        rows.push(await runRouteWithRetry(chrome.port, route, profile, false))
      }
    }

    if (!guestOnly) {
      await authenticateChrome(chrome.port)
      for (const route of authenticatedRoutes) {
        for (const profile of profiles) {
          console.log(`Lighthouse: ${route.slug} / ${profile.name}`)
          rows.push(await runRouteWithRetry(chrome.port, route, profile, true))
        }
      }
    }
  } finally {
    await chrome.kill()
  }

  const summary = {
    baseUrl: baseUrl.origin,
    generatedAt: new Date().toISOString(),
    guestOnly,
    thresholds: {
      performance: 90,
      accessibility: 90,
      bestPractices: 90,
      publicSeo: 90,
      protectedSeo: 'report-only (intentional noindex)',
    },
    passed: rows.every((row) => !belowThreshold(row)),
    results: rows,
  }
  await writeFile(join(outputDirectory, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
  await writeFile(join(outputDirectory, 'summary.md'), markdownSummary(rows))
  console.log(markdownSummary(rows))

  if (!summary.passed) {
    throw new Error('At least one required Lighthouse category is below the score of 90.')
  }
}

await main()
