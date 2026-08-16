import { createPageMetadata } from '@/lib/seo'
import { getPublicGuildMetadata } from '@/lib/server/publicMetadata'

export async function generateMetadata({ params }) {
  const { id } = await params
  const guild = await getPublicGuildMetadata(id)
  const title = guild?.name ? `${guild.name} — gildia Albion Online` : 'Profil gildii Albion Online'
  const description = (guild?.description || `Centrum gildii${guild?.server ? ` na serwerze ${guild.server}` : ''}: rekrutacja, skład i wydarzenia.`).slice(0, 155)
  return createPageMetadata({ title, description, path: `/gildie/${encodeURIComponent(id)}` })
}

export default function GuildDetailLayout({ children }) { return children }
