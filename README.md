# FC Växjö Mobile App

A club app for FC Växjö: players, coaches, parents, and staff.

**Now:** Java Spring Boot API + PostgreSQL on this computer.  
**Not yet:** phone app, login, hosting.

When you add or change a URL, update the table below. `UserController` is the source of truth.

## Run the API

From the `API` folder:

```powershell
.\mvnw.cmd spring-boot:run
```

Needs local Postgres and `API/.env` (password is not in Git). Base URL: `http://localhost:8080`

Roles in the database: `ADMIN`, `COACH`, `PLAYER`, `PARENT`.

## API endpoints

| Method | URL | What it does |
|---|---|---|
| GET | `/api/users` | List all users |
| GET | `/api/users/search?name=` | Find users whose name contains the text (ignore case) |
| GET | `/api/users/search?number=` | Find one user by shirt number |
| GET | `/api/users/{id}` | Fetch one user by id |
| POST | `/api/users` | Create a user |
| PUT | `/api/users/{id}/role` | Change that user's role |

No login yet. Anyone who can reach your PC can call these URLs.

Shirt number (`playerNumber`) is optional. Coaches and parents usually have none. Two users cannot share the same number.

### Create user (`POST /api/users`)

```json
{
  "name": "Erik",
  "email": "erik@fcvaxjo.se",
  "roleName": "PLAYER",
  "playerNumber": 7
}
```

Leave `playerNumber` out if they have no shirt number yet.

### Change role (`PUT /api/users/{id}/role`)

```json
{
  "roleName": "COACH"
}
```
