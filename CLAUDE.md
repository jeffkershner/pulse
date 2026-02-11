# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Market Pulse — a stock trading simulation (paper trading) app. Monorepo with a React/TypeScript frontend (`client/`) and Python/FastAPI backend (`server/`).

## Development Commands

### Frontend (`client/`)
```bash
cd client && npm install        # Install dependencies
cd client && npm run dev        # Vite dev server on localhost:5173
cd client && npm run build      # TypeScript compile + Vite build
cd client && npm run lint       # ESLint
```

### Backend (`server/`)
```bash
pip install -r server/requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload   # Run from server/
alembic upgrade head                                     # Run from server/
```

### Full Stack (Docker)
```bash
docker-compose up   # Starts PostgreSQL, backend, and frontend together
```

## Architecture

### Backend (`server/`)
FastAPI with async SQLAlchemy (asyncpg) on PostgreSQL. Structured in layers:
- **Routers** (`app/routers/`) — API endpoint definitions for auth, market, portfolio, trades, watchlist
- **Services** (`app/services/`) — Business logic: trade execution, portfolio calculations, auth/JWT, Finnhub integration, email (Resend)
- **Models** (`app/models/`) — SQLAlchemy ORM models (User, Trade, Position, Watchlist, OtpCode). All use UUID PKs.
- **Schemas** (`app/schemas/`) — Pydantic request/response models
- **Middleware** (`app/middleware/auth.py`) — JWT Bearer token extraction via FastAPI Depends()

Key patterns:
- All DB operations are async (async sessions, await queries)
- `app/config.py` uses pydantic-settings for env var configuration
- `app/database.py` handles async engine/session setup with Neon PostgreSQL SSL handling
- Real-time quotes: Finnhub WebSocket → in-memory cache → SSE stream to clients (`/api/stream`)
- Fallback simulated data when no Finnhub API key is configured
- Rate limiting on auth endpoints (`app/utils/rate_limit.py`)
- Migrations managed with Alembic (`server/alembic/`)

### Frontend (`client/src/`)
React 19 + TypeScript + Vite. Key structure:
- **Pages** (`pages/`) — LoginPage, DashboardPage, PortfolioPage
- **API layer** (`api/`) — Module per domain; all go through `api/client.ts` which wraps fetch with auth token injection and automatic 401→refresh flow
- **State** (`stores/`) — Zustand stores: `authStore` (JWT tokens, user), `quoteStore` (real-time market data)
- **Components** — `ui/` (shadcn/Radix primitives), `layout/` (AppShell, ProtectedRoute, Navbar), domain components (`market/`, `trading/`, `portfolio/`, `watchlist/`)
- **Hooks** — `useQuoteStream` for SSE connection with exponential backoff
- **Styling** — Tailwind CSS, forced dark mode

### Auth Flow
Email-based OTP: user enters email → backend sends 6-digit code via Resend → verify → JWT access (30min) + refresh (7d) tokens stored in localStorage.

### Trading Logic
Users start with $100k (configurable). BUY validates cash balance, updates/creates position with avg cost basis. SELL validates quantity, calculates realized PnL.

## Deployment
- **Server:** Railway (Dockerfile build, healthcheck at `/api/health`, runs `alembic upgrade head` on startup)
- **Client:** Cloudflare Pages (Vite build output in `dist/`)
- **Database:** Neon PostgreSQL

## Environment Variables
See `.env.example` at repo root. Key vars: `DATABASE_URL`, `FINNHUB_API_KEY`, `JWT_SECRET`, `RESEND_API_KEY`, `CORS_ORIGINS`, `STARTING_BALANCE`. Client uses `VITE_API_BASE` for the backend URL.
