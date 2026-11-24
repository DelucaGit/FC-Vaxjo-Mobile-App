# Databasändringar för den nya designen

Det här dokumentet hör ihop med prototypen `fc-vaxjo-prototyp.html` i samma mapp.
Det listar vad som behöver ändras i databasen (och API:t) för att designen ska gå att bygga.

Jämförelsen är gjord mot modellerna i `API/src/main/java/se/fcvaxjo/api/model/` den 22 november 2026.
Tre frågor är beslutade (se "Beslut" nedan). Inget är byggt.

## Sammanfattning

| # | Ändring | Typ | Behövs för |
|---|---|---|---|
| 1 | Ledighetsbegäran | Ny tabell | Spelare begär ledigt, tränare godkänner eller nekar |
| 2 | Sparade platser | Ny tabell | Listan "Var ska ni vara?" med Redigera |
| 3 | Sluttid på match | Ny kolumn | Start- och sluttid i matchguiden |
| 4 | Närvaro utgår från att alla kommer | Ändrad regel, ingen ny kolumn | Spelaren tillfrågas aldrig |

## Beslut (22 november 2026)

- Listan med sparade platser är gemensam för hela klubben.
- Motståndare sparas inte i en lista. Tränaren skriver namnet i en textruta.
- Ledigt kan bara begäras innan aktiviteten har börjat.

## 1. Ledighetsbegäran (ny tabell)

Idag finns ingen plats att spara en begäran. Närvaron har bara `PRESENT`, `ABSENT` och `EXCUSED`.

Förslag: en tabell `leave_requests`.

| Kolumn | Typ | Kommentar |
|---|---|---|
| `id` | bigint, PK | |
| `player_user_id` | bigint, inte null | Spelaren begäran gäller |
| `requested_by_user_id` | bigint, inte null | Spelaren själv eller föräldern |
| `training_id` | bigint, null | Exakt en av `training_id` och `match_id` är satt |
| `match_id` | bigint, null | |
| `reason_type` | text, inte null | `SICK`, `SCHOOL`, `FAMILY`, `INJURY`, `OTHER` |
| `reason_text` | text, null | Krävs (minst 5 tecken) när typen är `OTHER` |
| `status` | text, inte null | `PENDING`, `APPROVED`, `DENIED` |
| `coach_note` | text, null | Tränarens kommentar, visas vid nekad |
| `decided_by_user_id` | bigint, null | Tränaren som svarade |
| `decided_at` | timestamp, null | |
| `created_at` | timestamp, inte null | |

Regler:

- En spelare kan bara ha en aktiv begäran per aktivitet (unik på spelare + aktivitet).
- Spelaren kan dra tillbaka en begäran som är `PENDING`. Raden tas då bort.
- När en begäran blir `APPROVED` sätts närvaron för den spelaren till `EXCUSED`. Det värdet finns redan i `AttendanceStatus`.
- Orsaken är personuppgift och kan vara känslig (sjukdom, skada). Den ska märkas `x-pii` i `openapi.yaml`, och bara spelaren, föräldern och lagets tränare får läsa den.

- En begäran kan bara skickas innan aktiviteten har börjat. API:t nekar en begäran efter starttiden.

## 2. Sparade platser (ny tabell)

Idag är `venue` en fri text på `trainings` och `club_matches`. Det kan vara kvar så.
Den nya tabellen är bara listan med förslag som tränaren väljer ur.

Förslag: en tabell `saved_venues`.

| Kolumn | Typ | Kommentar |
|---|---|---|
| `id` | bigint, PK | |
| `name` | text, inte null | Till exempel "Kronobergsvallen 1" |
| `address` | text, null | Behövs för bortamatcher |
| `created_by_user_id` | bigint, inte null | |

- Unik på `name`.
- Listan är gemensam för hela klubben. Alla tränare ser och ändrar samma lista.
- Att ta bort en sparad plats ändrar inte gamla träningar och matcher, eftersom de har platsen som egen text.

## 3. Motståndare (ingen ändring)

Beslut: ingen sparad lista. Tränaren skriver motståndarens namn i en textruta varje gång.
`opponent` är redan en fri text på `club_matches`, så inget behöver ändras.

## 4. Sluttid på match (ny kolumn)

`trainings` har redan `starts_at` och `ends_at`. `club_matches` har bara `kickoff_at`.

Förslag: lägg till `ends_at` (timestamp, null) på `club_matches`.
Den får vara null så att gamla matcher fortsätter fungera.

## 5. Närvaro utgår från att alla kommer (ändrad regel)

Ingen ny kolumn behövs. Regeln blir:

- Finns ingen närvarorad för en spelare räknas spelaren som väntad.
- Godkänd ledighet ger `EXCUSED`.
- När tränaren sparar närvaron skrivs `PRESENT` eller `ABSENT` för varje spelare. Det stöds redan av `training_attendance` och `match_attendance`.

Kontrollera att appen och API:t inte har kvar något flöde där spelaren själv svarar Kommer eller Kan inte.

## Sådant som redan finns

- Start- och sluttid på träning (`starts_at`, `ends_at`).
- Upprepad träning (`CreateTrainingSeriesRequest` i API:t).
- Hemma eller borta på match (`home_away`).
- Inställd aktivitet med orsak (`status`, `cancel_reason`).

## Varför databasen och inte bara appen

Platserna är inte hemliga, så det handlar inte om skydd. Det handlar om var listan finns:

- **Sparat i appen på telefonen:** listan finns bara på den telefonen. Den andra tränaren i laget ser den inte, och den försvinner om tränaren byter telefon eller installerar om appen.
- **En fast lista i koden:** ingen kan lägga till eller ta bort en plats utan en ny version av appen.
- **I databasen:** alla tränare i laget ser samma lista, och den finns kvar.

Eftersom designen låter tränaren lägga till och ta bort platser behöver listan ligga i databasen.

## Att tänka på när det byggs

- Schemat skapas med `ddl-auto=update`. Nya tabeller och kolumner som får vara null läggs till av sig själva. Kolumner som inte får vara null på en tabell med data kräver mer omsorg.
- Varje ändrat eller nytt API-anrop ska in i `docs/api/openapi.yaml` i samma PR.
- Ledighetsbegäran är kärnfunktion (behörighet och affärslogik), så testerna skrivs först.
