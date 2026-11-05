# Postman checks — first auth slice

Base URL: `http://localhost:8080/api`

Bootstrap admin (seeded once):

> Passwords are not written here. `{{adminPassword}}` = `BOOTSTRAP_ADMIN_PASSWORD` and `{{demoPassword}}` = `DEMO_PASSWORD` in your local `API/.env` (set them as Postman environment variables).

- Email: `admin@fcvaxjo.se`
- Temporary password: `{{adminPassword}}`

## Checklist

1. **No token → 401**  
   `GET /users` without Authorization → 401 `{ "message": "Login required" }`

2. **Login**  
   `POST /auth/login`  
   Body: `{ "email": "admin@fcvaxjo.se", "password": "{{adminPassword}}" }`  
   → 200 with `token`, `mustChangePassword: true`

3. **Change password**  
   `POST /auth/change-password`  
   Header: `Authorization: Bearer <token>`  
   Body: `{ "currentPassword": "{{adminPassword}}", "newPassword": "{{newPassword}}" }`  
   → 200, `mustChangePassword: false`, new `token`

4. **Create player as ADMIN**  
   `POST /users` with Bearer token, valid PLAYER body (parent + team)  
   → 201 with `temporaryPassword` (and `parentTemporaryPassword` if new parent)

5. **Create as PLAYER token → 403**  
   Log in as a PLAYER (after creating one and changing password), then `POST /users`  
   → 403

6. **Soft-delete as COACH/ADMIN**  
   `DELETE /users/{playerId}` with staff token → 204

7. **Refresh token (still valid JWT)**  
   `POST /auth/refresh`  
   Header: `Authorization: Bearer <token>`  
   → 200 with a **new** `token` (another 120 minutes).  
   No body needed. Expired/missing token → 401.

JWT lifetime: **120 minutes** (`app.jwt.expiration-ms=7200000`).

Wrong password, unknown email, or an inactive account → 401 `Invalid email or password` (the same message for all three). A blank email or password is still 400.
