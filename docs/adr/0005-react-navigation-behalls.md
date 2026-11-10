# ADR 0005: React Navigation behålls (inte Expo Router)

**Status:** Accepterad (Marcel, 2026-11-10) · **Datum:** 2026-11-05

## Kontext
`UI/AGENTS.md` (rad 28–29) säger: "Use **Expo Router** for all navigation. Routes live in `src/app/`" och "Import `Link`, `router` … from `expo-router`". Koden gör något annat:
- `UI/package.json` har `@react-navigation/native` ^7.5.1 och `@react-navigation/bottom-tabs` ^7.21.0, men inte `expo-router`.
- `UI/App.tsx` använder `NavigationContainer` och `createBottomTabNavigator`, med flikarna Home, Schema, Laget, Mer, Search och Create.
- Skärmarna ligger i `UI/src/screens/` och använder `useNavigation`/`useFocusEffect`. Det finns ingen `src/app/`-katalog.
`AGENTS.md` ser ut att vara Expo-mallens generiska standardtext, inte ett eget beslut.

## Beslut
- Vi behåller **React Navigation** (bottom tabs, och senare stack vid behov) för V1.
- `UI/AGENTS.md` är uppdaterad så att AI-agenter inte börjar migrera till Expo Router.

## Konsekvenser
- Ingen omskrivning, och nuvarande skärmar och rollstyrda flikar fungerar som de är.
- Vi går miste om filbaserad routing och djuplänkar "gratis". Djuplänkar, t.ex. från push-notiser, kräver manuell `linking`-konfiguration.
- Migrering till Expo Router kan omprövas i en ny ADR om webbstöd eller djuplänkar blir viktiga.
