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
- `GET /products/{product_id}`
- `POST /shipping/quote`
- `POST /cart/quote`
- `POST /checkout`
- `POST /payments/razorpay/order`
- `POST /payments/razorpay/verify`
- `GET /orders`
- `PATCH /orders/{order_id}/status`
- `PATCH /orders/{order_id}/procurement/{supplier_id}`
- `GET /orders/{order_id}`

## Admin ops UI
- `GET /admin` in the Next.js app provides an operations dashboard for:
- order status updates (`payment_pending` → `purchasing` → `consolidating` → `shipped`)
- procurement task updates per supplier (`queued` / `placed` / `failed`)

## Marketplace UI upgrades
- Aurora dark theme with glassmorphism product cards
- Top navigation with search, account menu, cart count, and delivery context
- Category chips and sorting (`price`, `rating`, `discount`)
- Filters sidebar (price, brand, rating, availability)
- Deals section with live countdown timers
- Wishlist / save-for-later workflow
- Product detail page with gallery, variants, features, and \"Customers also bought\" carousel

## Validation run
- Backend tests: `cd backend && .venv/bin/pytest -q`
- Frontend lint: `cd frontend && npm run lint`
- Frontend build: `cd frontend && npm run build`

See [docs/roadmap.md](docs/roadmap.md) for expansion path.
