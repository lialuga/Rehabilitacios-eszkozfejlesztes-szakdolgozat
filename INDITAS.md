# Az Ashi app elindítása

Egy paranccsal elindul az Android emulátor, lefordul és települ az app, majd megnyílik. Szenzor nem
kell hozzá, mert az app szimulált adatokkal is fut.

## Előfeltételek (egyszer kell beállítani)

| Mi | Ellenőrzés |
|---|---|
| Node.js 18+ | `node -v` |
| JDK 17 | `java -version` |
| Android Studio, benne egy virtuális eszköz (Device Manager → *Create device*) | `~/Library/Android/sdk/emulator/emulator -list-avds` |
| Függőségek | `npm install` a repo gyökerében |

Ha az Android SDK nem a `~/Library/Android/sdk` mappában van, állítsd be az `ANDROID_HOME` változót.

## Indítás

```bash
npm run app
```

Ez a parancs:
1. elindítja az első Android virtuális eszközt, ha még nem fut egy sem; másikat így választhatsz:
   `AVD=Pixel_8 npm run app`;
2. lefordítja a release buildet (az első alkalommal néhány perc);
3. telepíti és megnyitja az appot.

A release buildhez nem kell Metro, és nincs rajta fejlesztői felirat, ezért ez a jó választás a
képernyőképekhez. Ha a kód nem változott, a fordítás kihagyható: `npm run app -- --no-build`.

Fejlesztéshez, ahol a kódváltozás azonnal megjelenik: `npm run app:dev` (debug build Metróval).

## Szimulált adatok és nyelv

- **Szimulált adatok:** a főképernyőn a *Kipróbálás demó adatokkal* gomb, vagy *Beállítások → Demó mód*.
  Ilyenkor az app ugyanúgy mér és rögzít, mintha szenzor lenne csatlakoztatva.
- **Nyelv:** *Beállítások → Nyelv* (magyar, angol, német). Alapból a telefon nyelvét követi.


## iOS

iOS-en `npm start` mellett `npm run ios`. Ehhez Xcode kell, a részletek: [iOS_BUILD.md](iOS_BUILD.md).

## Backend és szenzor

- **Felhő szinkron:** [stepalign-backend/README.md](stepalign-backend/README.md).
- **Valódi szenzor:** [firmware/README.md](firmware/README.md).

A teljes összefoglaló: [ATADAS.md](ATADAS.md).
