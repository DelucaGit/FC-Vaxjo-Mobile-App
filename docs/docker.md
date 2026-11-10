# Docker-image för API:et

API:et kan byggas till en Docker-image (#68). Samma image ska köras på Railway. Vardagsutveckling sker fortfarande med Maven Wrapper (`bash mvnw spring-boot:run`), se README.

Kräver Docker Desktop. Kör kommandona från repo-roten.

## Bygg

```bash
docker build -t fcvaxjo-api API/
```

`API/Dockerfile` har två steg. Första steget bygger jar-filen med Maven och en full JDK 21. Andra steget kör bara jar-filen på en mindre JRE 21-image, som en vanlig användare (inte root). Testerna körs inte i bygget, de körs av `mvnw verify` och i CI.

`API/.dockerignore` stoppar `.env`, `target/`, `.git` och IDE-mappar från att skickas in i bygget.

## Kör mot lokal PostgreSQL

Inga hemligheter finns i imagen. Allt kommer från miljövariabler när containern startar:

| Variabel | Behövs | Betydelse |
| --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | ja | `prod` (SQL-loggning av, ingen demodata) |
| `DB_URL` | ja | JDBC-adress. Standard är `localhost`, vilket inne i en container är containern själv. |
| `DB_USERNAME` | nej | Standard `postgres` |
| `DB_PASSWORD` | ja | Lösenord till databasen |
| `JWT_SECRET` | ja | Minst 32 byte. API:et startar inte utan. |
| `BOOTSTRAP_ADMIN_PASSWORD` | nej | Tillfälligt lösenord för första admin. Tomt = ingen admin skapas. |
| `PORT` | nej | Porten API:et lyssnar på. Standard 8080. Railway sätter den själv. |

Från containern når du PostgreSQL på din dator via `host.docker.internal` (fungerar i Docker Desktop på Windows och Mac).

PowerShell:

```powershell
docker run --rm -p 8080:8080 `
  -e SPRING_PROFILES_ACTIVE=prod `
  -e DB_URL=jdbc:postgresql://host.docker.internal:5432/fcvaxjo_db `
  -e DB_PASSWORD=ditt-lösenord `
  -e JWT_SECRET=minst-32-byte-slumpad-sträng `
  fcvaxjo-api
```

Bash:

```bash
docker run --rm -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e DB_URL=jdbc:postgresql://host.docker.internal:5432/fcvaxjo_db \
  -e DB_PASSWORD=ditt-lösenord \
  -e JWT_SECRET=minst-32-byte-slumpad-sträng \
  fcvaxjo-api
```

Du kan också lägga variablerna i en fil och skicka den med `--env-file`. Filen läses på din dator och kopieras inte in i imagen:

```bash
docker run --rm -p 8080:8080 --env-file API/.env \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e DB_URL=jdbc:postgresql://host.docker.internal:5432/fcvaxjo_db \
  fcvaxjo-api
```

API:et svarar sedan på `http://localhost:8080/api`. En riktig telefon når det via datorns LAN-IP, precis som när API:et körs med Maven (se `UI/src/api/config.ts`).

Om anslutningen till databasen nekas: kontrollera att PostgreSQL lyssnar på fler adresser än `localhost` (`listen_addresses` i `postgresql.conf`) och att `pg_hba.conf` släpper in anslutningen.

## Kontrollera att `.env` inte finns i imagen

```bash
docker run --rm --entrypoint ls fcvaxjo-api -la /app
```

Där ska bara `app.jar` finnas. Jar-filen byggs från `API/src/`, och `.env` ligger i `API/`, inte under `src/main/resources`, så den hamnar inte i jar-filen. Vill du se efter själv kan du bygga jar-filen lokalt och lista innehållet (JRE-imagen saknar `jar`-verktyget):

```bash
cd API && bash mvnw -B package -DskipTests && jar tf target/api-0.0.1-SNAPSHOT.jar | grep '\.env'
```

Raden ska inte visa någon `.env`.
