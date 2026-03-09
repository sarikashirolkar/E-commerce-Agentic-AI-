from __future__ import annotations

from app.models import Order

ORDERS: dict[str, Order] = {}


def save_order(order: Order) -> Order:
    ORDERS[order.id] = order
    return order


def get_order(order_id: str) -> Order:
    order = ORDERS.get(order_id)
    if order is None:
        raise KeyError(f"Unknown order_id: {order_id}")
    return order
