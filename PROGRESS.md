*30/7-2026*

# Project Idea

The idea of this project is to be a mobile app for FC Växjö. FC Växjö is the football club of my wife's father. My wife's father is an elderly man that usually sticks to pen and paper. My idea is to make an app for him, the coaches, the players and the player's parents to keep track of:

- Schedules
- Player behaviour
- Attendance
- Find parent's contact information
- Get phone notification when schedule is changed

# Stack

The idea is to use:

- React Native (built on Expo)
- Java Spring Boot
- Railway (hosting, replaces AWS; see `docs/adr/0002-hosting-pa-railway.md`)
- PostgreSQL

React Native will be to make the UI of the app. I have chosen this to make the app crossplatform for Android and iOS since the users of the app are expected to have a variation of devices. Expo is supposed to be easier for junior developers like me to set up.

Java Spring Boot will be used to make the API service. Why Java? Because that's what I am currently studying at the moment and also it's a very stable language. Me coming from a security background - I like to have stable systems.

Railway will be used to host the database (PostgreSQL) and API. I first planned AWS because that's what I have studied previously at school, but AWS is too expensive for a small club app, so the plan is now Railway (see `docs/adr/0002-hosting-pa-railway.md`). For Version 1 I will keep PostgreSQL on my own computer first, and move it to Railway later when the basics work.

For the repository structure I will go for a monorepo where I keep everything inside one root folder on Github. Inside that I will have one folder for the API (the Java backend) and another folder for the UI (React Native).

I will not have microservices for several reasons:
- More services means more AWS usage and that means higher costs.
- As a junior developer I am trying to build something stable at first.
- Since FC Växjö belongs to my wife's father, if the app goes down entirely I know I won't be in major trouble. It doesn't mean I don't love him, I just know that I will survive the fall. 

Inside the API folder I will use layers: controller, service, repository and models. That keeps the code easier to read.

# Project Timeline

I won't build everything at once. As a junior developer I need to focus on understanding how the code works in the system. So I will build slowly and steady. I will divide the project in versions where I will have small goals to accomplish each version. I have no idea how long this will take. Taking into consideration that I work 12h a day, have a newborn at home and have some local responsibilities in my area - I hope to achieve a stable version of the app in 3-4 months.

# Project Rules

For this project I want to write as much code by myself as possible. I want to use AI as it is supposed to - to be a helper, not someone that takes over. Because every time AI takes over my work I tend to lose control of the project. So I have made rules for the Cursor AI to follow. They are the following:

- AI can't change the code without my permission each time.
- AI takes the role of a mentor. Its role is to guide me and teach me. Every time it wants to make a change it needs to tell me the reason behind each decision.
- After each milestone I want the AI to automatically commit and push to Github Repository.

# Github Branching

I will use the standard Github Flow. That means I create short-lived branches for each feature or fix, then I merge them into the master branch.

# Project Version 1

Status: In progress. Postman can create, list, fetch, search by name / shirt number / phone, and change a user's role. JSON uses role **names**. Local PostgreSQL stores role **ids**. Expo MVP UI started under `UI/` (Search + Create tabs). No login yet (500 on blank search / bad role; map to 400 later). 

For the initial version of the app I want to have some functions up and running at the end. I want the API to be able to:

- Create a user with a role (ADMIN or COACH does this in the UI)
- Change the user's role with PUT
- Fetch the user and showcase the user data through Postman
- The data should be stored in PostgreSQL locally

# API design diagrams (7/9-2026)

Work diagrams live in one file: `API/Diagrams/api-layers-and-roles.drawio`.

Same file, two pages (not two files). Why: both views belong to the same API. draw.io already uses page tabs. Git history stays on one path. Split into separate files later only if a diagram gets a different owner or grows huge.

Page 1 is layers. Page 2 is users and roles. Short labels, no teaching copy. I replaced the first teaching sketch with this.

## Layers

Request order: Client → Controller → Service → Repository → PostgreSQL.

Packages for Version 1:

- `controller/` UserController
- `dto/` CreateUserRequest (HTTP in; package folder is currently `DTO`)
- `service/` UserService
- `repository/` UserRepository, RoleRepository
- `model/` AppUser, Role

Rules: calls only go down. The controller does not use a repository. `model` is shared data, not a fourth layer.

Version 1 endpoints on the controller:

- POST /users — create user with a role
- PUT /users/{id}/role — replace the role
- GET /users/{id} — fetch the user

## Users and roles

Two tables: `users` and `roles`. No join table. A user has exactly one role (`users.roleId`, required). Many users can share the same role (many PLAYERs).

Why one role for now: the create-user screen picks one role. PUT replaces it. PARENT + COACH on the same person is out of scope. We can add a join table later if we need several roles.

Role names (seed data, not created by users in Version 1):

- ADMIN
- COACH
- PLAYER
- PARENT

Who may create users and change roles:

- ADMIN → ADMIN, COACH, PLAYER, PARENT
- COACH → PLAYER, PARENT only (cannot grant ADMIN or COACH)
- PLAYER / PARENT → none

The first ADMIN is seed data. After that, only ADMIN and COACH use POST /users. Extra powers (schedules, attendance, notifications) come later. Version 1 only stores the user and the role.

# Spring Boot skeleton (7/9-2026)

I generated the API from start.spring.io (Maven, Java 21, Spring Boot 4, Web, JPA, Validation, PostgreSQL) and placed it in `API/` next to `Diagrams/`.

Local PostgreSQL 18 is installed. Database name: `fcvaxjo_db`. Cost: $0 (on my PC, not AWS).

The app starts with `.\mvnw.cmd spring-boot:run` and Tomcat listens on port 8080.

The database password is not in Git. It lives in `API/.env` (`DB_PASSWORD`). `application.properties` reads `${DB_PASSWORD}`. A library `springboot4-dotenv` loads the `.env` file. `.env` is in `.gitignore`. `.env.example` is committed with an empty key name only.

# User and Role models (7/9-2026)

I added the first Java models under `API/src/main/java/se/fcvaxjo/api/model/`:

- `Role.java` — id, name (name is unique)
- `User.java` — id, name, email (unique), roleId (required, column `role_id`)

They are JPA `@Entity` classes. `@Table` maps them to `roles` and `users`. `@Id` plus `@GeneratedValue(IDENTITY)` lets PostgreSQL fill in the id.

I first imported the wrong `@Id` (`org.springframework.data.annotation.Id`). That one is not for JPA/Postgres. The correct import is `jakarta.persistence.Id`.

