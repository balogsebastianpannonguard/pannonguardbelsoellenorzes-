/** A dokumentumokon futtatható AI-feladatok (kliens és szerver is használja). */
export const DOC_TASKS = {
  elemzes: { label: "Elemzés", hint: "Szakmai elemzés belső ellenőri szemmel" },
  osszefoglalo: { label: "Összefoglaló", hint: "Vezetői összefoglaló pontokba szedve" },
  kockazatok: { label: "Kockázatok, hiányosságok", hint: "Ellentmondások, hiányzó adatok, súlyosság szerint" },
  kulcsadatok: { label: "Kulcsadatok", hint: "Felek, összegek, dátumok, határidők táblázatban" },
  teendok: { label: "Teendők", hint: "Feladatlista felelőssel és határidővel" },
  egyeni: { label: "Saját kérés", hint: "Bármi, amit a dokumentumról kérdezni vagy kérni szeretnél" },
} as const;
export type DocTask = keyof typeof DOC_TASKS;
