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
}) {
  if (!userId || !message) return null

  try {
    const adminSupabase = createSupabaseAdminClient()
    const { data, error } = await adminSupabase
      .from('notifications')
      .insert([
        {
          user_id: userId,
          title,
          message,
          type,
          link,
          is_read: false,
        },
      ])
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
