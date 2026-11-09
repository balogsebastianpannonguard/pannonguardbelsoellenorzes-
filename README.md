# PannonGuard Belső ellenőrzés

Meghívásos, kétlépcsős azonosítással védett alrendszer a belső ellenőrzés munkaköréhez.
Indítás: `npm run dev` → http://localhost:3003 (a meghívót az elosztó küldi).

## Mi van benne most

| Oldal | Tartalom |
| --- | --- |
| Áttekintés | Fiókállapot, belépési aktivitás (14 nap), ISO 27001 / NIS2 alapintézkedések állapota |
| Biztonság | Fiókadatok, 2FA állapot, aktív munkamenetek, saját eseménynapló |

Az ellenőrzési modulok (terv, megállapítások, intézkedések, jelentések) később jönnek.

## Beállítás (.env.local)

`MONGODB_URI`, `MONGODB_DB`, `INVITES_DB`, `TOTP_ENCRYPTION_KEY` (kötelező, `npm run setup:secrets`).

Az elosztóban (`pannonguardeloszto/.env.local`) kell hozzá:
`BELSOELLENORZES_URL=http://localhost:3003`.
