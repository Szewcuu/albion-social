import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Ustaw nowe hasło',
  description: 'Bezpieczne ustawienie nowego hasła do konta Albion Social.',
  path: '/auth/nowe-haslo',
})

export default function NewPasswordLayout({ children }) {
  return children
}
