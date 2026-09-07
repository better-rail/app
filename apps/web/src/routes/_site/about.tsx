import { createFileRoute } from "@tanstack/react-router"
import { ContentPage } from "@/components/content-page"
import { pageHead, cacheHeaders, jsonLd, organizationJsonLd } from "@/lib/seo"

const team = [
  { name: "גיא טפר", role: "עיצוב ופיתוח", station: "בית יהושוע", image: "/assets/team/guy.webp" },
  { name: "מתן משרקי", role: "פיתוח", station: "חדרה מערב", image: "/assets/team/matan.webp" },
  { name: "דני רחליס", role: "פיתוח", station: "חוף הכרמל", image: "/assets/team/danny.webp" },
]

export const Route = createFileRoute("/_site/about")({
  head: () => ({
    ...pageHead({
      locale: "he",
      localized: false,
      path: "/about",
      title: "Better Rail - אודות",
      description: "על אפליקציית בטר רייל והצוות שמאחוריה: אפליקציית רכבת ישראל האלטרנטיבית, בקוד פתוח, ללא פרסומות ובחינם.",
    }),
    scripts: [jsonLd(organizationJsonLd())],
  }),
  headers: () => cacheHeaders(3600, 86400),
  component: AboutPage,
})

function AboutPage() {
  return (
    <ContentPage title="אודות">
      <p>אפליקציית בטר רייל שמה לעצמה כמטרה להנגיש את שירותי רכבת ישראל לציבור.</p>
      <p>האפליקצייה מציעה חווית משתמש מעולה וממשק נגיש ונח, שנוצרו מתוך ההיכרות הקרובה שלנו עם חווית הנסיעה ברכבת.</p>
      <p>בטר רייל מוצעת להורדה בחינם, ללא פרסומות וכתובה בקוד פתוח.</p>
      <h3>צוות</h3>
      <p>
        אנחנו נוסעי רכבת עם אהבה גדולה לפיתוח אפליקציות. בטר רייל מפגישה שני עולמות שאנחנו אוהבים - תחבורה ציבורית וטכנולוגיה.
      </p>
      <ul className="!mb-0 !list-none grid gap-6 !ps-0 sm:grid-cols-3">
        {team.map((member) => (
          <li key={member.name} className="flex flex-col items-center text-center">
            <img
              src={member.image}
              alt={member.name}
              width={150}
              height={206}
              className="h-[206px] w-[150px] rounded-2xl object-cover shadow-card"
              loading="lazy"
            />
            <p className="mt-3 !mb-0 text-lg font-bold text-text">{member.name}</p>
            <p className="!mb-0 text-[15px] text-text-2">{member.role}</p>
            <p className="!mb-0 text-[15px] text-dim">תחנה אהובה: {member.station}</p>
          </li>
        ))}
      </ul>
    </ContentPage>
  )
}
