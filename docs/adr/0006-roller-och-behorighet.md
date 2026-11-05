# ADR 0006: Roller och behörighet

**Status:** Accepterad (Marcel, 2026-11-05) · **Datum:** 2026-11-05

## Kontext
Koden har fyra roller (ADMIN, COACH, PLAYER, PARENT). Klubbens ordförande behöver en egen roll, och tränares rättigheter är i dag inte begränsade till egna lag för spelarhantering (se gap-analys).

## Beslut
- Hierarki: **ADMIN > CHAIRMAN (ordförande) > COACH > PLAYER = PARENT.** En användare har en roll.
- **ADMIN** har full behörighet, inklusive att tilldela ADMIN.
- **CHAIRMAN** har klubbens verksamhetsbehörighet: skapa lag, koppla tränare till lag och ta bort den kopplingen, och skapa och ändra träningar för alla lag (samma som ADMIN). Bara ADMIN och CHAIRMAN skapar lag och hanterar vilka tränare som hör till ett lag. De får göra det i alla lag.
- **COACH** får, **bara inom egna lag** (`team_coaches`), skapa spelare och föräldrar, ändra spelare, ta bort spelare ur lag, hantera träningar och närvaro, och lista, läsa och söka spelare, tränare och föräldrar i de lagen. Hela klubblistan är bara för ADMIN och CHAIRMAN.
- **PLAYER** ser sitt eget schema. **PARENT** ser sina egna barns scheman. Ingen av dem ser andra användares kontaktuppgifter.
- Allt kontrolleras i backend med `@PreAuthorize` för roll och service-kontroll för lagomfång.

## Konsekvenser
- `CHAIRMAN` finns i `RoleSeeder`. Skapa lag och koppla eller ta bort tränare använder `@PreAuthorize` för ADMIN och CHAIRMAN. Övriga ordföranderätter som ännu inte matchar ADR:n är markerade med `x-roles-planned` i `openapi.yaml`.
- COACH behöver lagkontroll i `UserService` (create/update/soft delete), på samma sätt som `TrainingService.assertCanManageTeam`.
- Läs-endpoints för användare och lag behöver rollkontroll.
- Öppna frågor: vem registrerar matcher? S1-8 svarar på om CHAIRMAN får skapa COACH.

## Genomförande (S1-2)
- `CHAIRMAN` finns i `ClubRole` och seedas av `RoleSeeder`. Rangen är ADMIN > CHAIRMAN > COACH > PLAYER = PARENT. Radens id i tabellen `roles` är inte rangen.
- `POST /api/teams` tillåter bara ADMIN och CHAIRMAN. Övriga inloggade roller får 403.
- Att koppla eller ta bort en tränare på ett lag var fortfarande bara ADMIN efter S1-2. Det gjordes i S1-7.
- Rollnamnet är en textkolumn, inte en databas-enum. Ingen schema-migrering behövdes. Det finns inget Flyway/Liquibase i projektet ännu (se ADR 0002).

## Genomförande (S1-7)
- `POST /api/teams/{id}/coaches` och `DELETE /api/teams/{id}/coaches/{userId}` tillåter ADMIN och CHAIRMAN i alla lag. Det finns ingen laggräns för de två rollerna.
- Regeln sitter i `ClubRole.canLinkCoach` och i `@PreAuthorize` på de två metoderna, samma stil som `POST /api/teams`.
- COACH, PLAYER och PARENT får 403. En tränare får alltså inte koppla eller ta bort tränare, inte ens i egna lag.
- `x-roles-planned` är borttagen på de två operationerna.

## Genomförande (S1-8)

