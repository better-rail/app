import { createFileRoute } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { ContentPage, NewTabHint } from "@/components/content-page"
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

const P = ({ children }: { children: ReactNode }) => <p className="site-page-content-text">{children}</p>

const Subtitle = ({ children }: { children: ReactNode }) => <h2 className="site-page-content-subtitle">{children}</h2>

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="link-underline" href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <NewTabHint />
    </a>
  )
}

function LawsuitPage() {
  return (
    <ContentPage title={TITLE}>
      <div className="byline">
        <img src="/assets/team/guy.webp" className="byline-image" alt="גיא טפר" width={34} height={34} />
        <div className="byline-details">
          <p className="byline-name">גיא טפר</p>
          <p className="byline-role">
            <time dateTime="2026-09-01">1 בספטמבר 2026</time>
          </p>
        </div>
      </div>

      <aside className="update-note">
        <p className="update-note-label">
          <time dateTime="2026-09-07">עדכון · 7 בספטמבר 2026</time>
        </p>
        <p className="update-note-text">
          בטר רייל חזרה למשוך מידע מרכבת ישראל.{" "}
          <a
            className="link-underline update-note-link"
            href="https://x.com/better_rail/status/2096877673888825749"
            target="_blank"
            rel="noopener noreferrer"
          >
            לפרטים המלאים
            <NewTabHint />
          </a>
        </p>
      </aside>

      <p className="site-page-content-text lead">קיבלנו מכתב אזהרה לפני תביעה מרכבת ישראל.</p>

      <figure className="post-hero">
        <a
          className="post-hero-link"
          href="/assets/documents/israel-railways-warning-letter-2026-08-09.pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          <picture>
            <source type="image/avif" srcSet="/assets/images/lawsuit-letter.avif" />
            <source type="image/webp" srcSet="/assets/images/lawsuit-letter.webp" />
            <img
              src="/assets/images/lawsuit-letter.png"
              className="post-hero-image"
              alt="מכתב ההתראה לפני תביעה שנשלח לבטר רייל מטעם רכבת ישראל"
              width={1780}
              height={820}
              fetchPriority="high"
            />
          </picture>
          <NewTabHint />
        </a>
        <figcaption className="post-hero-caption">לחצו על התמונה לקריאת המכתב המלא</figcaption>
      </figure>

      <P>הרכבת טוענת ש:</P>
      <ul className="claims-list">
        <li className="site-page-content-text">אנחנו פוגעים בקניין הרוחני שלה כשאנחנו מפרסמים את לוח הזמנים</li>
        <li className="site-page-content-text">אנחנו מפיקים רווח מסחרי משימוש בלוח הזמנים</li>
        <li className="site-page-content-text">אנחנו מעמיסים על שרתי הרכבת וכך גרמנו נזק של אלפי שקלים</li>
        <li className="site-page-content-text">ביצענו פעולות האקינג מתוחכמות על מאגרי המידע של הרכבת</li>
      </ul>
      <P>
        אנחנו כופרים בטענות ומאמינים שהן חסרות כל שחר. עו״ד גיא זומר מייצג אותנו מול רכבת ישראל, ואת תגובתו המלאה והמפורטת תוכלו
        לקרוא <ExternalLink href="/assets/documents/better-rail-response-letter-2026-08-31.pdf">במכתב התגובה (PDF)</ExternalLink>.
      </P>
      <P>בעמוד זה רצינו להציג בקצרה את עיקרי התגובה שלנו.</P>

      <hr className="divider" />

      <Subtitle>זכות הציבור לדעת</Subtitle>
      <P>רכבת ישראל היא חברה ממשלתית, הממומנת מכספי משלם המסים. לוח הזמנים שלה הוא מידע ציבורי, ולציבור יש זכות לדעת אותו.</P>
      <P>אין לרכבת הזכות לדרוש עליו בלעדיות כקניין רוחני. להפך - עליה להנגיש אותו לציבור ככל הניתן.</P>

      <Subtitle>בטר רייל לא פועלת למטרות רווח</Subtitle>
      <P>בטר רייל היא אפליקצייה חינמית, בקוד פתוח, ללא פרסומות וללא מטרות רווח.</P>
      <P>
        לאורך 5 שנות פעילות האפליקצייה קיבלנו כ-2,000 שקל שהיו מחווה של תמיכה מהמשתמשים שלנו. הסכום הזה לא מכסה את עלויות התחזוקה
        השוטפת, ולא את אלפי שעות הפיתוח שהשקענו לאורך השנים. הרכבת דורשת שנעביר אליהם כל רווח שנעשה מהאפליקצייה, אבל האמת היא שאנו
        פועלים ״בהפסד״, מתוך רצון ותשוקה להנגשת תחבורה ציבורית.
      </P>
      <P>
        לא ברור הצורך של הרכבת, גוף ממשלתי עם תקציב שנתי של מיליארדים, לשלוח עורך דין עם מכתב איומים, בדרישה לכספים מאפליקצייה שלא
        פועלת למטרות רווח.
      </P>

      <Subtitle>לא ביצענו שום פעולת האקינג</Subtitle>
      <P>
        הרכבת טוענת, באמצעות עו״ד זיו רוטנברג, שחדרנו בצורה בלתי מורשית למערכות רכבת ישראל. אך אותו עו״ד טוען{" "}
        <ExternalLink href="https://www.themarker.com/law/2026-08-10/ty-article/.premium/0000019f-ea85-d106-a7ff-fb95a92b0000">
          בראיון לדה מארקר
        </ExternalLink>{" "}
        בתאריך 10.08.26, יום לאחר שליחת מכתב ההתראה:
      </P>
      <aside className="callout">
        <p className="callout-text">
          ״מידע המתפרסם באתר אינטרנט ונגיש לכל אדם, ללא צורך בזיהוי, בהרשאה או בסיסמה, אינו יכול להיחשב מידע סודי. אין לראות במידע
          שהוצג כסודי משום שממילא זמין באמצעות ערוצים רבים שאינם קשורים…״
        </p>
      </aside>
      <P>
        זמני רכבת ישראל מועברים דרך בקשת רשת סטנדרטית <strong>ונגישים לכל אדם, ללא צורך בזיהוי, בהרשאה או בסיסמה</strong>.
      </P>
      <P>
        לא ביצענו פעולת האקינג מיוחדת בשביל גישה לנתונים. הרכבת לא משתמשת במנגנון אבטחה בשביל להגן על המידע, מה שאיפשר עד כה
        לציבור לגשת אליו בחופשיות, והצמיח יוזמות ופרויקטים להנגשתו, כמו בטר רייל.
      </P>
      <P>
        קוד המקור של בטר רייל חשוף לציבור{" "}
        <a className="link-underline" href={GITHUB_URL}>
          באתר גיטהאב
        </a>
        . כל אחד יכול לבדוק איזה פעולות אנו מבצעים בשביל למשוך ולהציג את הנתונים. טענות רכבת ישראל משוללות כל יסוד.
      </P>

      <Subtitle>עומס על השרתים</Subtitle>
      <P>
        הרכבת טוענת שפעילות בטר רייל הכבידה על השרת שלהם ואף לקחה חלק בקריסתו (!) במספר מועדים. משתמשי בטר רייל היו ״מכבידים״
        באותה מידה על שרתי הרכבת לולא היו משתמשים בבטר רייל.
      </P>
      <P>בשביל להבין את סדרי הגודל - באפליקציית רכבת ישראל משתמשים מאות אלפים מדי יום, בבטר רייל בערך אלף.</P>
      <P>
        הרכבת טוענת שהעומס שבטר רייל גרמה למערכותיה גרם לנזק שנאמד באלפי שקלים. אנו דורשים בזאת כי רכבת ישראל תעביר לעיוננו את
        התחקירים והבדיקות שסעיף 10 למכתב ההתראה נסמך עליהם, את נתוני התעבורה שעל בסיסם יוחס לבטר רייל חלק באירועים, ואת החישוב
        שממנו נגזר סכום הנזק הנטען. כל עוד לא הועברו אלה, אין בטענה דבר שניתן להתמודד עמו לגופו.
      </P>

      <hr className="divider" />

      <Subtitle>איך הגענו לכאן</Subtitle>
      <P>
        הסאגה הזו התחילה לאחר בקשה שהגיעה מצד רכבת ישראל, להפסיק להשתמש בנתונים שלהם ולעבור להשתמש במאגר המידע של משרד התחבורה.
      </P>
      <P>
        כך עשינו - הרמנו חיש מהר גרסה של האפליקצייה שעובדת מול נתוני משרד התחבורה. במהלך הבדיקות התגלו{" "}
        <a className="link-underline" href="/gtfs-siri-issues.html">
          פערים משמעותיים
        </a>{" "}
        בין הנתונים של המשרד אל מול נתוני הרכבת - חוסרים ואי דיוקים. הצגת המידע הזה כפי שהוא תפגע בנוסעי הרכבת הסומכים על בטר
        רייל.
      </P>
      <aside className="callout">
        <p className="callout-text">
          לא רק נוסעי בטר רייל נפגעים מכך - כל אפליקציות התחב״צ (גוגל מפות, מוביט, הופאון וכו׳) שמסתמכות על המידע שמעביר משרד
          התחבורה עלולות להציג מידע שגוי.
        </p>
        <p className="callout-text callout-punchline">למעשה, לרכבת ישראל יש בלעדיות על נתוני האמת המלאים.</p>
      </aside>
      <P>
        פנינו לרכבת ולמשרד התחבורה במטרה לפעול להסדרת העניין, נפגשנו עם מספר אנשי מקצוע אך דבר לא השתנה עד כה. ביקשנו, לטובת
        הנוסעים, שיתנו לנו קצת אוויר לנשימה עד שיסדירו את עניין תקינות הנתונים, ושיתנו לנו אפשרות להמשיך להציג את הנתונים התקינים
        - אך במקום זאת קיבלנו מכתב התראה לפני תביעה.
      </P>

      <Subtitle>מה קורה עכשיו</Subtitle>
      <P>העלנו גרסה חדשה שמפסיקה לעבוד מול נתוני רכבת ישראל ועובדת מול נתוני משרד התחבורה.</P>
      <P>
        הנוסע הממוצע לא ירגיש בהבדל, אבל כאשר משהו מאתגר את לוח הזמנים של הרכבת - ביטולי רכבות, שינויי רציפים, ועוד - אנחנו עלולים
        להציג מידע שגוי באפליקצייה. אנחנו ממשיכים לפעול ומקווים שהבעיות הקיימות יוסדרו בהקדם על ידי רכבת ישראל ומשרד התחבורה.
      </P>

      <Subtitle>איך אפשר לעזור</Subtitle>
      <P>אם גם אתכם הסיפור הזה הצליח לעצבן, יש כמה דברים שאפשר לעשות:</P>
      <ul className="claims-list">
        <li className="site-page-content-text">
          לשתף את בטר רייל עם חברים! ככל שיותר אנשים ישתמשו באפליקצייה, כך גם ההשפעה שלנו. האפליקצייה עדיין עובדת רוב הזמן בסדר
          גמור :)
        </li>
        <li className="site-page-content-text">
          לדווח לנו על אי-דיוקים בלוח הזמנים (דרך{" "}
          <a className="link-underline" href="mailto:feedback@better-rail.co.il">
            המייל
          </a>{" "}
          או בטוויטר), כדי שנוכל להצביע על הפערים מול הגורמים הרלוונטיים
        </li>
        <li className="site-page-content-text">
          לעקוב אחרינו ב<ExternalLink href={TWITTER_URL}>טוויטר</ExternalLink> לעדכונים
        </li>
      </ul>
      <P>
        ומעבר לזה, תמיד נשמח ל<ExternalLink href={SUPPORT_URL}>תמיכה כספית</ExternalLink> להמשך הפעילות שלנו. השינויים האחרונים
        שנאלצנו לבצע כוללים הרמת שרתים ותמיכה במערכת של משרד התחבורה, עלויות חודשיות שאנו מממנים מכיסינו.
      </P>
      <P>זה המקום להגיד המון תודה לעו״ד גיא זומר ולעמותת תחבורה בדרך שלנו שמלווים אותנו.</P>
      <p className="site-page-content-text signature">
        שתהיה נסיעה טובה,
        <strong>צוות בטר רייל</strong>
      </p>
    </ContentPage>
  )
}
