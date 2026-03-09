# Global Indian Shopping Platform for NRIs (Phase-1 MVP)

This repository contains a Phase-1 working MVP for a global Indian shopping platform that lets overseas customers buy from multiple Indian suppliers in one consolidated checkout.

## What is implemented
- Product catalog abstraction across multiple suppliers
- Search/filter endpoint for aggregated products
- Shipping quote calculator using billable weight (physical vs volumetric)
- Cart quote endpoint with product margin, shipping margin, and service fee
- Checkout flow that creates an order and supplier procurement tasks
- In-memory order store for prototype workflows
- Next.js storefront UI for catalog browsing, cart building, quote preview, and checkout

## Tech stack
- Python + FastAPI
- Next.js + TypeScript
- Pydantic models
- Pytest tests

## Quick start (backend)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Quick start (frontend)
```bash
cd frontend
npm install
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

## API endpoints
- `GET /health`
- `GET /suppliers`
- `GET /products?query=&category=`
- `POST /shipping/quote`
- `POST /cart/quote`
- `POST /checkout`
- `GET /orders/{order_id}`

## Example request
```bash
curl -s http://127.0.0.1:8000/cart/quote \
  -H 'Content-Type: application/json' \
  -d '{
    "destination_country": "US",
    "items": [
      {"product_id": "prd_amul_ghee_1l", "quantity": 2},
      {"product_id": "prd_haldiram_bhujia", "quantity": 1}
    ]
  }'
```

## Notes
- Supplier integrations are currently mocked via adapters and static catalog entries.
- Warehouse/inventory and real payment/courier integrations are planned for the next iteration.
- This is intentionally structured so each integration can be swapped with real APIs in Phase 2.

See [docs/roadmap.md](docs/roadmap.md) for delivery plan and expansion path.
