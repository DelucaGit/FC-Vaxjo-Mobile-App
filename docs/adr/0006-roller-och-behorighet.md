# ADR 0006: Roller och behörighet

**Status:** Accepterad (Marcel, 2026-11-05) · **Datum:** 2026-11-05

## Kontext
Koden har fyra roller (ADMIN, COACH, PLAYER, PARENT). Klubbens ordförande behöver en egen roll, och tränares rättigheter är i dag inte begränsade till egna lag för spelarhantering (se gap-analys).

## Beslut
- Hierarki: **ADMIN > CHAIRMAN (ordförande) > COACH > PLAYER = PARENT.** En användare har en roll.
- **ADMIN** har full behörighet, inklusive att tilldela ADMIN.
- **CHAIRMAN** har klubbens verksamhetsbehörighet: skapa lag, koppla tränare till lag och ta bort den kopplingen. Bara ADMIN och CHAIRMAN skapar lag och hanterar vilka tränare som hör till ett lag. De får göra det i alla lag.
- **COACH** får, **bara inom egna lag** (`team_coaches`), skapa spelare och föräldrar, ändra spelare, ta bort spelare ur lag och hantera träningar och närvaro.
- **PLAYER** ser sitt eget schema. **PARENT** ser sina egna barns scheman. Ingen av dem ser andra användares kontaktuppgifter.
- Allt kontrolleras i backend med `@PreAuthorize` för roll och service-kontroll för lagomfång.

## Konsekvenser
- `CHAIRMAN` finns i `RoleSeeder`. Skapa lag och koppla eller ta bort tränare använder `@PreAuthorize` för ADMIN och CHAIRMAN. Övriga ordföranderätter som ännu inte matchar ADR:n är markerade med `x-roles-planned` i `openapi.yaml`.
- COACH behöver lagkontroll i `UserService` (create/update/soft delete), på samma sätt som `TrainingService.assertCanManageTeam`.
- Läs-endpoints för användare och lag behöver rollkontroll.
- Öppna frågor: får CHAIRMAN skapa COACH och byta roller, och vem registrerar matcher?

## Genomförande (S1-2)
- `CHAIRMAN` finns i `ClubRole` och seedas av `RoleSeeder`. Rangen är ADMIN > CHAIRMAN > COACH > PLAYER = PARENT. Radens id i tabellen `roles` är inte rangen.
- `POST /api/teams` tillåter bara ADMIN och CHAIRMAN. Övriga inloggade roller får 403.
- Att koppla eller ta bort en tränare på ett lag var fortfarande bara ADMIN efter S1-2. Det gjordes i S1-7.
- Rollnamnet är en textkolumn, inte en databas-enum. Ingen schema-migrering behövdes. Det finns inget Flyway/Liquibase i projektet ännu (se ADR 0002).

## Genomförande (S1-7)
- `POST /api/teams/{id}/coaches` och `DELETE /api/teams/{id}/coaches/{userId}` tillåter ADMIN och CHAIRMAN i alla lag. Det finns ingen laggräns för de två rollerna.
- Regeln sitter i `ClubRole.canLinkCoach` och i `@PreAuthorize` på de två metoderna, samma stil som `POST /api/teams`.
- COACH, PLAYER och PARENT får 403. En tränare får alltså inte koppla eller ta bort tränare, inte ens i egna lag.
- `x-roles-planned` är borttagen på de två operationerna. Övriga planerade ordföranderätter (skapa användare, byta roll) är kvar.
- Att ordföranden skapar en tränare, eller gör en spelare till tränare, är en egen story (S1-8) och ingår inte här.
