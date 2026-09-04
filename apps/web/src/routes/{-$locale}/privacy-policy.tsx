import { createFileRoute } from "@tanstack/react-router"
import { ContentPage } from "@/components/content-page"
import { useLocale, resolveLocale } from "@/i18n"
import { pageHead, cacheHeaders } from "@/lib/seo"

export const Route = createFileRoute("/{-$locale}/privacy-policy")({
  head: ({ params }) => {
    const locale = resolveLocale(params.locale) ?? "he"
    return pageHead({
      locale,
      path: "/privacy-policy",
      title: locale === "he" ? "Better Rail - מדיניות פרטיות" : "Better Rail - Privacy Policy",
      description:
        locale === "he"
          ? "מדיניות הפרטיות של אפליקציית ואתר Better Rail: איזה מידע נאסף, לאיזו מטרה ומאיפה מגיעים הנתונים."
          : "The Better Rail privacy policy: what information is collected, why, and where our data comes from.",
    })
  },
  headers: () => cacheHeaders(3600, 86400),
  component: PrivacyPage,
})

function PrivacyPage() {
  const locale = useLocale()
  if (locale === "en") {
    return (
      <ContentPage title="Privacy Policy">
        <p>At Better Rail, we prioritize your privacy and are dedicated to safeguarding your personal information.</p>
        <p>
          We use PostHog to understand how the app and website are used and improve them. It collects an anonymous device
          identifier, device and OS details, interface language, and usage statistics, stored on PostHog's servers in the European
          Union.{" "}
          <strong>
            We don't store your favorite routes and your search history, and we don't share any of this information with third
            parties.
          </strong>
        </p>
        <p>
          We use Sentry to monitor crashes and errors in the app. It collects device information, logs and diagnostic details, and
          records a session replay of sessions where an error occurred. Replays capture the app's screens only, contain no audio,
          and are not linked to you.
        </p>
        <p>You always can opt out from this data collection by disabling the "Telemetry" option in the app's settings.</p>
        <h3>Better Rail Live</h3>
        <p>In the mobile app you have the option to get live updates on a specific train ride.</p>
        <p>
          For this feature to work we keep the ride details during the time of the ride in an anonymized form. We also store logs
          to help us identify and resolve issues with the feature.
        </p>
        <h3>Where our data comes from</h3>
        <p>
          Train schedules and routes are calculated on our own servers, based on the Israeli Ministry of Transport's open public
          transport data (GTFS). Real-time information about delays, cancellations and platform changes comes from the Ministry of
          Transport's SIRI service.
        </p>
        <p>
          Searches you make in the app or on this website are sent only to our servers, and are not forwarded to Israel Railways.
          These requests contain no identifying information, and we don't store them. On the website, your recent searches and
          favorite routes are kept only in your own browser.
        </p>
        <p className="text-[15px] text-dim">Last updated on September 5th, 2026</p>
      </ContentPage>
    )
  }

  return (
    <ContentPage title="מדיניות פרטיות">
      <p>
        אנו משתמשים ב-PostHog כדי להבין כיצד נעשה שימוש באפליקציה ובאתר ולשפר אותם. הוא אוסף מזהה מכשיר אנונימי, פרטי מכשיר ומערכת
        הפעלה, שפת ממשק וסטטיסטיקות שימוש, הנשמרים בשרתי PostHog באיחוד האירופי. אנחנו לא מאחסנים את המסלולים המועדפים עליך ואת
        היסטוריית החיפושים שלך, ואיננו חולקים מידע זה עם צדדים שלישיים.
      </p>
      <p>
        אנו משתמשים ב-Sentry כדי לנטר קריסות ושגיאות באפליקציה. הוא אוסף מידע על המכשיר, לוגים ופרטי אבחון, ומקליט הקלטת מסך
        (Session Replay) של הפעלות שבהן אירעה שגיאה. ההקלטות מתעדות את מסכי האפליקציה בלבד, ללא שמע, ואינן משויכות אליך.
      </p>
      <p>
        חיפושי המסלולים באפליקציה ובאתר מעובדים בשרתים שלנו, אך אינם נשמרים ואינם משויכים אליך. מידע אישי אשר מוזן באפליקציה לא
        עובר אלינו.
      </p>
      <p>תמיד ניתן לבטל את איסוף הנתונים על ידי השבתת האפשרות "טלמטריה" בהגדרות האפליקציה</p>
      <h3>Better Rail Live</h3>
      <p>באפליקציה ניתן לקבל עדכונים חיים על נסיעה ספציפית ברכבת.</p>
      <p>
        כדי שתכונה זו תפעל, אנו שומרים את פרטי הנסיעה במהלך הנסיעה בצורה אנונימית. אנו גם מאחסנים לוגים של השרת כדי לעזור לנו
        לזהות ולפתור בעיות.
      </p>
      <h3>מקורות המידע</h3>
      <p>
        לוחות הזמנים ומסלולי הנסיעה מחושבים בשרתים שלנו, על בסיס נתוני התחבורה הציבורית הפתוחים (GTFS) של משרד התחבורה. מידע על
        עיכובים, ביטולים ושינויי רציף מתקבל בזמן אמת משירות ה-SIRI של משרד התחבורה.
      </p>
      <p>
        החיפושים באפליקציה ובאתר נשלחים לשרתים שלנו בלבד, ואינם מועברים לרכבת ישראל. בקשות החיפוש אינן כוללות מידע מזהה, ואיננו
        שומרים אותן. באתר, החיפושים האחרונים והמסלולים המועדפים נשמרים בדפדפן שלכם בלבד.
      </p>
      <p className="text-[15px] text-dim">עודכן לאחרונה ב-5 בספטמבר 2026</p>
    </ContentPage>
  )
}
