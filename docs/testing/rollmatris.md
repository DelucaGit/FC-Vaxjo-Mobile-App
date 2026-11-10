# Rollmatris (S1-6a)

Senast uppdaterad: 2026-11-10, inga spelardata publikt (ADR 0007). Tröjnumrets 404 är "User not found". Inaktiv refresh är 401.

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
| S1-2 | Topp 5, punkt 2 | Läsningar läcker e-post och telefon till fel roll | Tränarens laggräns är grön (S1-10). Spelarens egen rad döljer förälderns namn, e-post och telefon (F6). Inga `known-gap`-tester är kvar |
| S1-3 | Topp 5, punkt 3 | COACH kan skapa, ändra och mjukradera spelare i ett annat lag | `KnownCoachScopeTest` är grön och körs i vanliga bygget |
| S1-4 | Topp 5, punkt 4 | Inaktiv token ska nekas. GET av den inaktiva raden är 404 för ADMIN och CHAIRMAN, och 403 för PLAYER, PARENT och COACH (F3) | Token-testerna är gröna. GET-testerna är gröna efter F3. Taggen `known-gap` är borta |
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
| `POST /api/auth/login` | Publik. 200 för aktiv användare. Fel lösenord, okänd e-post och inaktiv ger samma 401 | Stämmer (S1-9). Saknad e-post eller lösenord är fortfarande 400 |
| `POST /api/auth/login`, spärr (#64, ADR 0008) | 429 i 15 minuter, även med rätt lösenord, efter 5 misslyckade försök per e-post+IP, 30 per IP eller 20 per e-post. Samma e-post från annan IP släpps fram tills 20. Lyckad inloggning nollställer e-post+IP och e-post. Intern IP (proxy) ger e-post ensam vid 5. Falska `X-Real-IP`/`X-Forwarded-For` ignoreras utan betrodd proxy. 429-svaret innehåller ingen IP | Stämmer (`LoginRateLimitTest`, `LoginAttemptLimiterTest`, styrbar klocka; `LoginClientIpServerTest` med riktig Tomcat och `X-Real-IP`). Okänd e-post räknas likadant |
| `POST /api/auth/change-password` | Inloggad, bara sitt eget lösenord. Inaktiv token ska få 401 | Stämmer. Inaktiv token får 401 i filtret |
| `POST /api/auth/refresh` | Inloggad och aktiv. Inaktiv får 401 | Inaktiv token får 401. Texten är "Login required", samma som övriga nekade token (F11) |

### Användare

| Anrop | ADMIN | CHAIRMAN | COACH eget lag | COACH annat lag | PLAYER | PARENT eget barn | PARENT annat barn | Kod idag |
|---|---|---|---|---|---|---|---|---|
| `GET /api/users` | 200, all PII | 200, all PII | 403 (hela klubben) | 403 | 403 | 403 | 403 | 200 för ADMIN och CHAIRMAN. 403 för COACH, PLAYER och PARENT. **S1-10** |
| `GET /api/users/{id}` | 200 för aktiv. 404 för inaktiv och för saknat id | 200 för aktiv. 404 för inaktiv och för saknat id | 200 i eget lag, 403 annars. 403 för inaktiv och för saknat id | 403 för aktiv. 403 för inaktiv | 200 bara sig själv, utan förälderns namn, e-post och telefon. 403 för andra. 403 för inaktiv | 403. 403 för inaktiv | 403 för aktiv. 403 för inaktiv | COACH är begränsad till egna lag och ser förälderns fält. Spelaren ser inget av de tre fälten (F6). Inaktiv rad är 404 för ADMIN och CHAIRMAN, och 403 för de andra tre (F3). **S1-10**, **S1-13**, **F3**, **F6** |
| `POST /api/users/search` | 200 | 200 | 200 bara eget lag | tomt | 403 | 403 | 403 | Kroppen har exakt ett av name, playerNumber, phone. GET är 405. COACH ser bara egna lag. Saknat telefonnummer och saknat tröjnummer ger 404 "User not found". **F1**, **S1-10**, **S1-12**, **F2** |
| `POST /api/users` | 201 | 201 spelare, förälder eller tränare. Inte ADMIN | 201 PLAYER i eget lag, och förälder bara som `newParent` på den spelaren | 403 | 403 | 403 | 403 | Beslut (b) är stängt. En tränare som skapar en fristående förälder får 400. ADMIN och CHAIRMAN får skapa förälder fritt. |
| `PUT /api/users/{id}/player` | 200 | 200 alla lag | 200 eget lag | 403 | 403 | 403 | 403 | Stämmer efter S1-3 |
| `DELETE /api/users/{id}` | 204 | 204 | 204 eget lag | 403 | 403 | 403 | 403 | Stämmer efter S1-3 |
| `PUT /api/users/{id}/role` | 200 vilken roll som helst | 200 bara PLAYER till COACH, inte egen roll, inte ADMIN/CHAIRMAN | 403 | 403 | 403 | 403 | 403 | Stämmer efter S1-8 |

Beslut (b), stängt: en tränare får skapa en förälder bara tillsammans med en aktiv spelare i ett lag hen tränar (`newParent` på den spelaren). Allt annat om den föräldern är 400, inklusive en fristående `PARENT`. ADMIN och CHAIRMAN får skapa en förälder utan barn. En inaktiv förälder syns inte i `parentName`, `parentEmail` eller `parentMobilePhoneNumber`. Att koppla en spelare till en inaktiv förälder, eller till någon som inte är PARENT, är 400.

F7: när en tränare skapar en användare och e-post eller telefon redan finns, är svaret 400 `Could not create the user`. Samma text i eget lag och i ett annat lag, och samma text för båda fälten. ADMIN och CHAIRMAN behåller de exakta texterna. Ett tröjnummer som redan finns är samma 400 för tränaren, och `Shirt number already in use` för ADMIN och CHAIRMAN (F10).

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

`PUT /api/trainings/{id}` ändrar tid, plats och titel. Laget ändras inte.
`PUT /api/trainings/{id}/cancellation` sätter CANCELLED och en valfri orsak. Raden raderas inte. Närvaron ligger kvar, men ny närvaro är 400 "This training is cancelled".
Samma URL med `cancelled=false` aktiverar träningen igen: SCHEDULED och tom orsak, och närvaro går att markera igen. Samma roller och lag som när den ställs in; COACH för annat lag och PLAYER/PARENT får 403.
PLAYER och PARENT ser `trainingStatus` CANCELLED i `GET /api/my/trainings`. Personal ser `status` i lagets lista.

Kod idag: stämmer. Anonymt anrop är 401.

### Matcher

`x-roles` för personalens URL:er: ADMIN, CHAIRMAN och COACH. `x-scope`: ADMIN och CHAIRMAN alla lag. COACH bara lag i `team_coaches`. PLAYER och PARENT: 403 på de URL:erna.
Det gäller lista, hämta, skapa, sätta resultat och tömma resultat.

`PUT /api/matches/{id}/result` med båda målen `null` tömmer resultatet. Bara ett mål satt ger 400. Samma roller och lag som får sätta resultatet får tömma det. En COACH från ett annat lag får 403 och resultatet ligger kvar.

En COACH som byter match-id till ett annat lag får 403. Samma 403 när id inte finns, så svaret inte säger att matchen finns. ADMIN och CHAIRMAN får 404 "Match not found" när id saknas.

`GET /api/my/matches`: PLAYER bara sitt lag. PARENT måste skicka sitt eget barn. Ingen e-post, ingen telefon, inget `createdByUserId`.

Kod idag: stämmer. Anonymt anrop är 401.

### Mitt schema

| Anrop | Mål | Kod idag |
|---|---|---|
| `GET /api/my/teams` | ADMIN alla lag. COACH bara sina. Övriga 403 | Stämmer |
| `GET /api/my/children` | PARENT, bara egna aktiva barn, namn och lag. Ingen e-post, ingen telefon. Övriga 403 | Stämmer |
| `GET /api/my/trainings` | PLAYER bara sig själv (childId är 403). PARENT måste skicka sitt eget barn (annat barn 403, saknad childId 400). Ingen e-post. `trainingStatus` visar CANCELLED när träningen är inställd | Stämmer |
| `GET /api/my/matches` | Samma personregler som träningarna. Motståndare, tid, plats, hemma/borta och resultat. Ingen e-post | Stämmer |
| `GET /api/my/coaches` | PLAYER och PARENT, samma personregler som träningarna (okänt barn 404). Bara de aktiva tränarna i det egna (barnets) laget, med id, namn, e-post och telefon (ADR 0009). Inte andra lags tränare. ADMIN, CHAIRMAN och COACH 403 | Stämmer (`MyCoachesAccessTest`) |

### Planerade publika anrop

`GET /api/public/teams`, `GET /api/public/matches/upcoming`, `GET /api/public/matches/history` är öppna utan token. Ingen spelardata, ingen e-post och ingen telefon (ADR 0007). Den gamla truppen `GET /api/public/teams/{id}/players` är borttagen och ger 404. `PublicLeakTest` seedar en spelare med unika värden och anropar alla publika GET-endpoints som Spring känner till.

`GET /api/public/teams/{id}/trainings` och `GET /api/public/teams/{id}/coaches` är kvar som planerade. De har ingen handler, så svaret är 404, inte en lista.

POST, PUT och DELETE under `/api/public` får 401 utan token, och 405 när någon är inloggad men metoden inte finns.

### Anonymt anrop

Varje operation i `docs/api/openapi.yaml` utom `POST /api/auth/login` och `GET /api/public/**` ska ge 401 utan token. Login med fel lösenord, okänd e-post eller inaktivt konto är 401 med texten "Invalid email or password" (S1-9). Saknad e-post eller lösenord är 400. `AnonymousAccessTest` läser filen och hoppar över de publika GET-anropen. Övriga nya paths kommer med av sig själv.

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
| Tränare byter match-id till ett annat lag | 403 | Stämmer |
| Tränare byter match-id till ett id som inte finns | 403, samma text som ett annat lag | Stämmer |
| Ordförande öppnar en match i vilket lag som helst | 200 | Stämmer |
| Tränare byter lag-id på spelarlistan | 403, ingen föräldratelefon | 403. Taggen `known-gap` är borta. **S1-10** |
| Tränare byter user-id till en spelare i ett annat lag | 403 | 403. Taggen `known-gap` är borta. **S1-10** |
| Ordförande öppnar en träning i vilket lag som helst | 200 | Stämmer (S1-11) |

### Inaktiv rad

Beslut (F3, Arkitekten): `GET /api/users/{id}` på en inaktiv användare är **404 "User not found" för ADMIN och CHAIRMAN**. PLAYER, PARENT och COACH får **403**, samma svar som för ett id som saknas, även när de skulle få se raden om den var aktiv. En redan utfärdad token för det inaktiva kontot är 401 (det stämmer, S1-4). S1-13 sa 404 för alla roller. De tester som krävde 404 för de tre rollerna är ändrade, för de strider mot F3.

### Ändra och mjukradera ett id som saknas

Beslut (F8): en tränare får 403 både när id saknas och när spelaren ligger i ett annat lag, på `PUT /api/users/{id}/player` och `DELETE /api/users/{id}`. ADMIN och CHAIRMAN får fortfarande 404 när id saknas.

## Vad som läcker idag, per roll

**ADMIN.** Ser klubbens persondata, och det ska en admin. `GET /api/users/{id}` på en inaktiv spelare är 404 "User not found" (S1-13). Sök på ett nummer som inte finns säger "User not found" och upprepar inte numret (S1-12).

**CHAIRMAN.** Får skapa lag, koppla tränare, sköta spelare och markera träning i alla lag. En inaktiv rad är 404 "User not found", samma som för admin (S1-13).

**COACH, eget lag.** Får förälderns telefon på den egna laglistan, och det ska de. `GET /api/users` är 403. Sök ger bara träffar i egna lag (S1-10).

**COACH, annat lag.** `GET /api/users/{id}`, lagets spelare och lagets tränare svarar 403 (S1-10). Skapa, ändra och mjukradera i det andra laget är 403 (S1-3). Ett id som saknas är samma 403 på ändra och mjukradera (F8). Träningar med ett annat lag-id är 403, även om laget inte finns. `/api/my/teams` är redan spärrat.

**PLAYER.** Katalog, sök och andras id är 403. Eget schema läcker inte förälderns telefon. Den egna användarraden döljer `parentName`, `parentEmail` och `parentMobilePhoneNumber` (F6, beslut c). En inaktiv rad ger samma 403 som ett saknat id (F3). `/api/my/coaches` visar namn, e-post och telefon till de aktiva tränarna i det egna laget, inga andra (ADR 0009). `/api/teams/{id}/coaches` är fortfarande 403.

**PARENT, eget barn.** `/api/my` visar bara det egna barnet, utan e-post och telefon. Undantaget är `/api/my/coaches`, som visar namn, e-post och telefon till de aktiva tränarna i barnets lag (ADR 0009). Katalogen och `/api/teams/{id}/coaches` är 403.

**PARENT, annat barn.** `childId` för det andra barnet är 403. Ett id som inte finns är 404, som kontraktet säger. Laglistan är 403.

**Inaktiv spelare.** Login är 401 med samma text som fel lösenord, `Invalid email or password` (S1-9). En redan utfärdad token stoppas av filtret (S1-4). `GET /api/users/{id}` är 404 "User not found" för ADMIN och CHAIRMAN, och 403 för PLAYER, PARENT och COACH (F3). Listor och sök tar inte med raden.

**Anonym och trasig token.** Skyddade URL:er är 401 utan persondata i svaret. `GET /api/public/**` är öppet och innehåller inte e-post eller telefon.
