import assert from 'node:assert/strict'
import test from 'node:test'

import { absoluteUrl, createPageMetadata, SITE_URL } from '../../src/lib/seo.js'

test('buduje kanoniczny adres bez podwójnego ukośnika', () => {
  assert.equal(absoluteUrl('/regulamin'), `${SITE_URL}/regulamin`)
  assert.equal(absoluteUrl('prywatnosc'), `${SITE_URL}/prywatnosc`)
})

test('publiczna strona otrzymuje canonical, Open Graph i indeksowanie', () => {
  const metadata = createPageMetadata({
    title: 'Regulamin | Albion Online Polska Portal',
    description: 'Zasady portalu.',
    path: '/regulamin',
    index: true,
  })
  assert.equal(metadata.alternates.canonical, `${SITE_URL}/regulamin`)
  assert.equal(metadata.openGraph.url, `${SITE_URL}/regulamin`)
  assert.equal(metadata.openGraph.images[0].width, 1200)
  assert.equal(metadata.robots.index, true)
})

test('chroniony moduł jest noindex i ma własny canonical', () => {
  const metadata = createPageMetadata({
    title: 'Kroniki Walk',
    description: 'Historia walk.',
    path: '/killboard',
  })
  assert.equal(metadata.title.absolute, 'Kroniki Walk | Albion Social')
  assert.equal(metadata.alternates.canonical, `${SITE_URL}/killboard`)
  assert.equal(metadata.robots.index, false)
  assert.equal(metadata.robots.follow, false)
})
