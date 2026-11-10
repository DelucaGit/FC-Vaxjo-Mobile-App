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

From the `API` folder, turn on the `dev` profile in the start command. Nothing else selects it. Without that variable the API still starts, but SQL logging stays off and `DemoClubSeeder` does not run.

Bash:

```bash
SPRING_PROFILES_ACTIVE=dev bash mvnw spring-boot:run
```

PowerShell:

```powershell
$env:SPRING_PROFILES_ACTIVE = "dev"
.\mvnw.cmd spring-boot:run
```

`API/.env` is loaded by `springboot4-dotenv` for `DB_PASSWORD`, `JWT_SECRET`, and the seed passwords. That library adds the file after Spring has already chosen the profile, so `SPRING_PROFILES_ACTIVE` inside `API/.env` does not turn `dev` on. Set the profile in the shell, as above.

Base URL: `http://localhost:8080/api`

To build and run the API as a Docker image (like on the server), see `docs/docker.md`.

In `dev`, `DemoClubSeeder` fills in demo teams, users, and trainings, and SQL logging is on. Demo logins are in `API/POSTMAN_AUTH.md`, and the passwords are the values in your `API/.env`.

Production turns SQL logging off. Set the environment variable `SPRING_PROFILES_ACTIVE=prod` (Railway variables, not a file in Git). That loads `application-prod.properties`. Do not set `dev` at the same time. If the variable is missing, no profile is active. The base file has `spring.jpa.show-sql=false`, so a forgotten profile does not print SQL and does not plant demo users. Passwords and `JWT_SECRET` stay in environment variables. Nothing secret is written in the prod file.

Run the tests from the `API` folder. You do not need local PostgreSQL or `API/.env`.

Most Spring tests turn on the `test` profile with `@ActiveProfiles("test")`. That loads `API/src/test/resources/application-test.properties`: an in-memory H2 database and a test-only JWT secret. Two profile checks do not use that file: one starts with no profile, and one uses `@ActiveProfiles("dev")` on its own H2 database. GitHub Actions runs the same two commands (`.github/workflows/backend-ci.yml`).

The normal build skips tests tagged `known-gap`. That tag marks rules the code still breaks. `API/pom.xml` sets `excludedGroups` to `known-gap`, so `./mvnw test` stays green. After F6 no test carries that tag. The known-gap command is still there for the next rule that needs a measuring stick.

Normal build, Git Bash on Windows and Linux or Mac:

```bash
bash mvnw -B verify
```

Known-gap only. `-DexcludedGroups=` (empty) clears the skip in `pom.xml`. Without it, Maven would skip the tests you just asked for. `-Dgroups=known-gap` runs only that tag.

```bash
bash mvnw -B verify -DexcludedGroups= -Dgroups=known-gap
```

Same two commands in PowerShell:

```powershell
.\mvnw.cmd -B verify
```

```powershell
.\mvnw.cmd -B verify "-DexcludedGroups=" "-Dgroups=known-gap"
```

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

Roles: `ADMIN` > `CHAIRMAN` > `COACH` > `PLAYER` = `PARENT`. Only ADMIN and CHAIRMAN can create a team or link a coach to a team (see `docs/adr/0006-roller-och-behorighet.md`).
