import { createFileRoute } from "@tanstack/react-router"
import { ContentPage } from "@/components/content-page"
import { pageHead } from "@/lib/seo"

export const Route = createFileRoute("/_site/thank-you")({
  head: () =>
    pageHead({
      locale: "he",
      localized: false,
      noindex: true,
      path: "/thank-you",
      title: "Better Rail - תודה רבה!",
      description: "התמיכה שלכם התקבלה בהצלחה.",
    }),
  component: () => (
    <ContentPage
      title="תודה רבה!"
      before={
        <p className="thank-you-emoji" aria-hidden="true">
          💙
        </p>
      }
    >
      <p className="site-page-content-text">התמיכה שלכם התקבלה בהצלחה, ואנחנו מודים לכם מעומק הלב.</p>
      <p className="site-page-content-text">התמיכה שלכם היא שמאפשרת לנו להמשיך לפתח ולתחזק את האפליקציה עבור כלל הנוסעים.</p>
      <p className="site-page-content-text">אישור תשלום וחשבונית יישלחו אליכם למייל בדקות הקרובות.</p>
      <p className="site-page-content-text">
        שתהיה נסיעה טובה,
        <br />
        צוות בטר רייל
      </p>
    </ContentPage>
  ),
})
