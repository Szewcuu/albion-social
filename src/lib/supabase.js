import { createClient } from '@supabase/supabase-js'
import { portalAuth } from '@/lib/supabaseAuth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const client = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => {
    const { data } = await portalAuth.auth.getSession()
    return data.session?.access_token || null
  },
})

export const supabase = client
