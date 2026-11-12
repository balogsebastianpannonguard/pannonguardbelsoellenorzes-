# PannonGuard Belső ellenőrzés

Meghívásos, kétlépcsős azonosítással védett alrendszer a belső ellenőrzés munkaköréhez.
Indítás: `npm run dev` → http://localhost:3003 (a meghívót az elosztó küldi).

## Mi van benne most

| Oldal | Tartalom |
| --- | --- |
| Áttekintés | Fiókállapot, belépési aktivitás (14 nap), ISO 27001 / NIS2 alapintézkedések állapota |
| Biztonság | Fiókadatok, 2FA állapot, aktív munkamenetek, saját eseménynapló |

A hét munkaterület (pályázatok, adatok és ábrák, fordítás, ellenőri adatok, hiányosságok, javaslattétel, jogszabályok)
a menüből érhető el.

## Pajzs – a lebegő védőember

Minden belépés utáni oldalon a jobb alsó sarokban (vagy Ctrl/⌘+K):

| Fül | Mit tud |
| --- | --- |
| Pajzs | AI-csevegés a rendszer élő számaival, kattintható oldalhivatkozásokkal; „Mai helyzet” AI nélkül is |
| Számok | Megállapítások (lezárási arány, súlyosság, 8 hetes trend), pályázati határidők és készültség, javaslatok, munkaterületek |
| Teendő | Lejárt határidők, felelős/határidő nélküli súlyos megállapítások, javaslat nélküli tételek, régi tervezetek, hibás ellenőri fájlok |
| Iratok | Szkennelt PDF, kép, Word, Excel digitalizálása (akár 8 egyszerre): típus, felek, összegek, határidők, eltérések, CSV-export |
| Jog | A figyelt jogszabályok napi változásfigyelése, azonnali ellenőrzés |
| Bejelentés | Hibajegy vagy kérés (BE-HB-/BE-KE- azonosítóval) e-mailben a fejlesztőnek, oldallal, eszközzel és technikai naplóval |

Ha egy oldal hibára fut, a hibaoldal „Hiba bejelentése” gombja a hibaazonosítóval kitöltve nyitja meg a bejelentést.

## Beállítás (.env.local)

`MONGODB_URI`, `MONGODB_DB`, `INVITES_DB`, `TOTP_ENCRYPTION_KEY` (kötelező, `npm run setup:secrets`),
`GEMINI_API_KEY` (AI-funkciók), `EMAIL_USER` / `EMAIL_PASS` / `SMTP_*` (bejelentő levelek), `CRON_SECRET` (napi jogszabály-figyelés).

Az elosztóban (`pannonguardeloszto/.env.local`) kell hozzá:
`BELSOELLENORZES_URL=http://localhost:3003`.
