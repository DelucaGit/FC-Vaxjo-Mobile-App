# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working agreement (from `.cursor/rules/`)

- **AI writes, developer understands.** Claude writes and edits the code. The developer must still understand every change: after making one, explain what changed and why in simple language (junior-friendly, no unexplained jargon), including any non-obvious choice, what it costs later, and the alternative. Prefer small, readable steps over big rewrites or clever abstractions, and warn early if a change would make the structure messy. This replaces the older "mentor mode" rule in `.cursor/rules/mentor-mode.mdc`.
- `LK_POSTS.md` is local only and gitignored. Never stage, commit, or push it.
- **Kanban on GitHub Issues** replaces Jira. Issues are linked with "Blocked by"; phase 1 is the milestone "Fas 1: Pilot" (spec #57), with at most 2 issues in progress. Stories use plain language (`As a ____ I would like to ____ because ____.`); tasks use **Add / Why / Done when**.
- **Vertical slices.** Each issue goes all the way: DB → API → app → real phone.
- **Labels.** `AFK`: the agent does everything and Marcel reviews the PR. `HITL`: a human is needed for part of it.
- **Done means all four:** (1) API tests green (`mvnw verify`); (2) app tests, lint and typecheck green; (3) run against the local API (after the move: against Render); (4) tried on a real phone.
- Nothing is pushed or merged to `master` without Marcel's explicit yes.
- Record locked decisions in `PROGRESS.md`. Architecture decisions go in `docs/adr/` (written in Swedish).

## Repo layout

Monorepo: `API/` is a Java 21 / Spring Boot 4 backend with PostgreSQL. `UI/` is an Expo (React Native) app. `docs/` holds the API contract, ADRs, the gap analysis, and the role test matrix. `logs/` is an Obsidian developer log, not code.

## API contract

`docs/api/openapi.yaml` is the source of truth for every endpoint: roles (`x-roles`, `x-roles-planned`), PII fields (`x-pii`), and unbuilt parts (`x-status: planned`). Update it in the same PR as any endpoint change. Lint it with:

```
npx @redocly/cli lint docs/api/openapi.yaml
```

## Backend (`API/`)

Commands run from `API/`. Tests need no PostgreSQL and no `.env`, because they use in-memory H2 through the `test` profile.

```bash
bash mvnw -B verify                                         # normal build + tests (same as CI)
bash mvnw -B verify -DexcludedGroups= -Dgroups=known-gap    # only the known-gap tests
bash mvnw test -Dtest=TeamAccessTest                        # one test class
bash mvnw test -Dtest=TeamAccessTest#methodName             # one test method
SPRING_PROFILES_ACTIVE=dev bash mvnw spring-boot:run        # run locally (http://localhost:8080/api)
```

PowerShell: `.\mvnw.cmd ...`, and quote `-D` args (`"-DexcludedGroups="`).

- **Profiles.** No profile is active by default, which is deliberately safe: SQL logging is off and no demo data is seeded. `dev` turns on SQL logging and `DemoClubSeeder`. `prod` keeps logging off. Set the profile in the shell, not in `API/.env`, because `springboot4-dotenv` loads `.env` after the profile has already been chosen.
- **Secrets.** `API/.env` (see `.env.example`) holds `DB_PASSWORD` and `JWT_SECRET`. The API will not start if `JWT_SECRET` is missing or under 32 bytes. It also holds `BOOTSTRAP_ADMIN_PASSWORD` and `DEMO_PASSWORD`; if one is empty, that seeder does nothing.
- **Pre-commit hook.** `.githooks/pre-commit` runs gitleaks or a pattern check and blocks staged `.env` files. Enable it with `git config core.hooksPath .githooks`.
- **Layers.** Code goes controller → service → repository → model, with DTOs in `DTO/`. Errors are thrown as `BadRequestException` / `NotFoundException` / `UnauthorizedException` and mapped to `{"message": ...}` by `ApiExceptionHandler`. The schema comes from `ddl-auto=update`; there is no Flyway or Liquibase.
- **Auth.** `SecurityConfig` is stateless JWT. Only `POST /api/auth/login` is public. `JwtAuthFilter` checks every token against the database through `AccountAccessService.tokenStillMatchesAccount`, so deactivating an account, changing a role, or changing the password invalidates older tokens right away. The role inside the JWT is never trusted on its own. There is also `/api/auth/refresh` and `/api/auth/change-password`; a seeded user can have `mustChangePassword`.
- **Authorization has two layers** (ADR 0006):
  1. Role checks: `@PreAuthorize` on controller methods.
  2. Team scope: checks in the service layer (e.g. `TrainingService.assertCanManageTeam`) limit COACH to their own teams, using `team_coaches`.

  Role rank is ADMIN > CHAIRMAN > COACH > PLAYER = PARENT, defined in `ClubRole`. The DB stores role ids, while JSON uses role names. A row's id in `roles` is not its rank. CHAIRMAN cannot assign ADMIN or CHAIRMAN. Nobody except ADMIN may change their own role. Turning a PLAYER into a COACH clears `playerNumber` (a unique column) and `parentId`.
- **Tests.**
  - Access tests extend `support/ClubApiTest`: a `@SpringBootTest` with MockMvc and the `test` profile that rolls back after each test. `ClubFixture` seeds two teams, Alfa and Beta. `Actor` sends a given person's token, and `Actor.ANON` sends none.
  - `security/access/` holds one test class per area, and `docs/testing/rollmatris.md` is the matrix they follow.
  - JUnit tag `known-gap` marks rules the code still breaks. The pom excludes it by default. CI runs it in a separate job that is allowed to fail.

## App (`UI/`)

Commands run from `UI/`. Read `UI/AGENTS.md` first: Expo APIs change every SDK, so check the versioned docs before using one. Add packages with `npx expo install`. Run lint and typecheck before calling a task done.

```bash
npm start              # Expo dev server (w = web)
npm test               # jest (jest-expo)
npx jest src/api/http.test.ts   # one test file
npm run lint
npm run typecheck
```

- **Navigation.** The app uses React Navigation (bottom tabs), not Expo Router; see ADR 0005. In `App.tsx`, `RootNavigator` shows Login, then ChangePassword when `mustChangePassword` is set, then `MainTabs`, whose tabs depend on the user's role (`src/auth/roles.ts`).
- **HTTP.** Every request goes through `apiFetch` in `src/api/http.ts`.
  - It attaches the bearer token. On a 401 it refreshes once and retries; if that fails, it clears the session and calls the `onUnauthorized` handler registered by `AuthProvider`.
  - `auth.ts` registers the refresh function with `setRefreshSession` instead of being imported by `http.ts`, which avoids a circular import.
  - `readErrorMessage` turns a generic Spring 403 into a Swedish message for the user.
- **Storage and config.** Tokens are kept in `expo-secure-store` (`tokenStorage.ts`) and the profile in AsyncStorage (`authStorage.ts`). The API host is set in `src/api/config.ts`: Android emulator uses `10.0.2.2`; for a real phone, set `useLanIp` and the PC's LAN IP.
- User-facing text in the app is in Swedish.
