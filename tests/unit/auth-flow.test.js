import test from 'node:test'
import assert from 'node:assert/strict'
import { friendlyAuthError, safePortalNext, validatePortalPassword } from '../../src/lib/authFlow.js'

test('wymaga mocnego hasła portalowego', () => {
  assert.equal(validatePortalPassword('zbyt-krotkie1!').valid, true)
  assert.equal(validatePortalPassword('bezcyfry!!').valid, false)
  assert.equal(validatePortalPassword('BezZnaku123').valid, false)
  assert.equal(validatePortalPassword('Ab1!').valid, false)
})

test('nie pozwala przekierować callbacku poza portal', () => {
  assert.equal(safePortalNext('/profil?linked=discord'), '/profil?linked=discord')
  assert.equal(safePortalNext('//evil.example'), '/')
  assert.equal(safePortalNext('https://evil.example'), '/')
})

test('nie ujawnia czy konto istnieje przy błędnym logowaniu', () => {
  assert.equal(friendlyAuthError({ message: 'Invalid login credentials' }), 'Nieprawidłowy e-mail lub hasło.')
})
