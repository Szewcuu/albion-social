import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('link resetu hasła używa token hash obsługiwanego przez serwer portalu', async () => {
  const template = await readFile(
    new URL('../../supabase/email-templates/reset-password.html', import.meta.url),
    'utf8',
  )

  assert.match(template, /{{ \.SiteURL }}\/auth\/confirm\?token_hash={{ \.TokenHash }}/)
  assert.match(template, /type=recovery/)
  assert.match(template, /next=%2Fauth%2Fnowe-haslo/)
  assert.doesNotMatch(template, /{{ \.ConfirmationURL }}/)
})
