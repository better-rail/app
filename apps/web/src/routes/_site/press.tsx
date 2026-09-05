import { createFileRoute } from "@tanstack/react-router"
import { ContentPage } from "@/components/content-page"
import { pageHead, cacheHeaders } from "@/lib/seo"

const articles = [
  {
    href: "https://www.geektime.co.il/israel-railways-better-rail-strikes-back-10k/",
    icon: "geektime.avif",
    title: "אחרי האיום של הרכבת: עשרת אלפים משתמשים חדשים באפליקציית Better Rail",
    outlet: "גיקטיים",
    date: "2026-09-03",
    dateText: "3 בספטמבר 2026",
  },
  {
    href: "https://www.themarker.com/news/transport/2026-09-02/ty-article/.premium/000001a0-6229-df5d-a9b9-622b46480000",
    icon: "themarker.avif",
    title: "למה כולם מורידים את האפליקציה הזאת? כשהרכבת נלחמת במי שעוזר לנוסעים",
    outlet: "TheMarker",
    date: "2026-09-02",
    dateText: "2 בספטמבר 2026",
  },
  {
    href: "https://www.calcalist.co.il/local_news/article/byhijch00mg",
    icon: "calcalist.avif",
    title: "איום התביעה של רכבת ישראל הקפיץ את Better Rail לראש טבלת ההורדות באפסטור",
    outlet: "כלכליסט",
    date: "2026-09-02",
    dateText: "2 בספטמבר 2026",
  },
  {
    href: "https://www.globes.co.il/news/article.aspx?did=1001554297",
    icon: "globes.avif",
    title: "רכבת ישראל דרשה להסיר את האפליקציה. אלפים נהרו אליה",
    outlet: "גלובס",
    date: "2026-09-02",
    dateText: "2 בספטמבר 2026",
  },
  {
    href: "https://cars.walla.co.il/item/3864932",
    icon: "walla.svg",
    title: "ברכבת ישראל שכחו שהציבור משלם להם משכורת",
    outlet: "וואלה",
    date: "2026-09-02",
    dateText: "2 בספטמבר 2026",
  },
  {
    href: "https://www.kipa.co.il/%D7%97%D7%93%D7%A9%D7%95%D7%AA/1230831-0/",
    icon: "kipa.avif",
    title: 'רכבת ישראל איימה, המפתחים עקצו: "בזכותכם הגענו למקום הראשון"',
    outlet: "כיפה",
    date: "2026-09-02",
    dateText: "2 בספטמבר 2026",
  },
  {
    href: "https://www.mako.co.il/nexter-news/Article-1f37abe77fb50a1027.htm",
    icon: "mako.avif",
    title: 'רכבת ישראל נגד בטר רייל: "דורשים להסיר אותה מחנויות האפליקציות"',
    outlet: "מאקו",
    date: "2026-09-01",
    dateText: "1 בספטמבר 2026",
  },
  {
    href: "https://www.israelhayom.co.il/news/transportation/article/21328746",
    icon: "israelhayom.avif",
    title: "בזמן שהנוסעים סובלים: מדוע רכבת ישראל מנסה לחסל אפליקציה חינמית?",
    outlet: "ישראל היום",
    date: "2026-09-01",
    dateText: "1 בספטמבר 2026",
  },
  {
    href: "https://www.calcalist.co.il/local_news/article/hktxe7euml",
    icon: "calcalist.avif",
    title: 'הרכבת מאיימת לתבוע אפליקציית תחב"צ: "גרמה לעומסים ותקלות"',
    outlet: "כלכליסט",
    date: "2026-09-01",
    dateText: "1 בספטמבר 2026",
  },
  {
    href: "https://www.inn.co.il/news/705332",
    icon: "inn.avif",
    title: "העימות מחריף: Better Rail מסרבת להסיר את האפליקציה ודוחה את דרישות הרכבת",
    outlet: "ערוץ 7",
    date: "2026-09-01",
    dateText: "1 בספטמבר 2026",
  },
  {
    href: "https://www.kikar.co.il/laws/tkor48",
    icon: "kikar.avif",
    title: "רכבת ישראל מאיימת בתביעה נגד אפליקציית זמני הרכבות",
    outlet: "כיכר השבת",
    date: "2026-09-01",
    dateText: "1 בספטמבר 2026",
  },
  {
    href: "https://www.geektime.co.il/israel-railways-vs-better-rail/",
    icon: "geektime.avif",
    title: "רכבת ישראל מאיימת בתביעה על אפליקציה בקוד פתוח שניסתה לעזור לנוסעים",
    outlet: "גיקטיים",
    date: "2026-09-01",
    dateText: "1 בספטמבר 2026",
  },
  {
    href: "https://www.kipa.co.il/%D7%97%D7%93%D7%A9%D7%95%D7%AA/1230758-0/",
    icon: "kipa.avif",
    title: 'רכבת ישראל נגד אפליקציית התחבורה הפופולרית: "גרמה לנזק של מאות אלפים"',
    outlet: "כיפה",
    date: "2026-09-01",
    dateText: "1 בספטמבר 2026",
  },
  {
    href: "https://www.ice.co.il/law/news/article/1128093",
    icon: "ice.avif",
    title: "רכבת ישראל מאיימת בתביעה: האפליקציה הפופולרית קיבלה מכתב אזהרה",
    outlet: "ICE",
    date: "2026-09-01",
    dateText: "1 בספטמבר 2026",
  },
]

export const Route = createFileRoute("/_site/press")({
  head: () =>
    pageHead({
      locale: "he",
      localized: false,
      path: "/press",
      title: "Better Rail - בטר רייל בתקשורת",
      description: "ריכוז הכתבות, הראיונות והאזכורים של אפליקציית בטר רייל באמצעי התקשורת.",
    }),
  headers: () => cacheHeaders(3600, 86400),
  component: () => (
    <ContentPage title="בטר רייל בתקשורת" subtitle="ריכוז הכתבות, הראיונות והאזכורים של אפליקציית בטר רייל באמצעי התקשורת.">
      <ul className="!mb-0 !list-none flex flex-col gap-3 !ps-0">
        {articles.map((article) => (
          <li key={article.href} className="!mb-0">
            <a
              href={article.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3.5 rounded-card border border-line/60 bg-surface p-4 !no-underline shadow-card transition-[box-shadow,border-color] duration-200 hover:border-brand/40 hover:shadow-card-hover"
            >
              <img
                src={`/assets/press/${article.icon}`}
                alt=""
                width={28}
                height={28}
                className="mt-1 size-7 shrink-0 rounded-md object-contain"
                loading="lazy"
                decoding="async"
              />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-[17px] font-bold leading-snug !text-text transition-colors group-hover:!text-brand-text">
                  {article.title}
                </span>
                <span className="flex items-center gap-1.5 text-[14px] !text-muted">
                  <span className="font-medium text-text-2">{article.outlet}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={article.date}>{article.dateText}</time>
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </ContentPage>
  ),
})
