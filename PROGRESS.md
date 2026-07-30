# FC Växjö Mobile App — Progress & Decisions

This file is our journey log. We write every progress step and every decision here,
so later we can turn it into an article about how the app was built.

---

## Vision

Build a **mobile Android app for FC Växjö** (football club) so the club can keep track of:

- **Users** — anyone who logs in
- **Players** — children / youth who play
- **Parents** — guardians linked to one or more players
- **Coaches** — people who coach a team

### Planned tech stack

| Layer | Technology | Why |
|--------|------------|-----|
| Mobile app | React Native (Android first) | One codebase, good for learning, can add iOS later |
| API backend | Java + Spring Boot | Strong typing, good for structured club data |
| Database | PostgreSQL | Reliable relational DB; fits users/teams/roles well |
| Hosting | AWS (later) | Scalable, but we stay cheap while learning |

**Budget goal:** stay around **$100/month or less**. While building, we run locally for free and only pay for AWS when we need the app online.

---

## Current status (2026-07-30)

### What already existed

- Spring Boot API project under `api/`
- Simple models: `User`, `Role`, `Player`
- No database yet, no REST endpoints yet, no React Native app yet

### Step 1 — Better models + journey log

1. Created this `PROGRESS.md` journey file.
2. Improved the Java models so real club relationships are clearer:
   - Added `ADMIN` role
   - Added `Team` (a squad / age group)
   - Players belong to a **team**
   - Coaches belong to a **team** (not to a single player)
   - A player can have **several parents**
   - A young player may not have their own login yet (`user` on Player is optional)

### Step 2 — Connect PostgreSQL (Spring Data JPA)

1. Added `spring-boot-starter-data-jpa` and the PostgreSQL driver to `api/pom.xml`.
2. Turned `User`, `Team`, and `Player` into `@Entity` classes (real database tables).
3. Added repositories (`UserRepository`, `TeamRepository`, `PlayerRepository`) so we can save/load data.
4. Added `docker-compose.yml` to run PostgreSQL locally for **$0**.
5. Tests use H2 (in-memory) so CI / cloud agents can run without Docker.

**How you start the local database on your machine:**

```bash
docker compose up -d
```

Then run the API from `api/`:

```bash
./mvnw spring-boot:run
```

### Step 3 — REST API endpoints

Added a clear 3-layer layout:

1. **Controller** — receives HTTP requests (`/api/...`)
2. **Service** — business rules (e.g. “parent must have PARENT role”)
3. **Repository** — talks to the database

Main endpoints:

| Method | Path | What it does |
|--------|------|----------------|
| POST | `/api/users` | Create a user |
| GET | `/api/users` | List users |
| GET | `/api/users/{id}` | Get one user |
| POST | `/api/teams` | Create a team |
| GET | `/api/teams` | List teams |
| GET | `/api/teams/{id}` | Get one team |
| POST | `/api/teams/{teamId}/coaches/{coachUserId}` | Assign coach to team |
| POST | `/api/players` | Create a player |
| GET | `/api/players` | List players (`?teamId=` optional) |
| GET | `/api/players/{id}` | Get one player |
| POST | `/api/players/{playerId}/parents/{parentUserId}` | Link parent |
| PUT | `/api/players/{playerId}/team/{teamId}` | Assign player to team |

Responses never include passwords. Integration test covers create user → team → player → parent link.

### Step 4 — JWT login + password hashing

1. Added Spring Security + JWT (jjwt).
2. Passwords are hashed with **BCrypt** (never stored as plain text).
3. Public endpoints:
   - `POST /api/auth/login` → returns a JWT
   - `POST /api/auth/register` → parent signup + JWT
4. All other `/api/**` routes need header: `Authorization: Bearer <token>`
5. `POST /api/users` is **ADMIN only** (create coaches/admins/players).
6. Admin seeding is **optional** (`ADMIN_SEED=true`) and password comes from env.

**Login example:**

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"YOUR_ADMIN_EMAIL","password":"YOUR_ADMIN_PASSWORD"}'
```

Then use the token:

```bash
curl http://localhost:8080/api/teams \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Step 5 — Mobile app + full Docker test stack

1. Created Expo React Native app in `mobile/` (login, parent register, teams/players).
2. JWT stored in SecureStore on device / sessionStorage on web.
3. Removed secrets from source code — use `.env` (from `.env.example`).
4. `docker compose up --build` runs:
   - PostgreSQL
   - Java API
   - Mobile web UI at http://localhost:8081
5. Added `README.md` with run instructions.

**Test everything:**

