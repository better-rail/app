import { ogLocale, localePath, type Locale } from "@/i18n"

export const SITE_URL = "https://better-rail.co.il"
export const SITE_NAME = "Better Rail"
export const TWITTER_HANDLE = "@better_rail"
export const DEFAULT_OG_IMAGE = `${SITE_URL}/assets/images/og-image.png`
export const APP_STORE_URL = "https://apps.apple.com/il/app/better-rail/id1562982976"
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.betterrail"
export const GITHUB_URL = "https://github.com/better-rail/app"
export const TWITTER_URL = "https://www.x.com/better_rail"
export const SUPPORT_URL = "https://pages.greeninvoice.co.il/payments/links/696f6413-1068-4002-a0f7-6b9b6676ead5"
export const FEEDBACK_EMAIL = "feedback@better-rail.co.il"
export const APP_STORE_ID = "1562982976"

export const absoluteUrl = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path}`)

type MetaTag = Record<string, string>
type LinkTag = Record<string, string>

export interface PageSeo {
  title: string
  description: string
  /** Site path without locale prefix, e.g. `/stations/herzliya` */
  path: string
  locale: Locale
  /** When false the page has no English/Hebrew twin and no hreflang alternates are emitted */
  localized?: boolean
  image?: string
  imageAlt?: string
  type?: "website" | "article"
  noindex?: boolean
  publishedTime?: string
  author?: string
}

/** Builds the `meta` + `links` arrays for a route's `head()`, including canonical and hreflang. */
export function pageHead(seo: PageSeo): { meta: MetaTag[]; links: LinkTag[] } {
  const canonical = absoluteUrl(localePath(seo.locale, seo.path))
  const image = absoluteUrl(seo.image ?? DEFAULT_OG_IMAGE)

  const meta: MetaTag[] = [
    { title: seo.title },
    { name: "description", content: seo.description },
    { property: "og:title", content: seo.title },
    { property: "og:description", content: seo.description },
    { property: "og:url", content: canonical },
    { property: "og:type", content: seo.type ?? "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: ogLocale(seo.locale) },
    { property: "og:image", content: image },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: TWITTER_HANDLE },
    { name: "twitter:title", content: seo.title },
    { name: "twitter:description", content: seo.description },
    { name: "twitter:image", content: image },
  ]

  if (seo.imageAlt) {
    meta.push({ property: "og:image:alt", content: seo.imageAlt }, { name: "twitter:image:alt", content: seo.imageAlt })
  }
  if (seo.noindex) meta.push({ name: "robots", content: "noindex, nofollow" })
  if (seo.publishedTime) meta.push({ property: "article:published_time", content: seo.publishedTime })
  if (seo.author) meta.push({ name: "author", content: seo.author }, { property: "article:author", content: seo.author })
  if (seo.localized !== false) {
    const otherLocale: Locale = seo.locale === "he" ? "en" : "he"
    meta.push({ property: "og:locale:alternate", content: ogLocale(otherLocale) })
  }

  const links: LinkTag[] = [{ rel: "canonical", href: canonical }]
  if (seo.localized !== false) {
    links.push(
      { rel: "alternate", hrefLang: "he", href: absoluteUrl(localePath("he", seo.path)) },
      { rel: "alternate", hrefLang: "en", href: absoluteUrl(localePath("en", seo.path)) },
      { rel: "alternate", hrefLang: "x-default", href: absoluteUrl(localePath("he", seo.path)) },
    )
  }

  return { meta, links }
}

/** Serialises structured data for a `<script type="application/ld+json">` tag. `<` is escaped so it can never close the script. */
export function jsonLd(data: object | object[]): { type: string; children: string } {
  return { type: "application/ld+json", children: JSON.stringify(data).replace(/</g, "\\u003c") }
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: "בטר רייל",
    url: SITE_URL,
    logo: `${SITE_URL}/assets/favicon/icon-original.png`,
    email: FEEDBACK_EMAIL,
    sameAs: [GITHUB_URL, TWITTER_URL, APP_STORE_URL, PLAY_STORE_URL],
  }
}

export function websiteJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl(localePath(locale, "/")),
    inLanguage: locale === "he" ? "he-IL" : "en",
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  }
}

export function mobileAppJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    name: SITE_NAME,
    operatingSystem: "iOS, Android",
    applicationCategory: "TravelApplication",
    inLanguage: locale === "he" ? "he-IL" : "en",
    offers: { "@type": "Offer", price: "0", priceCurrency: "ILS" },
    installUrl: [APP_STORE_URL, PLAY_STORE_URL],
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  }
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>, locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(localePath(locale, item.path)),
    })),
  }
}

export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  }
}

/** Browser: always revalidate. Netlify CDN: serve cached HTML for `sMaxAge` seconds and refresh in the background for `swr` more. */
export function cacheHeaders(sMaxAge: number, swr: number): Record<string, string> {
  return {
    "Cache-Control": "public, max-age=0, must-revalidate",
    "Netlify-CDN-Cache-Control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
    "Netlify-Vary": "query",
  }
}
