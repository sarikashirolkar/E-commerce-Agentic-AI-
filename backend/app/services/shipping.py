from __future__ import annotations

import math

from app.models import CartItem, ShippingQuote
from app.services.catalog import get_product_or_error


# Volumetric divisor used by many international couriers for cm-based dimensions.
VOLUMETRIC_DIVISOR = 5000

# Per-country base INR charge and per-kg rate (mock values for MVP).
COUNTRY_RATE_CARD: dict[str, tuple[float, float]] = {
    "US": (900.0, 700.0),
    "GB": (850.0, 680.0),
    "AU": (920.0, 720.0),
    "CA": (880.0, 690.0),
    "AE": (650.0, 520.0),
}

SHIPPING_MARGIN_RATE = 0.12


def _physical_weight(items: list[CartItem]) -> float:
    total = 0.0
    for item in items:
        product = get_product_or_error(item.product_id)
        total += product.weight_kg * item.quantity
    return total


def _volumetric_weight(items: list[CartItem]) -> float:
    total = 0.0
    for item in items:
        product = get_product_or_error(item.product_id)
        dims = product.dimensions_cm
        volumetric_per_unit = (dims.length * dims.width * dims.height) / VOLUMETRIC_DIVISOR
        total += volumetric_per_unit * item.quantity
    return total


def quote_shipping(destination_country: str, items: list[CartItem]) -> ShippingQuote:
    country = destination_country.upper()
    if country not in COUNTRY_RATE_CARD:
        raise ValueError(f"Unsupported destination country: {destination_country}")

    base_charge, per_kg_rate = COUNTRY_RATE_CARD[country]
    physical = _physical_weight(items)
    volumetric = _volumetric_weight(items)
    billable_weight = max(physical, volumetric)

    courier_cost = base_charge + (math.ceil(billable_weight) * per_kg_rate)
    margin = round(courier_cost * SHIPPING_MARGIN_RATE, 2)
    total_charge = round(courier_cost + margin, 2)

    return ShippingQuote(
        billable_weight_kg=round(billable_weight, 3),
        courier_base_charge_inr=round(courier_cost, 2),
        platform_shipping_margin_inr=margin,
        total_shipping_charge_inr=total_charge,
    )
