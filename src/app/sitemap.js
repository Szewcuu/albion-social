export default async function sitemap() {
  const baseUrl = 'https://albion-social.vercel.app'
  
  const routes = [
    '',
    '/buildy',
    '/gildie',
    '/rynek',
    '/killboard',
    '/kalkulator-craftingu',
    '/loot-split',
    '/timery',
    '/wyprawy',
    '/profil',
    '/prywatnosc',
    '/regulamin'
  ].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString().split('T')[0],
    changeFrequency: route === '' || route === '/rynek' || route === '/killboard' ? 'hourly' : 'daily',
    priority: route === '' ? 1.0 : 0.8,
  }))

  return routes
}
