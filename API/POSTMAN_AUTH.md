# Postman checks — first auth slice

Base URL: `http://localhost:8080/api`

Bootstrap admin (seeded once):

- Email: `admin@fcvaxjo.se`
- Temporary password: `TempAdmin1!`

## Checklist

1. **No token → 401**  
   `GET /users` without Authorization → 401 `{ "message": "Login required" }`

2. **Login**  
   `POST /auth/login`  
   Body: `{ "email": "admin@fcvaxjo.se", "password": "TempAdmin1!" }`  
   → 200 with `token`, `mustChangePassword: true`

3. **Change password**  
   `POST /auth/change-password`  
   Header: `Authorization: Bearer <token>`  
   Body: `{ "currentPassword": "TempAdmin1!", "newPassword": "NewSecure1!" }`  
   → 200, `mustChangePassword: false`, new `token`

4. **Create player as ADMIN**  
   `POST /users` with Bearer token, valid PLAYER body (parent + team)  
   → 201 with `temporaryPassword` (and `parentTemporaryPassword` if new parent)

5. **Create as PLAYER token → 403**  
   Log in as a PLAYER (after creating one and changing password), then `POST /users`  
   → 403

6. **Soft-delete as COACH/ADMIN**  
   `DELETE /users/{playerId}` with staff token → 204

Wrong password on login → 400 `Invalid email or password`.
