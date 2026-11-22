# ADR 0012: Meny i stället för bottenflikar

**Status:** Föreslagen · **Datum:** 2026-11-22

## Kontext
Den nya designen (prototypen `Design files/fc-vaxjo-prototyp.html`) har ingen flikrad längst ner. Varje sida har en toppbar med en menyknapp uppe till vänster. Knappen öppnar en meny som glider fram från vänster över ett mörkt lager (`.drawer` och `.scrim` i prototypen). Menyn visar sidorna för användarens roll.
- Hittills har appen använt `createBottomTabNavigator` med en stack per flik (ADR 0005, `MainTabs.tsx`, `stacks.tsx`, `tabsForRole.ts`).
- Fler sidor ska in per roll (t.ex. "Tidigare aktiviteter" och "Ny användare" direkt i menyn). En flikrad rymmer inte dem.
- React Navigations egen drawer (`@react-navigation/drawer`) kräver nya paket (bland annat `react-native-gesture-handler` och `react-native-reanimated`). Vi vill inte lägga till paket för det här.

## Beslut
- Bottenflikarna tas bort. `@react-navigation/bottom-tabs` används inte längre i koden.
- Efter inloggning finns **en** native stack (`UI/src/navigation/MainStack.tsx`). Den registrerar bara de sidor som rollen får öppna (`routesForRole`), och startar på rollens första menyval.
- Menyn byggs med React Natives egna delar (`Modal` och `Pressable`), utan bibliotek (`UI/src/navigation/Menu.tsx`). Vilka sidor en roll ser bestäms av `menuForRole` (`menuForRole.ts`), som har egna tester.
- Ett menyval startar om stacken med sidan som första sida (`navigation.reset`), precis som när man bytte flik förut.
- Menyknappen ritas i den gemensamma toppbaren (`Screen`). Den visas bara på stackens första sida. En sida man har gått vidare till behåller sin tillbaka-pil.
- React Navigation behålls (ADR 0005 gäller fortfarande, utom delen om flikar).
- "Mer" ligger tills vidare sist i menyn, så att "Byt lösenord" och "Logga ut" går att nå. Task #206 ersätter det med profilmenyn.

## Konsekvenser
- Inga nya paket. Menyn har ingen svepgest för att öppnas, och den tonas in i stället för att glida in.
- Varje flik hade förut en egen historik. Nu finns en historik, och den börjar om vid varje menyval.
- `@react-navigation/bottom-tabs` ligger kvar i `package.json` men importeras inte. Det kan tas bort i en egen task.
- Behöver vi svepgest eller animation senare kan `@react-navigation/drawer` prövas i en ny ADR.
