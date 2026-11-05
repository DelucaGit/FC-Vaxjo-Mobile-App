# ADR 0001: Monorepo och lagerarkitektur

**Status:** Accepterad (dokumenterar befintligt beslut i PROGRESS.md) · **Datum:** 2026-11-05

## Kontext
Ett enmansprojekt (junior utvecklare, begränsad tid) med en Java-backend och en Expo-app. Mikrotjänster skulle ge mer drift, högre kostnad och mer att förstå (PROGRESS.md, "Stack").

## Beslut
- Ett repo (`DelucaGit/FC-Vaxjo-Mobile-App`) med `API/` (Spring Boot 4.1, Java 21, PostgreSQL) och `UI/` (Expo/React Native).
- En monolitisk backend. Inga mikrotjänster.
- Lager i `API/src/main/java/se/fcvaxjo/api/`: `controller → service → repository → PostgreSQL`, där anrop bara går nedåt. Controllers använder aldrig repositories. `model/` är delade entiteter och inget eget lager. HTTP in/ut sker via DTO:er i `DTO/`, så att entiteter (t.ex. `passwordHash`) aldrig serialiseras.
- Behörighet ligger i backend, i `@PreAuthorize` plus kontroller i service-lagret.
- GitHub Flow med korta feature-grenar mot `master`.

## Konsekvenser
- Det blir enkelt att bygga, köra lokalt och hosta, med en process och en databas.
- Mobil, backend och kontrakt (`openapi.yaml`) kan ändras i samma PR.
- Paketet heter `DTO` med versaler, vilket avviker från Java-konventionen. Det kan döpas om senare.
- Behörighetslogiken är duplicerad (`hasRole`/`currentUserId` finns i tre services) och bör brytas ut till en gemensam komponent.
