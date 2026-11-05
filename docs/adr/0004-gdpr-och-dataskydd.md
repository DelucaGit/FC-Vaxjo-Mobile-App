# ADR 0004: GDPR och dataskydd som grundkrav

**Status:** Accepterad (Marcel, 2026-11-05) · **Datum:** 2026-11-05

## Kontext
Appen hanterar persondata om barn (namn, närvaro och senare beteende) och föräldrars kontaktuppgifter. Hemsidan ska dessutom visa tränares kontaktuppgifter publikt. Klubben är personuppgiftsansvarig.

## Beslut
1. **Dataminimering.** Svar innehåller bara de fält mottagaren behöver, med DTO:er per roll. Beteendeanteckningar ska vara sakliga och bara synas för COACH (eget lag), CHAIRMAN och ADMIN.
2. **Behörighet per roll och lag i backend** enligt ADR 0006. Den kontrolleras i service-lagret och döljs inte bara i UI:t.
3. **Publicering bara med samtycke.** Spelar- och föräldradata publiceras aldrig. En tränares namn och kontaktuppgifter visas på fcvaxjo.se bara efter ett uttryckligt samtycke, där tränaren väljer per uppgift (namn/e-post/telefon). Samtycket lagras med tidsstämpel och kan återkallas när som helst, och då försvinner uppgifterna från publika svar direkt.
4. **Ingen PII i loggar, URL:er eller felmeddelanden.** Prod kör med `show-sql=false`.
5. **Gallring och hård radering.** Vi fastställer lagringstider. Mjuk radering räcker inte, så hård radering och anonymisering ska kunna göras på begäran.
6. **Demodata är avstängd i prod.** `DemoClubSeeder` körs bara i profilen `dev`, och det finns inga hårdkodade lösenord i prod.
7. **Säkerhet.** HTTPS, hemligheter bara i Railways miljövariabler och en JWT-hemlighet utan standardvärde.
8. **Det juridiska.** DPA med Railway (EU-region), en integritetspolicy i appen och på hemsidan, och ett registerutdrag. Policy och samtycken stäms av med någon som kan GDPR före lansering.

## Konsekvenser
- Flera befintliga endpoints bryter mot punkt 2, 4 och 5 (se `docs/gap-analys.md`).
- Det behövs en samtyckesmodell för tränare innan `/api/public/teams/{id}/coaches` byggs.
- Testaren granskar behörighet och dataläckor i varje PR.
