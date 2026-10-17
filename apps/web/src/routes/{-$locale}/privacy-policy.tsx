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
          ? "מדיניות הפרטיות של אפליקציית ואתר בטר רייל: איזה מידע נאסף, לאיזו מטרה ומאיפה מגיעים הנתונים."
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
        <h2 className="mt-6 text-lg">Better Rail Live</h2>
        <p>In the mobile app you have the option to get live updates on a specific train ride.</p>
        <p>
          For this feature to work we keep the ride details during the time of the ride in an anonymized form. We also store logs
          to help us identify and resolve issues with the feature.
        </p>
        <h2 className="mt-6 text-lg">Jerusalem travel vouchers</h2>
        <p>
          When you order a travel voucher for Jerusalem – Yitzhak Navon station, your phone number, the verification code and the
          trip details (train number, date, stations and number of passengers) are sent directly from your device to Israel
          Railways, and don't pass through our servers. Israel Railways texts you the verification code and the voucher, and
          handles these details under its own privacy policy.
        </p>
        <p>
          The voucher and the last phone number you entered are saved on your device only, to show the voucher and prefill the
          number next time. The voucher is deleted from your device the next time you open the app, starting a day after the ride.
          Your phone number and verification code are not collected by PostHog or Sentry, and are hidden in session replays.
        </p>
        <p>
          When you view a route through Yitzhak Navon, the app checks with Israel Railways whether vouchers are left for the
          train. These requests contain no identifying information, except in the few minutes after you verify your phone number,
          when they include your Israel Railways sign-in details.
        </p>
        <h2 className="mt-6 text-lg">Where our data comes from</h2>
        <p>
          Train schedules and routes are calculated on our own servers, based on the Israeli Ministry of Transport's open public
          transport data (GTFS). Real-time information about delays, cancellations and platform changes comes from the Ministry of
          Transport's SIRI service.
        </p>
        <p>
          Searches you make in the app or on this website are sent only to our servers, and are not forwarded to Israel Railways
          (except for the voucher requests described above). These requests contain no identifying information, and we don't store
          them. On the website, your recent searches are kept only in your own browser.
        </p>
        <p className="text-[15px] text-dim">Last updated on October 16th, 2026</p>
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
      <h2 className="mt-6 text-lg">Better Rail Live</h2>
      <p>באפליקציה ניתן לקבל עדכונים חיים על נסיעה ספציפית ברכבת.</p>
      <p>
        כדי שתכונה זו תפעל, אנו שומרים את פרטי הנסיעה במהלך הנסיעה בצורה אנונימית. אנו גם מאחסנים לוגים של השרת כדי לעזור לנו
        לזהות ולפתור בעיות.
      </p>
      <h2 className="mt-6 text-lg">שוברי נסיעה לירושלים</h2>
      <p>
        בהזמנת שובר נסיעה לתחנת ירושלים – יצחק נבון, מספר הטלפון, קוד האימות ופרטי הנסיעה (מספר הרכבת, התאריך, התחנות ומספר
        הנוסעים) נשלחים ישירות מהמכשיר שלך לרכבת ישראל, ואינם עוברים דרך השרתים שלנו. רכבת ישראל שולחת את קוד האימות ואת השובר
        ב-SMS, ומעבדת את הפרטים בהתאם למדיניות הפרטיות שלה.
      </p>
      <p>
        השובר ומספר הטלפון האחרון שהזנת נשמרים במכשיר שלך בלבד, כדי להציג את השובר ולמלא את המספר מראש בפעם הבאה. השובר נמחק
        מהמכשיר בפתיחה הבאה של האפליקציה, החל מיום לאחר הנסיעה. מספר הטלפון וקוד האימות אינם נאספים ב-PostHog וב-Sentry, ומוסתרים
        בהקלטות המסך.
      </p>
      <p>
        בצפייה במסלול שעובר בתחנת יצחק נבון, האפליקציה בודקת מול רכבת ישראל אם נותרו שוברים לרכבת. בקשות אלה אינן כוללות מידע
        מזהה, למעט בדקות שלאחר אימות מספר הטלפון, שבהן הן כוללות את פרטי ההתחברות שלך לרכבת ישראל.
      </p>
      <h2 className="mt-6 text-lg">מקורות המידע</h2>
      <p>
        לוחות הזמנים ומסלולי הנסיעה מחושבים בשרתים שלנו, על בסיס נתוני התחבורה הציבורית הפתוחים (GTFS) של משרד התחבורה. מידע על
        עיכובים, ביטולים ושינויי רציף מתקבל בזמן אמת משירות ה-SIRI של משרד התחבורה.
      </p>
      <p>
        החיפושים באפליקציה ובאתר נשלחים לשרתים שלנו בלבד, ואינם מועברים לרכבת ישראל (למעט בקשות השוברים שתוארו למעלה). בקשות
        החיפוש אינן כוללות מידע מזהה, ואיננו שומרים אותן. באתר, החיפושים האחרונים נשמרים בדפדפן שלכם בלבד.
      </p>
      <p className="text-[15px] text-dim">עודכן לאחרונה ב-16 באוקטובר 2026</p>
    </ContentPage>
  )
}
