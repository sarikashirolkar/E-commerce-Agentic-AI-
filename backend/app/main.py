from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models import CheckoutRequest, Order, ShippingQuoteRequest
from app.services.catalog import list_suppliers, search_products
from app.services.pricing import quote_cart
from app.services.shipping import quote_shipping
from app.services.supplier_ordering import build_procurement_tasks
from app.store import get_order, save_order

app = FastAPI(title="NRI Global Shopping Platform API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/suppliers")
def suppliers() -> list[dict]:
    return [supplier.model_dump() for supplier in list_suppliers()]


@app.get("/products")
def products(query: str | None = None, category: str | None = None) -> list[dict]:
    return [product.model_dump() for product in search_products(query=query, category=category)]


@app.post("/shipping/quote")
def shipping_quote(payload: ShippingQuoteRequest) -> dict:
    try:
        quote = quote_shipping(
            destination_country=payload.destination_country,
            items=payload.items,
        )
        return quote.model_dump()
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/cart/quote")
def cart_quote(payload: ShippingQuoteRequest) -> dict:
    try:
        quote = quote_cart(destination_country=payload.destination_country, items=payload.items)
        return quote.model_dump()
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/checkout", response_model=Order)
def checkout(payload: CheckoutRequest) -> Order:
    try:
        quote = quote_cart(destination_country=payload.destination_country, items=payload.items)
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    order = Order(
        customer_email=payload.customer_email,
        destination_country=payload.destination_country,
        items=payload.items,
        quote=quote,
        procurement_tasks=build_procurement_tasks(payload.items),
    )
    return save_order(order)


@app.get("/orders/{order_id}", response_model=Order)
def fetch_order(order_id: str) -> Order:
    try:
        return get_order(order_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
