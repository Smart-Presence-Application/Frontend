/** Public address of the site; used for canonical links and share previews. */
const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "https://smartpresence.app").replace(/\/$/, "")

/** 1200x630 picture shown when a link is shared (WhatsApp, LinkedIn, X, Slack...). */
const SHARE_IMAGE = `${SITE_URL}/og-image.png`

interface SeoProps {
  title: string
  description: string
  path?: string
  noIndex?: boolean
}

/** React 19 hoists these tags into <head>, so each route can own its metadata. */
export function Seo({ title, description, path = "/", noIndex }: SeoProps) {
  const url = `${SITE_URL}${path}`
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="SmartPresence" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={SHARE_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="SmartPresence: AI-powered school management and attendance" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={SHARE_IMAGE} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
    </>
  )
}