Öppen fråga från beslutet: får ordföranden skapa tränare och byta roller? Ja. Syftet är att en ungdom ska kunna bli tränare. Reglerna bygger på S1-3 (PR #27), där ordföranden redan är personal för spelare och föräldrar i alla lag. Den här storyn mergas efter den.

- ADMIN och CHAIRMAN får skapa en användare med rollen COACH (`POST /api/users`).
- CHAIRMAN får också skapa PLAYER och PARENT, i vilket lag som helst. Det är samma personalregel som i S1-3.
- ADMIN och CHAIRMAN får byta en annan användares PLAYER till COACH (`PUT /api/users/{id}/role`).
- CHAIRMAN får inte sätta ADMIN eller CHAIRMAN, varken när en användare skapas eller när rollen byts. Svaret är 403 med texten "CHAIRMAN cannot assign the role ADMIN or CHAIRMAN".
- Den som inte är ADMIN får inte byta sin egen roll. Svaret är 403 med texten "You cannot change your own role". ADMIN får fortfarande byta sin egen roll.
- ADMIN behåller sina tidigare rättigheter och får fortfarande sätta vilken roll som helst.

En tränare har inget tröjnummer. `playerNumber` nollställs både när en COACH skapas och när en PLAYER blir COACH. Kolumnen är unik, så numret ska inte ligga kvar och blockera en spelare.

När en spelare blir tränare händer tre enkla saker. Samma sak oavsett om det är ADMIN eller CHAIRMAN som byter rollen:

- **Föräldrakopplingen tas bort.** `parentId` blir tom. Förälderns eget konto ligger kvar. En tränare ska inte ligga kvar som barn i förälderns lista.
- **Tröjnumret tas bort.** `playerNumber` blir tomt.
- **Laget på spelaren tas bort.** `teamId` blir tomt. En spelare tillhör ett lag via den kolumnen. En tränare tillhör lag via `team_coaches`. Den kopplingen görs inte här. Personen är tränare utan lag tills någon kopplar hen till ett lag.

Gamla närvarorader ligger kvar. De är historik och skrivs inte om.

Efter bytet måste personen logga in igen för att få en token med rollen COACH. Den gamla token säger fortfarande PLAYER. PR #29 är inmergad här, så filtret jämför token med databasen och nästa anrop blir 401. Testerna sparar en riktig aktiv användare och låter token peka på just det id:t och den rollen.

Ingen schemaändring. Rollnamnet är redan en textkolumn (se S1-2 och ADR 0002).

## Genomförande (S1-11)
- `ClubRole.canManageAllTrainings()` är sant för ADMIN och CHAIRMAN. COACH, PLAYER och PARENT är falskt. Lagkontrollen för en tränare ligger kvar i `TrainingService`, eftersom rollen inte vet vilka rader som finns i `team_coaches`.
- CHAIRMAN får skapa träning och markera närvaro på vilket lag som helst, utan att vara kopplad som tränare. Samma sak gäller att lista och hämta träningen, så ordföranden kan se det hen just ändrade.
- COACH är oförändrad: bara lag där hen finns i `team_coaches`.
- PLAYER och PARENT får 403 på personalens tränings-URL:er. De läser sitt schema via `/api/my/trainings`.
- Det finns fortfarande ingen URL för att byta titel eller tid på en träning. "Ändra" är den ändring ADMIN redan kan göra: markera närvaro.

## Genomförande (S1-10)
- `ClubRole.canReadEveryTeam()` är sant för ADMIN och CHAIRMAN. COACH, PLAYER och PARENT är falskt. Lagkontrollen för en tränare ligger i `UserService`, samma `team_coaches`-rad som när tränaren skapar eller ändrar en spelare (S1-3) och hanterar träningar (S1-11). Rollen vet inte vilka rader som finns i tabellen.
- `GET /api/users` är hela klubben. Bara ADMIN och CHAIRMAN. COACH får 403 och använder laglistan i stället.
- `GET /api/users/{id}`: COACH får läsa en spelare vars `teamId` är ett lag hen tränar, en tränare som är kopplad till ett sådant lag, en förälder till en aktiv spelare där, och sin egen rad. Annars 403. ADMIN och CHAIRMAN ser alla. PLAYER och PARENT är oförändrade: bara sin egen rad.
- Sök på namn ger bara träffar i tränarens lag. Ett annat lag ger en tom lista. Sök på tröjnummer eller telefon som inte ligger där ger samma 404-text som när personen saknas. Texten ändras inte här.
- `GET /api/teams/{id}/players` och `.../coaches`: COACH bara egna lag. Kontrollen sker före "Team not found", så ett okänt lag-id ger 403 för en tränare. ADMIN och CHAIRMAN ser alla lag, även lag de inte är kopplade till.

## Genomförande (S1-13, uppdaterat i F3)
- Läsningen i S1-10 gäller aktiva användare. En rad med `active=false` är dold för alla roller, även ADMIN, CHAIRMAN och tränaren i spelarens eget lag.
- ADMIN och CHAIRMAN får 404 "User not found" både när id saknas och när raden är inaktiv.
- PLAYER, PARENT och COACH får 403 i båda fallen. S1-13 sa 404 för alla. Arkitekten beslutade F3: svaret ska vara detsamma som för ett saknat id för den rollen, så statuskoden inte säger att kontot finns (ADR 0004).
- Listor och sök (`GET /api/users`, namn, tröjnummer, telefon, lagets spelare och tränare) visade redan bara `active=true`. Det är oförändrat.
- Att slå på kontot igen blir en egen endpoint senare. Den byggs inte här. Ändra och mjukradera ser fortfarande den inaktiva raden när anroparen får hantera laget, så de kan säga "Player is already inactive". En tränare som skickar ett id som saknas, eller en spelare i ett annat lag, får 403 (F8). ADMIN och CHAIRMAN får 404 när id saknas.

## Genomförande (F4, beslut b)
- En tränare får skapa en förälder bara som `newParent` på en aktiv spelare i ett lag hen tränar. En fristående `PARENT` är 400, inte 403. ADMIN och CHAIRMAN får fortfarande skapa en förälder utan barn.
- `parentId` som är inaktiv, eller som inte har rollen PARENT, är 400 när spelaren skapas. Samma regel fanns redan vid uppdatering.
- `getParentName`, `getParentEmail` och `getParentMobilePhoneNumber` ger null när föräldern är inaktiv, så namn, e-post och telefon inte följer med i svaret.
