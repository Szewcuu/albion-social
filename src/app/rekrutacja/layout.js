import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Rekrutacja do Ekipy Moderacji | Albion Online Polska',
  description: 'Dołącz do zespołu Straży Społeczności Albion Online Polska. Nabór na moderatora serwera Discord, grupy Facebook lub obu platform.',
  path: '/rekrutacja',
  index: true,
})

export default function RecruitmentLayout({ children }) {
  return children
}
