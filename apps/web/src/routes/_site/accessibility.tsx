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
        אנו בבטר רייל רואים חשיבות רבה בכך שכל אחד ואחת יוכלו לתכנן את הנסיעה ברכבת בקלות, ופועלים כדי שהאתר יהיה נגיש גם לאנשים
        עם מוגבלות.
      </p>
      <p className="site-page-content-text">
        התאמות הנגישות באתר נעשו לפי תקנה 35 לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג-2013, ולפי תקן
        ישראלי ת"י 5568 המבוסס על הנחיות WCAG 2.0 ברמה AA. האתר עומד ברמה AA, למעט החריגים המפורטים בהמשך.
      </p>

      <h2 className="site-page-content-subtitle">התאמות הנגישות באתר</h2>
      <ul>
        <li className="site-page-content-text">
          ניווט מלא באמצעות המקלדת, כולל בחירת תחנות, לוח השנה ובחירת השעה, וקישור "דלג לתוכן" בראש כל עמוד.
        </li>
        <li className="site-page-content-text">סימון בולט של הרכיב שעליו נמצא הפוקוס.</li>
        <li className="site-page-content-text">
          תמיכה בקוראי מסך: מבנה כותרות ואזורים, תיאור לכפתורים ולתמונות, והקראה של תוצאות החיפוש, עיכובים, ביטולים ושינויי רציף.
        </li>
        <li className="site-page-content-text">ניגודיות צבעים לפי דרישות התקן, במצב בהיר ובמצב כהה.</li>
        <li className="site-page-content-text">אפשרות להגדיל את התצוגה בדפדפן ללא אובדן תוכן או פונקציונליות.</li>
        <li className="site-page-content-text">הפחתת אנימציות כשההגדרה "הפחתת תנועה" פעילה במערכת ההפעלה.</li>
        <li className="site-page-content-text">שפת העמוד וכיוון הטקסט מוגדרים בהתאם לעברית או לאנגלית.</li>
      </ul>

      <h2 className="site-page-content-subtitle">הסתייגויות</h2>
      <p className="site-page-content-text">למרות מאמצינו, ייתכן שיתגלו באתר רכיבים שאינם נגישים במלואם. בין היתר:</p>
      <ul>
        <li className="site-page-content-text">
          מסמכים שהתקבלו מגורמים חיצוניים ומוצגים כפי שהם (כגון קובצי PDF סרוקים) אינם נגישים במלואם.
        </li>
        <li className="site-page-content-text">קישורים לאתרים חיצוניים, כמו חנויות האפליקציות, אינם באחריותנו.</li>
      </ul>
      <p className="site-page-content-text">
        אנו ממשיכים לשפר את נגישות האתר. אם נתקלתם בבעיה, נשמח שתספרו לנו כדי שנוכל לתקן אותה.
      </p>

      <h2 className="site-page-content-subtitle">הסדרי נגישות פיזיים</h2>
      <p className="site-page-content-text">
        בטר רייל היא שירות דיגיטלי בלבד, ואינה מפעילה מקום ציבורי או מקבלת קהל. לנגישות בתחנות וברכבות יש לפנות לרכבת ישראל.
      </p>

      <h2 className="site-page-content-subtitle">רכז הנגישות ופניות בנושא נגישות</h2>
      <p className="site-page-content-text business-details">
        שם: גיא טפר
        <br />
        טלפון: <span dir="ltr">055-507-8020</span>
        <br />
        דוא"ל: <a href={`mailto:${FEEDBACK_EMAIL}?subject=נגישות`}>{FEEDBACK_EMAIL}</a>
        <br />
        כתובת: חולות גאולים 8, צורן
      </p>
      <p className="site-page-content-text">
        כדי שנוכל לטפל בפנייה, נשמח לקבל תיאור של הבעיה, את כתובת העמוד שבו נתקלתם בה, ואת סוג הדפדפן והטכנולוגיה המסייעת שבהם
        השתמשתם.
      </p>

      <p className="site-page-content-last-updated">עודכן לאחרונה ב-18 באוקטובר 2026</p>
    </ContentPage>
  )
}
