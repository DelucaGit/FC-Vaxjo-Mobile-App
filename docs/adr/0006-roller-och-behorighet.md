# ADR 0006: Roller och behörighet

**Status:** Accepterad (Marcel, 2026-11-05) · **Datum:** 2026-11-05

## Kontext
Koden har fyra roller (ADMIN, COACH, PLAYER, PARENT). Klubbens ordförande behöver en egen roll, och tränares rättigheter är i dag inte begränsade till egna lag för spelarhantering (se gap-analys).

## Beslut
- Hierarki: **ADMIN > CHAIRMAN (ordförande) > COACH > PLAYER = PARENT.** En användare har en roll.
- **ADMIN** har full behörighet, inklusive att tilldela ADMIN.
- **CHAIRMAN** har klubbens verksamhetsbehörighet: skapa lag och koppla tränare till lag. Bara ADMIN och CHAIRMAN skapar lag.
- **COACH** får, **bara inom egna lag** (`team_coaches`), skapa spelare och föräldrar, ändra spelare, ta bort spelare ur lag och hantera träningar och närvaro.
- **PLAYER** ser sitt eget schema. **PARENT** ser sina egna barns scheman. Ingen av dem ser andra användares kontaktuppgifter.
- Allt kontrolleras i backend med `@PreAuthorize` för roll och service-kontroll för lagomfång.

## Konsekvenser
- `CHAIRMAN` ska läggas till i `RoleSeeder` och i `@PreAuthorize` på lagendpoints. Den är markerad som planerad i `openapi.yaml` (`x-roles-planned`).
- COACH behöver lagkontroll i `UserService` (create/update/soft delete), på samma sätt som `TrainingService.assertCanManageTeam`.
- Läs-endpoints för användare och lag behöver rollkontroll.
- Öppna frågor: vem registrerar matcher? S1-8 svarar på om CHAIRMAN får skapa COACH.

## Genomförande (S1-2)
- `CHAIRMAN` finns i `ClubRole` och seedas av `RoleSeeder`. Rangen är ADMIN > CHAIRMAN > COACH > PLAYER = PARENT. Radens id i tabellen `roles` är inte rangen.
- `POST /api/teams` tillåter bara ADMIN och CHAIRMAN. Övriga inloggade roller får 403.
- Att koppla eller ta bort en tränare på ett lag är fortfarande bara ADMIN. Det står kvar som `x-roles-planned` i `openapi.yaml`.
- Rollnamnet är en textkolumn, inte en databas-enum. Ingen schema-migrering behövdes. Det finns inget Flyway/Liquibase i projektet ännu (se ADR 0002).

## Genomförande (S1-8)

Öppen fråga från beslutet: får ordföranden skapa tränare och byta roller? Ja, i ett smalt fall. Syftet är att en ungdom ska kunna bli tränare.

- ADMIN och CHAIRMAN får skapa en användare med rollen COACH (`POST /api/users`).
- ADMIN och CHAIRMAN får byta en PLAYER till COACH (`PUT /api/users/{id}/role`).
- CHAIRMAN får inte sätta ADMIN eller CHAIRMAN, varken när en användare skapas eller när rollen byts. Svaret är 403 med texten "CHAIRMAN cannot assign the role ADMIN or CHAIRMAN".
- ADMIN behåller sina tidigare rättigheter och får fortfarande sätta vilken roll som helst.
- CHAIRMAN får inte skapa andra roller än COACH, och får inte göra andra rollbyten än PLAYER till COACH. Det håller ändringen liten. Att en tränare skapar spelare i egna lag är en annan story.

När en spelare blir tränare händer tre enkla saker. Samma sak oavsett om det är ADMIN eller CHAIRMAN som byter rollen:

- **Föräldrakopplingen tas bort.** `parentId` blir tom. Förälderns eget konto ligger kvar. En tränare ska inte ligga kvar som barn i förälderns lista.
- **Tröjnumret tas bort.** `playerNumber` blir tomt. Numret är unikt, så det blir ledigt för en annan spelare. En tränare har inget tröjnummer.
- **Laget på spelaren tas bort.** `teamId` blir tomt. En spelare tillhör ett lag via den kolumnen. En tränare tillhör lag via `team_coaches`. Den kopplingen görs inte här. Personen är tränare utan lag tills någon kopplar hen till ett lag (det är en egen story).

Gamla närvarorader ligger kvar. De är historik och skrivs inte om.

Efter bytet måste personen logga in igen för att få en token med rollen COACH. Den gamla token säger fortfarande PLAYER. När filtret jämför token med databasen och rollen inte längre stämmer blir nästa anrop 401. På den här grenen gör `JwtAuthFilter` ännu inte den jämförelsen (det är S1-4, som inte är mergad). Tills det filtret är inne fungerar den gamla token tills den går ut, men den ger fortfarande spelarens rättigheter, inte tränarens.

Ingen schemaändring. Rollnamnet är redan en textkolumn (se S1-2 och ADR 0002).
