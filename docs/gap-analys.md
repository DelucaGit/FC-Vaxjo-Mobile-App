# Gap-analys: säkerhet och GDPR (FC Växjö API/UI)

Underlaget är grenen `feature/player-parent-trainings-view` (commit d21b180), läst 2026-11-05. Radnummer avser den commiten.
Roller och omfång bedöms mot ADR 0006.
Sökvägarna nedan är relativa till repo-roten. `J/` = `API/src/main/java/se/fcvaxjo/api/`.
Allvarlighet: **K** = kritisk (måste åtgärdas före produktion), **H** = hög, **M** = medel, **L** = låg.

## Topp 5

1. **K: Demo-seeder och bootstrap-admin körs alltid, med kända lösenord.** `J/service/DemoClubSeeder.java:32` har `@Component` utan `@Profile`. Den återställer **admin-kontot till ett hårdkodat temporärt lösenord vid varje omstart** (`:70`, `:85-91`), skapar demoanvändare med ett hårdkodat temporärt lösenord (`:36`) och återaktiverar demokontona och återställer deras lösenord vid varje start (`:209-213`). `J/service/AdminSeeder.java:22-23` har hårdkodad admin-e-post och ett hårdkodat temporärt lösenord. Lösenorden stod också i klartext i PROGRESS.md och står fortfarande i `API/POSTMAN_AUTH.md` och `API/POSTMAN_TRAININGS.md` (publikt repo). I produktion skulle vem som helst kunna logga in som admin efter en omstart.
   *Delvis åtgärdat på grenen `docs/api-contract`:* `DemoClubSeeder` har nu `@Profile("dev")`, `application.properties` sätter `dev` som standardprofil (`SPRING_PROFILES_ACTIVE`), och lösenorden är borttagna ur PROGRESS.md (men inte ur POSTMAN-filerna). `AdminSeeder` är orörd, eftersom den bara skapar admin när kontot saknas och då kräver lösenordsbyte. Före prod ska den ändå läsa ett engångslösenord från en miljövariabel. Lösenorden finns kvar i git-historiken och ska betraktas som kända.
   *Åtgärdat på grenen `security/remove-hardcoded-passwords`:* alla seed-lösenord läses från `DEMO_PASSWORD` och `BOOTSTRAP_ADMIN_PASSWORD` (`API/.env`, eller Railways variabler). Saknas de hoppar seedern över sitt arbete. POSTMAN-filerna använder platshållare. En pre-commit-hook (`.githooks/pre-commit` + `.gitleaks.toml`) stoppar nya läckor.
2. **K: Läs-endpoints saknar rollkontroll och exponerar all PII för alla inloggade, även PLAYER och PARENT.** Det gäller `J/controller/UserController.java:38` (`GET /api/users`), `:57`, `:76`, `:88` (`/search`), `:93` (`GET /api/users/{id}`, även inaktiva), `J/controller/TeamController.java:72` (`/coaches`) och `:81` (`/players`). Alla returnerar `FetchUserResponse` (`J/DTO/FetchUserResponse.java:11-23`) med e-post, telefon och förälderns namn, e-post och telefon. Ett barn kan alltså lista alla andra barns föräldrars telefonnummer. Säkerhetsregeln `anyRequest().authenticated()` (`J/config/SecurityConfig.java:59`) är det enda skyddet.
   *S1-10 är stängd:* en tränare läser bara personer på lag där hen finns i `team_coaches`. Hela listan `GET /api/users` är ADMIN och CHAIRMAN.
   *S1-13 är stängd för den inaktiva raden:* `GET /api/users/{id}` är 404 "User not found" när kontot är inaktivt, för alla roller. Spelarens egen rad visar fortfarande förälderns telefon.
3. **H: COACH är inte begränsad till sina egna lag för användarändringar.** `PUT /api/users/{id}/player` (`J/controller/UserController.java:132-133`, `J/service/UserService.java:188-251`), `DELETE /api/users/{id}` (`UserController.java:152-153`, `UserService.java:255-265`) och `POST /api/users` (`UserService.java:75-83`, `:99-106`) kontrollerar bara rollen, inte `team_coaches`. En tränare kan därför ändra eller ta bort spelare i vilket lag som helst och skriva om vilken förälders e-post och telefon som helst (`UserService.java:229-248`). Jämför `TrainingService.assertCanManageTeam` som gör rätt.
4. **H: Det finns bara mjuk radering, och inaktiverade konton behåller åtkomst.** `softDeletePlayer` sätter bara `active=false` (`J/service/UserService.java:253-265`), och det finns ingen hård radering, anonymisering eller gallring (närvarorader, föräldralänk och e-post ligger kvar för alltid). `GET /api/users/{id}` returnerar inaktiva (`UserController.java:93-96`). `JwtAuthFilter` (`J/security/JwtAuthFilter.java:40-46`) litar på token utan att kontrollera `active` eller aktuell roll, så en inaktiverad eller nedgraderad användare behåller åtkomsten i upp till 120 minuter.
   *S1-13 är stängd för GET:* `GET /api/users/{id}` svarar 404 "User not found" och lämnar inte ut den inaktiva raden. Filtret nekar en gammal token för ett inaktivt konto (S1-4). Hård radering, anonymisering och gallring är kvar.
