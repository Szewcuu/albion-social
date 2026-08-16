import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Logowanie do portalu',
  description: 'Bezpieczne zakończenie logowania Discord do portalu Albion Social.',
  path: '/auth/callback',
})

export default function AuthLayout({ children }) { return children }
