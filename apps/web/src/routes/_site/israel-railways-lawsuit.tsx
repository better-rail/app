import { createFileRoute } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { ContentPage } from "@/components/content-page"
import { pageHead, cacheHeaders, jsonLd, SITE_URL, SUPPORT_URL, TWITTER_URL, GITHUB_URL } from "@/lib/seo"

const TITLE = "רכבת ישראל מאיימת לתבוע אותנו"
const DESCRIPTION = "רכבת ישראל טוענת שבטר רייל הפרה זכויות יוצרים, פרצה לשרתיה וגרמה נזק של מאות אלפי שקלים."
const OG_IMAGE = "/assets/images/og-lawsuit-letter.jpg"

export const Route = createFileRoute("/_site/israel-railways-lawsuit")({
  head: () => ({
    ...pageHead({
      locale: "he",
      localized: false,
      path: "/israel-railways-lawsuit",
      title: "Better Rail - רכבת ישראל מאיימת לתבוע את בטר רייל",
      description: "רכבת ישראל מאיימת לתבוע את בטר רייל - העדכונים, הרקע והתגובה שלנו.",
      image: OG_IMAGE,
      imageAlt: "מכתב ההתראה לפני תביעה שנשלח לבטר רייל מטעם רכבת ישראל",
      type: "article",
      publishedTime: "2026-09-01",
      author: "גיא טפר",
    }),
    scripts: [
      jsonLd({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: TITLE,
        description: DESCRIPTION,
        image: `${SITE_URL}${OG_IMAGE}`,
        datePublished: "2026-09-01",
        inLanguage: "he-IL",
        author: { "@type": "Person", name: "גיא טפר" },
        publisher: { "@type": "Organization", name: "Better Rail", url: SITE_URL },
        mainEntityOfPage: `${SITE_URL}/israel-railways-lawsuit`,
      }),
    ],
  }),
  headers: () => cacheHeaders(3600, 86400),
  component: LawsuitPage,
})

function Callout({ children }: { children: ReactNode }) {
  return (
    <aside className="my-6 rounded-xl bg-brand-soft px-5 py-4 text-[17px] leading-relaxed sm:px-6 sm:py-5 sm:text-[19px]">
      {children}
    </aside>
  )
}

const Divider = () => <hr className="my-7 w-16 border-0 border-t border-line-strong" />