```bash
cp .env.example .env
# edit secrets in .env
docker compose up --build
```

Open http://localhost:8081 and log in with your `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
---

## Decisions and why

### Decision 1: Start with Java models before the database

**Why:** First we define *what* we store. Then we connect PostgreSQL.
If the model is wrong, the database will be wrong too.

### Decision 2: One `User` type + a `Role`

**Why:** Parents, coaches, players, and admins all need login details
(name, email, password). Role tells us *what they are allowed to do*.
This is simpler than four separate login tables.

### Decision 3: Add an `ADMIN` role

**Why:** Someone at the club must create teams, invite coaches, and manage users.
That person is not only a coach or parent.

### Decision 4: Coaches are linked to a `Team`, not to each `Player`

**Why:** In real clubs, a coach trains a whole squad (for example “P12”),
not one child at a time. Linking coach → team matches reality and avoids
duplicating the same coach on every player.

### Decision 5: Parents are a list on `Player` (many parents per player)

**Why:** A child often has two guardians. One parent can also have several children.
In the database this is a many-to-many table called `player_parents`.

### Decision 6: `Player.user` is optional

**Why:** Young players may not have their own phone/login.
Parents manage them until the player is old enough for an account.

### Decision 7: Use Spring Data JPA + Hibernate `ddl-auto=update` while learning

**Why:** Hibernate can create/update tables from our Java classes.
That is fast for learning. Later (before real production) we switch to
Flyway (or Liquibase) migration scripts so table changes are controlled.

### Decision 8: Develop locally first; AWS later

**Why:** AWS costs money. Local API + local PostgreSQL (Docker) costs $0 while we learn.
We only deploy when the app actually works.

### Decision 9: Table name `app_users` instead of `users` / `user`

**Why:** `user` is a reserved word in PostgreSQL. `app_users` avoids confusing SQL errors.

### Decision 10: H2 for tests, PostgreSQL for real runs

**Why:** Tests should run without installing Docker everywhere.
H2 is free and in-memory. Your real app still uses PostgreSQL locally/on AWS.

### Decision 11: Hash passwords with BCrypt + use JWT for login

**Why:**
- BCrypt stores a one-way hash, so a DB leak does not reveal real passwords.
- JWT lets the mobile app prove “I logged in” without server sessions.
- Stateless JWT fits React Native well (send token on each request).

### Decision 12: Controllers → Services → Repositories

**Why:** Keeps each file easy to read.
- Controllers only handle HTTP
- Services hold rules (roles, “already exists”, etc.)
- Repositories only save/load data

### Decision 13: DTOs instead of returning entities directly

**Why:** We can hide passwords and shape JSON for the mobile app
without changing the database tables.

### Decision 14: `@Transactional` on services

**Why:** Hibernate loads related lists (coaches, parents) lazily.
A transaction keeps the DB session open long enough to read them safely.

### Decision 15: Public register is PARENT-only; admin creates other roles

**Why:** Anyone on the internet should not be able to create an ADMIN or COACH.
Parents can self-register. Club staff accounts are created by an admin.

### Decision 16: Seed admin only when explicitly enabled

**Why:** Production should not invent admin accounts by accident.
Docker/local learning sets `ADMIN_SEED=true` and provides `ADMIN_PASSWORD` via `.env`.

### Decision 17: Secrets only in environment / `.env`

**Why:** Source code is often pushed to GitHub. Passwords and JWT secrets
must never live in committed files. `.env` is gitignored; `.env.example` has placeholders only.

### Decision 18: Expo web export inside Docker for testing

**Why:** You asked for an app you can test in Docker. Native Android emulators
are heavy. We ship a web build of the same React Native app on port 8081
so you can click through login/teams/players in a browser. Android via Expo Go stays available later.

### Decision 19: CORS allow-list instead of `*`

**Why:** Only known front-end origins (localhost Expo web) may call the API from a browser.

---

## Suggested next steps (not done yet)

1. Tighten permissions (e.g. coaches only see their teams; parents only their children).
2. Add `/api/auth/me` endpoint.
3. Try the app on a real Android phone with Expo Go.
4. Deploy to AWS when ready — with a cheap setup (still aim under ~$100/month).
---

## Cost notes (keep under ~$100/month)

| Phase | Expected cost |
|--------|----------------|
| Local development (Docker Postgres + Spring Boot) | ~$0 |
| Small AWS API + PostgreSQL (careful Free Tier / tiny instances) | aim for ~$0–40 while learning |
| Domain name (optional, later) | ~$10–15 / year |

We revisit AWS choices before any paid resources are created.
