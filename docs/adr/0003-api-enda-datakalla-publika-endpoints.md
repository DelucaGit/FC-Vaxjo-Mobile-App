# ADR 0003: API:t är enda datakällan, och fcvaxjo.se läser via publika endpoints

**Status:** Accepterad (Marcel, 2026-11-05) · **Datum:** 2026-11-05

## Kontext
Klubbens hemsida fcvaxjo.se ska visa information som appen hanterar. Två databaser skulle glida isär. Samtidigt innehåller API:t persondata om barn och föräldrar.

## Beslut
- Spring Boot-API:t är **enda källan** till klubbdata. Appen skriver till det och hemsidan läser från det, utan egen databas för klubbdata.
- Hemsidan läser bara via **publika read-only** endpoints under `/api/public/**` (`permitAll`, bara GET), med egna DTO:er:
  - aktiva lag (`/api/public/teams`)
  - träningsscheman per lag (`/api/public/teams/{id}/trainings`)
  - kommande matcher (`/api/public/matches/upcoming`)
  - matchhistorik/resultat (`/api/public/matches/history`)
  - tränarens namn och kontaktuppgifter (`/api/public/teams/{id}/coaches`), bara **med tränarens samtycke** och bara de uppgifter tränaren valt att visa
- Publika DTO:er innehåller **aldrig** spelar- eller föräldrauppgifter (namn, e-post, telefon), närvaro eller beteende. `FetchUserResponse` m.fl. återanvänds aldrig publikt.
- CORS tillåter `https://fcvaxjo.se` (och `www`) bara för `/api/public/**` och bara GET.

## Konsekvenser
- Det finns en sanning för all data. Endpoints är markerade `x-status: planned` i `openapi.yaml`.
- **Matcher finns inte i API:t ännu.** Det behövs en ny entitet och skriv-endpoints. Samtyckesfält för tränare behövs också.
- Publika endpoints behöver rate limiting (429) och caching. Kontraktstester ska visa att inga spelar-/föräldra-PII-fält finns i publika svar.
