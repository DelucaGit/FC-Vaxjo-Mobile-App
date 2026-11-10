# FC Växjö – designspec för bygge

Underlaget innehåller allt som behövs för att bygga om appen från noll: designvärden, komponenter, skärmar per roll, datamodell, mockdata och regler. All text i appen är svenska.

> **Anpassad till backend (2026-11-10).** Originalet kom från Lovable-prototypen. Rättigheter och skärmar är justerade så att de bara visar det API:et faktiskt tillåter (källa: `docs/api/openapi.yaml` och `docs/testing/rollmatris.md`). Ändrat: bara spelare kan redigeras och tas bort; tränaren ser bara föräldrar i sina lag; sök på exakt tröjnummer/telefon; tvingat lösenordsbyte vid första inloggning; spärr efter för många inloggningsförsök; automatisk låsning av närvaro. Lovable-prototypen (zip) följer fortfarande originalet på de punkterna.

---

## 1. Så här ger du det här till Claude

**Enklaste vägen:** ladda upp filen `fc-vaxjo-prototype.zip` (innehåller källkoden + logotypen) i Claude och klistra in prompten nedan.

```text
Bygg en mobil webbapp för fotbollsföreningen FC Växjö enligt bifogad designspec
(fc-vaxjo-design-spec.md) och källkoden i zip-filen. Följ specen exakt vad gäller
färger, typografi, mått, skärmar och rollrättigheter. All UI-text på svenska.
Frontend only med mockdata – ingen backend, ingen inloggning på riktigt.
Börja med att bekräfta skärmlistan och rollmatrisen innan du skriver kod.
```

**Utan källkod:** klistra in hela detta dokument i Claude och be den bygga utifrån det. Specen är skriven för att räcka ensam.

---

## 2. Produkten i korthet

En mobil app för en barnfotbollsförening. Samma app, olika innehåll beroende på roll. Ingen backend i prototypen: allt data ligger i minnet och nollställs vid omladdning.

- Ram: max **420 px** bred, centrerad på sidan, `h-dvh`, sidokant `#E7E5E4` på breda skärmar.
- Under ramens botten: en bottenmeny med tabbar per roll.
- Överst på varje skärm: en rubrikrad med tillbaka-pil (när man kommit djupare) och ev. åtgärd till höger.
- Huvudåtgärden på en skärm ligger **fast i botten** ovanför bottenmenyn.

---

## 3. Designvärden

### Färger

| Användning | Hex | Oklch |
|---|---|---|
| Primär (knappar, länkar, aktiv tab) | `#8F1822` | `oklch(0.423 0.153 23.1)` |
| Primär intryckt | `#680010` | `oklch(0.326 0.132 22.9)` |
| Text på primär | `#FAFAF9` | `oklch(0.985 0.001 106.4)` |
| Varning / omarkerad / inställd | `#D97706` | `oklch(0.666 0.157 58.3)` |
| Varning mjuk bakgrund | – | `oklch(0.962 0.058 95.6)` |
| Sidbakgrund i ramen | `#FAFAF9` | `oklch(0.985 0.001 106.4)` |
| Bakgrund utanför ramen, fält | `#F5F5F4` (muted) | `oklch(0.97 0.001 106.4)` |
| Kort / listytor / header | `#FFFFFF` | `oklch(1 0 0)` |
| Brödtext | `#1C1917` | `oklch(0.216 0.006 56)` |
| Sekundärtext | `#78716C` | `oklch(0.553 0.012 58.1)` |
| Divider, input kant | `#E7E5E4` | `oklch(0.923 0.003 48.7)` |
| Overlay bakom dialog | `#1C1917` 45 % | `oklch(0.216 0.006 56 / 45%)` |

Bakgrunden utanför ramen och body är `muted`. Lista, kort och header är vita. Ingen mörkt läge.

### Typografi

- **Anton** – versaler, `letter-spacing 0.02em`, vikt 400. Endast för skärmtitlar, datumrad och veckorubrik.
- **Work Sans** – allt annat.
- Laddas via `<link>` i HTML-head, inte via CSS `@import`.

