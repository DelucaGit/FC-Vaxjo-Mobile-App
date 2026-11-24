# FC Växjö-appen

En mobilapp där en barnfotbollsförening håller ordning på lag, aktiviteter, närvaro och ledighet.
Ordlistan bestämmer vilka ord vi använder. Ordet inom parentes är det engelska namnet i kod och på GitHub.

## Language

### Personer och roller

**Spelare** (Player):
Ett barn som tillhör ett lag och deltar i lagets aktiviteter.
_Avoid_: Medlem, barn

**Förälder** (Parent):
En vuxen som är kopplad till en eller flera spelare och ser och agerar för deras räkning.
_Avoid_: Målsman, vårdnadshavare

**Tränare** (Coach):
En vuxen som leder ett eller flera lag och sköter lagets aktiviteter, närvaro och ledighet.
_Avoid_: Ledare, coach

**Ordförande** (Chairman):
Klubbens ordförande, som ser och sköter alla lag men inte kan utse admin eller ordförande.

**Admin** (Admin):
Den som har full behörighet i klubben, över alla lag och användare.
_Avoid_: Administratör, superuser

**Användare** (User):
En person med ett konto i appen, oavsett roll.
_Avoid_: Konto (kontot är inloggningen, användaren är personen)

### Lag och aktiviteter

**Lag** (Team):
En grupp spelare med en eller flera tränare, till exempel "P2015 Röd".
_Avoid_: Trupp, grupp

**Aktivitet** (Activity):
Något laget gör vid en bestämd tid och plats. En aktivitet är antingen en träning eller en match.
_Avoid_: Event, händelse, pass

**Träning** (Training):
En aktivitet där laget övar, med starttid och sluttid.
_Avoid_: Pass, träningspass

**Träningsserie** (Training series):
Flera träningar som skapas på en gång och upprepas varje vecka.
_Avoid_: Återkommande träning, upprepning

**Match** (Match):
En aktivitet där laget spelar mot en motståndare, hemma eller borta.

**Motståndare** (Opponent):
Laget vi möter i en match. Det är bara ett namn som tränaren skriver, inte ett lag i appen.
_Avoid_: Motståndarlag, bortalag

**Hemma / Borta** (Home / Away):
Om matchen spelas på vår plan eller motståndarens.

**Plats** (Venue):
Var en aktivitet äger rum, till exempel "Kronobergsvallen 1" eller en adress.
_Avoid_: Arena, plan, ställe

**Sparad plats** (Saved venue):
En plats som finns i klubbens gemensamma lista, så att tränare kan välja den i stället för att skriva den.
_Avoid_: Favoritplats, förvald plats

**Inställd** (Cancelled):
En aktivitet som inte blir av men ligger kvar i schemat med en orsak.
_Avoid_: Avbokad, borttagen

**Kommande / Tidigare** (Upcoming / Past):
En aktivitet är kommande tills den har börjat, och därefter tidigare.
_Avoid_: Framtida, gammal, historik

### Närvaro och ledighet

**Närvaro** (Attendance):
Tränarens notering av vilka spelare som var med på en aktivitet.
_Avoid_: Anmälan, svar, kallelse

**Förväntas komma** (Expected):
Utgångsläget för varje spelare i laget på varje aktivitet. Spelaren tillfrågas aldrig och bekräftar inget.
_Avoid_: Anmäld, kommer, bekräftad, "du är med"

**Närvarande / Frånvarande** (Present / Absent):
Det tränaren noterar för en spelare på en aktivitet: var med eller var inte med.

**Ledig** (Excused):
En spelare som har en godkänd ledighetsbegäran för aktiviteten.
_Avoid_: Ursäktad, anmäld frånvaro

**Låst närvaro** (Locked attendance):
En närvarolista som är klar och inte längre kan ändras.
_Avoid_: Fryst, stängd

**Ledighetsbegäran** (Leave request):
En spelares eller förälders fråga till tränaren om att slippa en kommande aktivitet, med en orsak. Den kan bara skickas innan aktiviteten har börjat.
_Avoid_: Frånvaroanmälan, avanmälan, ledighetsansökan

**Orsak** (Reason):
Varför spelaren begär ledigt: sjuk, skola/prov, familj/resa, skada eller annat med egen text.
_Avoid_: Anledning, skäl, ursäkt

**Väntar på svar** (Pending):
En ledighetsbegäran som tränaren ännu inte har besvarat. Spelaren kan dra tillbaka den.
_Avoid_: Obehandlad, öppen

**Godkänd / Nekad** (Approved / Denied):
Tränarens svar på en ledighetsbegäran. Vid nekad kan tränaren lämna en kommentar.
_Avoid_: Beviljad, avslagen, accepterad

### Appens delar

**Startsida** (Home):
Den första skärmen efter inloggning. Den visar nästa aktivitet och kommande vecka.
_Avoid_: Hem, hubb, dashboard

**Nästa aktivitet** (Next activity):
Den kommande aktivitet som ligger närmast i tiden, visad överst på startsidan.

**Kommande vecka** (Coming week):
Aktiviteterna de sju dagarna efter nästa aktivitet. "Visa fler" lägger till sju dagar till.

**Meny** (Menu):
Listan som öppnas med knappen uppe till vänster och leder till appens övriga sidor. Innehållet beror på rollen.
_Avoid_: Sidomeny, drawer, hamburgermeny, flikar

**Profilmeny** (Profile menu):
Listan som öppnas med initialerna uppe till höger. Den visar vem man är och har Byt lösenord och Logga ut.
_Avoid_: Konto, Mer, inställningar

**Guide** (Wizard):
Ett formulär som ställer en fråga i taget, till exempel Ny träning och Ny match.
_Avoid_: Wizard, formulär, steg-för-steg
