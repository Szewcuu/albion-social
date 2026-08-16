import { createPageMetadata } from '@/lib/seo'
import { getPublicProfileMetadata } from '@/lib/server/publicMetadata'

export async function generateMetadata({ params }) {
  const { id } = await params
  const profile = await getPublicProfileMetadata(id)
  const name = profile?.ingame_nick || profile?.username
  const title = name ? `${name} — profil gracza Albion Online` : 'Profil gracza Albion Online'
  const description = (profile?.bio || `Karta postaci${profile?.main_server ? ` z serwera ${profile.main_server}` : ''}, buildy i aktywność w społeczności Albion Social.`).slice(0, 155)
  return createPageMetadata({ title, description, path: `/profil/${encodeURIComponent(id)}` })
}

export default function PublicProfileLayout({ children }) { return children }
