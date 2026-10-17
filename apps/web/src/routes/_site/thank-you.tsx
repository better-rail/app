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
      title={<span className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center">💙 תודה רבה!</span>}
    >
      <p>התמיכה שלכם התקבלה בהצלחה, ואנחנו מודים לכם מעומק הלב.</p>
      <p>התמיכה שלכם היא שמאפשרת לנו להמשיך לפתח ולתחזק את האפליקציה עבור כלל הנוסעים.</p>
      <p>אישור תשלום וחשבונית יישלחו אליכם למייל בדקות הקרובות.</p>
      <p>
        שתהיה נסיעה טובה,
        <br />
        צוות בטר רייל
      </p>
    </ContentPage>
  ),
})
