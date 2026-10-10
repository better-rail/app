import { useEffect } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { ContentPage } from "@/components/content-page"
import { trackEvent } from "@/lib/analytics"
import {
  APP_STORE_URL,
  DISCORD_URL,
  GITHUB_URL,
  PLAY_STORE_URL,
  SITE_URL,
  TWITTER_URL,
  cacheHeaders,
  jsonLd,
  pageHead,
} from "@/lib/seo"

const PATH = "/releases/2.8/"
const MEDIA = "/assets/images/releases/2.8/"
const TITLE = "מה חדש בבטר רייל 2.8"
const DESCRIPTION = "מחירי נסיעה, בחירת תחנת ההחלפה, סינון לפי מספר החלפות, ווידג׳טים חדשים ועוד בגרסה 2.8 של בטר רייל."

export const Route = createFileRoute("/_site/releases/2.8")({
  head: () => ({
    ...pageHead({
      locale: "he",
      localized: false,
      path: PATH,
      title: `Better Rail - ${TITLE}`,
      description: DESCRIPTION,
      image: `${MEDIA}og-image.jpg`,
      twitterImage: `${MEDIA}twitter-image.jpg`,
      type: "article",
      publishedTime: "2026-09-22",
    }),
    scripts: [
      jsonLd({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "BlogPosting",
            "@id": `${SITE_URL}${PATH}#article`,
            url: `${SITE_URL}${PATH}`,
            mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${PATH}` },
            headline: TITLE,
            description: DESCRIPTION,
            image: { "@type": "ImageObject", url: `${SITE_URL}${MEDIA}og-image.jpg`, width: 1200, height: 630 },
            datePublished: "2026-09-22",
            dateModified: "2026-09-22",
            inLanguage: "he-IL",
            author: { "@id": `${SITE_URL}/#organization` },
            publisher: { "@id": `${SITE_URL}/#organization` },
            about: { "@id": `${SITE_URL}/#app` },
          },
          {
            "@type": "Organization",
            "@id": `${SITE_URL}/#organization`,
            name: "Better Rail",
            alternateName: "בטר רייל",
            url: `${SITE_URL}/`,
            logo: { "@type": "ImageObject", url: `${SITE_URL}/assets/favicon/icon-original.png`, width: 512, height: 512 },
            sameAs: [GITHUB_URL, TWITTER_URL],
          },
          {
            "@type": "SoftwareApplication",
            "@id": `${SITE_URL}/#app`,
            name: "Better Rail",
            alternateName: "בטר רייל",
            url: `${SITE_URL}/`,
            applicationCategory: "TravelApplication",
            operatingSystem: ["iOS", "Android", "watchOS"],
            softwareVersion: "2.8",
            publisher: { "@id": `${SITE_URL}/#organization` },
            installUrl: [APP_STORE_URL, PLAY_STORE_URL],
          },
        ],
      }),
    ],
  }),
  headers: () => cacheHeaders(3600, 86400),
  component: ReleasePage,
})

function ReleaseVideo({ name, poster, label }: { name: string; poster: string; label: string }) {
  return (
    <figure className="my-5">
      <video
        src={`${MEDIA}${name}`}
        poster={`${MEDIA}${poster}`}
        width={1080}
        height={1080}
        muted
        loop
        playsInline
        preload="none"
        aria-label={label}
        className="w-full rounded-2xl"
      />
    </figure>
  )
}

function ReleasePicture({ name, alt, height }: { name: string; alt: string; height: number }) {
  return (
    <figure className="my-5">
      <picture>
        <source type="image/avif" srcSet={`${MEDIA}${name}.avif`} />
        <source type="image/webp" srcSet={`${MEDIA}${name}.webp`} />
        <img
          src={`${MEDIA}${name}.jpg`}
          alt={alt}
          width={1240}
          height={height}
          loading="lazy"
          decoding="async"
          className="w-full rounded-2xl"
        />
      </picture>
    </figure>
  )
}

