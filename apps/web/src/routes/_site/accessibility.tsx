import { createFileRoute } from "@tanstack/react-router"
import { ContentPage } from "@/components/content-page"
import { FEEDBACK_EMAIL, pageHead, cacheHeaders } from "@/lib/seo"

export const Route = createFileRoute("/_site/accessibility")({
  head: () =>
    pageHead({
      locale: "he",
      localized: false,
      path: "/accessibility",
      title: "Better Rail - הצהרת נגישות",
      description: "הצהרת הנגישות של אתר בטר רייל: התאמות הנגישות באתר, הסתייגויות ופרטי הקשר של רכז הנגישות.",
    }),
  headers: () => cacheHeaders(3600, 86400),
  component: AccessibilityPage,
})

function AccessibilityPage() {
  return (
    <ContentPage title="הצהרת נגישות">
      <p className="site-page-content-text">
        אנו פועלים כדי שבטר רייל יהיה נגיש לכולם. האתר הונגש לפי תקנה 35 לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות
        לשירות), התשע"ג-2013, ולפי ת"י 5568 ברמה AA, למעט החריגים המפורטים בהמשך.
      </p>

      <h2 className="site-page-content-subtitle">מה הונגש</h2>
      <ul>
        <li className="site-page-content-text">ניווט מלא במקלדת, סימון פוקוס בולט וקישור "דלג לתוכן".</li>
        <li className="site-page-content-text">תמיכה בקוראי מסך, כולל הקראה של תוצאות החיפוש, עיכובים, ביטולים ושינויי רציף.</li>
        <li className="site-page-content-text">ניגודיות צבעים לפי התקן במצב בהיר וכהה, והגדלת תצוגה ללא אובדן תוכן.</li>
        <li className="site-page-content-text">הפחתת אנימציות כשההגדרה "הפחתת תנועה" פעילה במכשיר.</li>
      </ul>

      <h2 className="site-page-content-subtitle">הסתייגויות</h2>
      <p className="site-page-content-text">
        קובצי PDF סרוקים שהתקבלו מגורמים חיצוניים, ואתרים חיצוניים שאנו מקשרים אליהם, עשויים שלא להיות נגישים במלואם.
      </p>

      <h2 className="site-page-content-subtitle">הסדרי נגישות פיזיים</h2>
      <p className="site-page-content-text">
        בטר רייל היא שירות דיגיטלי ואינה מקבלת קהל. לנגישות בתחנות וברכבות יש לפנות לרכבת ישראל.
      </p>

      <h2 className="site-page-content-subtitle">רכז הנגישות</h2>
      <p className="site-page-content-text">נתקלתם בבעיית נגישות? נשמח לשמוע ולתקן.</p>
      <p className="site-page-content-text business-details">
        שם: גיא טפר
        <br />
        טלפון: <span dir="ltr">055-507-8020</span>
        <br />
        דוא"ל: <a href={`mailto:${FEEDBACK_EMAIL}?subject=נגישות`}>{FEEDBACK_EMAIL}</a>
      </p>

      <p className="site-page-content-last-updated">עודכן לאחרונה ב-18 באוקטובר 2026</p>
    </ContentPage>
  )
}
