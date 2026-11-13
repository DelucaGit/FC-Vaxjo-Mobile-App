# ADR 0011: Hosting på Render + Neon i stället för Railway

**Status:** Föreslagen (väntar på Marcel, issue #158) · **Datum:** 2026-11-13 · Ersätter ADR 0002.

## Kontext
ADR 0002 valde Railway. Railway tar betalt efter användning, så räkningen kan dra över budgeten. Klubben vill ha ett API som alltid är uppe och kostar högst cirka 7–8 USD i månaden. Piloten ska vara igång senast 2026-12-20.

## Beslut
- API:et körs på **Render Starter** (Frankfurt), byggt av Docker-imagen från #68. Konfigurationen ligger i `render.yaml`.
- PostgreSQL ligger hos **Neon Free** (AWS `eu-central-1`, Frankfurt), med den direkta anslutningen (inte `-pooler`) och `sslmode=require`.
- Hemligheter (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `BOOTSTRAP_ADMIN_PASSWORD`) ligger bara som miljövariabler på Render, aldrig i git.
- Render anropar `GET /api/public/health`, som inte rör databasen.
- Egen backup med `pg_dump` före varje deploy och minst varje vecka (`docs/deploy-render.md`).
- Appen får API-adressen från `EXPO_PUBLIC_API_URL` i EAS-bygget `pilot`.

## Konsekvenser
- Fast kostnad (cirka 7 USD/mån; priser och gratisgränser kontrolleras mot Render och Neon innan betalning).
- Både data och server ligger i EU, vilket krävs av ADR 0004. Personuppgiftsbiträdesavtal behövs med Render och Neon.
- Neon pausar efter 5 minuter utan användning. Första anropet efteråt kan bli långsamt. En liten anslutningspool (5) håller oss under Neons gräns.
- Neons gratisplan har bara cirka 6 timmars återställningshistorik och inga schemalagda backuper. Därför egen `pg_dump`.
- **Öppen punkt:** vilken header Render sätter för klientens IP är inte kontrollerad (ADR 0008). Tills den är kontrollerad gäller reservläget, där inloggningsspärren går på e-post ensam. Kontrolleras efter första deployen.
- Reserv om Render inte duger: en Hetzner-server (cirka 4–5 EUR) med samma Docker-image.