I added Lombok (`@Getter`, `@Setter`) so I do not write get/set methods by hand. Lombok is only used at compile time. Cost: $0. Cost later: those methods are hidden until I remember they exist.

I also set `spring.jpa.hibernate.ddl-auto=update` for local Version 1. When I restarted the API, Hibernate created the two tables in `fcvaxjo_db`. I confirmed them in pgAdmin. They are empty. Next step after the models was the repository layer.

`ddl-auto=update` is fine on my PC. I will not use it on the real Railway database later, because it can change tables in ways that are hard to undo.

# Permissions vs a third table (9/9-2026)

Version 1 has **no** `permissions` table. `users` points at `roles`. What a role may do is Java `if`s in `UserService`. That already applies to every user with that role.

A permissions table is optional **later**, if those ifs get long. First try extra columns on `roles` (for example `can_see_parent_phones`). A `permissions` + `role_permissions` join is only if many named powers are shared across roles.

Sketch: `API/Diagrams/users-roles-permissions.drawio` (page 1 = now, page 2 = later). Permissions stay in the API (service + maybe DB flags). Not a separate cloud product. That work is later (GitHub issue #12), not Version 1.

# Repository layer (9/9-2026)

I added Spring Data JPA repositories under `API/src/main/java/se/fcvaxjo/api/repository/`:

- `RoleRepository` — `JpaRepository<Role, Long>` plus `findByName`
- `UserRepository` — `JpaRepository<User, Long>` plus `findByEmail`

They are interfaces, not classes. Spring builds the SQL from the method names. `Long` matches the `id` type on the models. `findByEmail` must match the `email` field on `User` (a method named `findByUsername` failed at startup because `User` has no `username`).

This layer only talks to PostgreSQL. No HTTP yet. The service uses `findByName` when creating a user with a role name like COACH.

How I start the API: from the `API` folder, `.\mvnw.cmd spring-boot:run`. I use the Maven wrapper because `mvn` is not on my PATH. The Cursor Run button started from the repo root, so it did not load `API/.env` and Hibernate could not log in to Postgres. Confirmed working: `Started ApiApplication`.

# Service layer (9/9-2026)

I added `UserService` under `API/src/main/java/se/fcvaxjo/api/service/`. Spring injects the two repositories through the constructor. The class is `@Service`.

Methods:

- `createUser(name, email, roleName)` — email must be unique, role name must exist, then save `roleId` (the number) on the user
- `getUserById(id)`
- `changeUserRole(id, roleName)` — loads the user, looks up the role by name, replaces `roleId`

Incoming role is a **name** (`COACH`). Stored on `users` is the **id**. That way Postman can send a word, and Postgres keeps a foreign key.

I renamed the entity from `User` to `AppUser`. The table is still `users`. Why: Spring Security later has its own `User` class, and the names would clash. `UserRepository` now uses `AppUser`.

The service still returns `AppUser`. A DTO (Data Transfer Object) comes at the **controller**, when HTTP exists, so we do not leak extra fields later (password, parent phone). Not in the service.

I did **not** add ADMIN/COACH permission `if`s yet. There is no logged-in caller. That waits for Spring Security after Postman.

## Role seeder

A separate class `RoleSeeder` implements `CommandLineRunner`. After the app starts, it inserts ADMIN, COACH, PLAYER, PARENT if they are missing. Confirmed in pgAdmin: four rows in `roles`.

Why not the controller: a controller is for HTTP URLs. Seeding is startup data, not a request. The controller also must not talk to a repository. Why not inside `UserService`: that class is the brain for users, not boot data.

No HTTP yet. Next step was the controller + Postman (GitHub issue #9). Hosting the API on the internet stays for later (still $0 on my PC).

# Controller + first Postman create (13/9-2026)

I added `UserController` at `API/src/main/java/se/fcvaxjo/api/controller/`. It only calls `UserService`. It does not use a repository.

URLs are under `/api/users` (extra `/api` prefix vs the first diagram `POST /users`). Postman must use the full path.

What works from Postman:

- `POST http://localhost:8080/api/users` — create user with a role **name**
- `GET http://localhost:8080/api/users` — list all users (`getAllUsers` on the service)

I confirmed create: JSON `{ "name": "Erik", "email": "erik@fcvaxjo.se", "roleName": "COACH" }` returned HTTP 200 with `id` 1 and `roleId` 2 (COACH in the seed order). The row is in PostgreSQL.

The POST body is not `AppUser`. `AppUser` has `roleId`, not `roleName`. I added `CreateUserRequest` (name, email, roleName). The controller pulls three strings and calls `createUser(name, email, roleName)`. The service still saves the id. That is the DTO at the HTTP edge we planned.

# Controller complete for Postman (15/9-2026)

All Version 1 user URLs work from Postman (`http://localhost:8080`):

- `GET /api/users` — list; each item is `FetchUserResponse` (`roleName`, not `roleId`). A for-loop maps `AppUser` → DTO.
- `GET /api/users/{id}` — one user as `FetchUserResponse`
- `POST /api/users` — `CreateUserRequest` in, `CreateUserResponse` out (same four fields as fetch)
- `PUT /api/users/{id}/role` — `ChangeRoleRequest` in (`roleName` only), `ChangeRoleResponse` out (`id` + new `roleName`)

`UserService.getRoleName(roleId)` turns the database id into a word. The controller does not use a repository.

I confirmed PUT: COACH (role id 2) → PLAYER (role id 3) in Postgres. Invalid role `ARTIST` / `REFEREE` still returns **500**. Next: map that to **400**, missing user to **404**, create to **201**. Then Spring Security (ADMIN/COACH only). No hard delete in V1; inactive flag later.

No Spring Security yet. Anyone who can reach localhost can call these URLs. That is OK while learning.

# Search users by name (18/9-2026)

Coaches can search by part of a name (ignore case). Three layers:

- `UserRepository.findByNameContainingIgnoreCase` — Spring Data builds the LIKE query
- `UserService.searchByName` — rejects null/blank (`isBlank`), then calls the repository
- `GET /api/users/search?name=Mar` — `@RequestParam`, returns `List<FetchUserResponse>`

Empty `?name=` is not “missing param”; Spring still 200 unless the service throws. After `isBlank`, Postman gets **500** and the message is only in the server log (Spring hides 500 messages). Next: exception handler → **400** with a short JSON message.

# Solo Scrum in Jira (17/9-2026)

I will run Scrum by myself in the Jira website. Cursor will not create tickets for me unless I ask.

Order: epic → user stories → 1-week sprint → tasks (tasks only for the current sprint). No standups, story points, or burndown charts.

I tried the Atlassian MCP so Cursor could talk to Jira. Login failed: Rovo is not activated on this Free site. Rovo needs a paid Jira plan (about $9/user/month) and often a company email, not Gmail. Extra Rovo usage can start costing money later. I stay on Jira Free ($0). MCP stays off.

Rules live in `.cursor/rules/scrum-jira.mdc` so they stay separate from mentor-mode.

Writing rules (same day): epics and user stories stay in everyday language. Technical words (URLs, classes, Postman) belong in **tasks** only. Every story is `As a ____ I would like to ____ because ____.` Every task hangs on a story and says Add / Why / Done when. A sprint is Done only when the week-end checklist in that rules file is all true.

Testing (same day): a sprint is not Done until new functions were tested. Postman proves the URL. Java tests cover **core** service functions, not every class. Today we only have Spring’s empty `contextLoads` test (app starts). JUnit is already in the project ($0).

# LinkedIn ideas file (17/9-2026)

After each git push, Cursor reads `logs/Developer Log of FC Växjö Mobile App.md` and rewrites local `LK_POSTS.md` with at most 10 recruiter-facing post ideas (passion, problem-solving, project management, communication). Quality over count. The file is in `.gitignore` so it never goes to GitHub. Rule: `.cursor/rules/lk-posts.mdc`.

# Expo MVP UI (26/10-2026)

Decision: MVP front end is **Expo** (React Native), not a separate web-only admin. Why: the long-term product is a phone app for coaches/parents; building the first screens in Expo avoids throwing away a throwaway website.

MVP goal in one sentence: a coach/admin can create a club user and find them again (name, shirt number, or phone) without Postman.

What exists now under `UI/`:

- Tab **Search** — name / shirt # / phone → calls the Java API
- Tab **Create** — name, email, role, optional shirt + phone
- `src/api/config.ts` — API host (localhost / Android emulator / optional LAN IP for a real phone)
- API `CorsConfig` — so Expo **web** can call `/api/**` from localhost during local MVP

Out of MVP for now: login, schedules, attendance, notifications, polish design.

How to run locally: start the API (`API/` → `.\mvnw.cmd spring-boot:run`), then `cd UI` → `npm start` (press `w` for web, or Expo Go on a phone with LAN IP set in `config.ts`).

# Player linked to one parent (26/10-2026)

Decision: each PLAYER has exactly one PARENT. Stored as `users.parent_id` (nullable). No join table yet.

When creating a PLAYER, the coach must either:

- send `parentId` of an existing PARENT, or
- send `newParent` with **name + email + phone** (all required) so parent and player are created together in one transaction.

Expo Create tab: search parents by name (filters search results to role PARENT), or open “Create new parent” fields. Other roles skip the parent block.

Responses include `parentId` and `parentName` so the UI can show who the parent is.

# Teams API (27/10-2026)

Decision: club has named teams (e.g. P15).

- PLAYER has one `team_id` (required on create). PARENT / ADMIN have none.
- COACH ↔ team is many-to-many via `team_coaches` (`team_id` + `user_id`). A coach is not stored with `users.team_id`.

API:

- `POST/GET /api/teams`, `GET /api/teams/{id}`
- `POST/GET /api/teams/{id}/coaches`, `DELETE /api/teams/{id}/coaches/{userId}`
- Create PLAYER must send `teamId` (team must exist) plus parent as before.

Expo UI (27/10-2026):

- **Teams** tab — create team, pick a team, add/remove coaches by name search
- **Create** tab — PLAYER must pick a team from the list (create teams first if empty)
- Search results show `teamName`

Team roster: `GET /api/teams/{id}/players` lists PLAYERs with that `team_id`. Teams tab shows players (name, shirt #, parent) when a team is selected.

Player edit / soft delete (27/10-2026):

- `users.active` — soft delete (`DELETE /api/users/{id}` sets active=false). Inactive players leave team lists.
- `PUT /api/users/{id}/player` — edit name, email, phone, shirt, team (required, can switch), parent name/email/phone.
- Expo: tap a player on Teams → detail form → Save or Remove. Player and parent emails are editable; duplicates return 400.

# First security slice — login + role gates (27/10-2026)

Decision: **local email + BCrypt + JWT now** (no Auth0 yet). IdP can replace `/api/auth/login` later without changing role names. Login id is **email** (no username column).

What shipped:

- `users.password_hash`, `users.must_change_password`
- `POST /api/auth/login`, `POST /api/auth/change-password`
- Create user generates a temporary password (returned once); new parent gets one too
- Spring Security: JWT filter; only login is public; `@PreAuthorize` on create/soft-delete (ADMIN|COACH), role change + team admin ops (ADMIN only); COACH may only create PLAYER
- Bootstrap admin seeder: `admin@fcvaxjo.se` with a hardcoded temporary password (must change after first login)
- Expo: login screen, change-password gate, Bearer token on all API calls, Create tab only for ADMIN/COACH
- Java tests: `AuthServiceTest`, create-user password flags in `UserServiceTest`
- Postman checklist: `API/POSTMAN_AUTH.md`

Out of this slice (next): parent sees only children; player schedule rights; team-scoped coach limits.

Jira (paste yourself): Epic — Staff and members can sign in safely… Stories 1–2 from the security plan; keep story 3 (parent children) for later.

# JWT 120 minutes + silent refresh (27/10-2026)

Decision: access tokens last **120 minutes** (`app.jwt.expiration-ms=7200000`). `POST /api/auth/refresh` (Bearer required) returns a new JWT for another 120 minutes. Expo `apiFetch` on 401 tries refresh once, then clears session and shows login. No separate refresh-token table yet. Branch: `feature/jwt-120min-refresh`.

# Trainings + attendance (27/10-2026)

Decision: a training belongs to one team and stores **starts_at** + **ends_at**. On create, we **snapshot** active PLAYERs into `training_attendance` (status null). Later joiners do not appear on old trainings. Coach/admin marks `PRESENT` / `ABSENT` / `EXCUSED`. ADMIN any team; COACH only teams in `team_coaches`.

API: `POST/GET /api/trainings`, `GET /api/trainings/{id}`, `GET/PUT .../attendance`. Expo **Trainings** tab for staff. Branch: `feature/trainings-attendance`. Postman: `API/POSTMAN_TRAININGS.md`.

Jira (paste yourself): Epic — Coaches can run trainings… Story — As a coach I would like to create a training… and mark present/absent/excused…

# Demo club seed (27/10-2026)

`DemoClubSeeder`: ensures teams P13 + P14 + P15; each gets 1 coach, up to 10 players (1 parent each), and up to **10 trainings** with attendance snapshots. Idempotent (fills missing players/trainings only). Demo users get a hardcoded temporary password. Also resets `admin@fcvaxjo.se` to its temporary password (must change password) so local login works after password drift. Runs only with the Spring profile `dev` (default locally), never in production.

# Player + parent read-only schedule (27/10-2026)

Decision: members may **view** schedule only. Coaches/admins still create trainings and mark Present/Absent/Excused.

- `GET /api/my/children` (PARENT) — linked active players
- `GET /api/my/trainings` (PLAYER own team; PARENT needs `childId`) — training + that player’s status
- Expo: **Schedule** tab for PLAYER/PARENT (`MyScheduleScreen`); staff keep **Trainings** tab
- Branch: `feature/player-parent-trainings-view`. Tests: `MyScheduleServiceTest`. Postman: `API/POSTMAN_TRAININGS.md`

Jira (paste yourself):

- Story: `As a player I would like to see my team's trainings and my attendance status because I need to know when to show up.`
- Story: `As a parent I would like to see my child's trainings and attendance status because I need to follow their schedule.`
- Tasks: Add/Why/Done when for `GET /api/my/children`, `GET /api/my/trainings`, Expo Schedule tab, Postman + Java tests.

# CHAIRMAN role (5/11-2026)

Decision: add the chairman as a real role, with rank ADMIN > CHAIRMAN > COACH > PLAYER = PARENT. PLAYER and PARENT stay equal. The rank lives in `ClubRole`, not in the database id. `RoleSeeder` inserts `CHAIRMAN` when the row is missing. The `roles.name` column is already a string, so no new migration (there is no Flyway/Liquibase yet).

`POST /api/teams` allows only ADMIN and CHAIRMAN (`@PreAuthorize`, same style as the other endpoints). COACH, PLAYER and PARENT get 403. Linking a coach to a team is still ADMIN only. That part of ADR 0006 is not in this story. Branch: `cursor/s1-2-roll-chairman-24da`. Merged as PR #26.

# Secure token storage — story S1-5a (5/11-2026)

Decision: the access token and the refresh-token slot move from AsyncStorage to `expo-secure-store` (Expo SDK 58, `expo-secure-store` ~58.0.2).

Why: AsyncStorage is plain text. The JWT is the login. SecureStore uses the iOS keychain and the Android keystore. Role, email, user id and must-change-password stay in AsyncStorage. They are not the login token.

How the code is split, so it stays easy to explain:

- `UI/src/api/tokenStorage.ts` is the only file that calls SecureStore. get/set/clear for the access token and the refresh token.
- `UI/src/api/authStorage.ts` still owns the session. `saveSession` / `loadSession` / `clearSession` / `getToken` keep the same names. Login, refresh, change-password and logout did not need a new flow.
- On web there is no keychain. The tokens stay in memory for that browser tab. They are still not written to AsyncStorage.

Migration: older builds saved one JSON blob, `fcvaxjo_session`, with the JWT inside. On the next app open, `loadSession` copies that token into SecureStore and writes the profile back without it. If SecureStore already has a token, that newer copy is kept and the plain-text copy is still removed. A broken blob is deleted so a token cannot sit in AsyncStorage. A token without a full profile is deleted, not kept. We cannot rebuild a session from a token alone.

Refresh token: the API contract (`LoginResponse`) still has one field, `token`. `POST /api/auth/refresh` sends that JWT and returns a new one. There is no separate refresh token yet. The storage module has a refresh slot anyway, so logout clears both and a later API can store one without calling SecureStore from a screen. `saveSession` clears the refresh slot because today's login response does not include one.

`apiFetch` no longer uses a dynamic `import()` to call refresh. That import made a circle (auth imports apiFetch) and Jest cannot run it. `auth.ts` registers `refreshSession` with `setRefreshSession` instead.

Plugin: `expo-secure-store` in `app.json`, with Android backup exclusion turned on. `faceIDPermission: false` because we do not ask for biometrics. `ios.config.usesNonExemptEncryption: false` because we use the platform keychain, not our own encryption. Apple asks this at submit time.

Tests: Jest + `jest-expo` in `UI/`. Mocks for SecureStore and AsyncStorage. 24 tests. `npx tsc --noEmit`, `npx expo lint` and `npm test` pass.

Open: email is still in the AsyncStorage profile, and the JWT payload still contains the email (gap analysis item 10, second half). Not part of this story.

# Signed-in email leaves AsyncStorage (5/11-2026)

Update to the note above: the email does not stay in AsyncStorage.

Decision: the signed-in email is personal data, and the screens need it (Home greeting, More, change-password). It is saved with get/set/clear in `tokenStorage.ts`, the same file as the tokens, and removed from `fcvaxjo_session`. Logout clears it.

Migration: on the next open, if the old JSON still has `email`, copy it into SecureStore (unless SecureStore already has one) and write the profile back without it. This also covers phones that already ran the token migration and only have the email left in the JSON. A broken blob is deleted.

What stays in AsyncStorage, and why: `roleName` (which tabs to show), `userId` (Home loads that person), `mustChangePassword` (the gate after login). They are not contact data.

Refresh is unchanged. `POST /api/auth/refresh` still sends the access token and stores the new JWT. `saveSession` still clears the refresh slot because the server does not send a separate refresh token.

The JWT payload itself still contains the email. That is the API, not this storage change.

# Coach only on own teams (5/11-2026)

Story S1-3. A coach could create, edit and remove players on any team, because the API only checked the role.

Decision: keep the role check on the controller (`@PreAuthorize`). Check the team in `UserService`, the same way trainings already do. The link is `team_coaches`, not `users.team_id`, because one coach can train several teams.

What shipped:

- COACH may create `PLAYER` only when they train that `teamId`. Otherwise 403. The check runs before any insert, so a refused call does not leave a new parent behind.
- COACH may not create a standalone `PARENT`. A parent has no team, so there is no `team_coaches` row to check. The coach creates the parent only as `newParent` on a player in their own team. ADMIN and CHAIRMAN may create a parent with no child.
- COACH may soft-delete a player only on their own team. ADMIN still can on every team.
- COACH may edit a player only when they train both the current team and the new team. That closes the same hole: a coach could otherwise rewrite another parent's phone number.
- Unknown team ids return 403 for a coach (not 400 "Team not found"), so the error does not reveal which teams exist. Same order as trainings.
- No schema change. `existsByTeamIdAndUserId` is a parameterized Spring Data query.
- CHAIRMAN may create, edit and remove players on every team, same as ADMIN. A chairman may not create a coach or an admin.

Tests: `UserServiceTest` (mocked) and `CoachOwnTeamIntegrationTest` (HTTP + H2). The test profile uses an in-memory database so the suite does not need local Postgres or a real password.

# Sprint 1, story S1-1 — role check on read endpoints (5/11-2026)

Decision: close the personal-data reads that gap #2 named. ADR 0006 says role checks use `@PreAuthorize`, and anything that is not a plain role check lives in the service as a normal if.

What shipped:

- `GET /api/users`, all three `/api/users/search` queries, `GET /api/teams/{id}/coaches` and `GET /api/teams/{id}/players` are ADMIN or COACH only. PLAYER and PARENT get 403.
- `GET /api/users/{id}` stays open for the caller's own id, because the home screen loads the logged-in name from that URL. Anyone else's id is 403, and we answer 403 before 404 so a forbidden id does not reveal that the row exists. The check is `UserService.assertCallerMayReadUser`, same shape as `assertCallerMayCreate`.
- `GET /api/teams` and `GET /api/teams/{id}` stay open to every logged-in role. They return id and name only, not contact details.
- COACH is still not limited to their own teams on these reads. That is story S1-3.
- CHAIRMAN is not added. That role does not exist yet (story S1-2).
- A player who reads their own row still gets the linked parent's phone in `FetchUserResponse`. Hiding that field is data minimisation (ADR 0004), not this story.

Tests: `UserServiceTest` for the own-id rule. `UserAndTeamReadAccessTest` calls the API with JWTs for 401, 403 and the staff paths that must keep working.

# Role matrix and access tests (5/11-2026)

Decision: story S1-6a measures access. It does not change production code.

Why this shape: the OpenAPI file already says who may call each URL (`x-roles`, `x-scope`, `x-pii`). ADR 0006 is the target where the contract also has `x-roles-planned`. One short test per behavior is easier to explain than one test that loops every role. Tests the code still fails stay in the suite as a measuring stick, tagged `known-gap`, and Maven skips that tag so `./mvnw test` stays green.

Rebased onto `origin/master` after PR #24, #25 and #26. Creating a team as CHAIRMAN is no longer a known gap, because #26 already allows it. Linking a coach, and chairman writes on users, are still known gaps.

What is on branch `test/s1-6-rollmatris` (not pushed):

- `docs/testing/rollmatris.md` — target vs what the code does today, and how to run the known gaps
- Test profile uses in-memory H2. Fictional club: Lag Alfa and Lag Beta, own child and other child
- Passing MockMvc tests for the rules that already hold, including CHAIRMAN `POST /api/teams`
- Known-gap tests for S1-2 (read PII), S1-3 (coach not limited to own team on user changes), S1-4 (inactive token and GET of an inactive player), the remaining CHAIRMAN writes (ADR 0006), and phone numbers echoed in 404 text (gap point 6)

Story ids follow the numbering in `docs/gap-analys.md` top 5. The gap file itself does not write S1-1..S1-4. S1-1 is point 1 (seed passwords, already fixed). S1-2 is point 2, S1-3 is point 3, S1-4 is point 4.

Next: product owner approves before any push. Do not merge. The known-gap tests should start passing only when those stories change production code.

# S1-4: old JWT stops when the account changes (5/11-2026)

Decision: on every request, look up the user in the database. Do not add a token version column.

Why: a token lasts 120 minutes. After a soft delete (`active=false`) or a role change, the old token must get 401 on the next call. A database read does that for tokens that are already out in the app, and it needs no schema change. A version number would also work, but it needs a new column, a migration, and a rule for tokens that have no version yet. Traffic for one club is small, so one read by primary key per request is enough.

What shipped:

- `AccountAccessService` answers "is this user still active, and is the role in the token still their role?"
- `JwtAuthFilter` logs the request in only when that answer is yes. It does not write the 401 itself, so login stays public.
- Same 401 body as before: `{ "message": "Login required" }`. We do not say "inactive" here, because that would tell a caller the account exists.
- Turning the account back on, or changing the role back, makes the same token work again. After a role change the person can also log in again and get a token with the new role. Refresh cannot upgrade an old role.
- Tests: `AccountAccessServiceTest`, `JwtAuthFilterTest`, `JwtAuthFilterIntegrationTest` (H2, so `mvn test` does not need local Postgres).
- `docs/api/openapi.yaml` describes the new 401 cases. The open question about role change waiting for expiry is closed.
- After master gained `CHAIRMAN`, the same check covers that role. A CHAIRMAN token is rejected once the role in the database is no longer CHAIRMAN. `CreateTeamAuthorizationTest` now creates a real user, because a token for a missing user is 401.
- After PR #31, the inactive-token tests in `KnownInactiveUserTest` run in the normal suite. GET of an inactive row stays tagged `known-gap`, because this story does not hide that row.

# Chairman links coaches (5/11-2026)

Decision: ADMIN and CHAIRMAN may link a coach to any team and remove that link. COACH, PLAYER and PARENT get 403, including a coach on their own team. The rule lives in `ClubRole.canLinkCoach` and in `@PreAuthorize` on the two coach endpoints, same style as creating a team. The service still only checks that the user is a COACH. Creating a coach, or turning a player into a coach, stays in story S1-8.

Why a separate method from `canCreateTeam`: the two rights match today, but they are different actions. Changing one later must not silently change the other.

After the role matrix (PR #31) was merged in, `chairman_canAddCoach` and `chairman_canRemoveCoach` no longer have the `known-gap` tag. Creating, editing, or removing a player, and changing a role, still have that tag.

# S1-1 follow-up — chairman may read personal data (5/11-2026)

Decision: after `CHAIRMAN` landed on master, the same read rules include the chairman. `ClubRole.canReadPersonalData()` is the rule (admin, chairman, coach). The list and search annotations repeat those three names, same style as `canCreateTeam`. The chairman is not checked against `team_coaches`, because the chairman looks after every team. A coach is still not limited to their own teams on reads. That remains outside this story. Creating a coach or an admin is still ADMIN only. Creating a player is not: the chairman may do that on every team.

# Chairman uses the same player rules as admin (5/11-2026)

After master and the read-access branch were merged in, CHAIRMAN is real. For creating, editing and removing players the chairman is club-wide staff, same as ADMIN. A coach is still limited to `team_coaches`. A chairman may create a parent with no child. A chairman may not create a coach or an admin. That question in ADR 0006 stays open. Read rules from S1-1 are unchanged: chairman, admin and coach may read personal data for every team.

# S1-8: chairman can make a coach (5/11-2026)

Decision: build on S1-3. The chairman is already club-wide staff for players and parents. This story adds the coach. The chairman may create PLAYER, PARENT and COACH, and may change another user's PLAYER into a COACH. The chairman may never set ADMIN or CHAIRMAN (403). Anyone who is not ADMIN gets 403 if they try to change their own role. ADMIN keeps the old rights and may still set any role, including their own. Linking a coach to a team stays a separate step (`team_coaches`). This branch is merged after PR #27.

When a coach is created, `playerNumber` is cleared even if the request sends one. A coach has no shirt number, and the column is unique.

When a player becomes a coach, three player-only fields are cleared. The same happens whether ADMIN or CHAIRMAN does the change:

- `parentId` becomes empty. The parent account stays. A coach is not a child on that parent's list.
- `playerNumber` becomes empty, so the shirt number is free.
- `teamId` becomes empty. Players belong to a team through that column. Coaches belong through `team_coaches`, and this story does not write that table.

Old attendance rows stay. They are history.

After the change the person must log in again to get a token that says COACH. The old token still says PLAYER. PR #29 is merged in here, so the JWT filter rejects that token on the next call. The tests save a real active user and point the token at that id and role.

No schema change. The role name is already a text column. Branch: `cursor/s1-8-chairman-skapar-tranare-80dc`.

# S1-1 follow-up — known-gap tags that now pass (5/11-2026)

Decision: after the role matrix (PR #31) landed, the PLAYER and PARENT checks in `KnownPiiLeakTest` pass, so they run in the normal suite. The class no longer has the `known-gap` tag.

These tests still have the tag, because this story does not make them pass:

- A coach can still read every team (S1-3).
- A player's own row still includes the parent's phone.
- A missing phone number is still echoed in the 404 text (gap 6, story S1-12).

# Known-gap tags after S1-3 (5/11-2026)

The role matrix arrived from master (PR #31) after this branch already limited coaches to their own teams and let the chairman manage players. `KnownCoachScopeTest` and the three chairman player tests now run with the normal suite. The inactive-token checks, the chairman coach-link checks, and turning a player into a coach run in the normal suite too, because those branches are merged in here. The tag stays on a coach reading another team, the parent's phone on a player's own row, GET of an inactive user, and the phone number in a 404.

# Chairman can manage trainings on every team (5/11-2026)

Decision: a chairman creates a training and marks attendance for any team, the same as an admin. They do not need a row in `team_coaches`. The yes/no is `ClubRole.canManageAllTrainings()`, so the service does not copy the rank as a loose string check. A coach is unchanged: only teams they are linked to. PLAYER and PARENT still get 403 on the staff training URLs. There is still no URL to edit a training's title or time. "Change" here is the change an admin can already make: mark who was present. Branch: `cursor/s1-11-chairman-trainings-4539`.

# App knows the chairman (S1-5b)

Decision: the Expo app uses one role helper (`UI/src/auth/roles.ts`) with the same ranks as `ClubRole`. ADMIN 4 > CHAIRMAN 3 > COACH 2 > PLAYER 1 = PARENT 1. The Swedish label for CHAIRMAN is Ordförande.

"Skapa lag" moved to its own screen. The button and the tab route exist only for ADMIN and CHAIRMAN. A coach cannot open that screen by navigating, because the route is not registered. Other staff checks (attendance tab, create user, edit roster) now include CHAIRMAN, because that role is above COACH. A coach still only sees "Spelare" when creating a user. An admin can also pick Ordförande. A chairman gets the same picker as a coach until ADR 0006 answers whether a chairman may create a coach. POST /api/users still rejects CHAIRMAN.

Contract gaps left as they are in `openapi.yaml` (not changed in this story): trainings and create-user are still ADMIN+COACH on the API, linking a coach is still ADMIN only, and GET /api/my/teams does not allow CHAIRMAN. The app therefore sends a chairman to the full team list, not "my teams".

Follow-up on the same branch: a chairman keeps the coach screens for every team (trainings, create player and parent). When the API still answers a bare 403, the screen says the function is not available for the role yet, instead of "Access Denied". Linking a coach and letting a chairman create a coach stay unchanged. PR #28 was still open, so master was not merged in.

# App branch merged with master (5/11-2026)

Master now has secure token storage (PR #28), chairman player rules, chairman may create a coach (S1-8 / PR #34), and chairman trainings (PR #35). This branch keeps that storage and the app role checks. The create-user picker for a chairman is now player, parent, and coach, matching `POST /api/users`. A bare 403 still becomes the sentence that the function is not available for the role yet.

# S1-CI: backend tests on every pull request (5/11-2026)

Decision: GitHub Actions runs the same Maven build as a laptop, on pull requests against master and on pushes to master. The workflow only starts when `API/**` or the workflow file itself changes, so a UI-only change does not wait for Java.

What shipped:

- `.github/workflows/backend-ci.yml`. Java 21 (Temurin), the version in `API/pom.xml`. Maven cache. No database service and no secrets.
- The test profile is not switched on by the workflow. Each Spring test already has `@ActiveProfiles("test")`, which loads in-memory H2.
- The main job runs `bash mvnw -B verify`. `excludedGroups` in `pom.xml` is `known-gap`, so those tests stay out. Checked locally: 274 tests, 0 failures.
- A second job runs only that tag: `bash mvnw -B verify -DexcludedGroups= -Dgroups=known-gap`. The empty `-DexcludedGroups=` is required, because the pom would otherwise skip the tests this job asks for. Checked locally: 11 tests, 11 failures, and none of the normal suite.
- `continue-on-error` is on that Maven step. The failures stay in the log, the check stays green, and the merge is not blocked. The known-gap surefire report is uploaded every time. The main job uploads its report only when the build fails.
- README tells how to run both commands in Git Bash on Windows and on Linux or Mac. `pom.xml` was left alone (PR #36 also edits it).

# S1-12: a missing phone number stays out of the error (5/11-2026)

Decision: when a phone search finds nobody, the 404 says "User not found". The number the caller typed is not copied into that text. ADR 0004 says personal data does not belong in an error. The same text is used when the only matching row is inactive, so the answer still does not say which case it was. Who may search, which team a coach may see, and whether an inactive user can log in are unchanged. Branch: `cursor/s1-12-generic-phone-404-8752`.

# S1-10: coach reads only their own teams (5/11-2026)

Decision: a coach may list, read and search people only on teams they are linked to in `team_coaches`. ADMIN and CHAIRMAN still see the whole club. PLAYER and PARENT are unchanged.

The whole club list (`GET /api/users`) is refused for a coach. They use the team roster instead. A name search returns only people on their teams: players on `users.team_id`, coaches in `team_coaches`, and parents of active players on those teams. A shirt number or phone that is not on those teams gets the same 404 as a missing person. The 404 text is unchanged. Reading one user on another team is 403. Opening another team's player list or coach list is 403, and that check runs before "team not found".

The yes/no for the whole club is `ClubRole.canReadEveryTeam()`. The team check reuses the `team_coaches` lookup already used when a coach creates or edits a player (S1-3) and when they manage trainings (S1-11). The role does not know those rows, so the lookup stays in `UserService`.

The five coach checks in `KnownPiiLeakTest` now run in the normal suite. The parent's phone on a player's own row, the phone number in a 404, and GET of an inactive user stay tagged `known-gap`. Branch: `cursor/s1-10-coach-own-team-reads-aa46`.

# S1-13: an inactive user is hidden on the normal read (5/11-2026)

Decision: `GET /api/users/{id}` returns 404 "User not found" when `active=false`, for every role, including ADMIN. The same sentence as a missing id (S1-12), so the answer does not say the account exists. That is data minimisation (ADR 0004). Turning the account back on is a later endpoint. It is not this GET.

The inactive check runs before the role check. A player, a parent, or a coach on another team still gets 403 for a missing id (S1-10). They get 404 for an inactive id, because this story asks for 404 for every role. ADMIN and CHAIRMAN get 404 in both cases.

Lists and searches already hid inactive rows (`active=true` on the club list, name search, shirt search, phone search, team players and team coaches). No new query was needed there. The queries stay parameterized. Writes still load the inactive row, so "Cannot edit an inactive player" and "Player is already inactive" stay as they are.

The four GET tests in `KnownInactiveUserTest` run in the normal suite. `player_ownRowHidesParentPhoneNumber` stays tagged `known-gap` (sprint 2). Branch: `cursor/s1-13-inactive-user-404-02ad`. The branch merges S1-12 and S1-10 first, so it is meant to land after PRs #36, #37 and #38.

# Role matrix part 2 (5/11-2026)

Decision: story S1-6 part 2 only adds tests. No production code.

Why: the first matrix named the roles, but it did not walk every operation in the contract, and it did not try a broken token or a swapped id. Anonymous calls are read from `openapi.yaml` so a new path is picked up. An inactive user is 404 for every role, including CHAIRMAN. That GET still returns the row for staff, so those tests stay `known-gap` under S1-4. A coach can still read another team's phone by swapping the id. That stays `known-gap` under S1-3, because the write side of that story is done and the read side is not. Gap 6 (phone echoed in a 404, story S1-12) is unchanged.

# S1-10 answers the new IDOR tests (5/11-2026)

The extended role matrix (PR #41) was merged into this branch. Two of its `known-gap` tests already match the code, so the tag came off only those two. No new permission rule was added.

A coach who swaps the team id on `GET /api/teams/{id}/players` gets 403. The check runs in `UserService` before the team lookup, on the same `team_coaches` row as a write, so the other parent's phone is not in the body. A coach who swaps the user id on `GET /api/users/{id}` to a player on another team gets 403 for the same reason. `openapi.yaml` already lists 403 on both reads.

GET of an inactive user stays `known-gap`, including the chairman case the matrix added. That belongs to S1-13. The phone search already answers "User not found" (S1-12). The matrix paragraph above still describes the gaps as they were when the tests were written. This branch follows S1-10 and S1-12.

# S1-13 takes the inactive GET tests off the gap list (5/11-2026)

S1-10, including the merged role matrix, is now on this branch. The inactive GET tests pass, so the `known-gap` tag is off for admin, chairman, coach, player and parent. The message is "User not found". The two IDOR tests stay in the normal suite. A player's own row still shows the parent's phone, and that test stays `known-gap`.

# S1-9: harden login (5/11-2026)

Decision: a failed login is one 401, and a password change kills tokens issued before that change.

Why one message: "This account is inactive" and "This account has no password yet" told the caller that the email exists (gap analysis point 9). Wrong password, unknown email, inactive account, and an account with no hash now all return `Invalid email or password`. A blank email or password stays 400, because that is a missing field, not a lookup. When the email is missing, or the row has no hash, we still run one BCrypt compare against a throwaway hash and ignore the result. Skipping that compare would return faster and show that the account is not there. An inactive account uses its real hash, then we reject it even if the password was right. Rate limiting is still not built.

Why `passwordChangedAt`: the filter already reads the user on every request (S1-4 / PR #29). A new column is enough. There is no Flyway and no Liquibase (ADR 0002), so the column is the new field on `AppUser`. Hibernate adds it with `ddl-auto=update`, the same way the other user columns were added. Existing rows stay null, so tokens that are already out keep working until the next change. `AuthService.changePassword` sets the time. `UserService` is not touched. Creating a user, and the dev seeders rewriting a demo password, do not set the field.

Why whole seconds: JWT `iat` has no milliseconds. Comparing the raw times would make a change in the same second look "later" than the new token, and that token would die immediately. We reject only when `passwordChangedAt` is in a later second than `iat`. The window is under one second. A token with no `iat` after a real change is rejected, because we cannot show it is new enough.

What shipped:

- `AccountAccessService.tokenStillMatchesAccount` takes `issuedAt` and applies the second check.
- Login failures are `UnauthorizedException` (401). Protected routes still say `Login required`.
- Tests: unit tests for the three 401 cases and the second boundary. `LoginAccessTest` calls the API for the same three cases. `JwtAuthFilterIntegrationTest` logs in a real active coach, changes the password, and checks that the old token is 401 and the new one still works.
- `docs/api/openapi.yaml` describes both 401 texts. The open question about login status is closed.
- No `known-gap` tag covered this. Nothing was untagged.

Branch: `cursor/s1-9-harda-inloggning-761e`. The branch also contains S1-13, so this note stays last. Login of an inactive account is 401 `Invalid email or password`. `GET /api/users/{id}` of that account is 404 `User not found`.

# S1-9 follow-up: same-second window and closed gaps (5/11-2026)

Decision: the password check stays a strict `>` on whole seconds. `>=` would reject the token from a login in the same second as the password change, because that token and `passwordChangedAt` share a second.

Gap analysis: S1-10, S1-12 and S1-13 are marked closed. The phone number is no longer repeated in the 404 text (S1-12). The phone number is still a query parameter, so it can still show up in access logs. That part stays open.

# F3 and F8: same answer for a missing id and a hidden row (5/11-2026)

Decision: PLAYER, PARENT and COACH get 403 for `GET /api/users/{id}` both when the id is missing and when the row is inactive. ADMIN and CHAIRMAN keep 404 "User not found" in both cases. A coach who updates or soft-deletes a missing id gets the same 403 as a player on another team. ADMIN and CHAIRMAN still get 404 when that id is missing.

Why: S1-13 answered 404 for every role. That let a player, a parent, or a coach tell a missing id (403) from an inactive row (404). ADR 0004 says the answer must not show that the account exists. The Architect decided F3: for a role that may read the row, an inactive row uses the same answer as a missing id. For these three roles that answer is 403, including the coach of the player's own team. The body does not say "inactive" and does not include the email or the phone.

The old tests in `KnownInactiveUserTest` required 404 for the coach, the player and the parent. Those tests conflict with F3, so they now require 403. ADMIN and CHAIRMAN stay on 404. No `known-gap` tag was removed. The remaining known-gap test is still the parent's phone on a player's own row.

A coach's write checks the team before it describes the player. A missing id never reaches "User not found" for that role. An inactive player on the coach's own team is still 400 "Cannot edit an inactive player" or "Player is already inactive", because the coach may manage that team and the row is there to edit.

# F4: hide an inactive parent, and close how a coach creates one (5/11-2026)

Decision (b): a coach may create a parent only together with an active player on a team they train. A standalone parent is 400. ADMIN and CHAIRMAN may still create a parent with no child. Linking a player to a parentId that is inactive, or that is not a PARENT, is 400 for every role. The three parent contact fields are null when that parent is inactive.

Why 400 and not 403: the coach is allowed to create users. The mistake is that this parent is not tied to a player on their team. 403 stays for a role they may not create at all, and for a team they do not train. That team check still runs first, so a parent is not saved as a side effect of a player on another team.

The open question in the role matrix is closed. Gap analysis point 12 is closed.

# F5: stamp the time on every new password hash (5/11-2026)

Decision: `PasswordChange.storeHash` is the only production write of a password hash. It sets `passwordChangedAt` to now. That covers `saveNewUser`, `AuthService.changePassword`, `AdminSeeder`, and every hash write in `DemoClubSeeder`, including `resetDemoLogin`.

Why the first login still works: S1-9 keeps the strict `>` on whole seconds. The token is rejected only when the hash was written in a later second than `iat`. Creating the user, then logging in, is the same second or a later one, so the first token is accepted. A token from before a rewrite, such as the demo seeder resetting a password, is 401.

# F7: a coach duplicate does not name the field (5/11-2026)

Decision: a coach who creates a user with an email or phone that is already stored gets 400 `Could not create the user`. ADMIN and CHAIRMAN still get `User already exists` and `Phone number already in use`.

Why one sentence for every coach duplicate: a precise text on the coach's own team, and a vague text for everyone else, would still show that the vague answer means "this person is outside my team". The same 400 also hides whether the clash was the email or the phone. 409 would be a new status that still means the value is taken. 400 is the status create already uses for a bad request.

# F6: a player does not see the parent's fields (5/11-2026)

Decision (c): a PLAYER sees none of `parentName`, `parentEmail` or `parentMobilePhoneNumber`. That is the player's own row and every other read a player can reach. The check is the caller's role. A coach on the team, an admin and a chairman still see the fields when the parent is active.

`player_ownRowHidesParentPhoneNumber` was the last test tagged `known-gap`. The tag is removed. No test keeps that tag.

# F2 and F11: shirt 404 and inactive refresh (5/11-2026)

Decision: a missing, inactive, or out-of-team shirt number is 404 `User not found`. The number is not in the body. The old test required `No user found with player number 22`. That text repeated the number, so the test now requires `User not found`.

Refresh of an inactive account stays a check inside `AuthService.refresh`, but the answer is 401 `Login required`. The old 400 said "This account is inactive", which tells the caller the account exists. The filter already sends 401 on the HTTP path. The service now sends the same answer if it is called without the filter. The role matrix target column says 401.

# F9: SQL logging is off unless the dev profile is on (5/11-2026)

Decision: `spring.jpa.show-sql` is `false` in `application.properties` and in `application-prod.properties`. Only `application-dev.properties` sets it to `true`.

Why the default is false: the app already starts in the `dev` profile locally, so a developer still sees SQL. If Railway forgets `SPRING_PROFILES_ACTIVE=prod`, the default file still keeps the log off. Putting `true` in the default file and hoping prod overrides it would print queries, including email and phone, whenever the profile is missing. The prod file has no secrets. Passwords stay in environment variables. Gap analysis point 7 is closed for the SQL log. `ddl-auto=update` and the database user are still open.

# F10: reject a duplicate shirt before insert (5/11-2026)

Decision: `saveNewUser` calls the same shirt check as an update, before the insert. ADMIN and CHAIRMAN get 400 `Shirt number already in use`. A coach gets `Could not create the user`, the same sentence as a duplicate email, so the text does not say the number is taken on another team. An update by a coach says `Could not update the player` instead of naming the shirt.

A `DataIntegrityViolationException` that still escapes is 400 `Could not save the user`. The database message can contain SQL, so it is not copied into the response.

# F1: search goes in the body (5/11-2026)

Decision: `GET /api/users/search?name=&number=&phone=` is replaced by `POST /api/users/search`. The JSON body must contain exactly one of `name`, `playerNumber` and `phone`. Anything else is 400. The answers and the roles stay the same. GET on that URL is 405, so it is not a search.

Why: ADR 0004 says personal data should not sit in the URL. An access log that stores the path would store the phone. The mobile app must switch to this POST before or at the same time as this change is merged. `UI/` is not changed here.
