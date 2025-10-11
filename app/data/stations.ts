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
  latitude: number
  longitude: number
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
    latitude: 32.08388270045,
    longitude: 34.79832291313
  },
  {
    id: "3500",
    hebrew: "הרצליה",
    english: "Herzliya",
    russian: "Герцлия",
    arabic: "هرتسليا",
    image: require("../../assets/station-images/herzeliya.jpeg"),
    latitude: 32.16380406924,
    longitude: 34.81844813817
  },
  {
    id: "3400",
    hebrew: "בית יהושע",
    english: "Bet Yehoshu'a",
    russian: "Бейт-Иегошуа ",
    arabic: "بيت يهوشوع",
    image: require("../../assets/station-images/bet-yehoshua.jpeg"),
    latitude: 32.26248917052,
    longitude: 34.86011570409
  },
  {
    id: "3300",
    hebrew: "נתניה",
    english: "Netanya",
    russian: "Нетания",
    arabic: "نتانيا",
    image: require("../../assets/station-images/netanya.jpg"),
    latitude: 32.32003215041,
    longitude: 34.86924338281
  },
  {
    id: "3100",
    hebrew: "חדרה - מערב",
    english: "Hadera - West",
    russian: "Хадера - Маарав",
    arabic: "الخضيرة - غرب  ",
    image: require("../../assets/station-images/hadera-west.jpg"),
    latitude: 32.43822137986,
    longitude: 34.89936548112
  },
  {
    id: "2800",
    hebrew: "בנימינה",
    english: "Binyamina",
    russian: "Биньямина",
    arabic: "بنيامينا",
    image: require("../../assets/station-images/binyamina.jpg"),
    latitude: 32.51448467381,
    longitude: 34.94999134486
  },
  {
    id: "2820",
    hebrew: "קיסריה - פרדס חנה",
    english: "Caesarea-Pardes Hana",
    russian: "Кейсария - Пардес-Хана",
    arabic: "قيساريا - بارديس حنا",
    image: require("../../assets/station-images/caesarea.jpg"),
    latitude: 32.48536666871,
    longitude: 34.95406075501
  },
  {
    id: "2500",
    hebrew: "עתלית",
    english: "Atlit",
    russian: "Атлит",
    arabic: "عتليت",
    image: require("../../assets/station-images/atlit.jpeg"),
    latitude: 32.69289501237,
    longitude: 34.94043965172
  },
  {
    id: "2200",
    hebrew: "חיפה - בת גלים",
    english: "Haifa - Bat Galim",
    russian: "Хайфа - Бат-Галим",
    arabic: "حيفا - بات چاليم",
    image: require("../../assets/station-images/bat-galim.jpg"),
    latitude: 32.83061006503,
    longitude: 34.9818701356
  },
  {
    id: "1300",
    hebrew: "חוצות המפרץ",
    english: "Hutzot HaMifratz",
    russian: "Хоцот ха-Мифрац ",
    arabic: "حوتسوت همفراتس",
    image: require("../../assets/station-images/hotzot-hamifratz.jpeg"),
    latitude: 32.80943952762,
    longitude: 35.05452502097
  },
  {
    id: "700",
    hebrew: "קריית חיים",
    english: "Kiryat Hayim",
    russian: "Кирьят-Хаим",
    arabic: "كريات حاييم",
    image: require("../../assets/station-images/kiryat-haim.jpg"),
    latitude: 32.82487368182,
    longitude: 35.06429676857
  },
  {
    id: "1400",
    hebrew: "קריית מוצקין",
    english: "Kiryat Motzkin",
    russian: "Кирьят-Моцкин",
    arabic: "كريات موتسكين",
    image: require("../../assets/station-images/kiryat-motzkin.jpeg"),
    latitude: 32.83308121901,
    longitude: 35.06994744889
  },
  {
    id: "1500",
    hebrew: "עכו",
    english: "Ako",
    russian: "Акко ",
    arabic: "عكا",
    image: require("../../assets/station-images/ako.jpeg"),
    latitude: 32.92829345527,
    longitude: 35.08295983999
  },
  {
    id: "2300",
    hebrew: "חיפה - חוף הכרמל",
    english: "Haifa - Hof HaKarmel",
    russian: "Хайфа Хоф ха - Кармель",
    arabic: "حيفا - شاطئ الكرمل",
    image: require("../../assets/station-images/hof-hakarmel.jpg"),
    latitude: 32.79353924024,
    longitude: 34.95753144212
  },
  {
    id: "8700",
    hebrew: "כפר סבא - נורדאו",
    english: "Kfar Sava - Nordau",
    russian: "Кфар-Саба – Нордау",
    arabic: "كفار سابا - نورداو",
    image: require("../../assets/station-images/kfar-saba.jpg"),
    latitude: 32.16747612278,
    longitude: 34.91737665833
  },
  {
    id: "1600",
    hebrew: "נהריה",
    english: "Nahariya",
    russian: "Нагария",
    arabic: "نهاريا",
    image: require("../../assets/station-images/nahariya.jpg"),
    latitude: 33.00501672925,
    longitude: 35.09872242315
  },
  {
    id: "6300",
    hebrew: "בית שמש",
    english: "Bet Shemesh",
    russian: "Бейт Шемеш",
    arabic: "بيت شيمش",
    image: require("../../assets/station-images/beit-shemesh.jpg"),
    latitude: 31.75780776755,
    longitude: 34.98951853185
  },
  {
    id: "7000",
    hebrew: "קריית גת",
    english: "Kiryat Gat",
    russian: "Кирьят-Гат ",
    arabic: "كريات چات",
    image: require("../../assets/station-images/kiryat-gat.jpg"),
    latitude: 31.603481361,
    longitude: 34.77791873463
  },
  {
    id: "5000",
    hebrew: "לוד",
    english: "Lod",
    russian: "Лод",
    arabic: "اللد",
    image: require("../../assets/station-images/lod.jpg"),
    latitude: 31.94526773734,
    longitude: 34.87515829891
  },
  {
    id: "7300",
    hebrew: "באר שבע - צפון/אוניברסיטה",
    english: "Be'er Sheva - North/University",
    russian: "Беер - Шева Цафон",
    arabic: "بئر السبع - شمال/الجامعة",
    image: require("../../assets/station-images/beer-sheva-university.jpg"),
    latitude: 31.26202195846,
    longitude: 34.8092838076
  },
  {
    id: "4800",
    hebrew: 'כפר חב"ד',
    english: "Kfar Habad",
    russian: "Кфар ХАБАД",
    arabic: "كفار حباد",
    image: require("../../assets/station-images/kfar-habad.jpg"),
    latitude: 31.99319267447,
    longitude: 34.85301532275
  },
  {
    id: "4600",
    hebrew: "תל אביב - השלום",
    english: "Tel Aviv - HaShalom",
    russian: "Тель-Авив - ха-Шалом",
    arabic: "تل أبيب - السلام",
    image: require("../../assets/station-images/tlv-hashalom.jpg"),
    latitude: 32.07351575482,
    longitude: 34.79321156154
  },
  {
    id: "2100",
    hebrew: "חיפה - מרכז השמונה",
    english: "Haifa Center - HaShmona",
    russian: "Хайфа - Мерказ - Центральная",
    arabic: "حيفا المركز - هشمونا",
    image: require("../../assets/station-images/hashmona.jpg"),
    latitude: 32.82222905061,
    longitude: 34.99710279981
  },
  {
    id: "5010",
    hebrew: "רמלה",
    english: "Ramla",
    russian: "Рамле",
    arabic: "الرملة",
    image: require("../../assets/station-images/ramla.jpg"),
    latitude: 31.92883757817,
    longitude: 34.87725704175
  },
  {
    id: "8800",
    hebrew: "ראש העין - צפון",
    english: "Rosh Ha'Ayin - North",
    russian: "Рош ха - Айн Цафон",
    arabic: "روش هعاين - شمال",
    image: require("../../assets/station-images/rosh-haayin.jpg"),
    latitude: 32.12081396137,
    longitude: 34.93478740359
  },
  {
    id: "5300",
    hebrew: "באר יעקב",
    english: "Be'er Ya'akov",
    russian: "Беер-Яаков",
    arabic: "بئير يعكوف",
    image: require("../../assets/station-images/beer-yaakov.jpg"),
    latitude: 31.93291329141,
    longitude: 34.82861680091
  },
  {
    id: "5200",
    hebrew: "רחובות",
    english: "Rehovot",
    russian: "Реховот",
    arabic: "رحوڤوت",
    image: require("../../assets/station-images/rehovot.jpg"),
    latitude: 31.90864822061,
    longitude: 34.80640456905
  },
  {
    id: "5410",
    hebrew: "יבנה מזרח",
    english: "Yavne - East",
    russian: "Явне - Восток",
    arabic: "ياڤنه - شرق",
    image: require("../../assets/station-images/yavne-east.jpg"),
    latitude: 31.86185991981,
    longitude: 34.74409499704
  },
  {
    id: "9100",
    hebrew: "ראשון לציון - הראשונים",
    english: "Rishon LeTsiyon - HaRishonim",
    russian: "Ришон ле-Цион - Ха-Ришоним ",
    arabic: "ريشون لتسيون - هريشونيم",
    latitude: 31.9489470222,
    longitude: 34.80267690316
  },
  {
    id: "5800",
    hebrew: "אשדוד עד הלום",
    english: "Ashdod - Ad Halom",
    russian: "Ашдод - ад-Халом",
    arabic: "أشدود - عاد هلوم",
    image: require("../../assets/station-images/ashdod.jpg"),
    latitude: 31.77401405581,
    longitude: 34.66607185533
  },
  {
    id: "4250",
    hebrew: "פתח תקווה - סגולה",
    english: "Petah Tikva - Segula",
    russian: "Петах-Тиква - Сгула",
    arabic: "بيتح تكڤا - سچوله",
    image: require("../../assets/station-images/petah-tikva-segula.jpeg"),
    latitude: 32.11206460163,
    longitude: 34.90129705967
  },
  {
    id: "4100",
    hebrew: "בני ברק",
    english: "Bnei Brak",
    russian: "Бней-Брак",
    arabic: "بني براك",
    image: require("../../assets/station-images/bnei-brak.jpg"),
    latitude: 32.1030988621,
    longitude: 34.83014376164
  },
  {
    id: "3600",
    hebrew: "תל אביב - אוניברסיטה",
    english: "Tel Aviv - University",
    russian: "Тель-Авив - Университет",
    arabic: "تل أبيب - الجامعة",
    image: require("../../assets/station-images/tlv-university.jpg"),
    latitude: 32.10366118606,
    longitude: 34.80461316395
  },
  {
    id: "7320",
    hebrew: "באר שבע - מרכז",
    english: "Be'er Sheva - Center",
    russian: "Беер - Шева Мерказ",
    arabic: "بئر السبع - المركز",
    image: require("../../assets/station-images/beer-sheva-center.jpg"),
    latitude: 31.24328539379,
    longitude: 34.79839533036
  },
  {
    id: "1220",
    hebrew: "מרכזית המפרץ (לב המפרץ)",
    english: "HaMifrats Central Station",
    russian: "Центральная станция Ха-Мифрац",
    arabic: "همفراتس المركزية",
    image: require("../../assets/station-images/hamifrats.jpg"),
    latitude: 32.79389180941,
    longitude: 35.03715200939
  },
  {
    id: "4900",
    hebrew: "תל אביב - ההגנה",
    english: "Tel Aviv - HaHagana",
    russian: "Тель-Авив - ха-Хагана ",
    arabic: "تل أبيب - ههچناه",
    image: require("../../assets/station-images/tlv-hagana.jpg"),
    latitude: 32.05414521391,
    longitude: 34.78481666846
  },
  {
    id: "8600",
    hebrew: "נמל תעופה בן גוריון",
    english: "Ben Gurion Airport",
    russian: "Бен-Гурион Аэропорт",
    arabic: "مطار بن چوريون",
    image: require("../../assets/station-images/ben-gurion.jpg"),
    alias: ["נתבג"],
    latitude: 32.00073372711,
    longitude: 34.87072873976
  },
  // {
  //   id: "6700",
  //   hebrew: "ירושלים - מלחה",
  //   english: "Jerusalem - Malha",
  //   russian: "Иерусалим - Малха",
  //   arabic: "القدس - المالحه",
  //   image: require("../../assets/station-images/malha.jpg"),
  //   latitude: 31.74781314849,
  //   longitude: 35.18816145878
  // },
  {
    id: "5900",
    hebrew: "אשקלון",
    english: "Ashkelon",
    russian: "Ашкелон ",
    arabic: "أشكلون",
    image: require("../../assets/station-images/ashkelon.jpg"),
    latitude: 31.67673852877,
    longitude: 34.60485148184
  },
  {
    id: "7500",
    hebrew: "דימונה",
    english: "Dimona",
    russian: "Димона",
    arabic: "ديمونا",
    image: require("../../assets/station-images/dimona.jpg"),
    latitude: 31.0691421498,
    longitude: 35.01187610884
  },
  {
    id: "9200",
    hebrew: "הוד השרון - סוקולוב",
    english: "Hod HaSharon - Sokolov",
    russian: "Ход Хашарон - Соколов",
    arabic: "هود هشارون - سوكولوڤ",
    image: require("../../assets/station-images/hod-hasharon-sokolov.jpg"),
    latitude: 32.17027052848,
    longitude: 34.90155446748
  },
  {
    id: "4170",
    hebrew: "פתח תקווה  - קריית אריה",
    english: "Petah Tikva - Kiryat Arye",
    russian: "Петах Тиква – Кирьят Арье",
    arabic: "بيتح تكڤا - كريات أريه",
    image: require("../../assets/station-images/kiryat-arye.jpg"),
    latitude: 32.1062008212,
    longitude: 34.86317272267
  },
  {
    id: "5150",
    hebrew: "לוד גני אביב",
    english: "Lod - Gane Aviv",
    russian: "Лод - Ганей Авив",
    arabic: "اللد - چاني أڤيڤ",
    image: require("../../assets/station-images/lod-gane-aviv.jpg"),
    latitude: 31.96700826157,
    longitude: 34.87871888949
  },
  {
    id: "8550",
    hebrew: "להבים - רהט",
    english: "Lehavim - Rahat",
    russian: "Леавим - Рахат",
    arabic: "لهاڤيم - رهط",
    image: require("../../assets/station-images/lehavim.jpg"),
    latitude: 31.36986507692,
    longitude: 34.79827779806
  },
  {
    id: "300",
    hebrew: "פאתי מודיעין",
    english: "Pa'ate Modi'in",
    russian: "Патей Модиин",
    arabic: "بأتي موديعين",
    image: require("../../assets/station-images/paate-modiin.jpg"),
    latitude: 31.89366159331,
    longitude: 34.96079058978
  },
  {
    id: "400",
    hebrew: "מודיעין - מרכז",
    english: "Modi'in - Center",
    russian: "Модиин центр ",
    arabic: "موديعين - المركز",
    image: require("../../assets/station-images/modiin-center.jpg"),
    latitude: 31.9011923305,
    longitude: 35.00574429971
  },
  {
    id: "4640",
    hebrew: "צומת חולון",
    english: "Holon Junction",
    russian: "Холон - Развязка Холон",
    arabic: "مفترق حولون",
    image: require("../../assets/station-images/holon-junction.jpeg"),
    latitude: 32.03711211302,
    longitude: 34.77647898097
  },
  {
    id: "4660",
    hebrew: "חולון - וולפסון",
    english: "Holon - Wolfson",
    russian: "Холон - Вольфсон",
    arabic: "حولون - ڤولفسون",
    image: require("../../assets/station-images/holon-wolfson.jpg"),
    latitude: 32.03541214299,
    longitude: 34.75970608355
  },
  {
    id: "4680",
    hebrew: "בת ים - יוספטל",
    english: "Bat Yam - Yoseftal",
    russian: "Бат Ям - Йосеф Таль",
    arabic: "بات يام - يوسفطال",
    image: require("../../assets/station-images/bat-yam-yoseftal.jpg"),
    latitude: 32.01459118975,
    longitude: 34.76211642675
  },
  {
    id: "4690",
    hebrew: "בת ים - קוממיות",
    english: "Bat Yam - Komemiyut",
    russian: "Бат Ям - Комемуют",
    arabic: "بات يام - كوميميوت",
    image: require("../../assets/station-images/bat-yam-komemiyut.jpg"),
    latitude: 32.00093409866,
    longitude: 34.75948739465
  },
  {
    id: "9800",
    hebrew: "ראשון לציון - משה דיין",
    english: "Rishon LeTsiyon - Moshe Dayan",
    russian: "Ришон-Ле-Цион станция им. Моше Даяна",
    arabic: "ريشون لتسيون -موشي ديان",
    image: require("../../assets/station-images/rishon-moshe-dayan.jpg"),
    latitude: 31.98792905502,
    longitude: 34.7574503105
  },
  {
    id: "9000",
    hebrew: "יבנה מערב",
    english: "Yavne - West",
    russian: "Явне-Запад",
    arabic: "ياڤني - غرب",
    image: require("../../assets/station-images/yavne-west.jpg"),
    latitude: 31.89123558994,
    longitude: 34.73154036466
  },
  {
    id: "9600",
    hebrew: "שדרות",
    english: "Sderot",
    russian: "Сдерот",
    arabic: "سديروت",
    image: require("../../assets/station-images/sderot.jpg"),
    latitude: 31.51523,
    longitude: 34.586183
  },
  {
    id: "9650",
    hebrew: "נתיבות",
    english: "Netivot",
    russian: "Нетивот",
    arabic: "نتيفوت",
    image: require("../../assets/station-images/netivot.jpg"),
    latitude: 31.410595,
    longitude: 34.571191
  },
  {
    id: "9700",
    hebrew: "אופקים",
    english: "Ofakim",
    russian: "Офаким",
    arabic: "أوفاكيم",
    image: require("../../assets/station-images/ofakim.jpg"),
    latitude: 31.321891,
    longitude: 34.633948
  },
  {
    id: "3310",
    hebrew: "נתניה - ספיר",
    english: "Netanya - Sapir",
    russian: "Нетания – Сапир",
    arabic: "نتانيا - سبير",
    image: require("../../assets/station-images/netanya-sapir.jpeg"),
    latitude: 32.278789,
    longitude: 34.865261
  },
  {
    id: "1240",
    hebrew: "יקנעם - כפר יהושע",
    english: "Yokne'am - Kfar Yehoshu'a",
    russian: "Йокнеам – Кфар-Иегошуа",
    arabic: "يوكنعام – كفار يهوشوع",
    image: require("../../assets/station-images/yokneam.jpg"),
    latitude: 32.681534,
    longitude: 35.124919
  },
  {
    id: "1250",
    hebrew: "מגדל העמק - כפר ברוך",
    english: "Migdal Ha'emek - Kfar Barukh",
    russian: "Мигдаль-Ха-Эмек – Кфар Барух",
    arabic: "مجدال هعيمك – كفار باروخ",
    image: require("../../assets/station-images/migdal-haeemek.jpg"),
    latitude: 32.64816,
    longitude: 35.208421
  },
  {
    id: "1260",
    hebrew: "עפולה ר. איתן",
    english: "Afula R.Eitan",
    russian: "Афула Р. Эйтан",
    arabic: "العفولة  ر. ايتان",
    image: require("../../assets/station-images/afula.jpg"),
    latitude: 32.621368,
    longitude: 35.294197
  },
  {
    id: "1280",
    hebrew: "בית שאן",
    english: "Beit She'an",
    russian: "Бейт Шеан",
    arabic: "بيت شآن",
    image: require("../../assets/station-images/beit-shean.jpg"),
    latitude: 32.515045,
    longitude: 35.488278
  },
  {
    id: "1820",
    hebrew: "אחיהוד",
    english: "Ahihud",
    russian: "Ахихуд",
    arabic: "احيهود",
    image: require("../../assets/station-images/ahihud.jpeg"),
    latitude: 32.8622708,
    longitude: 35.1223181
  },
  {
    id: "1840",
    hebrew: "כרמיאל",
    english: "Karmiel",
    russian: "Кармиэль",
    arabic: "كرميئيل",
    image: require("../../assets/station-images/karmiel.jpg"),
    latitude: 32.923722,
    longitude: 35.3001157
  },
  {
    id: "2940",
    hebrew: "רעננה מערב",
    english: "Ra'anana West",
    russian: "Раанана-Вест",
    arabic: "رعنانا – غرب",
    image: require("../../assets/station-images/raanana-west.jpeg"),
    latitude: 32.180012,
    longitude: 34.850805
  },
  {
    id: "2960",
    hebrew: "רעננה דרום",
    english: "Ra'anana South",
    russian: "Раанана Южный",
    arabic: "رعنانا الجنوبية",
    image: require("../../assets/station-images/raanana-south.jpeg"),
    latitude: 32.172592,
    longitude: 34.886196
  },
  {
    id: "6150",
    hebrew: "קריית מלאכי - יואב",
    english: "Kiryat Malakhi – Yoav",
    russian: "Кирьят Малахи-Йоав",
    arabic: "كريات ملاخي – يوآڤ",
    image: require("../../assets/station-images/kiryat-malachi.jpg"),
    latitude: 31.755331,
    longitude: 34.823378
  },
  {
    id: "680",
    hebrew: "ירושלים - יצחק נבון",
    english: "Jerusalem - Yitzhak Navon",
    russian: "Иерусалим - Ицхак Навон",
    arabic: "أورشليم – يتسحاق ناڤون",
    image: require("../../assets/station-images/jerusalem-itzhak-navon.jpg"),
    blurhash: "9KGSDi?w",
    latitude: 31.7881805,
    longitude: 35.2024441
  },
  {
    id: "6900",
    hebrew: "מזכרת בתיה",
    english: "Mazkeret Batya",
    russian: "Мазкерет Батья",
    arabic: "مزكيرت باتيا",
    image: require("../../assets/station-images/mazkeret-batya.jpg"),
    latitude: 31.842165,
    longitude: 34.855981
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
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
  }, [locale])

  return normalizeStationNames
}
