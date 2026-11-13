# Driftsättning på Render + Neon (#158)

API:et körs på **Render** (Starter, Frankfurt) mot **Neon** (gratis PostgreSQL, Frankfurt). Beslutet står i ADR 0011. Imagen byggs av Render från `API/Dockerfile` (se `docs/docker.md`). Konfigurationen finns i `render.yaml` i repo-roten.

Priser och gratisgränser ändras. Kontrollera dem på render.com och neon.com innan du betalar.

## Det du gör (människa)

1. **Neon:** skapa konto och ett projekt, region AWS `eu-central-1` (Frankfurt). Kopiera den **direkta** anslutningen (utan `-pooler` i adressen). Du behöver databasnamn, användare, lösenord och adress.
2. **Render:** skapa konto, välj Blueprint och peka på GitHub-repot. Render läser `render.yaml`. Fyll i hemligheterna när Render frågar:

   | Variabel | Värde |
   | --- | --- |
   | `DB_URL` | `jdbc:postgresql://<neon-adress>/<databas>?sslmode=require` (adressen utan `-pooler`) |
   | `DB_USERNAME` | Neons användare |
   | `DB_PASSWORD` | Neons lösenord |
   | `JWT_SECRET` | minst 32 byte, slumpad (se `API/.env.example`) |
   | `BOOTSTRAP_ADMIN_PASSWORD` | tillfälligt lösenord till första admin |

   Render frågar bara vid första skapandet. Ändra senare under Environment i Render.
3. **Expo/EAS:** skapa konto vid behov, logga in med `npx eas-cli login` och bygg APK:n (nedan).
4. Installera APK:n på ordförandens telefon.

## Appens adress

`UI/eas.json` sätter `EXPO_PUBLIC_API_URL` för bygget `pilot`. Rätta adressen till den som Render faktiskt ger tjänsten (visas på tjänstens sida, slutar på `.onrender.com`) och lägg till `/api`. Vid daglig utveckling är variabeln inte satt, så de lokala adresserna i `UI/src/api/config.ts` gäller som förut.

```bash
cd UI
npx eas-cli build --platform android --profile pilot
```

`UI/app.json` har `usesCleartextTraffic: true` så att telefonen kan nå din dator över http under utveckling. Mot Render används https. Överväg att stänga av den inför piloten.

## Backup med pg_dump

Neons gratisplan sparar bara en kort historik (cirka 6 timmar) och tar inga schemalagda backuper. Ta därför en egen backup före varje deploy och minst en gång i veckan. Det kräver PostgreSQL-verktygen (`pg_dump`, `pg_restore`) på din dator.

Använd den **direkta** adressen, inte `-pooler`:

```bash
pg_dump -Fc -v -d "postgresql://ANVANDARE:LOSENORD@EP-ADRESS/DATABAS?sslmode=require" -f fcvaxjo-$(date +%F).dump
```

Backupfilen innehåller personuppgifter. Spara den krypterat och aldrig i git (`*.dump` ligger i `.gitignore`).

Prova återställning mot en tom lokal databas:

```bash
createdb fcvaxjo_restore
pg_restore -v -d fcvaxjo_restore fcvaxjo-2026-12-01.dump
```

## Kontrollera efter första deployen

Inloggningsspärren (ADR 0008) behöver telefonens riktiga IP. Vilken header Render sätter är **inte kontrollerad**: dokumentationen gick inte att läsa vid planeringen. Tills det är kontrollerat gäller reservläget: spärren går på e-postadressen ensam (5 fel) och API:et loggar en varning en gång i timmen.

- [ ] `https://<tjänsten>.onrender.com/api/public/health` svarar `{"status":"UP"}`.
- [ ] Loggen visar att API:et startat med profilen `prod` och att Neon svarar.
- [ ] Ordföranden loggar in med APK:n och byter lösenord.
- [ ] Logga `getRemoteAddr()` (trunkerad) en gång från 4G och en gång från wifi. Är det en intern adress i båda fallen sätter Render sin klient-IP i en annan header än `X-Real-IP`. Rätta då `server.tomcat.remoteip.remote-ip-header` i `application-prod.properties` och uppdatera ADR 0008. Ta bort loggraden efteråt.
- [ ] `curl` mot login med falsk `X-Real-IP` och `X-Forwarded-For`: spärren ska följa din riktiga IP, inte headern.
- [ ] Ta en backup och prova återställningen lokalt.
- [ ] Kolla Neons förbrukning av compute-timmar efter första veckan. Gratisgränsen ska räcka.
- [ ] Neon pausar efter 5 minuter utan användning. Första anropet efteråt kan ta en stund. Kontrollera att appen klarar det.
