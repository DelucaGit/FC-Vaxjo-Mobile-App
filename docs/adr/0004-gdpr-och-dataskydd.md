# ADR 0004: GDPR och dataskydd som grundkrav

**Status:** Accepterad (Marcel, 2026-11-05) · **Datum:** 2026-11-05

## Kontext
Appen hanterar persondata om barn (namn, närvaro och senare beteende) och föräldrars kontaktuppgifter. Hemsidan ska dessutom visa tränares kontaktuppgifter publikt. Klubben är personuppgiftsansvarig.

## Beslut
1. **Dataminimering.** Svar innehåller bara de fält mottagaren behöver, med DTO:er per roll. Beteendeanteckningar ska vara sakliga och bara synas för COACH (eget lag), CHAIRMAN och ADMIN.
2. **Behörighet per roll och lag i backend** enligt ADR 0006. Den kontrolleras i service-lagret och döljs inte bara i UI:t.
3. **Publicering bara med samtycke.** Kontaktuppgifter för spelare och föräldrar publiceras aldrig. En spelares namn och tröjnummer får visas publikt bara efter den länkade förälderns samtycke (ADR 0007). En tränares namn och kontaktuppgifter visas på fcvaxjo.se bara efter ett uttryckligt samtycke, där tränaren väljer per uppgift (namn/e-post/telefon). Det tränarsamtycket är ännu inte byggt. Samtycket lagras med tidsstämpel och kan återkallas när som helst, och då försvinner uppgifterna från publika svar direkt.
4. **Ingen PII i loggar, URL:er eller felmeddelanden.** Prod kör med `show-sql=false`.
5. **Gallring och hård radering.** Vi fastställer lagringstider. Mjuk radering räcker inte, så hård radering och anonymisering ska kunna göras på begäran.
6. **Demodata är avstängd i prod.** `DemoClubSeeder` körs bara i profilen `dev`, och det finns inga hårdkodade lösenord i prod.
7. **Säkerhet.** HTTPS, hemligheter bara i Railways miljövariabler och en JWT-hemlighet utan standardvärde.
8. **Det juridiska.** DPA med Railway (EU-region), en integritetspolicy i appen och på hemsidan, och ett registerutdrag. Policy och samtycken stäms av med någon som kan GDPR före lansering.

## Genomförande (S1-13)
En mjukt borttagen användare (`active=false`) lämnas inte ut på den vanliga läsningen. `GET /api/users/{id}` svarar 404 med texten "User not found" för alla roller, även ADMIN. Samma text som när id saknas, så svaret inte säger att kontot finns. Listor och sök visade redan bara `active=true`. Att slå på kontot igen blir en egen endpoint senare och byggs inte här.

## Konsekvenser
- Flera befintliga endpoints bryter mot punkt 2, 4 och 5 (se `docs/gap-analys.md`).
- Det behövs fortfarande en samtyckesmodell per fält för tränare innan `/api/public/teams/{id}/coaches` byggs. Spelardata publiceras aldrig, inte ens med samtycke (ADR 0007).
- Testaren granskar behörighet och dataläckor i varje PR.
