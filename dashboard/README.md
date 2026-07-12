# KheloGully — Scout Dashboard

React + Vite dashboard for scouts, teachers, and admins. Consumes Siddharth's
Express/MongoDB backend directly — no separate teacher web login, per the
project spec (teacher roster/evaluate flow lives in the Flutter app only).

## Setup

```bash
npm install
cp .env.example .env
# edit .env if your backend isn't on localhost:5000
npm run dev
```

Runs at `http://localhost:5173` by default.

## Before you start

1. Get Siddharth's backend running locally (`cd backend && npm install && npm run seed && npm run dev`).
2. Add `http://localhost:5173` to the backend's `CORS_ORIGINS` env var, or this
   dashboard's requests will be blocked by CORS.
3. Log in with a seeded scout/teacher/admin account (see backend README for
   the seeded phone numbers/passwords).

## Build order (matches the task doc)

- [x] `dashboard.service.js` teacher scoping already confirmed in the backend code
      (`buildDashboardScope` treats scout and teacher identically)
- [x] No separate teacher login — this app blocks any role outside
      scout/teacher/admin at the route level (`ProtectedRoute.jsx`)
- [x] Origin tag on the athlete list (`OriginTag.jsx`, keyed off `athlete.userId`)
- [x] Null-safe Z-score/percentile display (`ScoreBadge.jsx`) — handles both
      `zScore: null` and a missing testType key entirely
- [ ] Run the full Postman collection against a live backend before trusting
      this UI's data (do this yourself once the backend is running)
- [x] Leaderboard + district view wired last, per the doc's dependency order

## Structure

```
src/
  api/          axios client (with refresh-token interceptor), auth calls, dashboard calls
  context/      AuthContext — reads role/schoolOrRegion off the JWT for UI use only
  components/   Shell (sidebar), OriginTag, ScoreBadge, StatCard, LaneDivider
  pages/        Login, Overview, Leaderboard, Athletes, Heatmap
```

## Notes

- The heatmap page is a sorted bar chart by district, not a GIS map — this
  matches the project doc's own guidance to skip Leaflet/Mapbox as a time sink
  while keeping the same "data-driven talent density" story for the pitch.
- All role-based scoping happens server-side. Nothing here re-implements
  scoping logic — the frontend trusts whatever the backend returns for the
  logged-in user's role.
