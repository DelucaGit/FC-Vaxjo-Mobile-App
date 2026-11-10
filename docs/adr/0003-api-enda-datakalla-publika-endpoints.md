# ADR 0003: API:t är enda datakällan, och fcvaxjo.se läser via publika endpoints

**Status:** Accepterad (Marcel, 2026-11-05) · **Datum:** 2026-11-05

## Kontext
Klubbens hemsida fcvaxjo.se ska visa information som appen hanterar. Två databaser skulle glida isär. Samtidigt innehåller API:t persondata om barn och föräldrar.

## Beslut
- Spring Boot-API:t är **enda källan** till klubbdata. Appen skriver till det och hemsidan läser från det, utan egen databas för klubbdata.
- Hemsidan läser bara via **publika read-only** endpoints under `/api/public/**` (`permitAll`, bara GET), med egna DTO:er:
  - lag (`/api/public/teams`)
  - kommande matcher (`/api/public/matches/upcoming`)
  - matchhistorik/resultat (`/api/public/matches/history`)
  - trupp (`/api/public/teams/{id}/players`): bara namn och tröjnummer, och bara med den länkade förälderns samtycke (ADR 0007)
  - träningsscheman per lag (`/api/public/teams/{id}/trainings`) — fortfarande planerat
  - tränarens namn och kontaktuppgifter (`/api/public/teams/{id}/coaches`) — fortfarande planerat, bara med tränarens eget samtycke per fält
- Publika DTO:er innehåller **aldrig** e-post, telefon, föräldrauppgifter, närvaro eller beteende. `FetchUserResponse` återanvänds aldrig publikt.
- CORS tillåter `https://fcvaxjo.se` (och `www`) bara för `/api/public/**` och bara GET.

## Konsekvenser
- Det finns en sanning för all data. Byggda publika läsningar har ingen `x-status: planned`. Träningsschema och tränarkontakt är kvar som planerade.
- **Matcher kan skrivas av personal** (`POST /api/matches`). Publika läsningar för lag, matcher och trupp är byggda (ADR 0007). Träningsschema, tränarkontakt, rate limit och CORS för fcvaxjo.se är kvar.
- Publika endpoints behöver rate limiting (429) och caching. Kontraktstester ska visa att inga spelar-/föräldra-PII-fält finns i publika svar.
