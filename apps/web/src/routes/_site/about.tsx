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
      <p className="site-page-content-text">אפליקציית בטר רייל שמה לעצמה כמטרה להנגיש את שירותי רכבת ישראל לציבור.</p>
      <p className="site-page-content-text">
        האפליקצייה מציעה חווית משתמש מעולה וממשק נגיש ונח, שנוצרו מתוך ההיכרות הקרובה שלנו עם חווית הנסיעה ברכבת.
      </p>
      <p className="site-page-content-text">בטר רייל מוצעת להורדה בחינם, ללא פרסומות וכתובה בקוד פתוח.</p>
      <h2 className="site-page-content-subtitle">צוות</h2>
      <p className="site-page-content-text">
        אנחנו נוסעי רכבת עם אהבה גדולה לפיתוח אפליקציות. בטר רייל מפגישה שני עולמות שאנחנו אוהבים - תחבורה ציבורית וטכנולוגיה.
      </p>
      <div className="team-member-list">
        {team.map((member) => (
          <div key={member.name} className="team-member">
            <img src={member.image} alt={member.name} width={150} height={206} className="team-member-image" loading="lazy" />
            <div className="team-member-details">
              <h3 className="team-member-name">{member.name}</h3>
              <p className="team-member-role">{member.role}</p>
              <p className="team-member-station">תחנה אהובה: {member.station}</p>
            </div>
          </div>
        ))}
      </div>
    </ContentPage>
  )
}