| Text | Storlek | Snitt |
|---|---|---|
| Skärmtitel | 22 px | Anton versaler, `leading-none` |
| Skärmperson / rubrik i detalj | 18 px | 600 |
| Radtitel | 15 px | 600 |
| Brödtext, fält | 15–16 px | 400 |
| Radmeta, sekundärtext | 14 px | 400, muted |
| Sektionsetikett | 13 px | 600, muted |
| Tabbar | 12 px | 500 |
| Datumrad | 14 px | Anton versaler |

### Mått och form

- Radie **6 px** överallt (knappar, fält, kort, dialog).
- Tryckytor minst **48 px** höga (`min-h-12` på knappar och rader, `min-h-14` på tabbar).
- Headerhöjd **56 px** (`h-14`), bottenmeny ca **56 px** + `safe-area-inset-bottom`.
- Sidmarginal **16 px** (`px-4`).
- Divider **1 px** `#E7E5E4` mellan rader; sista raden har ingen divider.
- Aktivt tillstånd visas med `active:` (tryck), inte hover.

### Förbjudet

Inga gradienter, ingen glas-effekt, inga stora skuggor, inga emoji, inga illustrationer, inga ikoner i färgade cirklar, inga avatarer eller foton, inga staplade siffror/statistikpaneler, inga chart, ingen mörkt läge, ingen onboarding, ingen marknadsföringstext. Lists use thin dividers, not cards.

---

## 4. Komponenter

Alla byggd i React + Tailwind. Knappvarianters klasser:

- **Primary**: `bg-primary text-primary-foreground`, intryckt `bg-primary-pressed`, inaktiverad `bg-border text-muted-foreground`.
- **Secondary**: vit bakgrund, 1 px kant `#E7E5E4`, mörk text.
- **Danger**: vit bakgrund, kant, röd text (`#8F1822`).
- **Link**: ingen bakgrund, röd text, ingen sidopadding.
- Alla: `min-h-12`, radie 6, `text-[15px] font-semibold`, full bredd när `block`.

**Screen** – skärmram: header (rubrik, ev. pil, ev. högeråtgärd), scrollbart innehåll, fast bottenfält.

**List** – vit behållare med 1 px kant ovan och under. **Row** – rad i listan, minst 48 px, `chevron` (pil åt höger, muted) visas automatiskt när raden är klickbar. **RowTitle** 15/600, **RowMeta** 14 muted, **DateText** 14 Anton versaler.

**SectionLabel** – 13/600 muted med plats för en länknapp till höger (t.ex. "Lägg till tränare").
**WeekLabel** – "Vecka 46", Anton versaler 15 muted.
**InfoRow** – etikett till vänster (14 muted), värde högerkantat (15).
**Empty** – en kort rad muted text, t.ex. "Inga aktiviteter".
**Field / TextArea / SelectField** – etikett ovanför, fält 48 px högt, radie 6, kant `#E7E5E4`, fokus kant + ring i primärfärg, text 16 px.
**Segmented** – radioknappsrad i bakgrunden `muted` med 2 px innerpadding; aktiv knapp är primärfärgad med vit text, inaktiva mörk text; minst 44 px höga.
**Confirm** – dialog från underkanten: mörk overlay, vitt kort med radie 6, rubrik 16/600, primär bekräftelseknapp överst, därefter "Avbryt" som secondary. Stängs vid klick utanför.
**TelLink / MailLink** – telefon- och e-postlänk i primärfärg, understreck vid tryck.

---

## 5. Datamodell

```ts
type Role = "admin" | "ordforande" | "tranare" | "spelare" | "foralder";
type Status = "present" | "absent" | "excused";
type HomeAway = "Hemma" | "Borta";

interface User {
  id: string; name: string; email: string; phone: string; role: Role;
  teamId?: string;      // spelare
  number?: number;      // spelare, tröjnummer
  parentId?: string;    // spelare -> förälder
}
interface Team { id: string; name: string; coachIds: string[] }
interface Activity {
  id: string; teamId: string; type: "training" | "match";
  date: string;         // yyyy-mm-dd
  start: string;        // hh:mm
  end?: string;         // träning
  place: string;
  title?: string;       // träning
  cancelled?: boolean; cancelReason?: string;
  opponent?: string;    // match
  homeAway?: HomeAway;
  result?: [number, number];   // [eget lag, motståndare]
  attendance: Record<string, Status>;   // playerId -> status
  lockedAt?: string;    // t.ex. "12 nov 19:05"
}
interface Db { users: User[]; teams: Team[]; activities: Activity[] }
```

