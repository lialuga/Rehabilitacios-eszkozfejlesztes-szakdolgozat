# ⚡ ASHI - GYORS START ÚTMUTATÓ

## AKTUÁLIS STATUS (2026. március 17.)

✅ **Frontend**: Metro szerver felállt és fut  
❌ **Backend**: Adatbázis hiányzik  
⏳ **iOS**: Xcode elérhető (T7 SSD)  

---

## 🎯 KÖVETKEZŐ 5 LÉPÉS

### 1️⃣ ADATBÁZIS SETUP (5-10 perc)

```bash
# PostgreSQL adatbázis létrehozása
psql -U postgres -c "CREATE DATABASE stepalign;"

# .env fájl létrehozása
cat > stepalign-backend/.env << 'EOF'
DATABASE_URL="postgresql://postgres:password@localhost:5432/stepalign"
EOF

# Prisma migrációk futtatása
npx prisma migrate deploy --schema stepalign-backend/prisma/schema.prisma
```

### 2️⃣ BACKEND INDÍTÁSA (Új terminál)

```bash
npm run backend:start:dev
# Várj amíg: "Listening on port 3000"
```

### 3️⃣ iOS APP FUTTATÁSA (Új terminál)

```bash
npm run ios
# Szimulator automata indult, app futtatódik
```

### 4️⃣ FEJLESZTÉS

Metro menü billentyűk:
- `r` = App újratöltése
- `i` = iOS dev menu
- `d` = Debug
- `a` = Android ( ha szükséges)

### 5️⃣ TELJESS STACK EGYSZERRE (után)

```bash
npm run dev:all
# Backend + Metro + Tunnel 3 Terminal ablakban
```

---

## 📂 DOKUMENTÁCIÓ FÁJLOK

| Fájl | Tartalom |
|------|----------|
| **[PROJECT_STATUS.md](PROJECT_STATUS.md)** | Teljes projekt status & mérföldkövek |
| **[DATABASE_SETUP.md](DATABASE_SETUP.md)** | Részletes adatbázis setup |
| **[iOS_BUILD.md](iOS_BUILD.md)** | iOS build & Xcode útmutató |
| **README.md** | Eredeti React Native setup |

---

## 🔍 GYORS DIAGNÓZIS

### Metro szerver státusza
```bash
curl http://localhost:8081
# vagy Metro nyisd meg: http://localhost:8081
```

### Backend státusza
```bash
curl http://localhost:3000
```

### Adatbázis státusza
```bash
psql -U postgres -d stepalign -c "\dt"
# 3 táblát kéne mutatnia: users, sessions, samples
```

---

## 💾 ADATMODELL

```
User
├─ id (UUID)
├─ email
└─ Sessions
    ├─ id (UUID)
    ├─ startedAt
    ├─ duration
    ├─ stabilityAvg, inwardRatio, balanceScore
    └─ Samples
        ├─ id
        ├─ timestamp
        └─ roll, stability, inward (szenzor adatok)
```

---

## 🛠️ HASZNOS PARANCSOK

```bash
# Frontend
npm start                          # Metro szerver
npm run ios                        # iOS szimulator
npm run android                    # Android emulátor
npm test                          # Tesztek futtatása

# Backend
npm run backend:start:dev         # Development mód
npm run backend:build             # Production build
npx prisma studio                 # Adatbázis UI (*)

# Kombinált
npm run dev:all                   # Összes egyszer
npm run dev:tunnel                # Backend + Metro + Tunnel
```

(*) Prisma Studio nyit egy interaktív adatbázis kezelőt a böngészőben.

---

## 🚨 GYAKORI PROBLÉMÁK

| Problem | Megoldás |
|---------|----------|
| `Metro port már használt` | `lsof -ti:8081 \| xargs kill -9` |
| `Pod install fail` | `cd ios && rm -rf Pods && pod install && cd ..` |
| `Szimulator nem indul` | `open -a Simulator` |
| `Database error` | Nézd meg az DATABASE_URL a `.env`-ben |
| `Red screen az appban` | Nézd meg a Metro konzolt (hibák ott) |

---

## 📞 KONTAKT INFÓ

- **Fejlesztő**: garailuca
- **Projekt**: Ashi (React Native BLE szenzor app)
- **Backend**: NestJS, Prisma, PostgreSQL
- **Frontend**: React Native, TypeScript, Zustand
- **Workspace**: `/Users/garailuca/Ashi/Ashi`

---

## 🎉 TELJES STACK FUTTATÁSA

Miután az adatbázis fel van állítva:

```bash
# Terminal 1
npm start

# Terminal 2
npm run backend:start:dev

# Terminal 3 (opcionális)
npm run ios
```

Vagy egyszer:
```bash
npm run dev:all
```

---

**Mit szeretnél továbbra csinálni?**  
1. Adatbázis setup → `cat DATABASE_SETUP.md`
2. iOS build → `cat iOS_BUILD.md`  
3. Teljes status → `cat PROJECT_STATUS.md`

---

*Utolsó frissítés: 2026. március 17. 🚀*
