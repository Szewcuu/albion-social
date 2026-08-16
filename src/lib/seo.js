export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://albion-social.vercel.app').replace(/\/$/, '')
export const SITE_NAME = 'Albion Social'
export const DEFAULT_OG_IMAGE = '/og-banner.jpg'

export function absoluteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalizedPath}`
}

export function createPageMetadata({
  title,
  description,
  path,
  index = false,
  type = 'website',
  image = DEFAULT_OG_IMAGE,
}) {
  const canonical = absoluteUrl(path)
  const imageUrl = image.startsWith('http') ? image : absoluteUrl(image)
  const fullTitle = title.includes(SITE_NAME) || title.includes('Albion Online Polska Portal')
    ? title
    : `${title} | ${SITE_NAME}`

  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical },
    robots: {
      index,
      follow: index,
      googleBot: { index, follow: index, 'max-image-preview': 'large' },
    },
    openGraph: {
      type,
      locale: 'pl_PL',
      url: canonical,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: fullTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [imageUrl],
    },
  }
}
