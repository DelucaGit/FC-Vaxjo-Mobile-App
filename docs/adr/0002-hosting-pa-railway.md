# ADR 0002: Hosting på Railway i stället för AWS

**Status:** Accepterad (Marcel, 2026-11-05) · **Datum:** 2026-11-05

## Kontext
PROGRESS.md planerade AWS för API och PostgreSQL. För en liten ideell klubbapp med få användare blir AWS för dyrt och kräver för mycket drift. V1 körs i dag helt lokalt.

## Beslut
- Spring Boot-API:t och PostgreSQL hostas på **Railway**, som ersätter AWS i planen.
- Driftsättningen görs först när V1 är stabil, och bara när Marcel uttryckligen säger till.
- Hemligheter (`DB_PASSWORD`, `JWT_SECRET` m.fl.) ligger bara i Railways miljövariabler, aldrig i git eller i `application.properties`.
- Ingen AWS-specifik kod eller SDK används.

## Konsekvenser
- Låg och förutsägbar kostnad (storleksordningen ~5 USD/mån för en liten tjänst; verifieras mot Railways prislista innan start).
- Före produktion: en egen prod-profil med `ddl-auto=validate` (inte `update`), migreringar (Flyway/Liquibase), `show-sql=false`, ingen standard-JWT-hemlighet och CORS för riktiga domäner.
- GDPR: ett personuppgiftsbiträdesavtal (DPA) med Railway och val av EU-region behövs (se ADR 0004).
- PROGRESS.md och README är uppdaterade så att de pekar på Railway (samma PR som denna ADR).
