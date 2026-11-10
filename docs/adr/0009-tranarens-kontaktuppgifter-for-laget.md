# ADR 0009: Tränarens kontaktuppgifter syns för lagets spelare och föräldrar

**Status:** Föreslagen (väntar på Marcel, issue #79) · **Datum:** 2026-11-10

## Kontext
Föräldrar och spelare har idag ingen väg att kontakta sin tränare i appen. `GET /api/teams/{id}/coaches` ger 403 för PLAYER och PARENT (S1-10), och tränarens telefon och e-post är personuppgifter (ADR 0004). Marcel tog upp behovet 2026-11-10: en förälder kan behöva ringa tränaren, till exempel när barnet inte har kommit hem efter träningen, eller fråga om en träning.

## Beslut
1. Ett nytt läsanrop, `GET /api/my/coaches`, för PLAYER och PARENT. Andra roller får 403, anonyma 401. Personalen har redan `GET /api/teams/{id}/coaches`.
2. Samma personkontroll som `GET /api/my/trainings`:
   - PLAYER: tränarna i sitt eget lag. `childId` ger 403.
   - PARENT: måste skicka `childId` för ett eget, aktivt barn. Ett annat barn ger 403, ett okänt id 404 och ett saknat `childId` 400.
3. Svaret har bara de **aktiva** tränarna i laget (`team_coaches`), och bara `id`, `name`, `email` och `mobilePhoneNumber`. Ingen roll, inga andra lag, ingen spelar- eller föräldradata.
4. `GET /api/teams/{id}/coaches` är oförändrad. PLAYER och PARENT får fortfarande 403 där.

## Kostnad
- Fler personer ser tränarens privata telefon och e-post: alla spelare och föräldrar i laget. Det kan inte tas tillbaka när någon väl har sett eller sparat numret.
- Tränarna måste få veta detta **före piloten**, så att de kan säga till om de inte vill dela sitt privata nummer.
- Tränaren kan idag inte välja att dölja ett fält. Vill en tränare inte synas behöver den raden ändras av ADMIN (till exempel ett annat nummer). Ett eget fält för "kontaktnummer för laget" är en senare fråga.

## Alternativ som vi har övervägt
- **Öppna `GET /api/teams/{id}/coaches` för PLAYER och PARENT.** Avvisat. Anropet tar vilket lag-id som helst, så varje lag-id skulle behöva en ny kontroll av att personen hör till laget. Det är lätt att missa och kan läcka andra lags tränare. Det svarar också med hela `FetchUserResponse`, med fler fält än som behövs.
- **Ingen kontakt i appen.** Enklast för integriteten, men då måste föräldrar hitta numret på annat sätt, och appen hjälper inte när det är bråttom.

## Konsekvenser
- `docs/api/openapi.yaml` och `docs/testing/rollmatris.md` beskriver den nya regeln. `MyCoachesAccessTest` låser den.
- Om en tränare tas bort från laget eller blir inaktiv försvinner hen direkt ur svaret.
