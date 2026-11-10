# PRD: Appens första version (frontend v1)

**Datum:** 2026-11-10 · **Milstolpe:** Fas 1: Pilot · **Design:** `docs/design/fc-vaxjo-design-spec.md`

## Problem

Backend är klar för piloten: inloggning, roller, lag, spelare, träningar, matcher och närvaro med låsning. Appen (`UI/`) har vuxit fram skärm för skärm. Den följer inte den nya designen, saknar matcher och närvarolåsning, och flera skärmar är stora filer som blandar många funktioner (`TeamsScreen.tsx` har 1362 rader).

## Lösning

Vi bygger om appen efter designspecen, med **ett gränssnitt per roll** (Admin, Ordförande, Tränare, Spelare, Förälder). Appen visar bara det som backend faktiskt tillåter.

**Backend ändras inte.** Om en skärm kräver något som API:et inte har, stannar agenten och rapporterar i stället för att bygga ut backend.

## Regler för alla skivor

- **Källor:** designspecen (utseende och skärmar), `docs/api/openapi.yaml` (anrop), `docs/testing/rollmatris.md` (rättigheter). Om de säger emot varandra gäller backend.
- **Ingen extra funktion.** Inga kallelser, notiser, chatt, statistik, mörkt läge, gradienter, skuggor eller emoji. Ingen fyllnadstext.
- **Inte från prototypen:** knapparna "Visa som" på inloggningen och raden "Byt roll" i Mer. Rollen kommer från kontot.
- **Teknik:** Expo (React Native) och React Navigation, se ADR 0005. Varje flik har en egen skärmstack. Läs `UI/AGENTS.md` och lägg till paket med `npx expo install`.
- **Anrop:** alla anrop går genom `apiFetch`. Ett 403 visar det svenska meddelandet från `readErrorMessage`.
- **Svenska** i all text som användaren ser.
- **Klar betyder fyra saker:** (1) `mvnw verify` är grönt, (2) app-tester, lint och typecheck är gröna, (3) skivan fungerar mot det lokala API:et, (4) den är provad på en riktig telefon. Punkt 4 gör en människa.
- **Varje skiva äger sina egna filer.** Grunden (G1, G2) lägger alla flikar, rutter och API-moduler på plats. Skivorna fyller bara i sina egna skärmar, så att de kan byggas parallellt utan konflikter.

## Skivor

### Våg 0: grund (parallellt)

| Id | Innehåll | Filer |
|---|---|---|
| **G1** (#92) Designsystem och navigation | Färger, typsnitt (Anton, Work Sans), ikoner (Lucide), komponenterna från specens avsnitt 4, datumhjälp ("Vecka 46", datumrad). Flikar per roll (avsnitt 8) med en stack per flik. Alla rutter registreras med tomma platshållarskärmar. Gamla skärmar tas bort. | `UI/src/theme/`, `UI/src/components/ui/`, `UI/src/navigation/`, `App.tsx`, `UI/src/screens/` (platshållare) |
| **G2** (#93) API-moduler och rättighetsregler | En typad modul per område (auth, my, teams, trainings, matches, users) för varje anrop som appen använder. Rena regelfunktioner från specens avsnitt 6 (`visibleTeams`, `assignableRoles`, `canChangeRole`, `canMakeCoach`, `canEditOrDeleteUser`) med tester. | `UI/src/api/`, `UI/src/auth/permissions.ts` |

### Våg 1: funktioner (parallellt, efter G1 och G2)

| Id | Skärmar | Roller |
|---|---|---|
| **S1** (#94) Inloggning och konto | Login (med spärr efter 5 försök), Byt lösenord vid första inloggning, Mer, Byt lösenord | alla |
| **S2** (#95) Schema och tränare | Schema (med barnväljare), Tränare (kontakt) | Spelare, Förälder |
| **S3** (#65) Aktiviteter och träning | Aktiviteter (lista), Aktivitetsdetalj (träning och match), Ny/Redigera träning, Ställ in, Återaktivera | Tränare, Ordförande, Admin |
| **S4** (#66) Matcher | Ny match, Ange resultat | Tränare, Ordförande, Admin |
| **S5** (#83) Närvaro | Närvaro för träning och match: markera, Klar med bekräftelse, låst vy | Tränare, Ordförande, Admin |
| **S6** (#96) Lag | Laget, Lag, Lagsida, Nytt lag, Lägg till / ta bort tränare | Tränare (läsa), Ordförande, Admin |
| **S7** (#97) Spelare | Spelarprofil (redigera, ta bort), Ny spelare med förälderväljare | Tränare (egna lag), Ordförande, Admin |
| **S8** (#98) Sök och användare | Sök, Användare, Användardetalj (skrivskyddad för andra än spelare, Gör till tränare, Ändra roll) | Tränare (sök), Ordförande, Admin |

### Våg 2

| Id | Innehåll | Beror på |
|---|---|---|
| **S9** (#99) Ny användare | Ny användare för alla roller som får skapas. Återanvänder förälderväljaren från S7. | S7 |
| **T1** (#100) Hela appen på telefon | En människa går igenom specens checklista (avsnitt 10) för alla fem roller på en riktig telefon. | alla |

## Hur agenterna arbetar

- En ny agent per skiva, i en egen git-worktree och på en egen gren. Varje agent ska hålla sig under cirka 100 000 tokens. Blir en skiva större, stannar agenten vid en ren punkt och rapporterar.
- Varje agent öppnar en PR mot `master`. Inget mergas utan Marcels ja.
- Våg 1 startar först när G1 och G2 är mergade.

## Utanför v1

Allt som inte står i designspecen. Ändring och borttagning av andra än spelare (backend saknar anrop). Matcher kan inte ändras eller ställas in (backend saknar anrop). Spelare och föräldrar ser ingen matchnärvaro.
