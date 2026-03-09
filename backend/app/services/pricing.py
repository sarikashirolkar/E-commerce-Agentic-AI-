from __future__ import annotations

from app.models import CartItem, CartQuoteResponse
from app.services.catalog import get_product_or_error
from app.services.shipping import quote_shipping

PRODUCT_MARGIN_RATE = 0.15
SERVICE_FEE_INR = 300.0


def quote_cart(destination_country: str, items: list[CartItem]) -> CartQuoteResponse:
    subtotal = 0.0
    for item in items:
        product = get_product_or_error(item.product_id)
        subtotal += product.inr_price * item.quantity

    product_margin = round(subtotal * PRODUCT_MARGIN_RATE, 2)
    shipping = quote_shipping(destination_country=destination_country, items=items)

    grand_total = round(
        subtotal + product_margin + SERVICE_FEE_INR + shipping.total_shipping_charge_inr,
        2,
    )

    return CartQuoteResponse(
        items_subtotal_inr=round(subtotal, 2),
        product_margin_inr=product_margin,
        service_fee_inr=SERVICE_FEE_INR,
        shipping=shipping,
        grand_total_inr=grand_total,
    )
