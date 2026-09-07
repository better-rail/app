import { createFileRoute } from "@tanstack/react-router"
import { ContentPage } from "@/components/content-page"
import { pageHead, cacheHeaders } from "@/lib/seo"

const photographers: Array<[string, string]> = [
  [
    "איל שדליסקר",
    "תחנות תל אביב ההגנה, השלום, מרכז, אוניברסיטה, הרצליה, בית יהושוע, נתניה - ספיר, רעננה מערב ודרום, כפר סבא נורדאו, קיסריה, עתלית, חוצות המפרץ, קריית מוצקין, עכו",
  ],
  ["איתן שינברג", "תחנת מרכזית המפרץ, חיפה מרכז השמונה, פתח תקווה קריית אריה, עפולה ובית שאן"],
  ["נעם לוי", "תחנת צומת חולון, פתח תקווה סגולה ובת ים קוממיות"],
  ["יוגב לוי", "תחנת ראש העין צפון"],
  ["דנה טפר", "תחנת יבנה מערב"],
  ["אבישג אברמוביץ", "תחנת באר שבע אוניברסיטה וחיפה בת גלים"],
  ["ריזל אדלר", "תחנת לוד"],
  ["עדו וייס", "תחנת שדרות ומודיעין מרכז"],
  ["גיא אלון", "תחנת חיפה חוף הכרמל"],
  ["ניתאי שפר", "תחנת אחיהוד"],
  ["גבריאל ליין", "תחנת בת ים יוספטל"],
  ["נדב כהן", "תחנת נהריה ופאתי מודיעין"],
  ["מתן משרקי", "תחנת חדרה מערב"],
  ["ליאור יחזקאלי", "תחנת יקנעם כפר יהושוע"],
  ["עומר וולוך", "תחנת בנימינה"],
  ["אפי רוזנבלום", "תחנת כפר חב״ד"],
  ["אוהד שלו", "תחנת קריית גת"],
  ["גיא זומר", "תחנת רמלה ורחובות"],
  ["איתי דוד", "תחנת קריית חיים"],
  ["טל קסלר", "תחנת דימונה ויבנה מזרח"],
  ["ויטו חסן", "תחנת אשקלון"],
  ["מיכל וייס", "תחנת להבים"],
  ["נתנאל אביעד", "תחנת טייבה שומרון"],
]

const CC4 = "https://creativecommons.org/licenses/by-sa/4.0/deed.en"
const CC3 = "https://creativecommons.org/licenses/by-sa/3.0/deed.en"

export const Route = createFileRoute("/_site/image-attributions")({
  head: () =>
    pageHead({
      locale: "he",
      localized: false,
      path: "/image-attributions",
      title: "Better Rail - קרדיט תמונות",
      description: "קרדיט לצלמים שתרמו את תמונות תחנות הרכבת המופיעות באפליקציית ובאתר בטר רייל.",
    }),
  headers: () => cacheHeaders(3600, 86400),
  component: () => (
    <ContentPage title="צלמי Better Rail">
      <p>התמונות של תחנות הרכבת ב-Better Rail צולמו על ידי משתמשי האפליקצייה, וכאן המקום להגיד להם תודה:</p>
      <ul>
        {photographers.map(([name, credit]) => (
          <li key={name}>
            <b>{name}</b> - {credit}
          </li>
        ))}
      </ul>
      <div className="mb-6 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-[16px]" role="note">
        מצאתם תחנה עם תמונה חסרה? נשמח אם תוכלו לעזור ולצלם את התחנה מבחוץ, כך שניתן לזהות את מבנה התחנה. תמונות אפשר לשלוח למייל{" "}
        <a href="mailto:feedback@better-rail.co.il?subject=תמונת תחנה" dir="ltr">
          feedback@better-rail.co.il
        </a>
      </div>
      <h3>תמונות מוויקיפדיה</h3>
      <p>תמונות התחנות הבאות צולמו על ידי משתמשי וויקיפדיה:</p>
      <ul>
        <li>מיכאל יעקובסון - תחנת מגדל העמק וראשון לציון משה דיין</li>
        <li>Ori~ - אשדוד עד הלום</li>
        <li>Avi1111 - תחנת מזכרת בתיה</li>
        <li>
          The devious diesel - תחנת אופקים ונתיבות תחת רשיון <a href={CC4}>CC BY-SA 4.0</a>
        </li>
        <li>
          Little Savage - תחנת בני ברק תחת רשיון <a href={CC3}>CC BY-SA 3.0</a>
        </li>
        <li>
          פארוק - תחנת ירושלים יצחק נבון תחת רשיון <a href={CC4}>CC BY-SA 4.0</a>
        </li>
        <li>
          Itaygur - תחנת כרמיאל תחת רשיון <a href={CC4}>CC BY-SA 4.0</a>
        </li>
        <li>
          Golf Bravo - תחנת לוד תחת רשיון <a href={CC3}>CC BY-SA 4.0</a>
        </li>
        <li>
          McKaby - תחנת נתניה תחת רשיון <a href={CC3}>CC BY-SA 4.0</a>
        </li>
      </ul>
    </ContentPage>
  ),
})
