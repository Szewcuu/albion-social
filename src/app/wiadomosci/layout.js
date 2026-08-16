import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Skrzynka handlowa',
  description: 'Prywatne rozmowy kupujących i sprzedających na rynku Albion Polska.',
  path: '/wiadomosci',
})

export default function MessagesLayout({ children }) {
  return children
}
