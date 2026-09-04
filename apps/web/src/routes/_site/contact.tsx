import { createFileRoute } from "@tanstack/react-router"
import { ContentPage } from "@/components/content-page"
import { FEEDBACK_EMAIL, pageHead, cacheHeaders } from "@/lib/seo"

export const Route = createFileRoute("/_site/contact")({
  head: () =>
    pageHead({
      locale: "he",
      localized: false,
      path: "/contact",
      title: "Better Rail - יצירת קשר",
      description: "יצירת קשר עם צוות בטר רייל - שאלות, הצעות ודיווח על אי-דיוקים בלוח הזמנים.",
    }),
  headers: () => cacheHeaders(3600, 86400),
  component: () => (
    <ContentPage title="יצירת קשר">
      <p>נשמח לשמוע מכם בכל שאלה, הצעה או בקשה. ניתן ליצור איתנו קשר בדוא"ל:</p>
      <p className="text-lg">
        <a href={`mailto:${FEEDBACK_EMAIL}`} dir="ltr">
          {FEEDBACK_EMAIL}
        </a>
      </p>
    </ContentPage>
  ),
})
