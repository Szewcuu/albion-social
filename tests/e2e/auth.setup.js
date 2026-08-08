import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { expect, test as setup } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const authFile = 'playwright/.auth/user.json'

setup('authenticate test user', async ({ page }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_USER_EMAIL,
    password: process.env.E2E_USER_PASSWORD,
  })

  if (error || !data.session) throw new Error(`E2E login failed: ${error?.message || 'missing session'}`)

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  await page.goto('/')
  await page.evaluate(
    ({ storageKey, session }) => window.localStorage.setItem(storageKey, JSON.stringify(session)),
    { storageKey: `sb-${projectRef}-auth-token`, session: data.session },
  )
  await page.reload()
  await expect(page.getByRole('button', { name: /Wejdź przez Discord/i })).toBeHidden()

  await mkdir(dirname(authFile), { recursive: true })
  await page.context().storageState({ path: authFile })
})