Etiketter: `admin` = Admin, `ordforande` = Ordförande, `tranare` = Tränare, `spelare` = Spelare, `foralder` = Förälder. `present` = Närvarande, `absent` = Frånvarande, `excused` = Ursäktad.

### Datumformat

- Dag: `Tis 12 nov`
- Aktivitet: `Tis 12 nov · 17:30–19:00`
- Stämpel: `12 nov 19:05`
- Veckorubrik: `Vecka 46` (ISO-vecka)
- Månader: jan, feb, mar, apr, maj, jun, jul, aug, sep, okt, nov, dec. Dagar: Sön, Mån, Tis, Ons, Tor, Fre, Lör.
- "Nu" är fast satt till **10 nov 2026 15:00** så att prototypen alltid ser likadan ut.

### Mockdata som ska finnas

- Lag: **P12 Alfa** och **P12 Beta**.
- Varje lag: 2 tränare, 8 spelare med tröjnummer och telefon, varje spelare har en förälder.
- Föräldern **Anna Lind** har två barn i olika lag: **Elsa Lind** i P12 Alfa och **Noah Lind** i P12 Beta.
- Varje lag: 4 träningar (varav en inställd med anledning) och 3 matcher (varav en spelad med resultat 3–1).
- En tränare som inte är kopplad till något lag (för att kunna prova "Lägg till tränare").
- En admin och en ordförande.
- En träning i P12 Alfa på **mån 9 nov** där två spelare inte är markerade, så att närvaroskärmen kan provas.

---

## 6. Roller och rättigheter

| | Spelare | Förälder | Tränare | Ordförande | Admin |
|---|---|---|---|---|---|
| Tabbar | Schema, Tränare, Mer | Schema, Tränare, Mer | Aktiviteter, Laget, Sök, Mer | Aktiviteter, Lag, Användare, Mer | Aktiviteter, Lag, Användare, Mer |
| Ser lag | eget lag | barnens lag | lagen hen tränar | alla | alla |
| Schema | egen | barnen | – | – | – |
| Ny träning / match | nej | nej | ja | ja | ja |
| Ställ in träning | nej | nej | ja | ja | ja |
| Ange resultat | nej | nej | ja | ja | ja |
| Närvaro markera / låsa | nej | nej | ja | ja | ja |
| Ny spelare | nej | nej | ja, i egna lag | ja | ja |
| Redigera spelare (och spelarens förälder) | nej | nej | ja, i egna lag | ja | ja |
| Ta bort spelare | nej | nej | ja, i egna lag | ja | ja |
| Nytt lag | nej | nej | nej | ja | ja |
| Lägg till / ta bort tränare | nej | nej | nej | ja | ja |
| Användarlistan | nej | nej | nej | ja | ja |
| Ny användare | nej | nej | nej | Spelare, Förälder, Tränare | alla roller |
| Ändra roll | nej | nej | nej | nej | ja, aldrig på eget konto |
| "Gör till tränare" | nej | nej | nej | ja, på spelare | ja, på spelare |
| Redigera / ta bort andra än spelare | nej | nej | nej | nej | nej |

**Bara spelare kan redigeras och tas bort.** Backend har inget anrop för att ändra namn, e-post eller telefon på en tränare, förälder, ordförande eller admin, och inget för att ta bort dem. En förälders kontaktuppgifter ändras via barnets spelarprofil. Ta bort = mjukradering: spelaren blir inaktiv, raden och gammal närvaro sparas.

Admin får enligt backend ändra sin egen roll. Appen döljer det ändå, så att admin inte låser ute sig själv.

Regler i kod (rena funktioner, lätttestade):

