# ADR 0007: Inga spelardata publikt

**Status:** Accepterad (Marcel, 2026-11-05) · **Datum:** 2026-11-05

## Kontext
I sprint 2 föreslogs ett undantag från ADR 0003 och ADR 0004: en publik trupp med spelarens namn och tröjnummer, om den länkade föräldern hade gett samtycke (`GET /api/public/teams/{id}/players` och `PUT /api/users/{id}/public-consent`). Förslaget byggdes i PR #54.

Marcel har bestämt att det undantaget inte ska finnas. Spelarna är barn. Ett samtycke kan glömmas bort, återkallas för sent eller sättas av misstag, och då ligger barnets namn redan ute. Det enklaste sättet att skydda dem är att aldrig publicera något om dem alls.

## Beslut
1. **Inga spelardata visas publikt, aldrig.** Inte namn, inte tröjnummer, inte e-post, inte telefon, inte förälder, inte närvaro. Det gäller alla endpoints under `/api/public/**`, både de som finns och de som byggs senare.
2. `GET /api/public/teams/{id}/players` tas bort, med controller, service, DTO och tester.
3. `PUT /api/users/{id}/public-consent` och spelarens samtyckesfält (`publicConsentAt`) tas bort, med all kod och alla tester. Det finns inget samtycke att ge, eftersom inget publiceras.
4. ADR 0003 och ADR 0004 gäller utan undantag. Publikt finns bara lag (id och namn), kommande matcher och matchhistorik.
5. Ett läckagetest (`PublicLeakTest`) seedar en spelare med unikt namn, e-post, telefon och tröjnummer, anropar alla publika GET-endpoints och kontrollerar att inget av värdena finns i något svar. Testet hittar endpoints via Spring, så en ny publik GET kontrolleras automatiskt.
6. Tränarens kontaktuppgifter är en egen fråga och omfattas inte här. Den är fortfarande planerad, med tränarens eget samtycke per fält (ADR 0003, ADR 0004).

## Konsekvenser
- Hemsidan kan inte visa någon trupp. Vill klubben det senare krävs ett nytt beslut av Marcel och en ny ADR.
- Kolumnen `public_consent_at` kan finnas kvar i databaser som redan har startat den gamla koden, eftersom `ddl-auto=update` aldrig tar bort kolumner. Den används inte och är ofarlig. Den kan tas bort för hand om man vill.
- Läckagetestet måste vara grönt i varje PR. Om en ny publik endpoint aldrig svarar 200 i testet, faller testet, så att ingen endpoint slinker igenom okontrollerad.
- Rate limit och CORS för fcvaxjo.se är oförändrade och inte byggda.