5. **H: JWT-hemligheten har ett standardvärde i git.** `API/src/main/resources/application.properties:13` gav `JWT_SECRET` ett hårdkodat standardvärde. Glöms `JWT_SECRET` bort på Railway kan vem som helst förfalska en ADMIN-token. Appen bör vägra starta utan hemlighet i prod.
   *Åtgärdat på grenen `security/remove-hardcoded-passwords`:* `${JWT_SECRET}` har inget standardvärde, och `JwtService` vägrar starta om hemligheten saknas eller är kortare än 32 byte. Det gamla värdet finns kvar i git-historiken och ska betraktas som känt.

## Övriga brister

| # | Allv. | Brist | Fil:rad |
|---|---|---|---|
| 6 | M | PII i URL: telefonnummer skickas som query-parameter och kan synas i access-loggar. *Stängd i S1-12:* 404-texten säger "User not found" och upprepar inte numret. | `J/controller/UserController.java:88-90` |
| 7 | M | `spring.jpa.show-sql=true` skriver all SQL till loggen. `ddl-auto=update` och DB-användaren `postgres` (superuser) är inte lämpliga i prod. | `API/src/main/resources/application.properties:4`, `:8`, `:9` |
| 8 | M | CORS tillåter bara `localhost`/`127.0.0.1` med `allowedHeaders("*")` på hela `/api/**`. Det saknas en uppdelning mellan publikt (fcvaxjo.se) och skyddat (ADR 0003). | `J/config/CorsConfig.java:21-26` |
| 9 | M | Användaruppräkning och brute force. *Meddelandedelen åtgärdad i S1-9:* fel lösenord, okänd e-post, inaktivt konto och konto utan lösenord ger samma 401. Saknad e-post kör en BCrypt-jämförelse. Rate limiting och kontolåsning är kvar. | `J/service/AuthService.java`, `J/config/SecurityConfig.java` |
| 10 | M | JWT innehåller e-post i klartext (base64), och appen sparar token och e-post i AsyncStorage (okrypterat) i stället för `expo-secure-store`. | `J/security/JwtService.java:36`, `UI/src/api/authStorage.ts:1`, `:17-19` |
| 11 | M | Ingen Bean Validation: inga `@Valid`/`@NotBlank`/`@Email`/`@Size` på DTO:er. `name` krävs inte vid create, ingen formatkontroll av e-post/telefon och ingen maxlängd. Dubblett av `playerNumber` vid create ger DB-fel (troligen 500). | `J/DTO/*.java`, `J/controller/UserController.java:100`, `J/service/UserService.java:145-156` |
| 12 | L | En befintlig förälder kontrolleras inte för `active` när en ny spelare skapas (vilket görs vid update). | `J/service/UserService.java:117-124` (jfr `:223-225`) |
| 13 | L | Det temporära lösenordet returneras i klartext i svaret (avsiktligt), vilket kräver att svar aldrig loggas och att UI:t inte cachar dem. Lösenordspolicyn är bara ≥ 8 tecken. | `J/controller/UserController.java:192-193`, `J/service/AuthService.java:69` |
| 14 | L | Appen pratar okrypterad `http://`. Det är OK lokalt men kräver HTTPS-bas-URL i prod. | `UI/src/api/config.ts:24` |
| 15 | L | Rollbyte saknar skydd mot att den sista ADMIN nedgraderas, och det loggas inte vem som ändrade vad (ingen audit-logg för ändringar av persondata). | `J/service/UserService.java:364-370` |
| 16 | L | Dokumentationen var inaktuell: README sa "No login yet" och PROGRESS sa AWS (*åtgärdat på `docs/api-contract`*). Koden låter inte COACH skapa PARENT fristående, vilket ADR 0006 kräver. | `README.md:6`, `:33`; `PROGRESS.md:19`, `:108` |

## Det som redan fungerar bra
- Lösenord hashas med BCrypt, och entiteter exponeras aldrig direkt (bara via DTO).
- Träningar och närvaro är lagbegränsade för COACH (`TrainingService.assertCanManageTeam`).
- `/api/my/*` begränsar PLAYER till sig själv och PARENT till sina egna aktiva barn (`MyScheduleService.resolveTargetPlayer`), med `MyChildResponse` och `MyTrainingResponse` som minimala DTO:er.
- `.env` ligger i `.gitignore`, och `DB_PASSWORD` saknar standardvärde.