```ts
isClubWide = role === "admin" || role === "ordforande"
visibleTeams: klubb => alla; tranare => lagen hen står i coachIds;
              spelare => eget lag; foralder => barnens lag
assignableRoles: admin => alla 5; ordforande => spelare/foralder/tranare; andra => []
canChangeRole: admin && viewer !== target
canMakeCoach: isClubWide && target.role === "spelare"
canEditOrDeleteUser: target.role === "spelare" && target.teamId in visibleTeams(viewer)
```

Att en spelare får en annan roll (t.ex. "Gör till tränare") tar bort `teamId`, `number` och `parentId`. En tränare läggs sedan till i lag via "Lägg till tränare".

---

## 7. Skärmar

### Login
Logotyp centrerad (112 px), rubrik "FC Växjö" i Anton versaler 28 px. Fält E-post och Lösenord, knapp "Logga in" full bredd. Fel: "Fel e-post eller lösenord" i varningsfärg. Under en divider: "Visa som:" med knapparna Admin · Ordförande · Tränare · Spelare · Förälder som loggar in direkt på en mockanvändare. **Bara i prototypen** – den riktiga appen har ingen rollväljare; rollen kommer från kontot.
Efter 5 felaktiga försök spärras inloggningen i 15 minuter: "För många försök. Vänta en stund och försök igen."

### Byt lösenord vid första inloggning (alla roller)
Visas direkt efter inloggning när kontot har ett tillfälligt lösenord, innan något annat. Samma fält som "Byt lösenord", plus länken "Logga ut". Ingen bottenmeny och ingen tillbaka-pil.

### Schema (Spelare, Förälder)
Rubrik "Schema". Förälder med flera barn: barnväljare överst (segmenterad, förnamn). Aktiviteter grupperade under "Vecka NN".
- Träning: titel, datumrad, plats. Tidigare träning visar egen status (Närvarande / Frånvarande / Ursäktad / –). Inställd: titel överkryssad muted, raden "Inställd · anledning" i varningsfärg.
- Match: "Match mot Östers IF", resultat `3–1` till höger om titeln, datumrad, "plats · Hemma/Borta".
Tom: "Inga aktiviteter". Ingen bottenåtgärd.

### Tränare (Spelare, Förälder)
Lagnamn som liten etikett, sedan tränare med namn, telefonlänk och e-postlänk. Barnväljare överst för förälder. Tom: "Inga tränare".

### Aktiviteter (Tränare, Ordförande, Admin)
Lagväljare överst (segmenterad vid flera lag, annars lagnamnet). Aktiviteter per vecka. Raden visar: titel ("Match mot X" eller träningsnamn), resultat om det finns, datumrad, plats · Hemma/Borta, samt status: "Inställd · anledning" (varning), "Närvaro låst" (muted), eller "N ej markerade" i varningsfärg när någon markerats men inte alla. Inställd titel är överkryssad.
Botten: två knappar jämsides, "Ny träning" (primary) och "Ny match" (secondary).

### Aktivitetsdetalj (Tränare, Ordförande, Admin)
Rubrik "Träning" eller "Match". Rubrikblock 18/600 + datumrad. InfoRader: Lag, Plats, Hemma/Borta (match), Resultat (match, "–" om saknas), Status "Inställd · anledning" om inställd, annars Närvaro "Låst 12 nov 19:05" eller "N ej markerade".
Sektion "Åtgärder": Redigera träning (endast träning), Ställ in träning (träning som inte är inställd, röd text), Ange resultat (match).
Botten: "Närvaro" om aktiviteten inte är inställd, annars "Återaktivera".

### Ny träning / Redigera träning
Fält: Titel (förvald "Träning"), Datum, Start och Slut sida vid sida (förvalda 17:30 / 19:00), Plats (valfri). "Spara" låst tills Titel, Datum, Start och Slut är ifyllda och Slut är efter Start.

### Ny match
Fält: Motståndare, Datum, Avspark (förvald 10:00), Plats, Hemma/Borta som segmenterad. "Spara" låst tills alla är ifyllda.

### Ställ in träning
Textfält "Anledning (valfritt)". Knapp "Ställ in träning".

