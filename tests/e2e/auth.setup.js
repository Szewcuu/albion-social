import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { expect, test as setup } from '@playwright/test'
import { createE2EDiscordSession } from '../../scripts/lib/create-e2e-discord-session.mjs'

const authFile = 'playwright/.auth/user.json'

setup('authenticate test user', async ({ page }) => {
  const { session, projectRef } = await createE2EDiscordSession()
  await page.goto('/')
  await page.evaluate(
    ({ storageKey, session }) => window.localStorage.setItem(storageKey, JSON.stringify(session)),
    { storageKey: `sb-${projectRef}-auth-token`, session },
  )
  await page.reload()
  await expect(page.getByRole('button', { name: /Wejdź przez Discord/i })).toBeHidden()

  await mkdir(dirname(authFile), { recursive: true })
  await page.context().storageState({ path: authFile })
})
