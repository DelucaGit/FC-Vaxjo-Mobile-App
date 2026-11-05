# Rollmatris (S1-6a)

Senast uppdaterad: 2026-11-05, S1-10 och S1-13. IDOR-läsningarna är 403. Inaktiv rad är 404.

Det här är målet för vem som får anropa varje endpoint, och vilka personfält svaret får innehålla.
Källan är `docs/api/openapi.yaml` (`x-roles`, `x-scope`, `x-pii`, och `x-roles-planned` / `x-scope-planned` där de finns) plus ADR 0006.
Kolumnen **Kod idag** är vad Spring Security och servicen faktiskt gör på den här grenen.

Testerna ligger i `API/src/test/java/se/fcvaxjo/api/security/access/`.
Ett test = en mening: vem, vilket anrop, vad som ska hända.
Den påhittade klubben (Lag Alfa / Lag Beta) laddas i `ClubFixture` före varje test.

## Så kör du testerna

Från mappen `API`:

```bash
./mvnw test
```

Det är standardbygget. Det är grönt. Tester med taggen `known-gap` körs inte.
De är mätstickan för brister som fortfarande finns i koden. De ska faila tills storyn är fixad. Ändra inte produktionskod för att tysta dem, och mjuka inte upp förväntan.

```bash
./mvnw test -DexcludedGroups= -Dgroups=known-gap
```

Det kör bara mätstickan.

