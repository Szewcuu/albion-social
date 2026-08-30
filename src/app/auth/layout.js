import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Logowanie do portalu',
  description: 'Bezpieczne logowanie, potwierdzanie konta i odzyskiwanie dostępu do portalu Albion Social.',
  path: '/auth',
})

export default function AuthLayout({ children }) { return children }
