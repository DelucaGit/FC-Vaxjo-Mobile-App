# FC Växjö Mobile App

A club app for FC Växjö: players, coaches, parents, and staff.

**Now:** Java Spring Boot API + PostgreSQL + Expo (React Native) app, running on this computer. Login with email + password (JWT).
**Later:** hosting on [Railway](https://railway.com) (API + PostgreSQL), not AWS. See `docs/adr/0002-hosting-pa-railway.md`.

## API contract

The source of truth for every URL is **`docs/api/openapi.yaml`** (OpenAPI 3.1).
It lists methods, request and response fields, status codes, which roles may call what (`x-roles`), and which fields hold personal data (`x-pii`).
Parts marked `x-status: planned` are not built yet.
When you add or change a URL, update `openapi.yaml` in the same PR.

Lint it with:

```powershell
npx @redocly/cli lint docs/api/openapi.yaml
```

Architecture decisions are in `docs/adr/`. Known security/GDPR gaps are in `docs/gap-analys.md`.

## Run the API

Needs local PostgreSQL (database `fcvaxjo_db`) and `API/.env` with `DB_PASSWORD` (not in Git; see `API/.env.example`).

From the `API` folder:

```powershell
.\mvnw.cmd spring-boot:run
```

Base URL: `http://localhost:8080/api`

Local runs use the Spring profile `dev` by default (`SPRING_PROFILES_ACTIVE` overrides it). In `dev`, `DemoClubSeeder` fills in demo teams, users, and trainings. Demo logins are described in `API/POSTMAN_AUTH.md`. Production must set another profile and its own `JWT_SECRET`.

Run tests:

```powershell
.\mvnw.cmd test
```

## Run the app

From the `UI` folder:

```powershell
npm install
npm start
```

Press `w` for web, or scan the QR code with Expo Go. For a real phone, set your PC's LAN IP in `UI/src/api/config.ts`.

Roles: `ADMIN`, `COACH`, `PLAYER`, `PARENT` (`CHAIRMAN` is planned; see `docs/adr/0006-roller-och-behorighet.md`).
