import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Kalendarz wydarzeń gildii',
  description: 'Terminy wypraw, walk i wydarzeń społeczności Albion Online na wszystkich serwerach.',
  path: '/kalendarz',
})

export default function CalendarLayout({ children }) { return children }
