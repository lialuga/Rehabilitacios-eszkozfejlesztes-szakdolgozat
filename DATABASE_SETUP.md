# 🗄️ Adatbázis Setup Útmutató

## LÉPÉSRŐL LÉPÉSRE

### 1️⃣ PostgreSQL ELLENŐRZÉSE

```bash
# Verzió ellenőrzése
psql --version

# Vagy Homebrew-val (ha macOS-on van)
brew info postgres
```

Ha nincs telepítve:
```bash
brew install postgresql@15
brew services start postgresql@15
```

---

### 2️⃣ `stepalign` ADATBÁZIS LÉTREHOZÁSA

```bash
# Csatlakozás PostgreSQL szerverhez
psql -U postgres

# Az alábbi parancsokat futtasd a psql prompt-ban:
CREATE DATABASE stepalign;

# Kilépés
\q
```

Vagy egyetlen paranccsal:
```bash
psql -U postgres -c "CREATE DATABASE stepalign;"
```

---

### 3️⃣ `.env` FÁJL LÉTREHOZÁSA

Hozz létre egy `.env` fájlt a `stepalign-backend/` mappában:

```bash
cat > stepalign-backend/.env << 'EOF'
DATABASE_URL="postgresql://postgres:password@localhost:5432/stepalign"
EOF
```

**FONTOS**: Helyettesítsd be a valódi jelszavat!

---

### 4️⃣ BACKEND FÜGGŐSÉGEK TELEPÍTÉSE

```bash
npm --prefix stepalign-backend install
```

---

### 5️⃣ PRISMA MIGRÁCIÓK FUTTATÁSA

```bash
npx prisma migrate deploy --schema stepalign-backend/prisma/schema.prisma
```

Ez létre fogja hozni az összes szükséges táblát:
- `User` tábla
- `Session` tábla
- `Sample` tábla

---

### 6️⃣ ADATBÁZIS ELLENŐRZÉSE

```bash
# Prisma Studio megnyitása (interaktív UI)
npx prisma studio --schema stepalign-backend/prisma/schema.prisma

# Vagy psql-el:
psql -U postgres -d stepalign -c "\dt"
```

---

### 7️⃣ BACKEND INDÍTÁSA

Egy új terminálban:
```bash
npm run backend:start:dev
```

A szerver a `http://localhost:3000` címen érhető el.

---

## ✅ ELLENŐRZÉSI LÉPÉSEK

| Lépés | Parancs | Elvárt Kimenet |
|-------|---------|----------------|
| 1 | `psql --version` | PostgreSQL verziónumber |
| 2 | `psql -U postgres -d stepalign -c "\dt"` | 3 tábla (users, sessions, samples) |
| 3 | Backend indítás | `Listening on port 3000` |
| 4 | `curl localhost:3000` | API response |

---

## 🚀 TELJES STACK INDÍTÁSA

Miután az adatbázis működik:

**Terminál 1 - Metro:**
```bash
npm start
```

**Terminál 2 - Backend:**
```bash
npm run backend:start:dev
```

**Terminál 3 - Tunnel (opcionális):**
```bash
npm run dev:tunnel
```

Vagy egyszer:
```bash
npm run dev:all
```

---

## 🆘 PROBLÉMAMEGOLDÁS

### Hiba: `FATAL:  database "stepalign" does not exist`
```bash
psql -U postgres -c "CREATE DATABASE stepalign;"
```

### Hiba: `ERROR: password authentication failed`
Módosítsd a `.env` fájlban a jelszót:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/stepalign"
```

### Hiba: `psql: command not found`
PostgreSQL nincs telepítve:
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Hiba: Prisma migration fail
```bash
# Próbálkozz újra
npx prisma migrate deploy --schema stepalign-backend/prisma/schema.prisma

# Vagy resetelj (ADATVESZTÉS!)
npx prisma migrate reset --schema stepalign-backend/prisma/schema.prisma
```

---

## 📝 ADATBÁZIS SÉMA

```sql
CREATE TABLE "User" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "Session" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id),
  "startedAt" TIMESTAMP NOT NULL,
  duration INTEGER NOT NULL,
  "stabilityAvg" FLOAT NOT NULL,
  "inwardRatio" FLOAT NOT NULL,
  "balanceScore" FLOAT NOT NULL
);

CREATE TABLE "Sample" (
  id TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL REFERENCES "Session"(id),
  timestamp TIMESTAMP NOT NULL,
  roll FLOAT NOT NULL,
  stability FLOAT NOT NULL,
  inward FLOAT NOT NULL
);
```

---

**Kész?** 🎉 Ekkor a backend működnie kell!
