# KheloGully Backend

> **REST API Backend** for KheloGully — Node.js + Express + MongoDB  
> AI inference stays on-device. No video ever hits this server.

---

## Quick Start

### 1. Prerequisites
- Node.js ≥20 (Active LTS)
- MongoDB Atlas cluster (or local MongoDB)

### 2. Install Dependencies
```bash
cd backend
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env — fill in your MONGODB_URI and generate JWT secrets
```

**Generate JWT secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Run twice — one for `JWT_ACCESS_SECRET`, one for `JWT_REFRESH_SECRET`.

**Generate encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Seed Database (creates admin + scout accounts)
```bash
npm run seed
```

### 5. Start Development Server
```bash
npm run dev
```

Server runs at: `http://localhost:5000`  
API Docs (Swagger): `http://localhost:5000/api/docs`

---

## API Overview

All routes are versioned at `/api/v1/`.

| Module | Routes |
|---|---|
| Auth | `POST /api/v1/auth/register`, `/login`, `/refresh`, `/logout` · `GET /auth/profile` |
| Athletes | `POST/GET /api/v1/athletes` · `GET/PUT/DELETE /athletes/:id` |
| Results | `POST/GET /api/v1/results` · `GET /results/:id` · `GET /results/:id/score` |
| Sync | `POST /api/v1/sync/batch` (1MB limit) |
| Dashboard | `GET /api/v1/dashboard/leaderboard`, `/stats`, `/athletes`, `/heatmap` |
| Health | `GET /health` (liveness) · `GET /ready` (readiness) |

---

## Seeded Accounts

After running `npm run seed`:

| Role | Phone | Password |
|---|---|---|
| admin | +919999000001 | Admin@KheloGully2024! |
| scout | +919999000002 | Scout@KheloGully2024! |
| scout | +919999000003 | Scout@KheloGully2024! |

> ⚠️ Change all passwords before any demo or deployment.

---

## Architecture

```
src/
├── config/         env.js (Zod-validated), db.js
├── middleware/     requireAuth, validate, roleGuard, errorHandler
├── modules/
│   ├── auth/       register, login, refresh, logout, create-staff
│   ├── athletes/   CRUD with soft delete and ownership scoping
│   ├── results/    Test result storage with z-score computation
│   ├── sync/       Offline batch sync with idempotency
│   └── dashboard/  Leaderboard, stats, heatmap aggregations
├── routes/         health.js
├── utils/          logger, ownershipCheck, tokenCompare, idempotencyKey, zScore
├── scripts/        seed.js
├── app.js          Middleware stack
└── server.js       Startup + graceful shutdown
```

---

## Security Highlights

- **JWT**: 15-min access token in Authorization header; 7-day refresh token (cookie for web, body for mobile)
- **Refresh rotation**: new token on every `/refresh`; reuse detection revokes all sessions
- **Account lockout**: 5 failed logins → 15-min lock
- **Ownership checks**: always 404 (never 403) on wrong-user resource access
- **No PII in logs**: guardianName, village, district, phone, tokens all redacted via Winston
- **1MB sync limit**: `/sync/batch` overrides global 10kb cap
- **Idempotency**: duplicate sync entries silently skipped

---

## Postman Collection

Import from `postman/collection.json` and `postman/environment.json` into Postman.

---

## Deployment (Render / Railway)

1. Set all env vars from `.env.example` in the platform dashboard
2. Set `NODE_ENV=production`
3. Deploy command: `npm start`
4. Health check path: `/health`
5. MongoDB Atlas: add your server's egress IP to the Atlas IP allowlist

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Production start |
| `npm run seed` | Seed admin + scout accounts |
| `npm audit` | Check for vulnerabilities |
