# Postman checks — trainings + attendance

Base URL: `http://localhost:8080/api`

Log in first (`POST /auth/login`) and use `Authorization: Bearer <token>` on every call below.
ADMIN works for any team. COACH must be linked to the team.

## Checklist

1. **Create training**  
   `POST /trainings`  
   Body:
   ```json
   {
     "teamId": 1,
     "startsAt": "2026-10-27T16:00:00",
     "endsAt": "2026-10-27T17:30:00",
     "title": "Evening training"
   }
   ```
   → 201 with `id`, `startsAt`, `endsAt`, `teamName`

2. **List trainings for team**  
   `GET /trainings?teamId=1` → array (newest start first)

3. **Get one**  
   `GET /trainings/{id}` → one training

4. **Attendance snapshot**  
   `GET /trainings/{id}/attendance`  
   → one row per active PLAYER who was on the team at create time; `status` is `null`

5. **Mark attendance**  
   `PUT /trainings/{id}/attendance/{playerId}`  
   Body: `{ "status": "PRESENT" }` (or `ABSENT` / `EXCUSED`)  
   → 200 with that status

6. **Later joiner stays off the list**  
   Create a new PLAYER on the same team, then `GET /trainings/{id}/attendance` again  
   → new player is **not** on that training’s list

7. **Wrong coach → 403**  
   COACH not linked to the team calling create/list → 403
