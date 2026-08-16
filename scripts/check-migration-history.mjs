import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const migrationsDirectory = path.join(root, 'supabase', 'migrations')
const manifestPath = path.join(root, 'supabase', 'production-migration-history.json')
const filenamePattern = /^(\d{14})_([a-z0-9_]+)\.sql$/

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const errors = []
const manifestVersions = new Set()

for (const [index, migration] of manifest.migrations.entries()) {
  const { version, name } = migration
  if (!/^\d{14}$/.test(version) || !/^[a-z0-9_]+$/.test(name)) {
    errors.push(`Nieprawidłowy wpis manifestu na pozycji ${index + 1}: ${version}_${name}`)
  }
  if (manifestVersions.has(version)) {
    errors.push(`Powtórzona wersja w manifeście produkcyjnym: ${version}`)
  }
  if (index > 0 && version <= manifest.migrations[index - 1].version) {
    errors.push(`Manifest produkcyjny nie jest rosnący przy wersji: ${version}`)
  }
  manifestVersions.add(version)
}

const expected = new Map(
  manifest.migrations.map(({ version, name }) => [version, `${version}_${name}.sql`]),
)
const files = (await readdir(migrationsDirectory))
  .filter((filename) => filename.endsWith('.sql'))
  .sort()
const versions = new Set()

for (const filename of files) {
  const match = filename.match(filenamePattern)
  if (!match) {
    errors.push(`Nieprawidłowa nazwa aktywnej migracji: ${filename}`)
    continue
  }

  const [, version] = match
  if (versions.has(version)) errors.push(`Powtórzona wersja migracji: ${version}`)
  versions.add(version)
}

for (const [version, filename] of expected) {
  if (!files.includes(filename)) {
    errors.push(`Brakuje migracji produkcyjnej ${version}: oczekiwano ${filename}`)
  }
}

const latestProductionVersion = manifest.migrations.at(-1)?.version || ''
for (const filename of files) {
  const match = filename.match(filenamePattern)
  if (!match) continue
  const [, version] = match
  if (!expected.has(version) && version <= latestProductionVersion) {
    errors.push(`Lokalna migracja ${filename} koliduje z zamkniętą historią produkcji`)
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'))
  process.exit(1)
}

const pending = files.filter((filename) => !expected.has(filename.slice(0, 14)))
console.log(`Historia migracji jest spójna: ${expected.size} produkcyjnych, ${pending.length} oczekujących.`)
