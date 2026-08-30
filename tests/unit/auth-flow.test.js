import test from 'node:test'
import assert from 'node:assert/strict'
import { friendlyAuthError, safePortalNext, validatePortalPassword } from '../../src/lib/authFlow.js'

test('wymaga mocnego hasła portalowego', () => {
  assert.equal(validatePortalPassword('Zbyt-dlugie1!').valid, true)
  assert.equal(validatePortalPassword('same-male1!').valid, false)
  assert.equal(validatePortalPassword('SAME-DUZE1!').valid, false)
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
  assert.equal(friendlyAuthError({ message: 'captcha verification process failed' }), 'Nie udało się przejść ochrony przed botami. Odśwież zabezpieczenie i spróbuj ponownie.')
  assert.equal(friendlyAuthError({ message: 'Email signups are disabled', code: 'email_provider_disabled' }), 'Rejestracja przez e-mail jest chwilowo wyłączona w konfiguracji portalu.')
})
