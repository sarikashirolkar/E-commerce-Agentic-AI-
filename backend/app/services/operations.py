from __future__ import annotations

from app.models import Order, OrderStatus

ALLOWED_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.payment_pending: {OrderStatus.paid, OrderStatus.purchasing},
    OrderStatus.paid: {OrderStatus.purchasing},
    OrderStatus.purchasing: {OrderStatus.consolidating, OrderStatus.shipped},
    OrderStatus.consolidating: {OrderStatus.shipped},
    OrderStatus.shipped: set(),
}


def update_order_status(order: Order, next_status: OrderStatus) -> Order:
    if order.status == next_status:
        return order

    allowed = ALLOWED_TRANSITIONS.get(order.status, set())
    if next_status not in allowed:
        raise ValueError(f"Invalid status transition from {order.status} to {next_status}")

    order.status = next_status
    return order


def update_procurement_task_status(order: Order, supplier_id: str, next_status: str) -> Order:
    matched = False
    for task in order.procurement_tasks:
        if task.supplier_id == supplier_id:
            task.status = next_status
            matched = True
            break

    if not matched:
        raise ValueError(f"No procurement task found for supplier_id={supplier_id}")

    # Auto-advance to consolidating once every procurement task is placed.
    if order.procurement_tasks and all(task.status == "placed" for task in order.procurement_tasks):
        if order.status == OrderStatus.purchasing:
            order.status = OrderStatus.consolidating

    return order
