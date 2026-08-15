import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCatalogEntries, validateCatalogSnapshot } from '../src/lib/itemCatalogCore.js'

const SOURCE_REPOSITORY = 'ao-data/ao-bin-dumps'
const SOURCE_PATH = 'formatted/items.json'
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT_PATH = resolve(ROOT, 'src/data/albion-items.snapshot.json')
const API_URL = `https://api.github.com/repos/${SOURCE_REPOSITORY}/commits?path=${encodeURIComponent(SOURCE_PATH)}&per_page=1`

function requestHeaders() {
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'albion-social-item-catalog-sync',
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
  }
}

async function fetchText(url) {
  const response = await fetch(url, { headers: requestHeaders(), signal: AbortSignal.timeout(90_000) })
  if (!response.ok) throw new Error(`Źródło katalogu zwróciło HTTP ${response.status}.`)
  return response.text()
}

async function getSourceCommit() {
  const response = await fetch(API_URL, { headers: requestHeaders(), signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`GitHub API zwróciło HTTP ${response.status}.`)
  const commits = await response.json()
  const commit = commits?.[0]
  if (!commit?.sha || !commit?.commit?.committer?.date) throw new Error('Nie udało się ustalić wersji katalogu.')
  return { sha: commit.sha, updatedAt: commit.commit.committer.date }
}

async function buildSnapshot() {
  const sourceCommit = await getSourceCommit()
  const rawUrl = `https://raw.githubusercontent.com/${SOURCE_REPOSITORY}/${sourceCommit.sha}/${SOURCE_PATH}`
  const sourceText = await fetchText(rawUrl)
  const items = normalizeCatalogEntries(JSON.parse(sourceText))
  const catalogSha256 = createHash('sha256').update(JSON.stringify(items)).digest('hex')
  const snapshot = {
    schemaVersion: 1,
    catalogSha256,
    source: {
      repository: SOURCE_REPOSITORY,
      path: SOURCE_PATH,
      commit: sourceCommit.sha,
      updatedAt: sourceCommit.updatedAt,
      contentSha256: createHash('sha256').update(sourceText).digest('hex'),
    },
    itemCount: items.length,
    items,
  }
  const errors = validateCatalogSnapshot(snapshot)
  if (errors.length) throw new Error(errors.join(' '))
  return snapshot
}

async function validateExistingSnapshot() {
  const snapshot = JSON.parse(await readFile(OUTPUT_PATH, 'utf8'))
  const errors = validateCatalogSnapshot(snapshot)
  const actualCatalogSha256 = createHash('sha256').update(JSON.stringify(snapshot.items)).digest('hex')
  if (snapshot.catalogSha256 !== actualCatalogSha256) errors.push('Hash katalogu nie zgadza się z zawartością snapshotu.')
  if (errors.length) throw new Error(errors.join(' '))
  process.stdout.write(`Katalog ${snapshot.source.commit.slice(0, 12)}: ${snapshot.itemCount} przedmiotów.\n`)
}

async function syncSnapshot() {
  const snapshot = await buildSnapshot()
  const serialized = `${JSON.stringify(snapshot)}\n`
  const current = await readFile(OUTPUT_PATH, 'utf8').catch(() => '')
  if (current === serialized) {
    process.stdout.write(`Katalog jest aktualny (${snapshot.source.commit.slice(0, 12)}, ${snapshot.itemCount} przedmiotów).\n`)
    return
  }

  const temporaryPath = `${OUTPUT_PATH}.tmp`
  await mkdir(dirname(OUTPUT_PATH), { recursive: true })
  await writeFile(temporaryPath, serialized, 'utf8')
  await rename(temporaryPath, OUTPUT_PATH)
  process.stdout.write(`Zapisano katalog ${snapshot.source.commit.slice(0, 12)}: ${snapshot.itemCount} przedmiotów.\n`)
}

if (process.argv.includes('--validate')) {
  await validateExistingSnapshot()
} else {
  await syncSnapshot()
}
