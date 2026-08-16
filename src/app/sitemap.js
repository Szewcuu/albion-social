import { absoluteUrl } from '@/lib/seo'

export default async function sitemap() {
  // Moduły społecznościowe wymagają logowania, więc nie obiecujemy crawlerom
  // adresów, których anonimowy użytkownik nie może faktycznie otworzyć.
  const routes = [
    { path: '/', changeFrequency: 'weekly', priority: 1 },
    { path: '/regulamin', changeFrequency: 'monthly', priority: 0.3 },
    { path: '/prywatnosc', changeFrequency: 'monthly', priority: 0.3 },
  ].map((route) => ({
    url: absoluteUrl(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  return routes
}
