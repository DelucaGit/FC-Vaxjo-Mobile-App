# ADR 0007: Publik trupp bara med förälderns samtycke

**Status:** Föreslagen i sprint 2, väntar på Arkitekt och Marcel · **Datum:** 2026-11-05

## Kontext
ADR 0003 och ADR 0004 sa att spelar- och föräldradata aldrig publiceras. Hemsidan behöver ändå kunna visa en trupp. Sprint 2 ber om namn och tröjnummer, aldrig kontaktuppgifter, och bara med samtycke. Appen kräver redan en förälder på varje spelare som skapas.

## Beslut
1. `GET /api/public/**` är öppet utan inloggning. Bara GET. Andra metoder på den sökvägen kräver token.
2. Publikt utan samtycke: lag (id och namn), kommande matcher och matchhistorik. Ingen e-post, ingen telefon, inget `createdByUserId`.
3. Publik trupp (`GET /api/public/teams/{id}/players`) får bara innehålla **namn** och **tröjnummer**.
4. Spelaren syns bara när `publicConsentAt` är satt. Null betyder inget samtycke. Det är standard.
5. Bara den **länkade föräldern** får sätta och återkalla, via `PUT /api/users/{id}/public-consent`. Spelaren själv får inte. Personal får inte. Samtycke är inte en personalhandling.
6. Ett ja sparar tidsstämpeln första gången. Ett nytt ja flyttar den inte. Ett nej tömmer den, och spelaren försvinner från publika svar direkt.
7. En inaktiv spelare syns aldrig. Om föräldern är inaktiv syns barnet inte heller, för den föräldern kan inte längre återkalla.
8. En saknad spelare, en inaktiv spelare och någon annans barn ger samma 403. Svaret säger inte att raden finns.
9. Tränarens kontaktuppgifter publiceras inte här. Den modellen är fortfarande per fält och är inte byggd.

## Konsekvenser
- ADR 0004 punkt 3 och ADR 0003 har ett smalt undantag: namn och tröjnummer med förälderns samtycke. Kontaktuppgifter är fortfarande förbjudna publikt.
- Rate limit och CORS för fcvaxjo.se är oförändrade och inte byggda.
- Om klubben senare har spelare utan förälder behövs ett nytt beslut. De kan inte publiceras med den här regeln.
