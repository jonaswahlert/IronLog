# IronLog

En privat träningsapp byggd med Expo/React Native. Inte publikt öppen för registrering av andra — det är en app för eget bruk. All data lagras **lokalt på telefonen** (SQLite) — ingen molntjänst, inget konto, ingen internetanslutning krävs för att använda appen (förutom AI-funktionerna, se nedan).

## Vad appen gör

- **Träningspass**: starta ett pass, logga övningar (vikt/set/reps) eller kondition (distans/tid/puls) manuellt
- **Maskinregister**: fota en ny gymmaskin första gången → AI (Google Gemini) identifierar den automatiskt och sparar den. Nästa gång du tränar på samma maskin väljer du den bara från listan — ingen ny fotografering behövs
- **AI-genererat träningsprogram**: baserat på mål, antal träningsdagar/vecka och tid per pass, byggt enbart med maskiner du redan registrerat. Går även att bygga ett program manuellt utan AI
- **Profil**: ålder, längd, vikt, mål, viktlogg över tid
- **Progressbilder**: lägg till före/efter-foton, AI bedömer visuell förändring per kroppsdel

## Kom igång — köra appen lokalt

1. Installera beroenden (en gång, eller efter att paket ändrats):
   ```
   npm install
   ```
2. Starta utvecklingsservern:
   ```
   npx expo start
   ```
3. Öppna appen **Expo Go** på telefonen (ladda ner från App Store om den inte redan finns) och skanna QR-koden som visas i terminalen

### Vanligt problem: "npx"/"node" hittas inte i terminalen

Det betyder att Node.js inte finns i Windows PATH, trots att det är installerat. Fixa en gång, permanent:

1. Tryck **Windows-tangenten + R**, skriv `rundll32.exe sysdm.cpl,EditEnvironmentVariables`, tryck Enter
2. Under **"User variables"**: markera **"Path"** → **Edit** → **New** → skriv `C:\Program Files\nodejs` → OK i alla rutor
3. Stäng **hela VS Code** och öppna det igen (viktigt — bara en ny terminal räcker inte)

### Vanligt problem: QR-koden går inte att skanna / appen laddar aldrig

Oftast beror det på att telefonen och datorn inte hittar varandra på nätverket (skilda wifi-nät, företagsnätverk med brandvägg, etc.). Kör då istället:
```
npx expo start --tunnel
```
Detta går via internet istället för det lokala nätverket och löser nästan alltid problemet, men kan kräva att du loggar in i Expo Go med samma Expo-konto som terminalen använder (Account-fliken i appen).

## Bygga och publicera en ny version till TestFlight

1. Höj build-numret i `app.json` under `expo.ios.buildNumber` (t.ex. `"12"` → `"13"`) — Apple kräver att varje inskickad build har ett unikt, stigande nummer
2. Kör:
   ```
   eas build --platform ios --profile production --auto-submit
   ```
   Detta bygger appen i molnet (tar ~10–15 min) och skickar den automatiskt till App Store Connect när den är klar
3. Gå till [TestFlight i App Store Connect](https://appstoreconnect.apple.com/apps/6787896418/testflight/ios) och släpp ut den nya builden till dina testare — interna testare får den direkt, externa testare kräver att Apple granskar builden först (bara vid första gången till en ny extern grupp, oftast klart inom något dygn)

## API-nyckel (Google Gemini)

AI-funktionerna (maskinigenkänning, träningsprogram, bildjämförelse) använder Google Gemini via nyckeln `EXPO_PUBLIC_GEMINI_API_KEY`. Den finns sparad hos EAS (Expo Application Services) som en miljövariabel kopplad till projektet — **inte** i en lokal fil — så `eas build` fungerar utan extra uppsättning.

Vill du köra AI-funktionerna när du testar lokalt (`npx expo start`) behöver du själv skapa en `.env`-fil i projektroten med samma variabel:
```
EXPO_PUBLIC_GEMINI_API_KEY=din-nyckel-här
```
Hämta nyckelns värde med `eas env:get production --variable-name EXPO_PUBLIC_GEMINI_API_KEY --format long` (kräver att du är inloggad med `eas login`).

## Mappstruktur i korthet

- `app/` — varje fil/mapp här är en skärm i appen (Expo Router: mappstrukturen *är* navigationen)
- `app/(tabs)/` — de fem huvudflikarna: Pass, Maskiner, Historik, Program, Profil
- `lib/database.ts` — all lokal datalagring (SQLite) — maskiner, pass, övningar, profil, viktlogg, progressbilder
- `lib/claude.ts` — alla AI-anrop till Google Gemini (namnet är missvisande, en kvarleva från tidigare — det är Gemini, inte Claude, som används)

## Tekniskt

- Expo SDK 57, React Native, TypeScript, Expo Router
- Ingen backend, inget konto — all data ligger lokalt på enheten
- Byggkonfiguration: se `eas.json` (byggprofiler `preview`/`production`)
