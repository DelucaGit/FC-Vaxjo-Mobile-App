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

### What we did in this step

1. Created this `PROGRESS.md` journey file.
2. Improved the Java models so real club relationships are clearer:
   - Added `ADMIN` role
   - Added `Team` (a squad / age group)
   - Players belong to a **team**
   - Coaches belong to a **team** (not to a single player)
   - A player can have **several parents**
   - A young player may not have their own login yet (`user` on Player is optional)

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

**Why:** A child often has two guardians. One parent can also have several children
(we will model “parent → many players” more fully when we add the database).

### Decision 6: `Player.user` is optional

**Why:** Young players may not have their own phone/login.
Parents manage them until the player is old enough for an account.

### Decision 7: Keep models as plain Java for now (no JPA annotations yet)

**Why:** Easier to read and review. Next step is adding Spring Data JPA
and turning these classes into real database tables.

### Decision 8: Develop locally first; AWS later

**Why:** AWS costs money. Local API + local PostgreSQL costs $0 while we learn.
We only deploy when the app actually works.

---

## Suggested next steps (not done yet)

1. Add PostgreSQL + Spring Data JPA (save models in a real database).
2. Add REST endpoints (create user, list players, assign team, etc.).
3. Add login / security.
4. Start the React Native app (login + player list).
5. Deploy to AWS when ready — with a cheap setup.

---

## Cost notes (keep under ~$100/month)

| Phase | Expected cost |
|--------|----------------|
| Local development | ~$0 |
| Small AWS API + PostgreSQL (careful Free Tier / tiny instances) | aim for ~$0–40 while learning |
| Domain name (optional, later) | ~$10–15 / year |

We revisit AWS choices before any paid resources are created.
