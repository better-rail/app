import { Link, type LinkProps } from "@tanstack/react-router"
import type { ComponentProps } from "react"
import { useLocale } from "@/i18n"

/** The `{-$locale}` path param value for the current locale (Hebrew has no prefix). */
export function useLocaleParam(): "en" | undefined {
  const locale = useLocale()
  return locale === "he" ? undefined : "en"
}

type LocaleLinkProps = Omit<ComponentProps<typeof Link>, "to" | "params" | "search"> & {
  /** A route path under the `{-$locale}` layout, e.g. `/{-$locale}/stations` */
  to: string
  params?: Record<string, string | undefined>
  search?: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>)
}

/** `Link` that fills in the `locale` path param for routes under the `{-$locale}` layout. */
export function LocaleLink({ to, params, search, ...rest }: LocaleLinkProps) {
  const locale = useLocaleParam()
  const linkProps = { to, params: { locale, ...params }, search } as unknown as LinkProps
  return <Link {...linkProps} {...(rest as object)} />
}