### Ange resultat
Två siffror fält sida vid sida med "–" emellan, etiketterna är egna lagets namn och motståndarens namn. "Spara" låst tills båda är ifyllda.

### Närvaro (Tränare, Ordförande, Admin)
Rubrik "Närvaro". Huvud: datumrad 18 Anton, aktivitetstitel, räknare "X närvarande · Y frånvarande · Z ursäktad · N ej markerade" (sista talet i varningsfärg när N > 0), knapp "Markera alla närvarande" (secondary, låst när alla redan är markerade).
Spelarlistan: namn 15/600, tröjnummer `#7` muted till höger, segmenterad Närvarande / Frånvarande / Ursäktad under. Omarkerade rader har en **4 px vänsterkant i varningsfärg**.
Botten: "Klar" är låst så länge någon inte är markerad, och visar då "N spelare kvar att markera". När tränaren trycker "Klar" (bekräftelsedialog: "Låsa närvaron? Den går inte att ändra efteråt.") låses närvaron med stämpel "Låst 12 nov 19:05" och en låsikon; då visas status som text istället för knappar och bottenknappen försvinner. En låst lista kan aldrig öppnas igen.
Automatisk låsning: listan låses av sig själv 6 timmar efter att en träning slutat och 8 timmar efter avspark för en match. Då sparas bara de spelare som hann markeras; omarkerade visas inte i den låsta listan.
Spelarlistan är levande tills den låses: en spelare som läggs till i laget dyker upp, en som tas bort försvinner.
En inställd träning har ingen närvaro (knappen "Närvaro" visas inte, se Aktivitetsdetalj).

### Laget (Tränare)
Lagväljare, sedan "Tränare" (namn, telefon, e-post – skrivskyddade) och "Spelare (N)" med spelarrader: namn, tröjnummer, telefon, samt förälder "namn · telefon · e-post". Botten: "Ny spelare".

### Lag (Ordförande, Admin)
Lista med lag: namn, "8 spelare · Johan Berg, Sara Nilsson". Botten: "Nytt lag".

### Lagsida (Ordförande, Admin)
Som Laget men tränarsektionen har "Lägg till tränare" uppe till höger och "Ta bort" på varje tränare med bekräftelsedialog. Botten: "Ny spelare".

### Nytt lag
Fält "Lagnamn", "Spara" låst tills namnet är ifyllt.

### Lägg till tränare
Sökbar lista av tränare som inte redan är i laget, med e-post som meta. Klick lägger till och går tillbaka. Tom: "Inga tränare att lägga till".

### Spelarprofil (Tränare i egna lag, Ordförande, Admin)
Detta är den **enda** skärmen där en användare redigeras eller tas bort.
Fält Namn, E-post, Telefon, Tröjnummer (valfritt), Lag (dropdown med synliga lag). Sektion "Förälder": redigerbara fält Namn, Telefon, E-post – ändringen sparas på föräldern. Spara låst tills Namn, E-post och Lag är ifyllda.
Fel från servern när e-post eller telefon redan används: "E-post eller telefon används redan".
Röd knapp "Ta bort spelare" med bekräftelse ("Spelaren blir inaktiv. Gammal närvaro sparas."). Efter borttagning försvinner spelaren ur alla listor.

### Ny spelare
Fält: Namn, E-post, Telefon (valfri), Tröjnummer (valfritt), Lag (dropdown: tränare ser bara sina lag), Förälder som segmenterad "Välj befintlig" / "Skapa ny". En spelare måste alltid ha exakt en förälder.
- Befintlig, Ordförande/Admin: sökbar lista med alla föräldrar.
- Befintlig, Tränare: bara föräldrar till spelare i tränarens egna lag (t.ex. ett syskon). Tränaren kan inte se klubbens övriga föräldrar.
- Ny: tre fält för föräldern (Namn, E-post, Telefon – alla krävs).
"Spara" låst tills Namn, E-post, Lag och förälder är ifyllda.

