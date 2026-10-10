import { Outlet, createFileRoute } from "@tanstack/react-router"
import { SiteLayout } from "@/components/site-layout"

/** Pathless layout for the Hebrew-only marketing & legal pages (`/about`, `/press`, …). */
export const Route = createFileRoute("/_site")({
  beforeLoad: () => ({ locale: "he" as const }),
  component: () => (
    <SiteLayout locale="he">
      <Outlet />
    </SiteLayout>
  ),
})
