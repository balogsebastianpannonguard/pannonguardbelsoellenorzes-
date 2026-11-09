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

## Élesítés előtt

- HTTPS mögé tenni; a `TOTP_ENCRYPTION_KEY`-t titokkezelőbe áthelyezni (cseréje után
  minden hitelesítőt újra kell állítani). Ennek az alrendszernek saját kulcsa van.
- A MongoDB-felhasználót a szükséges adatbázisokra korlátozni.
- Rögzíteni az adatkezelési célt és a megőrzési időt, mielőtt ellenőrzési adat kerül a
  rendszerbe (ISO A.5.34, GDPR 30. cikk).
- Írásba foglalni az incidenskezelési folyamatot, a NIS2 szerinti 24 órás korai jelzéssel
  (ISO A.5.24–A.5.26, NIS2 23. cikk).
