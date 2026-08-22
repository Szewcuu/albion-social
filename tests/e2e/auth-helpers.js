import { combineChunks, stringFromBase64URL } from '@supabase/ssr'

export async function getCookieAccessToken(page) {
  const cookies = await page.context().cookies()
  const authCookie = cookies.find(({ name }) => /^sb-.+-auth-token(?:\.0)?$/.test(name))
  if (!authCookie) return null

  const storageKey = authCookie.name.replace(/\.0$/, '')
  const byName = new Map(cookies.map(({ name, value }) => [name, value]))
  const storedValue = await combineChunks(storageKey, async (name) => byName.get(name) || null)
  if (!storedValue) return null

  try {
    const serialized = storedValue.startsWith('base64-')
      ? stringFromBase64URL(storedValue.slice('base64-'.length))
      : storedValue
    return JSON.parse(serialized)?.access_token || null
  } catch {
    return null
  }
}