function ReleasePage() {
  useEffect(() => {
    const videos = document.querySelectorAll<HTMLVideoElement>(".release-2-8 video")
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      videos.forEach((video) => (video.controls = true))
      return
    }
    if (!("IntersectionObserver" in window)) {
      videos.forEach((video) => (video.controls = true))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          const video = target as HTMLVideoElement
          if (isIntersecting) void video.play().catch(() => {})
          else video.pause()
        })
      },
      { rootMargin: "200px 0px" },
    )
    videos.forEach((video) => observer.observe(video))
    return () => {
      observer.disconnect()
      videos.forEach((video) => video.pause())
    }
  }, [])

  return (
    <ContentPage title="מה חדש בגרסה 2.8" subtitle={<time dateTime="2026-09-22">22 בספטמבר 2026</time>} className="release-2-8">
      <p>היי ושלום לכל 20 אלף הנוסעים שהורידו את בטר רייל בחודש האחרון :)</p>
      <p>
        נתחיל מלהגיד המון תודה לכל מי שתמך בנו בחודש האחרון מול איומי הרכבת.
        <br />
        לא שמענו מהרכבת מאז ששלחנו את תגובתנו, אבל אנחנו אופטימיים שלא נצטרך להגיע לבית המשפט.
      </p>
      <p>התמיכה הגורפת שקיבלנו נותנת המון רוח גבית ומוטיבציה להמשיך ליצור את אפליקציית הרכבות הכי טובה שיש.</p>
      <p>
        חזרנו למשוך מידע מרכבת ישראל אחרי שלא יכולנו להמשיך להנגיש לנוסעי הרכבת מידע ממשרד התחבורה, המספק זמנים שעלולים להיות
        שגויים. רכבת ישראל היא הגורם היחיד שמספק מידע אמין על רכבות בזמן אמת נכון לעכשיו.{" "}
        <a href="/gtfs-siri-issues.html">דיווחנו על הפערים</a> לרכבת ישראל ומשרד התחבורה אך טרם קיבלנו התייחסות.
      </p>
      <p>ועכשיו אנחנו חוזרים להתמקד באפליקצייה! רבים מכם שלחו לנו פידבקים, וגרסה 2.8 מוסיפה הרבה מהפיצ׳רים שביקשתם.</p>

      <hr />
      <section>
        <h2>החלפה בתחנה אחרת</h2>
        <ReleaseVideo
          name="change-station.mp4"
          poster="change-station-poster.jpg"
          label="בחירת תחנה אחרת להחלפת רכבת, והמסלול מתעדכן בהתאם"
        />
        <p>
          במסלול עם החלפה, לחצו על החצים בכרטיס ״החלפה ב…״ ובחרו תחנה אחרת שבה עוצרות שתי הרכבות. המסלול יחושב מחדש דרך התחנה
          שבחרתם, וההתראות בזמן הנסיעה יתאימו להחלפה החדשה.
        </p>
      </section>
      <section>
        <h2>מחירי נסיעה</h2>
        <ReleaseVideo name="fares.mp4" poster="fares-poster.jpg" label="פתיחת מחירי הנסיעה, עם המחירים המוזלים לאזרח ותיק" />
        <p>לחצו על ״מחירי נסיעה״ בתפריט מסך לוח הזמנים, כדי לראות כמה עולים נסיעה בודדת, חופשי יומי וחופשי חודשי.</p>
        <p>בחרו את פרופיל הנוסע/ת שלכם - סטודנט, אזרח ותיק, נוער ועוד - והמחירים יוצגו אחרי ההנחה.</p>
      </section>
      <section>
        <h2>סינון לפי החלפות</h2>
        <ReleaseVideo name="filter.mp4" poster="filter-poster.jpg" label="סינון רכבות ישירות בלבד, והרשימה מתעדכנת בהתאם" />
        <p>
          בתפריט הסינון במסך לוח הזמנים אפשר עכשיו לבחור כמה החלפות מתאימות לכם: רכבות ישירות בלבד, עד החלפה אחת, או ללא הגבלה.
        </p>
      </section>

      <hr />
      <section>
        <h2>ווידג׳טים חדשים</h2>
        <ReleasePicture name="widget-xl" alt="הווידג׳ט החדש עם הרכבת הבאה ולוח הזמנים המלא" height={1240} />
        <p>
          ב-iOS 27 נוסף תמיכה בווידג׳ט גדול במיוחד, והווידג׳ט הגדול הנוכחי קיבל עיצוב חדש. הוספנו תמיכה בעיצוב הווידג׳ט הגדול גם
          באנדרואיד.
        </p>
        <ReleaseVideo
          name="android-widgets.mp4"
          poster="android-widgets-poster.jpg"
          label="הוספת ווידג׳ט מההגדרות: בחירת הגודל 4×3 והוספה למסך הבית"
        />
        <p>עוד באנדרואיד: כפתור ״הוספת ווידג׳ט למסך הבית״ חדש בהגדרות האפליקצייה, שמוסיף את הווידג׳ט בלחיצה.</p>
      </section>
      <section>
        <h2>Apple Watch</h2>
        <ReleasePicture name="apple-watch" alt="המסלולים המועדפים בשעון ופרטי הנסיעה ב-Smart Stack" height={900} />
        <p>פרטי הנסיעה בלייב אקטיביטי באפל ווטצ׳ קיבלו עיצוב חדש.</p>
        <p>ב-watchOS 27 אפשר גם לסדר מחדש את המסלולים המועדפים בגרירה, והסדר החדש מסתנכרן עם האייפון.</p>
      </section>

      <hr />
      <h2>שיפורים ותיקונים</h2>
      <ul>
        <li>
          אפשר לחפש תחנות גם לפי שמות נוספים שלהן, כמו ״אקספו״ (תל אביב - אוניברסיטה), ״מטרופול״ (אשדוד - עד הלום) או ״אלי כהן״
          (בת ים - יוספטל)
        </li>
        <li>הגדרת השפה של האפליקצייה בהגדרות האייפון חזרה, וחלה גם על הווידג׳טים</li>
        <li>תמיכה בתצוגת שעות בפורמט 12 שעות (AM/PM) באנגלית, לפי הגדרת השעון במכשיר</li>
      </ul>

      <aside className="my-8 rounded-xl bg-surface-2 px-5 py-6 text-center">
        <p className="mb-4 text-xl font-bold">עדכנו לגרסה החדשה</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("download_click", { platform: "ios", source: "release-2.8" })}
          >
            <img src="/assets/images/app-store-badge.svg" alt="הורדה לאייפון" width={160} height={54} />
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("download_click", { platform: "android", source: "release-2.8" })}
          >
            <img src="/assets/images/google-play-badge.svg" alt="הורדה לאנדרואיד" width={160} height={54} />
          </a>
        </div>
      </aside>
      <p>
        נשמח לשמוע מכם! מוזמנים לשלוח פידבק ולדבר איתנו ב
        <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
          דיסקורד
        </a>{" "}
        החדש שלנו.
      </p>
      <p>
        שתהיה נסיעה טובה,
        <br />
        <strong>צוות בטר רייל</strong>
      </p>
    </ContentPage>
  )
}
