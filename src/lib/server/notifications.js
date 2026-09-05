import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin'

/**
 * Server-side helper to create in-portal notification for a target user.
 */
export async function createNotification({
  userId,
  title = 'Nowe powiadomienie',
  message,
  link = null,
  type = 'info',
  sourceKey = null,
}) {
  if (!userId || !message) return null

  try {
    const adminSupabase = createSupabaseAdminClient()
    const payload = {
      user_id: userId,
      title,
      message,
      type,
      link,
      is_read: false,
      source_key: sourceKey,
      created_at: new Date().toISOString(),
    }
    const query = sourceKey
      ? adminSupabase.from('notifications').upsert(payload, { onConflict: 'user_id,source_key' })
      : adminSupabase.from('notifications').insert(payload)
    const { data, error } = await query
      .select()
      .single()

    if (error) {
      console.error('Błąd tworzenia powiadomienia:', error)
      return null
    }
    return data
  } catch (err) {
    console.error('Nieoczekiwany błąd powiadomienia:', err)
    return null
  }
}
