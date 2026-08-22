import test from 'node:test'
import assert from 'node:assert/strict'
import { isPublicPortalPath } from '../../src/lib/authRoutes.js'

test('udostępnia gościom wyłącznie bramę, dokumenty prawne i callback OAuth', () => {
  assert.equal(isPublicPortalPath('/'), true)
  assert.equal(isPublicPortalPath('/regulamin'), true)
  assert.equal(isPublicPortalPath('/prywatnosc'), true)
  assert.equal(isPublicPortalPath('/auth/callback'), true)
})

test('nie rozszerza dostępu przez podobny prefiks ścieżki', () => {
  assert.equal(isPublicPortalPath('/regulamin/ukryty'), false)
  assert.equal(isPublicPortalPath('/prywatnosc-kopia'), false)
  assert.equal(isPublicPortalPath('/auth/callback/inny'), false)
  assert.equal(isPublicPortalPath('/buildy'), false)
})
