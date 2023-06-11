import { useState, useEffect, useMemo } from "react"
import * as storage from "../utils/storage"

type Station = {
  id: string
  hebrew: string
  english: string
  russian: string
  arabic: string
  image?: any
  blurhash?: string
  alias?: string[]
}

export type NormalizedStation = {
  id: string
  name: string
  image?: any
  hebrew: string
  alias: string[]
}

const stations: Station[] = [
  {
    id: "3700",
    hebrew: "תל אביב - סבידור מרכז",
    english: "Tel Aviv - Savidor Center",
    russian: "Тель-Авив - Мерказ - Центральная",
    arabic: "تل ابيب – ساڤيدور المركز",
    image: require("../../assets/station-images/tlv-center.jpg"),
  },
  {
    id: "3500",
    hebrew: "הרצליה",
    english: "Herzliya",
    russian: "Герцлия",
    arabic: "هرتسليا",
    image: require("../../assets/station-images/herzeliya.jpeg"),
  },
  {
    id: "3400",
    hebrew: "בית יהושע",
    english: "Bet Yehoshu'a",
    russian: "Бейт-Иегошуа ",
    arabic: "بيت يهوشوع",
    image: require("../../assets/station-images/bet-yehoshua.jpeg"),
  },
  {
    id: "3300",
    hebrew: "נתניה",
    english: "Netanya",
    russian: "Нетания",
    arabic: "نتانيا",
    image: require("../../assets/station-images/netanya.jpg"),
  },
  {
    id: "3100",
    hebrew: "חדרה - מערב",
    english: "Hadera - West",
    russian: "Хадера - Маарав",
    arabic: "الخضيرة - غرب  ",
    image: require("../../assets/station-images/hadera-west.jpg"),
  },
  {
    id: "2800",
    hebrew: "בנימינה",
    english: "Binyamina",
    russian: "Биньямина",
    arabic: "بنيامينا",
    image: require("../../assets/station-images/binyamina.jpg"),
  },
  {
    id: "2820",
    hebrew: "קיסריה - פרדס חנה",
    english: "Caesarea-Pardes Hana",
    russian: "Кейсария - Пардес-Хана",
    arabic: "قيساريا - بارديس حنا",
    image: require("../../assets/station-images/caesarea.jpg"),
  },
  {
    id: "2500",
    hebrew: "עתלית",
    english: "Atlit",
    russian: "Атлит",
    arabic: "عتليت",
    image: require("../../assets/station-images/atlit.jpeg"),
  },
  {
    id: "2200",
    hebrew: "חיפה - בת גלים",
    english: "Haifa - Bat Galim",
    russian: "Хайфа - Бат-Галим",
    arabic: "حيفا - بات چاليم",
    image: require("../../assets/station-images/bat-galim.jpg"),
  },
  {
    id: "1300",
    hebrew: "חוצות המפרץ",
    english: "Hutzot HaMifratz",
    russian: "Хоцот ха-Мифрац ",
    arabic: "حوتسوت همفراتس",
    image: require("../../assets/station-images/hotzot-hamifratz.jpeg"),
  },
  {
    id: "700",
    hebrew: "קריית חיים",
    english: "Kiryat Hayim",
    russian: "Кирьят-Хаим",
    arabic: "كريات حاييم",
    image: require("../../assets/station-images/kiryat-haim.jpg"),
  },
  {
    id: "1400",
    hebrew: "קריית מוצקין",
    english: "Kiryat Motzkin",
    russian: "Кирьят-Моцкин",
    arabic: "كريات موتسكين",
    image: require("../../assets/station-images/kiryat-motzkin.jpeg"),
  },
  {
    id: "1500",
    hebrew: "עכו",
    english: "Ako",
    russian: "Акко ",
    arabic: "عكا",
    image: require("../../assets/station-images/ako.jpeg"),
  },
  {
    id: "2300",
    hebrew: "חיפה - חוף הכרמל",
    english: "Haifa - Hof HaKarmel",
    russian: "Хайфа Хоф ха - Кармель",
    arabic: "حيفا - شاطئ الكرمل",
    image: require("../../assets/station-images/hof-hakarmel.jpg"),
  },
  {
    id: "8700",
    hebrew: "כפר סבא - נורדאו",
    english: "Kfar Sava - Nordau",
    russian: "Кфар-Саба – Нордау",
    arabic: "كفار سابا - نورداو",
    image: require("../../assets/station-images/kfar-saba.jpg"),
  },
  {
    id: "1600",
    hebrew: "נהריה",
    english: "Nahariya",
    russian: "Нагария",
    arabic: "نهاريا",
    image: require("../../assets/station-images/nahariya.jpg"),
  },
  {
    id: "6300",
    hebrew: "בית שמש",
    english: "Bet Shemesh",
    russian: "Бейт Шемеш",
    arabic: "بيت شيمش",
    image: require("../../assets/station-images/beit-shemesh.jpg"),
  },
  {
    id: "7000",
    hebrew: "קריית גת",
    english: "Kiryat Gat",
    russian: "Кирьят-Гат ",
    arabic: "كريات چات",
    image: require("../../assets/station-images/kiryat-gat.jpg"),
  },
  {
    id: "5000",
    hebrew: "לוד",
    english: "Lod",
    russian: "Лод",
    arabic: "اللد",
    image: require("../../assets/station-images/lod.jpg"),
  },
  {
    id: "7300",
    hebrew: "באר שבע - צפון/אוניברסיטה",
    english: "Be'er Sheva - North/University",
    russian: "Беер - Шева Цафон",
    arabic: "بئر السبع - شمال/الجامعة",
    image: require("../../assets/station-images/beer-sheva-university.jpg"),
  },
  {
    id: "4800",
    hebrew: 'כפר חב"ד',
    english: "Kfar Habad",
    russian: "Кфар ХАБАД",
    arabic: "كفار حباد",
    image: require("../../assets/station-images/kfar-habad.jpg"),
  },
  {
    id: "4600",
    hebrew: "תל אביב - השלום",
    english: "Tel Aviv - HaShalom",
    russian: "Тель-Авив - ха-Шалом",
    arabic: "تل أبيب - السلام",
    image: require("../../assets/station-images/tlv-hashalom.jpg"),
  },
  {
    id: "2100",
    hebrew: "חיפה - מרכז השמונה",
    english: "Haifa Center - HaShmona",
    russian: "Хайфа - Мерказ - Центральная",
    arabic: "حيفا المركز - هشمونا",
    image: require("../../assets/station-images/hashmona.jpg"),
  },
  {
    id: "5010",
    hebrew: "רמלה",
    english: "Ramla",
    russian: "Рамле",
    arabic: "الرملة",
    image: require("../../assets/station-images/ramla.jpg"),
  },
  {
    id: "8800",
    hebrew: "ראש העין - צפון",
    english: "Rosh Ha'Ayin - North",
    russian: "Рош ха - Айн Цафон",
    arabic: "روش هعاين - شمال",
    image: require("../../assets/station-images/rosh-haayin.jpg"),
  },
  {
    id: "5300",
    hebrew: "באר יעקב",
    english: "Be'er Ya'akov",
    russian: "Беер-Яаков",
    arabic: "بئير يعكوف",
    image: require("../../assets/station-images/beer-yaakov.jpg"),
  },
  {
    id: "5200",
    hebrew: "רחובות",
    english: "Rehovot",
    russian: "Реховот",
    arabic: "رحوڤوت",
    image: require("../../assets/station-images/rehovot.jpg"),
  },
  {
    id: "5410",
    hebrew: "יבנה מזרח",
    english: "Yavne - East",
    russian: "Явне - Восток",
    arabic: "ياڤنه - شرق",
    image: require("../../assets/station-images/yavne-east.jpg"),
  },
  {
    id: "9100",
    hebrew: "ראשון לציון - הראשונים",
    english: "Rishon LeTsiyon - HaRishonim",
    russian: "Ришон ле-Цион - Ха-Ришоним ",
    arabic: "ريشون لتسيون - هريشونيم",
  },
  {
    id: "5800",
    hebrew: "אשדוד עד הלום",
    english: "Ashdod - Ad Halom",
    russian: "Ашдод - ад-Халом",
    arabic: "أشدود - عاد هلوم",
    image: require("../../assets/station-images/ashdod.jpg"),
  },
  {
    id: "4250",
    hebrew: "פתח תקווה - סגולה",
    english: "Petah Tikva - Segula",
    russian: "Петах-Тиква - Сгула",
    arabic: "بيتح تكڤا - سچوله",
    image: require("../../assets/station-images/petah-tikva-segula.jpeg"),
  },
  {
    id: "4100",
    hebrew: "בני ברק",
    english: "Bnei Brak",
    russian: "Бней-Брак",
    arabic: "بني براك",
    image: require("../../assets/station-images/bnei-brak.jpg"),
  },
  {
    id: "3600",
    hebrew: "תל אביב - אוניברסיטה",
    english: "Tel Aviv - University",
    russian: "Тель-Авив - Университет",
    arabic: "تل أبيب - الجامعة",
    image: require("../../assets/station-images/tlv-university.jpg"),
  },
  {
    id: "7320",
    hebrew: "באר שבע - מרכז",
    english: "Be'er Sheva - Center",
    russian: "Беер - Шева Мерказ",
    arabic: "بئر السبع - المركز",
    image: require("../../assets/station-images/beer-sheva-center.jpg"),
  },
  {
    id: "1220",
    hebrew: "מרכזית המפרץ (לב המפרץ)",
    english: "HaMifrats Central Station",
    russian: "Центральная станция Ха-Мифрац",
    arabic: "همفراتس المركزية",
    image: require("../../assets/station-images/hamifrats.jpg"),
  },
  {
    id: "4900",
    hebrew: "תל אביב - ההגנה",
    english: "Tel Aviv - HaHagana",
    russian: "Тель-Авив - ха-Хагана ",
    arabic: "تل أبيب - ههچناه",
    image: require("../../assets/station-images/tlv-hagana.jpg"),
  },
  {
    id: "8600",
    hebrew: "נמל תעופה בן גוריון",
    english: "Ben Gurion Airport",
    russian: "Бен-Гурион Аэропорт",
    arabic: "مطار بن چوريون",
    image: require("../../assets/station-images/ben-gurion.jpg"),
    alias: ["נתבג"],
  },
  // {
  //   id: "6700",
  //   hebrew: "ירושלים - מלחה",
  //   english: "Jerusalem - Malha",
  //   russian: "Иерусалим - Малха",
  //   arabic: "القدس - المالحه",
  //   image: require("../../assets/station-images/malha.jpg"),
  // },
  {
    id: "5900",
    hebrew: "אשקלון",
    english: "Ashkelon",
    russian: "Ашкелон ",
    arabic: "أشكلون",
    image: require("../../assets/station-images/ashkelon.jpg"),
  },
  {
    id: "7500",
    hebrew: "דימונה",
    english: "Dimona",
    russian: "Димона",
    arabic: "ديمونا",
    image: require("../../assets/station-images/dimona.jpg"),
  },
  {
    id: "9200",
    hebrew: "הוד השרון - סוקולוב",
    english: "Hod HaSharon - Sokolov",
    russian: "Ход Хашарон - Соколов",
    arabic: "هود هشارون - سوكولوڤ",
    image: require("../../assets/station-images/hod-hasharon-sokolov.jpg"),
  },
  {
    id: "4170",
    hebrew: "פתח תקווה  - קריית אריה",
    english: "Petah Tikva - Kiryat Arye",
    russian: "Петах Тиква – Кирьят Арье",
    arabic: "بيتح تكڤا - كريات أريه",
    image: require("../../assets/station-images/kiryat-arye.jpg"),
  },
  {
    id: "5150",
    hebrew: "לוד גני אביב",
    english: "Lod - Gane Aviv",
    russian: "Лод - Ганей Авив",
    arabic: "اللد - چاني أڤيڤ",
    image: require("../../assets/station-images/lod-gane-aviv.jpg"),
  },
  {
    id: "8550",
    hebrew: "להבים - רהט",
    english: "Lehavim - Rahat",
    russian: "Леавим - Рахат",
    arabic: "لهاڤيم - رهط",
    image: require("../../assets/station-images/lehavim.jpg"),
  },
  {
    id: "300",
    hebrew: "פאתי מודיעין",
    english: "Pa'ate Modi'in",
    russian: "Патей Модиин",
    arabic: "بأتي موديعين",
    image: require("../../assets/station-images/paate-modiin.jpg"),
  },
  {
    id: "400",
    hebrew: "מודיעין - מרכז",
    english: "Modi'in - Center",
    russian: "Модиин центр ",
    arabic: "موديعين - المركز",
    image: require("../../assets/station-images/modiin-center.jpg"),
  },
  {
    id: "4640",
    hebrew: "צומת חולון",
    english: "Holon Junction",
    russian: "Холон - Развязка Холон",
    arabic: "مفترق حولون",
    image: require("../../assets/station-images/holon-junction.jpeg"),
  },
  {
    id: "4660",
    hebrew: "חולון - וולפסון",
    english: "Holon - Wolfson",
    russian: "Холон - Вольфсон",
    arabic: "حولون - ڤولفسون",
    image: require("../../assets/station-images/holon-wolfson.jpg"),
  },
  {
    id: "4680",
    hebrew: "בת ים - יוספטל",
    english: "Bat Yam - Yoseftal",
    russian: "Бат Ям - Йосеф Таль",
    arabic: "بات يام - يوسفطال",
    image: require("../../assets/station-images/bat-yam-yoseftal.jpg"),
  },
  {
    id: "4690",
    hebrew: "בת ים - קוממיות",
    english: "Bat Yam - Komemiyut",
    russian: "Бат Ям - Комемуют",
    arabic: "بات يام - كوميميوت",
    image: require("../../assets/station-images/bat-yam-komemiyut.jpg"),
  },
  {
    id: "9800",
    hebrew: "ראשון לציון - משה דיין",
    english: "Rishon LeTsiyon - Moshe Dayan",
    russian: "Ришон-Ле-Цион станция им. Моше Даяна",
    arabic: "ريشون لتسيون -موشي ديان",
    image: require("../../assets/station-images/rishon-moshe-dayan.jpg"),
  },
  {
    id: "9000",
    hebrew: "יבנה מערב",
    english: "Yavne - West",
    russian: "Явне-Запад",
    arabic: "ياڤني - غرب",
    image: require("../../assets/station-images/yavne-west.jpg"),
  },
  {
    id: "9600",
    hebrew: "שדרות",
    english: "Sderot",
    russian: "Сдерот",
    arabic: "سديروت",
    image: require("../../assets/station-images/sderot.jpg"),
  },
  {
    id: "9650",
    hebrew: "נתיבות",
    english: "Netivot",
    russian: "Нетивот",
    arabic: "نتيفوت",
    image: require("../../assets/station-images/netivot.jpg"),
  },
  {
    id: "9700",
    hebrew: "אופקים",
    english: "Ofakim",
    russian: "Офаким",
    arabic: "أوفاكيم",
    image: require("../../assets/station-images/ofakim.jpg"),
  },
  {
    id: "3310",
    hebrew: "נתניה - ספיר",
    english: "Netanya - Sapir",
    russian: "Нетания – Сапир",
    arabic: "نتانيا - سبير",
    image: require("../../assets/station-images/netanya-sapir.jpeg"),
  },
  {
    id: "1240",
    hebrew: "יקנעם - כפר יהושע",
    english: "Yokne'am - Kfar Yehoshu'a",
    russian: "Йокнеам – Кфар-Иегошуа",
    arabic: "يوكنعام – كفار يهوشوع",
    image: require("../../assets/station-images/yokneam.jpg"),
  },
  {
    id: "1250",
    hebrew: "מגדל העמק - כפר ברוך",
    english: "Migdal Ha'emek - Kfar Barukh",
    russian: "Мигдаль-Ха-Эмек – Кфар Барух",
    arabic: "مجدال هعيمك – كفار باروخ",
    image: require("../../assets/station-images/migdal-haeemek.jpg"),
  },
  {
    id: "1260",
    hebrew: "עפולה ר. איתן",
    english: "Afula R.Eitan",
    russian: "Афула Р. Эйтан",
    arabic: "العفولة  ر. ايتان",
    image: require("../../assets/station-images/afula.jpg"),
  },
  {
    id: "1280",
    hebrew: "בית שאן",
    english: "Beit She'an",
    russian: "Бейт Шеан",
    arabic: "بيت شآن",
    image: require("../../assets/station-images/beit-shean.jpg"),
  },
  {
    id: "1820",
    hebrew: "אחיהוד",
    english: "Ahihud",
    russian: "Ахихуд",
    arabic: "احيهود",
    image: require("../../assets/station-images/ahihud.jpeg"),
  },
  {
    id: "1840",
    hebrew: "כרמיאל",
    english: "Karmiel",
    russian: "Кармиэль",
    arabic: "كرميئيل",
    image: require("../../assets/station-images/karmiel.jpg"),
  },
  {
    id: "2940",
    hebrew: "רעננה מערב",
    english: "Ra'anana West",
    russian: "Раанана-Вест",
    arabic: "رعنانا – غرب",
    image: require("../../assets/station-images/raanana-west.jpeg"),
  },
  {
    id: "2960",
    hebrew: "רעננה דרום",
    english: "Ra'anana South",
    russian: "Раанана Южный",
    arabic: "رعنانا الجنوبية",
    image: require("../../assets/station-images/raanana-south.jpeg"),
  },
  {
    id: "6150",
    hebrew: "קריית מלאכי - יואב",
    english: "Kiryat Malakhi – Yoav",
    russian: "Кирьят Малахи-Йоав",
    arabic: "كريات ملاخي – يوآڤ",
    image: require("../../assets/station-images/kiryat-malachi.jpg"),
  },
  {
    id: "680",
    hebrew: "ירושלים - יצחק נבון",
    english: "Jerusalem - Yitzhak Navon",
    russian: "Иерусалим - Ицхак Навон",
    arabic: "أورشليم – يتسحاق ناڤون",
    image: require("../../assets/station-images/jerusalem-itzhak-navon.jpg"),
    blurhash: "9KGSDi?w",
  },
  {
    id: "6900",
    hebrew: "מזכרת בתיה",
    english: "Mazkeret Batya",
    russian: "Мазкерет Батья",
    arabic: "مزكيرت باتيا",
    image: require("../../assets/station-images/mazkeret-batya.jpg"),
  },
]

type StationsObjectType = {
  [key: string]: {
    id: string
    hebrew: string
    english: string
    russian: string
    arabic: string
    image?: undefined
    blurhash?: string
  }
}

export let stationLocale = "hebrew"

export const stationsObject: StationsObjectType = {}

stations.forEach((station) => {
  stationsObject[station.id] = station
})

export const useStations = () => {
  const [locale, setLocale] = useState("hebrew")

  useEffect(() => {
    storage.load("appLanguage").then((languageCode) => {
      if (languageCode === "ar") {
        stationLocale = "arabic"
        setLocale("arabic")
      } else if (languageCode === "en") {
        stationLocale = "english"
        setLocale("english")
      } else if (languageCode === "ru") {
        stationLocale = "russian"
        setLocale("russian")
      }
    })
  }, [])

  const normalizeStationNames: NormalizedStation[] = useMemo(() => {
    return stations
      .map((station) => ({
        id: station.id,
        name: station[locale],
        image: station.image,
        hebrew: station.hebrew,
        alias: station.alias,
      }))
      .sort((a, b) => a.name.toLowerCase() > b.name.toLowerCase())
  }, [locale])

  return normalizeStationNames
}
