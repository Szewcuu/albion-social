import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const projectRoot = process.cwd()
const nextRoot = join(projectRoot, '.next')
const chunksRoot = join(nextRoot, 'static', 'chunks')
const appRoot = join(nextRoot, 'server', 'app')
const budgetPath = join(projectRoot, 'performance-budget.json')
const reportPath = join(nextRoot, 'performance-budget-report.json')

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

function sizeOfChunk(chunk) {
  const path = join(nextRoot, chunk)
  return existsSync(path) ? statSync(path).size : 0
}

if (!existsSync(chunksRoot) || !existsSync(appRoot)) {
  console.error('Brak produkcyjnego builda w .next. Uruchom najpierw `npm run build`.')
  process.exit(1)
}

const budget = JSON.parse(readFileSync(budgetPath, 'utf8'))
const javascriptChunks = walk(chunksRoot).filter((path) => path.endsWith('.js'))
const totalJavaScriptBytes = javascriptChunks.reduce((total, path) => total + statSync(path).size, 0)
const largestChunk = javascriptChunks
  .map((path) => ({ path: relative(nextRoot, path).replaceAll('\\', '/'), bytes: statSync(path).size }))
  .sort((left, right) => right.bytes - left.bytes)[0]

const buildManifest = JSON.parse(readFileSync(join(nextRoot, 'build-manifest.json'), 'utf8'))
const sharedChunks = [...new Set(buildManifest.rootMainFiles || [])]
const routeReports = walk(appRoot)
  .filter((path) => path.endsWith('page_client-reference-manifest.js'))
  .map((manifestPath) => {
    const source = readFileSync(manifestPath, 'utf8')
    const routeChunks = [...source.matchAll(/static\/chunks\/[^"']+\.js/g)].map((match) => match[0])
    const chunks = [...new Set([...sharedChunks, ...routeChunks])]
    const route = relative(appRoot, manifestPath)
      .replaceAll('\\', '/')
      .replace(/\/page_client-reference-manifest\.js$/, '')
      .replace(/^page_client-reference-manifest\.js$/, '/')

    return {
      route: route === '/' ? route : `/${route}`,
      bytes: chunks.reduce((total, chunk) => total + sizeOfChunk(chunk), 0),
      chunks: chunks.length,
    }
  })
  .sort((left, right) => right.bytes - left.bytes)

const largestRoute = routeReports[0]
const checks = [
  ['Cały JavaScript builda', totalJavaScriptBytes, budget.maxTotalJavaScriptBytes],
  ['Największy pojedynczy chunk', largestChunk.bytes, budget.maxSingleChunkBytes],
  [`Najcięższa trasa (${largestRoute.route})`, largestRoute.bytes, budget.maxRouteJavaScriptBytes],
]
const failures = checks.filter(([, actual, limit]) => actual > limit)
const formatKb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`

const report = {
  generatedAt: new Date().toISOString(),
  budget,
  summary: {
    totalJavaScriptBytes,
    chunkCount: javascriptChunks.length,
    largestChunk,
    largestRoute,
  },
  routes: routeReports,
  passed: failures.length === 0,
}
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)

console.log('\nBudżet wydajności JavaScript')
for (const [label, actual, limit] of checks) {
  const marker = actual <= limit ? 'OK' : 'PRZEKROCZONO'
  console.log(`- ${marker}: ${label}: ${formatKb(actual)} / ${formatKb(limit)}`)
}
console.log('\nNajcięższe trasy:')
for (const route of routeReports.slice(0, 5)) {
  console.log(`- ${route.route}: ${formatKb(route.bytes)} (${route.chunks} chunków)`)
}

if (failures.length) {
  console.error('\nBuild przekracza ustalony budżet JavaScript.')
  process.exit(1)
}
