# Global Indian Shopping Platform for NRIs (Phase-1 MVP)

This repository now includes a working Phase-1 backend + frontend MVP:
- Multi-supplier catalog and cart quote logic
- Consolidated checkout flow
- Razorpay payment order creation + signature verification
- PostgreSQL-ready order persistence (via SQLAlchemy)

## Tech stack
- Backend: FastAPI, SQLAlchemy, PostgreSQL driver (`psycopg`)
- Frontend: Next.js (App Router), TypeScript
- Tests: Pytest

## What is implemented
- Aggregated supplier/product model
- Product search endpoint
- Shipping quote engine (physical vs volumetric weight)
- Cart quote endpoint with margin + service fee
- Payment-pending order creation (`/checkout`)
- Razorpay order creation (`/payments/razorpay/order`)
- Razorpay signature verification (`/payments/razorpay/verify`)
- Order listing/fetch APIs (`/orders`, `/orders/{order_id}`)

## Backend setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Backend env vars:
- `DATABASE_URL` example: `postgresql+psycopg://postgres:postgres@localhost:5432/nri_shop`
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`

If `DATABASE_URL` is not provided, backend defaults to `sqlite:///./nri_shop.db` for local development.

## Frontend setup
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend env vars:
- `NEXT_PUBLIC_API_BASE_URL` (default expected: `http://127.0.0.1:8000`)

## API endpoints
- `GET /health`
- `GET /suppliers`
- `GET /products?query=&category=`
- `POST /shipping/quote`
- `POST /cart/quote`
- `POST /checkout`
- `POST /payments/razorpay/order`
- `POST /payments/razorpay/verify`
- `GET /orders`
- `GET /orders/{order_id}`

## Validation run
- Backend tests: `cd backend && .venv/bin/pytest -q`
- Frontend lint: `cd frontend && npm run lint`
- Frontend build: `cd frontend && npm run build`

See [docs/roadmap.md](docs/roadmap.md) for expansion path.
