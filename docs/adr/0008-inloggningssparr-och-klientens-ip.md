# ADR 0008: Inloggningsspärr och klientens IP

**Status:** Föreslagen (väntar på Marcel, PR #76) · **Datum:** 2026-11-10

## Kontext
API:et blir publikt på Railway (ADR 0002, issue #69). Inget hindrade någon från att gissa lösenord mot `POST /api/auth/login` (issue #64). Den första versionen spärrade efter 5 fel per e-post eller per IP, med IP från `getRemoteAddr()`.

På Railway går varje anrop genom Railways edge-proxy. Då är `getRemoteAddr()` proxyns adress för alla, och en regel per IP skulle spärra hela klubben när en person skriver fel fem gånger. Vi behöver telefonens riktiga IP, utan att en angripare kan fejka den.

Fakta vi bygger på:
- Railway dokumenterar `X-Real-IP` som klientens IP, och edgen skriver över ett värde som klienten själv skickat.
- `X-Forwarded-For` används inte. Railways egna svar om den går isär, och den kan innehålla interna hopp.
- Proxyn ansluter från 100.64.0.0/10 (rapporterat av användare, inte verifierat av oss).
- Tomcats RemoteIpValve (`server.forward-headers-strategy=native`) läser headern bara när den som ansluter finns i `internal-proxies`. Spring Boots standardlista täcker 10/8, 172.16/12, 192.168/16, 169.254/16, 100.64/10, 127/8, fc00::/7, fe80::/10 och ::1. En telefon på internet finns aldrig där, så en fejkad header ignoreras.
- `framework` (ForwardedHeaderFilter) litar på headern från vem som helst och är därför osäker.

## Beslut
1. **Klientens IP.** I `prod` sätts `server.forward-headers-strategy=native`, `server.tomcat.remoteip.remote-ip-header=X-Real-IP` och `server.tomcat.remoteip.protocol-header=X-Forwarded-Proto`. `internal-proxies` lämnas på standardvärdet. `AuthController` använder bara `getRemoteAddr()` och läser aldrig headern själv.
2. **Tre regler**, alla med 15 minuters spärr (namngivna konstanter i `LoginAttemptLimiter`):
   - e-post + IP: 5 fel (huvudregeln, en telefon som gissar på ett konto),
   - IP: 30 fel (en telefon som provar många konton),
   - e-post: 20 fel från vilka IP som helst (många telefoner mot ett konto).
   Ett spärrat anrop får 429 även med rätt lösenord. Ett fel glöms 15 minuter efter det senaste. En lyckad inloggning nollställer e-post + IP och e-post, men inte IP. Okänd e-post räknas likadant, så spärren avslöjar inte vilka konton som finns.
3. **Reserv (fallback).** Om IP:n ändå är intern (privat, loopback, link-local, 100.64/10, fc00::/7, fe80::/10, ::1) har proxyinställningen inte fungerat. Då hoppas båda IP-reglerna över, och e-posten spärras ensam efter 5 fel. Det är lika strängt som huvudregeln för ett konto, utan att alla som delar proxyns IP spärras. Priset är att en angripare som känner till en e-post kan spärra den personen i 15 minuter. En varning loggas högst en gång i timmen. Lokalt (127.0.0.1) gäller alltid reserven.
4. **Integritet.** Räknarna ligger i minnet. IP sparas bara som HMAC-SHA256 med en slumpad nyckel som skapas vid start och aldrig sparas (`ClientIpPrivacy`). IP loggas aldrig i klartext, bara avkortad till /24 (IPv4) eller /48 (IPv6). IP finns aldrig i ett svar.

## Alternativ som vi har övervägt
- **Räknare i PostgreSQL eller Redis.** Klarar flera instanser och omstarter, men kräver tabell eller ny tjänst, städning och fler tester. Onödigt för en instans i piloten.
- **Cloudflare framför Railway, eller Turnstile (captcha).** Starkt skydd mot botar, men ny leverantör, DNS-flytt och en captcha i appen. För mycket för piloten.
- **Extern identitetsleverantör** (till exempel Auth0 eller Keycloak). Ger spärr, 2FA och lösenordsåterställning färdigt, men byter hela inloggningen och lägger persondata hos en till part (ADR 0004).
- **Tvåfaktorsinloggning (2FA).** Skyddar även mot läckta lösenord, men är tungt för föräldrar och barn i en pilot.

## Konsekvenser
- Fungerar bara med en API-instans. Räknarna nollställs vid omstart.
- Om Railway ändrar proxy eller headers kan reserven slå till. Då märks det på varningen i loggen, inte på att klubben spärras ut.
- Inställningen måste kontrolleras efter första deploy (checklistan i `PROGRESS.md`, "Kontrollera efter första Railway-deploy").

## När beslutet ska ses över
Arbetet efter piloten följs i issue #77. Ändra beslutet om något av detta händer:
- Mer än en API-instans → flytta räknarna till PostgreSQL (eller Redis).
- Omstarter mitt i en attack blir ett problem → samma flytt.
- Reservvarningen syns i prod, eller Railway byter header → se över proxyinställningen.
- Riktade spärrar mot enskilda konton (någon spärrar en annan person med flit) → överväg captcha eller Cloudflare.
- Konton med större behörighet än piloten (fler klubbar, känsliga uppgifter) → överväg 2FA eller en identitetsleverantör.
