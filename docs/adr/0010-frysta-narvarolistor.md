# ADR 0010: Närvarolistor fryses efter träningen

**Status:** Accepterad (Marcel, 2026-11-10, issue #86) · **Datum:** 2026-11-10

## Kontext
Klubben vill kunna lita på närvarohistoriken. En ny spelare som börjar i laget ska inte dyka upp på gamla träningar, och en spelare som har slutat ska finnas kvar på de träningar hen var med på.

Tidigare kopierades lagets spelare till närvarolistan när träningen skapades (`POST /api/trainings`). Det gav två problem: en spelare som kom in i laget efter att framtida träningar redan var skapade saknades på dem, och listan följde inte laget fram till själva träningen.

## Beslut
1. **Öppen lista är levande.** Så länge listan inte är fryst visar den alla aktiva PLAYER i laget just nu, med sparad status eller `null` (inte markerad). En rad sparas först när någon markeras. `POST /api/trainings` kopierar inte längre spelare.
2. **"Klar" fryser listan.** `PUT /api/trainings/{id}/attendance/lock` får anropas av ADMIN, CHAIRMAN och COACH för eget lag. Alla spelare på den levande listan måste vara markerade, annars 400 "All players must be marked before the attendance list can be frozen". Ett lag utan spelare kan frysas direkt. Är listan redan fryst blir svaret 200 och inget ändras. Inställd träning ger 400.
3. **Automatisk frysning.** En träning som inte är fryst, inte är inställd (CANCELLED) och där nu är mer än 6 timmar efter `endsAt` fryses automatiskt. "Nu" är väggklockan i Europe/Stockholm. Det sker första gången träningen läses eller ändras, inte av ett schemalagt jobb.
4. **Automatisk frysning behåller bara de rader som redan är sparade** ("alternativ A"). Omarkerade spelare läggs inte till. Skälet är att frysningen kan ske flera dagar senare, när laget redan har ändrats, och då vore dagens lag fel personer.
5. **En fryst lista ändras aldrig.** Markering ger 400. Spelare som slutat ligger kvar (namnet visas fortfarande), och spelare som kommit till senare syns inte. Att ändra träningens tid låser inte upp listan.
6. Inställda träningar fryses aldrig automatiskt. Aktiveras träningen igen gäller 6-timmarsregeln igen.
7. Nytt fält `attendanceLockedAt` (`null` = öppen) i `TrainingResponse` och `MyTrainingResponse` (`GET /api/my/trainings`).
8. Gamla data: passerade träningar som fick kopierade rader när de skapades fryses med exakt de raderna första gången de rörs.

## Kostnad
- En fryst lista kan inte rättas, inte ens om tränaren har markerat fel. Idag skulle ADMIN behöva gå in direkt i databasen. Ett sätt att rätta i appen är en senare fråga.
- En skrivning kan ske under ett GET-anrop (den automatiska frysningen). Det är ovanligt för ett läsanrop och viktigt att känna till när man felsöker.
- Om ingen trycker "Klar" försvinner omarkerade spelare ur historiken, eftersom bara sparade rader fryses.

## Alternativ som vi har övervägt
- **Kopiera laget när träningen skapas (det gamla sättet).** Avvisat. Nya spelare saknas på framtida träningar som redan är skapade.
- **Alltid visa dagens lag.** Avvisat. Det skriver om historiken: spelare som slutat försvinner och nya spelare dyker upp på gamla träningar.
- **Frysa med ett schemalagt jobb (scheduler).** Avvisat. Fler rörliga delar att köra och övervaka. Lat frysning vid första läsning ger samma resultat för användaren.
- **Automatisk frysning som tar med dagens lag.** Avvisat. Frysningen kan ske flera dagar efter träningen, och då hamnar fel personer på listan.

## Konsekvenser
- `docs/api/openapi.yaml` och `docs/testing/rollmatris.md` beskriver reglerna. `TrainingAttendanceFreezeTest` låser dem.
- Appen behöver en "Klar"-knapp och måste visa att en fryst lista inte går att ändra.
- Medlemmars start- och slutdatum (`memberSince`/`memberUntil`, issue #85) används inte av frysningen ännu.
- **Byggt för matcher** (issue #67, PR #90, ersätter PR #84). Matcher följer samma regler, med de skillnader som står i nästa avsnitt.

## Matcher (issue #67)
1. Anropen är `GET /api/matches/{id}/attendance`, `PUT /api/matches/{id}/attendance/{playerId}` och `PUT /api/matches/{id}/attendance/lock` ("Klar"). ADMIN, CHAIRMAN och COACH för matchens lag får använda dem. COACH för annat lag, PLAYER och PARENT får 403. Anonym får 401.
2. **Okänt match-id:** ADMIN och CHAIRMAN får 404, men COACH får 403. Det är samma som för matchens andra anrop: en tränare ska inte kunna se om en match i ett annat lag finns.
3. **Automatisk frysning 8 timmar efter avspark** (`kickoffAt`, Europe/Stockholm). Matcher har ingen sluttid, så vi räknar med ungefär 2 timmars match plus samma 6 timmar som för träningar. Frysningen sker lat när en enskild match läses eller ändras, när lagets matchlista hämtas och i `GET /api/my/matches`.
4. Markering på en öppen lista kräver att spelaren finns på den levande listan, annars 400. Raden skapas första gången spelaren markeras. På en fryst lista ger markering 400 "The attendance list for this match is frozen and can no longer be changed".
5. Ny tabell `match_attendance` med unik nyckel (`match_id`, `player_user_id`). `attendanceLockedAt` finns i `MatchResponse` och `MyMatchResponse`. `MatchAttendanceFreezeTest` låser reglerna.
6. **Två separata klasser.** `MatchAttendanceRoster` är en nära kopia av `TrainingAttendanceRoster`, inte en gemensam generisk klass. Skälet är att varje klass blir lätt att läsa. Kostnaden är att en regeländring måste göras på två ställen.
