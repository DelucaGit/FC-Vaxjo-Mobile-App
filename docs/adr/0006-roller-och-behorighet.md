# ADR 0006: Roller och behörighet

**Status:** Accepterad (Marcel, 2026-11-05) · **Datum:** 2026-11-05

## Kontext
Koden har fyra roller (ADMIN, COACH, PLAYER, PARENT). Klubbens ordförande behöver en egen roll, och tränares rättigheter är i dag inte begränsade till egna lag för spelarhantering (se gap-analys).

## Beslut
- Hierarki: **ADMIN > CHAIRMAN (ordförande) > COACH > PLAYER = PARENT.** En användare har en roll.
- **ADMIN** har full behörighet, inklusive att tilldela ADMIN.
- **CHAIRMAN** har klubbens verksamhetsbehörighet: skapa lag, koppla tränare till lag, och skapa och ändra träningar för alla lag (samma som ADMIN). Bara ADMIN och CHAIRMAN skapar lag.
- **COACH** får, **bara inom egna lag** (`team_coaches`), skapa spelare och föräldrar, ändra spelare, ta bort spelare ur lag och hantera träningar och närvaro.
- **PLAYER** ser sitt eget schema. **PARENT** ser sina egna barns scheman. Ingen av dem ser andra användares kontaktuppgifter.
- Allt kontrolleras i backend med `@PreAuthorize` för roll och service-kontroll för lagomfång.

## Konsekvenser
- `CHAIRMAN` ska läggas till i `RoleSeeder` och i `@PreAuthorize` på lagendpoints. Den är markerad som planerad i `openapi.yaml` (`x-roles-planned`).
- COACH behöver lagkontroll i `UserService` (create/update/soft delete), på samma sätt som `TrainingService.assertCanManageTeam`.
- Läs-endpoints för användare och lag behöver rollkontroll.
- Öppna frågor: får CHAIRMAN skapa COACH och byta roller, och vem registrerar matcher?

## Genomförande (S1-2)
- `CHAIRMAN` finns i `ClubRole` och seedas av `RoleSeeder`. Rangen är ADMIN > CHAIRMAN > COACH > PLAYER = PARENT. Radens id i tabellen `roles` är inte rangen.
- `POST /api/teams` tillåter bara ADMIN och CHAIRMAN. Övriga inloggade roller får 403.
- Att koppla eller ta bort en tränare på ett lag är fortfarande bara ADMIN. Det står kvar som `x-roles-planned` i `openapi.yaml`.
- Rollnamnet är en textkolumn, inte en databas-enum. Ingen schema-migrering behövdes. Det finns inget Flyway/Liquibase i projektet ännu (se ADR 0002).

## Genomförande (S1-11)
- `ClubRole.canManageAllTrainings()` är sant för ADMIN och CHAIRMAN. COACH, PLAYER och PARENT är falskt. Lagkontrollen för en tränare ligger kvar i `TrainingService`, eftersom rollen inte vet vilka rader som finns i `team_coaches`.
- CHAIRMAN får skapa träning och markera närvaro på vilket lag som helst, utan att vara kopplad som tränare. Samma sak gäller att lista och hämta träningen, så ordföranden kan se det hen just ändrade.
- COACH är oförändrad: bara lag där hen finns i `team_coaches`.
- PLAYER och PARENT får 403 på personalens tränings-URL:er. De läser sitt schema via `/api/my/trainings`.
- Det finns fortfarande ingen URL för att byta titel eller tid på en träning. "Ändra" är den ändring ADMIN redan kan göra: markera närvaro.