function LawsuitPage() {
  return (
    <ContentPage
      title={TITLE}
      subtitle={
        <span className="flex items-center gap-2.5 text-[15px] text-text-2">
          <img
            src="/assets/team/guy.webp"
            alt=""
            width={34}
            height={34}
            className="size-[34px] rounded-full object-cover object-top"
          />
          <span className="flex flex-col leading-tight">
            <span className="font-bold">גיא טפר</span>
            <time dateTime="2026-09-01" className="text-[14px] opacity-70">
              1 בספטמבר 2026
            </time>
          </span>
        </span>
      }
    >
      <p className="text-[19px] font-bold">קיבלנו מכתב אזהרה לפני תביעה מרכבת ישראל.</p>
      <figure className="mb-7">
        <a
          href="/assets/documents/israel-railways-warning-letter-2026-08-09.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl transition-transform duration-300 ease-out-expo hover:-translate-y-0.5"
        >
          <picture>
            <source type="image/avif" srcSet="/assets/images/lawsuit-letter.avif" />
            <source type="image/webp" srcSet="/assets/images/lawsuit-letter.webp" />
            <img
              src="/assets/images/lawsuit-letter.png"
              alt="מכתב ההתראה לפני תביעה שנשלח לבטר רייל מטעם רכבת ישראל"
              width={1780}
              height={820}
              className="w-full rounded-xl border border-line bg-white shadow-card"
              fetchPriority="high"
            />
          </picture>
        </a>
        <figcaption className="mt-3 text-center text-[14px] text-muted">לחצו על התמונה לקריאת המכתב המלא</figcaption>
      </figure>
      <p>הרכבת טוענת ש:</p>
      <ul>
        <li>אנחנו פוגעים בקניין הרוחני שלה כשאנחנו מפרסמים את לוח הזמנים</li>
        <li>אנחנו מפיקים רווח מסחרי משימוש בלוח הזמנים</li>
        <li>אנחנו מעמיסים על שרתי הרכבת וכך גרמנו נזק של אלפי שקלים</li>
        <li>ביצענו פעולות האקינג מתוחכמות על מאגרי המידע של הרכבת</li>
      </ul>
      <p>
        אנחנו כופרים בטענות ומאמינים שהן חסרות כל שחר. עו״ד גיא זומר מייצג אותנו מול רכבת ישראל, ואת תגובתו המלאה והמפורטת תוכלו
        לקרוא{" "}
        <a
          href="/assets/documents/better-rail-response-letter-2026-08-31.pdf"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="תגובתו המלאה של עו״ד גיא זומר לרכבת ישראל (PDF)"
        >
          כאן
        </a>
        .
      </p>
      <p>בעמוד זה רצינו להציג בקצרה את עיקרי התגובה שלנו.</p>
      <Divider />
      <h2>זכות הציבור לדעת</h2>
      <p>רכבת ישראל היא חברה ממשלתית, הממומנת מכספי משלם המסים. לוח הזמנים שלה הוא מידע ציבורי, ולציבור יש זכות לדעת אותו.</p>
      <p>אין לרכבת הזכות לדרוש עליו בלעדיות כקניין רוחני. להפך - עליה להנגיש אותו לציבור ככל הניתן.</p>
      <h2>בטר רייל לא פועלת למטרות רווח</h2>
      <p>בטר רייל היא אפליקצייה חינמית, בקוד פתוח, ללא פרסומות וללא מטרות רווח.</p>
      <p>
        לאורך 5 שנות פעילות האפליקצייה קיבלנו כ-2,000 שקל שהיו מחווה של תמיכה מהמשתמשים שלנו. הסכום הזה לא מכסה את עלויות התחזוקה
        השוטפת, ולא את אלפי שעות הפיתוח שהשקענו לאורך השנים. הרכבת דורשת שנעביר אליהם כל רווח שנעשה מהאפליקצייה, אבל האמת היא שאנו
        פועלים ״בהפסד״, מתוך רצון ותשוקה להנגשת תחבורה ציבורית.
      </p>
      <p>
        לא ברור הצורך של הרכבת, גוף ממשלתי עם תקציב שנתי של מיליארדים, לשלוח עורך דין עם מכתב איומים, בדרישה לכספים מאפליקצייה שלא
        פועלת למטרות רווח.
      </p>
      <h2>לא ביצענו שום פעולת האקינג</h2>
      <p>
        הרכבת טוענת, באמצעות עו״ד זיו רוטנברג, שחדרנו בצורה בלתי מורשית למערכות רכבת ישראל. אך אותו עו״ד טוען{" "}
        <a
          href="https://www.themarker.com/law/2026-08-10/ty-article/.premium/0000019f-ea85-d106-a7ff-fb95a92b0000"
          target="_blank"
          rel="noopener noreferrer"
        >
          בראיון לדה מארקר
        </a>{" "}
        בתאריך 10.08.26, יום לאחר שליחת מכתב ההתראה:
      </p>
      <Callout>
        ״מידע המתפרסם באתר אינטרנט ונגיש לכל אדם, ללא צורך בזיהוי, בהרשאה או בסיסמה, אינו יכול להיחשב מידע סודי. אין לראות במידע
        שהוצג כסודי משום שממילא זמין באמצעות ערוצים רבים שאינם קשורים…״
      </Callout>
      <p>
        זמני רכבת ישראל מועברים דרך בקשת רשת סטנדרטית <strong>ונגישים לכל אדם, ללא צורך בזיהוי, בהרשאה או בסיסמה</strong>.
      </p>
      <p>
        לא ביצענו פעולת האקינג מיוחדת בשביל גישה לנתונים. הרכבת לא משתמשת במנגנון אבטחה בשביל להגן על המידע, מה שאיפשר עד כה
        לציבור לגשת אליו בחופשיות, והצמיח יוזמות ופרויקטים להנגשתו, כמו בטר רייל.
      </p>
      <p>
        קוד המקור של בטר רייל חשוף לציבור <a href={GITHUB_URL}>באתר גיטהאב</a>. כל אחד יכול לבדוק איזה פעולות אנו מבצעים בשביל
        למשוך ולהציג את הנתונים. טענות רכבת ישראל משוללות כל יסוד.
      </p>
      <h2>עומס על השרתים</h2>
      <p>
        הרכבת טוענת שפעילות בטר רייל הכבידה על השרת שלהם ואף לקחה חלק בקריסתו (!) במספר מועדים. משתמשי בטר רייל היו ״מכבידים״
        באותה מידה על שרתי הרכבת לולא היו משתמשים בבטר רייל.
      </p>
      <p>בשביל להבין את סדרי הגודל - באפליקציית רכבת ישראל משתמשים מאות אלפים מדי יום, בבטר רייל בערך אלף.</p>
      <p>
        הרכבת טוענת שהעומס שבטר רייל גרמה למערכותיה גרם לנזק שנאמד באלפי שקלים. אנו דורשים בזאת כי רכבת ישראל תעביר לעיוננו את
        התחקירים והבדיקות שסעיף 10 למכתב ההתראה נסמך עליהם, את נתוני התעבורה שעל בסיסם יוחס לבטר רייל חלק באירועים, ואת החישוב
        שממנו נגזר סכום הנזק הנטען. כל עוד לא הועברו אלה, אין בטענה דבר שניתן להתמודד עמו לגופו.
      </p>
      <Divider />
      <h2>איך הגענו לכאן</h2>
      <p>
        הסאגה הזו התחילה לאחר בקשה שהגיעה מצד רכבת ישראל, להפסיק להשתמש בנתונים שלהם ולעבור להשתמש במאגר המידע של משרד התחבורה.
      </p>
      <p>
        כך עשינו - הרמנו חיש מהר גרסה של האפליקצייה שעובדת מול נתוני משרד התחבורה. במהלך הבדיקות התגלו{" "}
        <a href="/gtfs-siri-issues.html">פערים משמעותיים</a> בין הנתונים של המשרד אל מול נתוני הרכבת - חוסרים ואי דיוקים. הצגת
        המידע הזה כפי שהוא תפגע בנוסעי הרכבת הסומכים על בטר רייל.
      </p>
      <Callout>
        <p className="!mb-3">
          לא רק נוסעי בטר רייל נפגעים מכך - כל אפליקציות התחב״צ (גוגל מפות, מוביט, הופאון וכו׳) שמסתמכות על המידע שמעביר משרד
          התחבורה עלולות להציג מידע שגוי.
        </p>
        <p className="!mb-0 font-bold">למעשה, לרכבת ישראל יש בלעדיות על נתוני האמת המלאים.</p>
      </Callout>
      <p>
        פנינו לרכבת ולמשרד התחבורה במטרה לפעול להסדרת העניין, נפגשנו עם מספר אנשי מקצוע אך דבר לא השתנה עד כה. ביקשנו, לטובת
        הנוסעים, שיתנו לנו קצת אוויר לנשימה עד שיסדירו את עניין תקינות הנתונים, ושיתנו לנו אפשרות להמשיך להציג את הנתונים התקינים
        - אך במקום זאת קיבלנו מכתב התראה לפני תביעה.
      </p>
      <h2>מה קורה עכשיו</h2>
      <p>העלנו גרסה חדשה שמפסיקה לעבוד מול נתוני רכבת ישראל ועובדת מול נתוני משרד התחבורה.</p>
      <p>
        הנוסע הממוצע לא ירגיש בהבדל, אבל כאשר משהו מאתגר את לוח הזמנים של הרכבת - ביטולי רכבות, שינויי רציפים, ועוד - אנחנו עלולים
        להציג מידע שגוי באפליקצייה. אנחנו ממשיכים לפעול ומקווים שהבעיות הקיימות יוסדרו בהקדם על ידי רכבת ישראל ומשרד התחבורה.
      </p>
      <h2>איך אפשר לעזור</h2>
      <p>אם גם אתכם הסיפור הזה הצליח לעצבן, יש כמה דברים שאפשר לעשות:</p>
      <ul>
        <li>
          לשתף את בטר רייל עם חברים! ככל שיותר אנשים ישתמשו באפליקצייה, כך גם ההשפעה שלנו. האפליקצייה עדיין עובדת רוב הזמן בסדר
          גמור :)
        </li>
        <li>
          לדווח לנו על אי-דיוקים בלוח הזמנים (דרך <a href="mailto:feedback@better-rail.co.il">המייל</a> או בטוויטר), כדי שנוכל
          להצביע על הפערים מול הגורמים הרלוונטיים
        </li>
        <li>
          לעקוב אחרינו ב
          <a href={TWITTER_URL} target="_blank" rel="noopener noreferrer">
            טוויטר
          </a>{" "}
          לעדכונים
        </li>
      </ul>
      <p>
        ומעבר לזה, תמיד נשמח ל
        <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
          תמיכה כספית
        </a>{" "}
        להמשך הפעילות שלנו. השינויים האחרונים שנאלצנו לבצע כוללים הרמת שרתים ותמיכה במערכת של משרד התחבורה, עלויות חודשיות שאנו
        מממנים מכיסינו.
      </p>
      <p>זה המקום להגיד המון תודה לעו״ד גיא זומר ולעמותת תחבורה בדרך שלנו שמלווים אותנו.</p>
      <p className="mt-6">
        שתהיה נסיעה טובה,
        <br />
        <strong>צוות בטר רייל</strong>
      </p>
    </ContentPage>
  )
}