### Sök (Tränare, Ordförande, Admin)
Ett fält och en segmenterad väljare: "Namn" / "Tröjnr" / "Telefon" (servern söker på exakt ett av dem). Namn: del av namnet räcker. Tröjnummer och telefon: exakt träff. Tränare söker bara i sina lag. Tom: "Inga träffar".

### Användare (Ordförande, Admin)
Sökfält, lista med namn och "Roll · Lag". Botten: "Ny användare".

### Användardetalj (Ordförande, Admin)
Spelare: öppnar Spelarprofil (redigera, ta bort) med knappen "Gör till tränare" (secondary) under.
Alla andra roller: **skrivskyddad**. InfoRader: Namn, E-post (MailLink), Telefon (TelLink), Roll, Lag (tränare: lagen hen tränar). Inga redigeringsfält och ingen "Ta bort".
Admin ser dessutom "Ändra roll" (dropdown med alla 5 roller) på alla utom sig själv. "Gör till tränare" och "Ändra roll" har bekräftelse: "Tröjnummer, lag och förälder tas bort."

### Ny användare
Fält Namn, E-post, Telefon (valfri), Roll (segmenterad vid upp till 3 roller, annars dropdown).
- Spelare: även Lag, Tröjnummer (valfritt) och Förälder (samma som i Ny spelare).
- Tränare: inget lag här; läggs till via "Lägg till tränare" på lagsidan.
- Förälder: bara grunduppgifterna. Kopplas till barn när barnet skapas.
"Spara" låst tills giltigt. Användaren får ett tillfälligt lösenord och måste byta vid första inloggningen.

### Mer (alla roller)
Namn och roll överst. Rader: "Byt lösenord", "Logga ut", "Byt roll" (röd text, returnerar till login).

### Byt lösenord
Fält Nuvarande lösenord, Nytt lösenord, Bekräfta. "Lösenorden matchar inte" i varningsfärg när de skiljer sig. "Spara" låst tills alla är ifyllda och matchar.

---

## 8. Bottenmeny

Rutnät med en kolumn per tab, vit bakgrund, 1 px kant upptill. Varje tab: ikon 24 px (Lucide, kontur) över etikett 12/500. Aktiv tab är primärfärgad med tjockare ikonstreck (2), övriga muted (1.5). Klick på aktiv tab nollställer skärmhögen i den taben.

Ikoner: Schema/Aktiviteter `CalendarDays`, Tränare `Contact`, Laget `Users`, Lag `Shield`, Sök `Search`, Användare `UserRound`, Mer `Menu`.

---

## 9. Teknik

React 19 + TypeScript + Vite + Tailwind v4. Lucide för ikoner, `class-variance-authority` för knappvarianter, `clsx` + `tailwind-merge` för klass-sammanslagning. Ingen backend: mockdata i en fil, state i en React context, navigation som en minnes-stack per tab (ingen router behövs för prototypen).

---

## 10. Kontrollera att det blev rätt

1. Login: alla fem "Visa som"-knappar öppnar rätt roll.
2. Anna Lind (Förälder) kan växla Elsa / Noah, och schemat följer med.
3. Johan Berg (Tränare) ser bara P12 Alfa, ingen Användare-flik.
4. Lars Holm (Ordförande) ser båda lagen men kan inte sätta Admin eller Ordförande.
5. Admin kan ändra roll på andra, inte på sig själv.
6. Närvaro: "Klar" är låst till alla är markerade, och visar "N spelare kvar att markera". Efter låsning visas "Låst ..." och knapparna försvinner.
7. Inställd träning: överkryssad titel, "Inställd · anledning", bottenknappen är "Återaktivera".
8. Match: resultat `3–1` syns i listan och i detaljen, "Hemma/Borta" syns.
9. Sök hittar på del av namn, exakt tröjnummer och exakt telefon.
11. Ordförande och Admin kan bara redigera och ta bort **spelare**. Tränare, föräldrar, ordförande och admin visas skrivskyddat.
12. Tränare ser bara föräldrar från sina egna lag under "Välj befintlig".
13. Nytt konto med tillfälligt lösenord hamnar först på "Byt lösenord vid första inloggning".
10. Ingen skärm har gradient, skugga, emoji, ikon i färgad cirkel eller mörkt läge.
