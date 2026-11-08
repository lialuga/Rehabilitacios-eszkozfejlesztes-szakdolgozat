# Ashi backend (NestJS + Prisma + PostgreSQL)

Az Ashi app „Felhő szinkron” funkciója ide tölti fel a befejezett méréseket.
App oldali kliens: `src/sync/syncService.ts` (a repo gyökerében).

## Indítás

```bash
cd stepalign-backend
npm install
cp .env.example .env        # ha még nincs .env; DATABASE_URL beállítása
npx prisma migrate deploy   # séma frissítése
npx prisma generate
npm run build
npm run start:prod          # http://0.0.0.0:3000
```

Fejlesztéshez: `npm run start:dev` (újraindul fájlváltozáskor).
A repo gyökeréből: `npm run backend:start`.

Ellenőrzés: `curl http://localhost:3000/health` → `{"status":"ok","db":true}`

## Telefon csatlakoztatása

1. A Mac és a telefon ugyanazon a Wi-Fin legyen.
2. A Mac IP-címe: `ipconfig getifaddr en0` (pl. `192.168.1.20`).
3. App → Beállítások → Felhő szinkron → **Mérések feltöltése** be, szerver címe: `192.168.1.20:3000`.
4. iOS az első alkalommal engedélyt kér a helyi hálózathoz: **Engedélyezés**.

> **Android release build:** az Android release buildben alapból tiltott a titkosítatlan HTTP. A debug
> build engedi (`android/app/src/debug/AndroidManifest.xml`). Release-hez HTTPS-es szerver kell
> (vagy egy, a szerver címére szűkített `network_security_config`), lásd a gyökér `ATADAS.md`-t.

## API

| Metódus | Útvonal | Leírás |
|---|---|---|
| `GET` | `/health` | API + adatbázis állapot |
| `POST` | `/session` | Mérés mentése. **Idempotens**: ugyanaz a `(userId, clientId)` frissíti a sort. 400, ha a törzs érvénytelen. |
| `GET` | `/session/:userId` | A felhasználó mérései, legújabb elöl |
| `DELETE` | `/session/:userId/:clientId` | Mérés törlése (204; 404, ha nincs) |

`POST /session` törzse (ugyanaz, mint az app `SessionPayload` típusa):

```json
{
  "userId": "81cde676-…", "clientId": "1730714400000-abc123",
  "startedAt": "2026-11-04T10:00:00.000Z", "durationMs": 60000,
  "avgStability": 80, "inwardPercent": 12, "balance": 84,
  "motorActivations": 3, "outwardEvents": 1, "avgCorrectionMs": 420,
  "peakAngle": 11.5, "avgAngle": 1.2,
  "inwardThreshold": 8, "outwardThreshold": 10,
  "steps": 120, "cadence": 110, "source": "ble", "trace": [0, 1, 2]
}
```

## Adatmodell (`prisma/schema.prisma`)

- `User`: névtelen, telepítésenként egy (`id` = az app által generált azonosító; `email` opcionális).
- `Session`: egy mérés. `duration` ms-ban, `inwardRatio` 0–1 között (az API `inwardPercent`-ként adja vissza).
- `Sample`: nyers minták helye (jelenleg nem használt).

Migrációk: `prisma/migrations/` (`20261105090000_session_v2` adta hozzá az új mezőket; a meglévő
sorok alapértékeket kaptak).

## Tesztek

```bash
npm test            # egységtesztek (mockolt Prisma)
npm run test:e2e    # e2e a valódi DATABASE_URL adatbázison; ideiglenes felhasználót hoz létre és töröl
npm run lint
```

## Ismert korlátok

- **Nincs hitelesítés.** A `userId` egy véletlen azonosító, aki ismeri, olvashatja és törölheti
  az adott felhasználó méréseit. Prototípushoz, helyi hálózaton elfogadható. Nyilvános üzemeltetés
  előtt bejelentkezés (pl. e-mail + token) és HTTPS kell.
- Nincs sebességkorlátozás (rate limit).
