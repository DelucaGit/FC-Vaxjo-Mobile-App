# Rollmatris (S1-6a)

Senast uppdaterad: 2026-11-05.

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
| S1-2 | Topp 5, punkt 2 | Läsningar läcker e-post och telefon till fel roll | Tränarens laggräns är grön (S1-10). Kvar som `known-gap`: spelarens egen rad visar förälderns telefon, och telefon i 404-texten |
| S1-3 | Topp 5, punkt 3 | COACH kan skapa, ändra och mjukradera spelare i ett annat lag | `KnownCoachScopeTest` är grön och körs i vanliga bygget |
| S1-4 | Topp 5, punkt 4 | Inaktiv token ska nekas. GET av den inaktiva raden är kvar | Token-testerna i `KnownInactiveUserTest` är gröna. GET-testerna är kvar som `known-gap` |
| ADR 0006 | Inte en egen topp-punkt. `x-roles-planned` | CHAIRMAN får skapa lag (PR #26), koppla eller ta bort en tränare (S1-7), skapa/ändra/ta bort spelare (S1-3) och byta en spelare till tränare (S1-8) | De testerna är gröna i `KnownChairmanAccessTest` och `TeamAccessTest` |
| GAP-6 | Övriga, punkt 6 | 404-texten ekar det sökta telefonnumret | Ett test i `KnownPiiLeakTest`, exkluderas |

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
| `GET /api/users` | 200, all PII | 200, all PII | 403 | 403 | 403 | 403 | 403 | 200 för ADMIN och CHAIRMAN. 403 för COACH. **S1-10** |
| `GET /api/users/{id}` | 200 | 200 | 200 i eget lag, 403 annars | 403 | 200 bara sig själv, utan förälderns kontaktfält. 403 för andra | 403 (använd `/api/my`) | 403 | COACH är begränsad till egna lag. Egen rad för spelare visar fortfarande förälderns telefon. Inaktiva rader lämnas ut. **S1-10**, **S1-4** |
| `GET /api/users/search` | 200 | 200 | 200 bara träffar i eget lag | tomt / inga andra lag | 403 | 403 | 403 | COACH ser bara egna lag. Telefon i 404-texten är kvar. **S1-10**, **GAP-6** |
| `POST /api/users` | 201 | 201 (planerat) | 201 för PLAYER i eget lag | 403 | 403 | 403 | 403 | ADMIN och COACH 201 utan lagkoll. CHAIRMAN 403. **S1-3**, **ADR 0006** |
| `PUT /api/users/{id}/player` | 200 | 200 (planerat) | 200 | 403 | 403 | 403 | 403 | ADMIN och COACH 200 utan lagkoll. **S1-3**, **ADR 0006** |
| `DELETE /api/users/{id}` | 204 | 204 (planerat) | 204 | 403 | 403 | 403 | 403 | ADMIN och COACH 204 utan lagkoll. **S1-3**, **ADR 0006** |
| `PUT /api/users/{id}/role` | 200 | 200 utom rollen ADMIN (planerat, öppen fråga om COACH) | 403 | 403 | 403 | 403 | 403 | Bara ADMIN. CHAIRMAN 403. **ADR 0006** |

COACH får i koden inte skapa en fristående PARENT (bara PLAYER, plus ny förälder via `newParent`). ADR 0006 säger att tränaren ska kunna skapa förälder. Det är en öppen fråga i kontraktet, inte en S1-test.

### Lag

| Anrop | ADMIN | CHAIRMAN | COACH eget | COACH annat | PLAYER | PARENT | Kod idag |
|---|---|---|---|---|---|---|---|
| `GET /api/teams` och `GET /api/teams/{id}` | 200, inga personfält | 200 | 200 | 200 | 200 | 200 | Stämmer |
| `GET /api/teams/{id}/coaches` | 200 med telefon/e-post | 200 | 200 | 403 | 403 | 403 | Stämmer efter S1-10. COACH bara egna lag |
| `GET /api/teams/{id}/players` | 200 med föräldratelefon | 200 | 200 med föräldratelefon | 403 | 403 | 403 | Stämmer efter S1-10. COACH bara egna lag |
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

### Planerade publika anrop

`/api/public/**` är `x-status: planned` och finns inte i koden. Anonymt anrop får 401, inte en öppen lista. Ingen mätsticka för "ska vara 200", för de är inte byggda än.

## Vad som läcker idag, per roll

**ADMIN.** Får se det ADMIN ska se. Två hål: `GET /api/users/{id}` lämnar ut en inaktiv spelare, med e-post och telefon (S1-4). Sök på ett nummer som inte finns skriver numret i 404-texten (GAP-6).

**CHAIRMAN.** Rollen finns och `POST /api/teams` svarar 201 (PR #26). Personlistorna svarar 200 för ordföranden och 403 för spelare och förälder (S1-1). Att skapa, ändra och ta bort en spelare fungerar i alla lag (S1-3). Att koppla eller ta bort en tränare svarar 201 och 204 (S1-7). Att byta en spelare till tränare svarar 200 (S1-8). Träningar får ordföranden skapa och markera på alla lag (S1-11).

**COACH, eget lag.** Får förälderns telefon på den egna laglistan, och det ska de. `GET /api/users` är 403. Sök ger bara träffar i egna lag (S1-10).

**COACH, annat lag.** `GET /api/users/{id}`, lagets spelare och lagets tränare svarar 403 (S1-10). Skrivningar mot det andra laget är 403 (S1-3). Träningar och `/api/my/teams` är redan spärrade.

**PLAYER.** `/api/my/trainings` visar bara det egna schemat och inte förälderns telefon. Katalogen, sök, `GET /api/users/{id}` (även den egna raden, som innehåller förälderns telefon), lagets spelare och lagets tränare svarar 200 med andras kontaktfält (S1-2). Skrivningar är 403, och det är rätt.

**PARENT, eget barn.** `/api/my/children` och `/api/my/trainings?childId=` visar bara det egna barnet, utan e-post och telefon. Samma förälder kan ändå lista hela klubben och andra lags föräldratelefon (S1-2).

**PARENT, annat barn.** `/api/my/trainings?childId=` för det andra barnet är 403. `GET /api/users/{id}` och laglistan för det andra barnet är 200 med telefon och e-post (S1-2).

**Inaktiv spelare.** Login är 400. Refresh är 400. En token som redan är utfärdad kan fortfarande anropa till exempel `GET /api/teams` och byta lösenord (S1-4). `GET /api/users/{id}` på den inaktiva raden svarar 200 (S1-4).
