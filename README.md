# FC Växjö — how to run and test everything in Docker
#
# Cost: local Docker is about $0. Secrets stay in `.env` (never commit it).

## 1. Create your secrets file

```bash
cp .env.example .env
```

Edit `.env` and set strong values for:
- `POSTGRES_PASSWORD` / `DB_PASSWORD` (same value)
- `JWT_SECRET` (32+ random characters)
- `ADMIN_PASSWORD` (8+ characters)

## 2. Start the full stack

```bash
docker compose up --build
```

Services:
| Service | URL | Purpose |
|---------|-----|---------|
| Mobile web | http://localhost:8081 | Test the app in a browser |
| API | http://localhost:8080 | Java backend |
| Postgres | localhost:5432 | Database |

## 3. Log in

Use the admin from your `.env`:
- Email: value of `ADMIN_EMAIL`
- Password: value of `ADMIN_PASSWORD`

Parents can also use **Create an account** in the app.

## 4. Useful commands

```bash
# Stop
docker compose down

# API tests (no Docker needed)
cd api && ./mvnw test

# Mobile only (against running API)
cd mobile && npm install && npm run web
```

## Security rules we follow

- Secrets only in `.env` / environment variables — not in source code
- Passwords stored with BCrypt
- JWT required for protected API routes
- CORS limited to known origins
- Admin seeding only when `ADMIN_SEED=true`
