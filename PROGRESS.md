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

### Decision 11: Passwords are plain text for now (temporary)

**Why:** We focus on “can we save users to the DB?” first.
Next security step must hash passwords — never ship plain-text passwords.

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

---

## Suggested next steps (not done yet)

1. Add login / security (and hash passwords).
2. Start the React Native app (login + player list).
3. Deploy to AWS when ready — with a cheap setup.
---

## Cost notes (keep under ~$100/month)

| Phase | Expected cost |
|--------|----------------|
| Local development (Docker Postgres + Spring Boot) | ~$0 |
| Small AWS API + PostgreSQL (careful Free Tier / tiny instances) | aim for ~$0–40 while learning |
| Domain name (optional, later) | ~$10–15 / year |

We revisit AWS choices before any paid resources are created.
