# Biztonság – PannonGuard Belső ellenőrzés

Fiókot csak az elosztóból kapott meghívóval lehet létrehozni, és a belépéshez
jelszó **és** hitelesítő alkalmazás (TOTP, RFC 6238) is kell. A védelem az
Objektumfelügyelet alrendszerével azonos; az intézkedések az ISO/IEC 27001:2022
Annex A és az NIS2-irányelv 21. cikk (2) bekezdéséhez igazodnak (a megfeleltetést az
áttekintő oldal mutatja). Ez technikai alapállapot, nem tanúsítás.

- **Meghívó:** az elosztó `invitations` gyűjteményéből (`INVITES_DB`) olvassa; csak
  `Belső ellenőrzés` munkakörű, érvényes, vissza nem vont tokent fogad el. A beváltás
  atomi, a token utána törlődik. *(ISO A.5.15, A.5.18)*
- **Jelszó:** legalább 12 karakter, scrypt (N=2^16) hash. Nem létező fióknál is lefut egy
  hash, így a válaszidő nem árulja el, létezik-e a cím. 15 percen belül 8 hibás próbálkozás
  után zárol. *(ISO A.8.5, A.8.24)*
- **TOTP:** a kulcs AES-256-GCM-mel titkosítva van tárolva (`TOTP_ENCRYPTION_KEY`), a
  felhasznált lépés el van mentve, így egy kód nem használható kétszer. Munkamenetenként
  5 hibás kód után újra kell kezdeni a belépést. *(NIS2 21(2)(j))*
- **Munkamenet:** szerveroldali, csak a token hash-e van tárolva; httpOnly, élesben
  `__Host-` + Secure süti. Köztes állapotok: `mfa` (5 perc), `setup` (30 perc). Teljes
  munkamenet: 12 óra, 60 perc tétlenség után lejár.
- **Elosztó felől:** a visszavont hozzáférés minden kérésnél ellenőrizve van; a
  hitelesítő-visszaállítás után a következő belépéskor új kulcsot és QR-kódot kap.
- **Webes védelem:** CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, noindex
  (`next.config.ts`). *(ISO A.8.26)*
- **Naplózás (`audit_log`):** regisztráció, belépés, hibás jelszó/kód, zárolás,
  kijelentkezés, IP és eszköz. *(ISO A.8.15)*

## Pajzs (lebegő asszisztens) és adatkezelés

- **AI (Google Gemini):** a csevegéshez csak darabszámok, súlyossági bontás és a pályázatok nevei kerülnek a
  modellhez; a megállapítások szövege, felelősök neve és személyes adat nem. A beírt kérdés és a digitalizált iratok
  tartalma viszont a szolgáltatóhoz kerül: személyes adatot tartalmazó irathoz fizetős (számlázott), Google Cloudban
  korlátozott kulcs kell, és az AI-szolgáltatót fel kell tüntetni az adatkezelési tájékoztatóban. *(ISO A.5.23, A.5.34)*
- **Iratok:** csak a kinyert adatok és az összefoglaló kerülnek a `documents` gyűjteménybe (SHA-256 alapján
  duplikátum-szűréssel), a fájl nem.
- **Bejelentések:** a `tickets` gyűjteménybe kerülnek, és e-mailben mennek a fejlesztőnek (`TICKET_TO`); óránként
  legfeljebb 6 felhasználónként. A technikai napló a böngészőhibák rövid, e-mail-címektől és hosszú tokenektől
  megtisztított sorai; a felhasználó a küldés előtt megnézheti és kikapcsolhatja. *(ISO A.5.24, A.8.15)*
- **Keretek:** csevegés 40/óra, iratfeldolgozás 40 fájl/óra, kézi jogszabály-ellenőrzés 4/óra felhasználónként
  (`assistant_usage`, automatikusan lejár).

## Élesítés előtt

- A Vercel-projektben beállítani a `GEMINI_API_KEY`, `EMAIL_USER`, `EMAIL_PASS`, `SMTP_*` és `CRON_SECRET` változókat.
- HTTPS mögé tenni; a `TOTP_ENCRYPTION_KEY`-t titokkezelőbe áthelyezni (cseréje után
  minden hitelesítőt újra kell állítani). Ennek az alrendszernek saját kulcsa van.
- A MongoDB-felhasználót a szükséges adatbázisokra korlátozni.
- Rögzíteni az adatkezelési célt és a megőrzési időt, mielőtt ellenőrzési adat kerül a
  rendszerbe (ISO A.5.34, GDPR 30. cikk).
- Írásba foglalni az incidenskezelési folyamatot, a NIS2 szerinti 24 órás korai jelzéssel
  (ISO A.5.24–A.5.26, NIS2 23. cikk).
