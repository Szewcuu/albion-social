import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { expect, test as setup } from '@playwright/test'
import { createE2EUserSession } from '../../scripts/lib/create-e2e-user-session.mjs'

const authFile = 'playwright/.auth/user.json'

setup('authenticate test user', async ({ page }) => {
  const { session, projectRef } = await createE2EUserSession()
  await page.goto('/')
  await page.evaluate(
    ({ storageKey, session }) => window.localStorage.setItem(storageKey, JSON.stringify(session)),
    { storageKey: `sb-${projectRef}-auth-token`, session },
  )
  await page.reload()
  await expect(page.getByRole('button', { name: /Wejdź przez Discord/i })).toBeHidden()

  const cookies = await page.context().cookies()
  expect(cookies.some(({ name }) => name.startsWith(`sb-${projectRef}-auth-token`))).toBe(true)
  await expect.poll(() => page.evaluate(
    (storageKey) => window.localStorage.getItem(storageKey),
    `sb-${projectRef}-auth-token`,
  )).toBeNull()

  await mkdir(dirname(authFile), { recursive: true })
  await page.context().storageState({ path: authFile })
})
