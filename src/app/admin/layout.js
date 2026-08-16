import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Centrum moderacji',
  description: 'Chronione centrum moderacji i monitoringu portalu Albion Social.',
  path: '/admin',
})

export default function AdminLayout({ children }) { return children }
