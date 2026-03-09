from __future__ import annotations

from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.models import (
    CheckoutRequest,
    Order,
    OrderStatus,
    RazorpayCreateOrderRequest,
    RazorpayCreateOrderResponse,
    RazorpayVerifyRequest,
    ShippingQuoteRequest,
)
from app.services.catalog import list_suppliers, search_products
from app.services.payments import create_razorpay_order, verify_razorpay_signature
from app.services.pricing import quote_cart
from app.services.shipping import quote_shipping
from app.services.supplier_ordering import build_procurement_tasks
from app.store import get_order, list_orders, save_order

app = FastAPI(title="NRI Global Shopping Platform API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()


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
        payment_amount_inr=quote.grand_total_inr,
        status=OrderStatus.payment_pending,
    )
    return save_order(order)


@app.post("/payments/razorpay/order", response_model=RazorpayCreateOrderResponse)
def create_payment_order(payload: RazorpayCreateOrderRequest) -> RazorpayCreateOrderResponse:
    try:
        order = get_order(payload.order_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    amount_paise = int(round(order.payment_amount_inr * 100))

    try:
        key_id, razorpay_order_id = create_razorpay_order(amount_paise=amount_paise, receipt=order.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    order.payment_provider = "razorpay"
    order.razorpay_order_id = razorpay_order_id
    save_order(order)

    return RazorpayCreateOrderResponse(
        key_id=key_id,
        razorpay_order_id=razorpay_order_id,
        amount_paise=amount_paise,
    )


@app.post("/payments/razorpay/verify", response_model=Order)
def verify_payment(payload: RazorpayVerifyRequest) -> Order:
    try:
        order = get_order(payload.order_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    if order.razorpay_order_id and order.razorpay_order_id != payload.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Razorpay order id mismatch")

    try:
        is_valid = verify_razorpay_signature(
            razorpay_order_id=payload.razorpay_order_id,
            razorpay_payment_id=payload.razorpay_payment_id,
            razorpay_signature=payload.razorpay_signature,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid Razorpay signature")

    order.payment_provider = "razorpay"
    order.razorpay_order_id = payload.razorpay_order_id
    order.razorpay_payment_id = payload.razorpay_payment_id
    order.paid_at = datetime.utcnow()
    order.procurement_tasks = build_procurement_tasks(order.items)
    order.status = OrderStatus.purchasing

    return save_order(order)


@app.get("/orders", response_model=list[Order])
def fetch_orders() -> list[Order]:
    return list_orders()


@app.get("/orders/{order_id}", response_model=Order)
def fetch_order(order_id: str) -> Order:
    try:
        return get_order(order_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
