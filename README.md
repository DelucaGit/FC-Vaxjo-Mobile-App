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

Needs local PostgreSQL (database `fcvaxjo_db`) and `API/.env` (not in Git). Copy `API/.env.example` to `API/.env` and fill in:

- `DB_PASSWORD`: your local Postgres password
- `JWT_SECRET`: random, at least 32 bytes. The API refuses to start without it.
- `BOOTSTRAP_ADMIN_PASSWORD`: temporary password for `admin@fcvaxjo.se`. If it is empty, no admin is created.
- `DEMO_PASSWORD`: temporary password for all demo users (dev only). If it is empty, there is no demo data.

From the `API` folder:

```powershell
.\mvnw.cmd spring-boot:run
```

Base URL: `http://localhost:8080/api`

Local runs use the Spring profile `dev` by default (`SPRING_PROFILES_ACTIVE` overrides it). In `dev`, `DemoClubSeeder` fills in demo teams, users, and trainings. Demo logins are in `API/POSTMAN_AUTH.md`, and the passwords are the values in your `API/.env`. Production must set another profile and its own secrets as Railway variables.

Run tests:

```powershell
.\mvnw.cmd test
```

Tests use the `test` profile (`API/src/test/resources/application-test.properties`) with a test-only JWT secret. `contextLoads` still needs local Postgres and `DB_PASSWORD`.

## Secrets: never commit them

Passwords, tokens, and keys live only in `API/.env` (gitignored) or in Railway variables. Never put them in code, docs, or Postman files; use placeholders like `{{adminPassword}}`.

A pre-commit hook blocks commits that look like they contain secrets. Turn it on once per clone:

```powershell
git config core.hooksPath .githooks
```

It runs `gitleaks protect --staged` with `.gitleaks.toml` when [gitleaks](https://github.com/gitleaks/gitleaks) is installed (`winget install gitleaks`), and otherwise a simpler pattern check. It also stops a staged `.env`.

## Run the app

From the `UI` folder:

```powershell
npm install
npm start
```

Press `w` for web, or scan the QR code with Expo Go. For a real phone, set your PC's LAN IP in `UI/src/api/config.ts`.

Roles: `ADMIN` > `CHAIRMAN` > `COACH` > `PLAYER` = `PARENT`. Only ADMIN and CHAIRMAN can create a team (see `docs/adr/0006-roller-och-behorighet.md`).