| Story | Gap-analys | Vad testerna mäter | I `./mvnw test` |
|---|---|---|---|
| S1-1 | Topp 5, punkt 1 | Inga seed-lösenord och ingen demoklubb i testprofilen | Gröna (`TestProfileSafetyTest`) |
| S1-2 | Topp 5, punkt 2 | Läsningar läcker e-post och telefon till fel roll | Tränarens laggräns är grön (S1-10), även de två IDOR-bytena. Telefon i 404-texten är grön (S1-12). Kvar som `known-gap`: spelarens egen rad visar förälderns telefon |
| S1-3 | Topp 5, punkt 3 | COACH kan skapa, ändra och mjukradera spelare i ett annat lag | `KnownCoachScopeTest` är grön och körs i vanliga bygget |
| S1-4 | Topp 5, punkt 4 | Inaktiv token ska nekas. GET av den inaktiva raden är 404 för alla roller | Token-testerna och GET-testerna är gröna (S1-13), även ordförande. Taggen `known-gap` är borta |
| ADR 0006 | Inte en egen topp-punkt. `x-roles-planned` | CHAIRMAN får skapa lag (PR #26), koppla eller ta bort en tränare (S1-7), skapa/ändra/ta bort spelare (S1-3) och byta en spelare till tränare (S1-8) | De testerna är gröna i `KnownChairmanAccessTest` och `TeamAccessTest` |
| GAP-6 | Övriga, punkt 6 | 404-texten ekar det sökta telefonnumret | Grön (S1-12). Testet i `KnownPiiLeakTest` körs i vanliga bygget. Texten är "User not found" |

Punkt 5 (JWT-hemlighet utan standardvärde) är redan åtgärdad. `TestProfileSafetyTest` kontrollerar att testprofilen har en tillräckligt lång testnyckel och att appen startar mot H2.

Gap-analysen skriver inte själv ut id:n S1-1..S1-4. Kopplingen ovan följer numreringen i topp 5, så S1-2 är punkt 2.

## Så läser du ett test

Exempel: `coachFromOtherTeam_cannotSeePlayerPhoneNumber`.

1. **Arrange.** `ClubFixture` har redan skapat Lag Alfa med en spelare och en föräldertelefon. Den som anropar är `Actor.COACH_BETA`, tränaren för det andra laget.
2. **Act.** `GET /api/teams/{alfa}/players`.
3. **Assert.** Status 403.
4. **Varför.** `parentMobilePhoneNumber` är `x-pii`. En tränare får se det bara för sitt eget lag (ADR 0006, S1-10). Testet är grönt: koden svarar 403.

## Fält

`FetchUserResponse` används av användarlistan, sök, tränarlistan och spelarlistan. Personfält (`x-pii`): `name`, `email`, `mobilePhoneNumber`, `parentName`, `parentEmail`, `parentMobilePhoneNumber`.

| Vem | Vilka kontaktfält |
|---|---|
| ADMIN | Alla användare |
| CHAIRMAN | Alla användare (klubbroll, ADR 0006). Koden släpper in det av misstag, för läsningarna saknar rollkontroll |
| COACH, eget lag | Spelare, föräldrar och tränare i laget. Förälderns telefon behövs för att driva laget |
| COACH, annat lag | Inga |
| PLAYER | Bara sin egen rad, och inte förälderns telefon eller e-post (föräldern är en annan person) |
| PARENT, eget barn | Barnets namn och schema via `/api/my`. Inte klubbkatalogen |
| PARENT, annat barn | Inga |

`TeamResponse` har bara id och namn. Inget `x-pii`. Alla inloggade får lista lag.

`AttendanceResponse`: `playerName` och `status` är `x-pii`. Bara ADMIN och lagets tränare. Ingen e-post och ingen föräldertelefon i det svaret.

`MyChildResponse` / `MyTrainingResponse`: barnets namn (och närvarostatus). Ingen e-post, ingen telefon.

## Endpoint för endpoint

Status nedan är målet. "Kod idag" är kort. Där målet redan stämmer är testet grönt. Där det inte stämmer pekar raden på storyn.

### Auth

| Anrop | Mål | Kod idag |
|---|---|---|
| `POST /api/auth/login` | Publik. 200 för aktiv användare, 400 för fel lösenord eller inaktiv | Stämmer. Inaktiv stoppas redan här |
| `POST /api/auth/change-password` | Inloggad, bara sitt eget lösenord. Inaktiv token ska få 401 | Stämmer. Inaktiv token får 401 i filtret |
| `POST /api/auth/refresh` | Inloggad och aktiv. Inaktiv får 400 | Inaktiv token får 401 i filtret, inte 400 |

### Användare

| Anrop | ADMIN | CHAIRMAN | COACH eget lag | COACH annat lag | PLAYER | PARENT eget barn | PARENT annat barn | Kod idag |
|---|---|---|---|---|---|---|---|---|
| `GET /api/users` | 200, all PII | 200, all PII | 403 (hela klubben) | 403 | 403 | 403 | 403 | 200 för ADMIN och CHAIRMAN. 403 för COACH, PLAYER och PARENT. **S1-10** |
| `GET /api/users/{id}` | 200 för aktiv. 404 för inaktiv | 200 för aktiv. 404 för inaktiv | 200 i eget lag, 403 annars. 404 för inaktiv | 403 för aktiv. 404 för inaktiv | 200 bara sig själv, utan förälderns telefon. 403 för andra. 404 för inaktiv | 403. 404 för inaktiv | 403 för aktiv. 404 för inaktiv | COACH är begränsad till egna lag. Egen rad för spelare visar fortfarande förälderns telefon. Inaktiv rad är 404 "User not found" för alla roller. **S1-10**, **S1-13** |
| `GET /api/users/search` | 200 | 200 | 200 bara eget lag | tomt | 403 | 403 | 403 | COACH ser bara egna lag. Saknat telefonnummer ger 404 "User not found". **S1-10**, **S1-12** |
| `POST /api/users` | 201 | 201 spelare, förälder eller tränare. Inte ADMIN | 201 PLAYER i eget lag | 403 | 403 | 403 | 403 | Stämmer efter S1-3 och S1-8 |
| `PUT /api/users/{id}/player` | 200 | 200 alla lag | 200 eget lag | 403 | 403 | 403 | 403 | Stämmer efter S1-3 |
| `DELETE /api/users/{id}` | 204 | 204 | 204 eget lag | 403 | 403 | 403 | 403 | Stämmer efter S1-3 |
| `PUT /api/users/{id}/role` | 200 vilken roll som helst | 200 bara PLAYER till COACH, inte egen roll, inte ADMIN/CHAIRMAN | 403 | 403 | 403 | 403 | 403 | Stämmer efter S1-8 |

COACH får i koden inte skapa en fristående PARENT (bara PLAYER, plus ny förälder via `newParent`). ADR 0006 säger att tränaren ska kunna skapa förälder. Det är en öppen fråga i kontraktet, inte en S1-test.

### Lag

| Anrop | ADMIN | CHAIRMAN | COACH eget | COACH annat | PLAYER | PARENT | Kod idag |
|---|---|---|---|---|---|---|---|
| `GET /api/teams` och `GET /api/teams/{id}` | 200, inga personfält | 200 | 200 | 200 | 200 | 200 | Stämmer |
| `GET /api/teams/{id}/coaches` | 200 med telefon/e-post | 200 | 200 | 403 | 403 | 403 | Stämmer efter S1-10. COACH bara egna lag. PLAYER och PARENT 403 |
| `GET /api/teams/{id}/players` | 200 med föräldratelefon | 200 | 200 med föräldratelefon | 403 | 403 | 403 | Stämmer efter S1-10. COACH bara egna lag. PLAYER och PARENT 403 |
| `POST /api/teams` | 201 | 201 | 403 | 403 | 403 | 403 | Stämmer efter PR #26. `x-roles` är ADMIN och CHAIRMAN |
| `POST` / `DELETE .../coaches` | 201 / 204 | 201 / 204 | 403 | 403 | 403 | 403 | ADMIN och CHAIRMAN. Stämmer efter S1-7. `x-roles` är ADMIN och CHAIRMAN |

### Träningar

`x-roles`: ADMIN, CHAIRMAN och COACH. `x-scope`: ADMIN och CHAIRMAN alla lag. COACH bara lag i `team_coaches`. PLAYER och PARENT: 403.
Det gäller lista, hämta, skapa, lista närvaro och markera närvaro.

Kod idag: stämmer efter S1-11. Närvarosvaret har spelarens namn, inte e-post och inte förälderns telefon.

### Mitt schema

| Anrop | Mål | Kod idag |
|---|---|---|
| `GET /api/my/teams` | ADMIN alla lag. COACH bara sina. Övriga 403 | Stämmer |
| `GET /api/my/children` | PARENT, bara egna aktiva barn, namn och lag. Ingen e-post, ingen telefon. Övriga 403 | Stämmer |
| `GET /api/my/trainings` | PLAYER bara sig själv (childId är 403). PARENT måste skicka sitt eget barn (annat barn 403, saknad childId 400). Ingen e-post | Stämmer |

### Anonymt anrop

Varje operation i `docs/api/openapi.yaml` utom `POST /api/auth/login` ska ge 401 utan token, inklusive de planerade `/api/public/**` (de är inte byggda och får inte vara öppna). Login med fel lösenord är 400. `AnonymousAccessTest` läser filen, så en ny path kommer med av sig själv. Koden gör detta idag.

### Trasig token

Mot en skyddad URL. Förväntan: 401 och body exakt `{"message":"Login required"}`. Ingen stacktrace, ingen telefon, ingen e-post.

| Fall | Kod idag |
|---|---|
| Utgången token | 401 |
| Ändrad payload, samma signatur (höjd roll eller annat userId) | 401 |
| Annan signeringsnyckel | 401 |
| `alg: none` | 401 |
| Token för ett userId som inte finns | 401 |
| Skräpformat | 401 |
| Prefix som inte är `Bearer` | 401 |

Nyckeln i testerna är testprofilens `app.jwt.secret`, plus en uppenbart påhittad andra nyckel. Inga riktiga hemligheter.

### IDOR (byte av id)

| Byte | Mål | Kod idag |
|---|---|---|
| Spelare byter `users/{id}` till en annan person eller ett okänt id | 403, så svaret inte säger om id:t finns | Stämmer |
| Förälder byter `childId` till ett annat barn | 403 | Stämmer |
| Förälder byter `childId` till ett id som inte finns | 404, kontraktet säger "Player not found" | Stämmer |
| Tränare byter `teamId` på träningar till ett annat lag eller ett okänt lag | 403, även när laget inte finns | Stämmer |
| Tränare byter tränings-id till ett annat lag | 403 | Stämmer |
| Tränare byter tränings-id till ett id som inte finns | 404 för alla, kontraktet skiljer på saknad rad | Stämmer |
| Tränare byter lag-id på spelarlistan | 403, ingen föräldratelefon | 403. Taggen `known-gap` är borta. **S1-10** |
| Tränare byter user-id till en spelare i ett annat lag | 403 | 403. Taggen `known-gap` är borta. **S1-10** |
| Ordförande öppnar en träning i vilket lag som helst | 200 | Stämmer (S1-11) |

### Inaktiv rad

Beslut: `GET /api/users/{id}` på en inaktiv användare är **404 "User not found" för ADMIN, CHAIRMAN, COACH, PLAYER och PARENT**. En redan utfärdad token för det inaktiva kontot är 401 (det stämmer, S1-4). GET:en stämmer efter S1-13. Taggen `known-gap` är borta från de testerna. Ett id som saknas är fortfarande 403 för spelare, förälder och en tränare utanför laget, och 404 för admin och ordförande.

### Planerade publika anrop

`/api/public/**` är `x-status: planned` och finns inte i koden. Anonymt anrop får 401, inte en öppen lista. Ingen mätsticka för "ska vara 200", för de är inte byggda än.

## Vad som läcker idag, per roll

**ADMIN.** Ser klubbens persondata, och det ska en admin. `GET /api/users/{id}` på en inaktiv spelare är 404 "User not found" (S1-13). Sök på ett nummer som inte finns säger "User not found" och upprepar inte numret (S1-12).

**CHAIRMAN.** Får skapa lag, koppla tränare, sköta spelare och markera träning i alla lag. En inaktiv rad är 404 "User not found", samma som för admin (S1-13).

**COACH, eget lag.** Får förälderns telefon på den egna laglistan, och det ska de. `GET /api/users` är 403. Sök ger bara träffar i egna lag (S1-10).

**COACH, annat lag.** `GET /api/users/{id}`, lagets spelare och lagets tränare svarar 403 (S1-10). Skapa, ändra och mjukradera i det andra laget är 403 (S1-3). Träningar med ett annat lag-id är 403, även om laget inte finns. `/api/my/teams` är redan spärrat.

**PLAYER.** Katalog, sök och andras id är 403. Eget schema läcker inte förälderns telefon. Den egna användarraden gör det fortfarande (S1-2). En inaktiv annans id ger 404 "User not found" (S1-13).

**PARENT, eget barn.** `/api/my` visar bara det egna barnet, utan e-post och telefon. Katalogen är 403.

**PARENT, annat barn.** `childId` för det andra barnet är 403. Ett id som inte finns är 404, som kontraktet säger. Laglistan är 403.

**Inaktiv spelare.** Login är 400. En gammal token får 401 (S1-4). `GET /api/users/{id}` på den inaktiva raden är 404 "User not found" för alla roller (S1-13). Listor och sök tar inte med raden.

**Anonym och trasig token.** 401 utan persondata i svaret. Inget hål där i den här körningen.
