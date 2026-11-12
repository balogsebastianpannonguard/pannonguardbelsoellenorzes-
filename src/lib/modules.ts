import {
  ChartColumn,
  ClipboardList,
  FolderKanban,
  Languages,
  Lightbulb,
  Scale,
  SearchX,
  type LucideIcon,
} from "lucide-react";

export type Module = {
  slug: string;
  number: string;
  title: string;
  /** Rövid név a menühöz. */
  label: string;
  icon: LucideIcon;
  summary: string;
  goals: string[];
};

/** A belső ellenőrzés munkaterületei. */
export const MODULES: Module[] = [
  {
    slug: "palyazatok",
    number: "01",
    title: "Pályázati anyagok",
    label: "Pályázati anyagok",
    icon: FolderKanban,
    summary: "A pályázati anyagok összeállítása átláthatóbb, a hiányzó elemek és a határidők egy helyen követhetők.",
    goals: [
      "Pályázatonként a szükséges dokumentumok és mellékletek listája, készültségi állapottal",
      "Hiányzó vagy lejáró dokumentumok jelzése a beadási határidő előtt",
      "Ki mit készít el, és mi vár jóváhagyásra – átlátható felelősök",
      "Az anyagok verzióinak és módosításainak nyomon követése",
    ],
  },
  {
    slug: "adatfeldolgozas",
    number: "02",
    title: "Adatfeldolgozás és ábrák",
    label: "Adatok és ábrák",
    icon: ChartColumn,
    summary: "Nagy adatbázisok és táblázatok gyorsabb feldolgozása, az eredmények ábrákban is megjelenítve.",
    goals: [
      "Excel-, CSV- és PDF-állományok betöltése, az oszlopok ellenőrzése",
      "Összesítések, szűrések és összehasonlítások néhány kattintással",
      "Oszlop-, vonal- és kördiagramok automatikus készítése",
      "Az elkészült ábrák és táblák letölthetők jelentésekhez",
    ],
  },
  {
    slug: "forditas",
    number: "03",
    title: "Idegen nyelvű okiratok fordítása",
    label: "Fordítás",
    icon: Languages,
    summary: "Idegen nyelvű okiratok és dokumentumok fordítása, hogy a tartalmuk gyorsan ellenőrizhető legyen.",
    goals: [
      "Dokumentum feltöltése vagy szöveg beillesztése, fordítás magyarra",
      "A fordítás mellett az eredeti szöveg is látható, a vitás részek összevethetők",
      "Szakkifejezések következetes használata",
      "Hivatalos célra szánt fordításnál jelzés, hogy emberi ellenőrzés kell",
    ],
  },
  {
    slug: "ellenori-adatok",
    number: "04",
    title: "Beérkező ellenőri adatok",
    label: "Ellenőri adatok",
    icon: ClipboardList,
    summary: "Az ellenőrzések során beérkező adatok gyorsabb és pontosabb feldolgozása.",
    goals: [
      "Egységes befogadás: a különböző forrásból érkező adatok egy rendszerbe kerülnek",
      "Formai és tartalmi ellenőrzés beérkezéskor, hibás vagy hiányos tételek jelzése",
      "Ellenőrzésenként összesített, visszakereshető adatállomány",
      "Ki, mikor és mit töltött fel – teljes nyomon követhetőség",
    ],
  },
  {
    slug: "hianyossagok",
    number: "05",
    title: "Hiányosságok feltárása",
    label: "Hiányosságok",
    icon: SearchX,
    summary: "Az esetleges hiányosságok felfedése az adatok és dokumentumok összevetésével.",
    goals: [
      "Hiányzó, ellentmondó vagy szokatlan adatok kiemelése",
      "Megállapítások rögzítése súlyosság és bizonyíték szerint",
      "Az intézkedések határideje és a javítás visszaellenőrzése",
      "Összesítés ellenőrzésenként és területenként",
    ],
  },
  {
    slug: "javaslatok",
    number: "06",
    title: "Javaslattétel",
    label: "Javaslattétel",
    icon: Lightbulb,
    summary: "Nagymértékű segítség a javaslatok megfogalmazásához a feltárt megállapítások alapján.",
    goals: [
      "A megállapításokból javaslatvázlat készítése, amelyet az ellenőr szerkeszt és hagy jóvá",
      "Hasonló korábbi esetek és intézkedések előkeresése",
      "Javaslatok csoportosítása prioritás és felelős szerint",
      "Vezetői összefoglaló nyomtatható formában",
    ],
  },
  {
    slug: "jogszabalyok",
    number: "07",
    title: "Jogszabályváltozások követése",
    label: "Jogszabályok",
    icon: Scale,
    summary: "A jogszabályok változásainak nyomon követése, hogy a belső szabályzatok naprakészek maradjanak.",
    goals: [
      "A figyelt jogszabályok listája, a változások időrendben",
      "Új vagy módosult rendelkezés esetén értesítés",
      "A változáshoz kapcsolódó belső szabályzatok és teendők megjelölése",
      "Hatálybalépési határidők a naptárban",
    ],
  },
];

export const moduleBySlug = (slug: string) => MODULES.find((module) => module.slug === slug);
