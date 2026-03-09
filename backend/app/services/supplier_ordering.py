from __future__ import annotations

from app.models import CartItem, ProcurementTask
from app.services.catalog import get_product_or_error


def build_procurement_tasks(items: list[CartItem]) -> list[ProcurementTask]:
    grouped: dict[str, int] = {}
    for item in items:
        product = get_product_or_error(item.product_id)
        grouped[product.supplier_id] = grouped.get(product.supplier_id, 0) + item.quantity

    tasks: list[ProcurementTask] = []
    for supplier_id, quantity in grouped.items():
        tasks.append(
            ProcurementTask(
                supplier_id=supplier_id,
                supplier_order_reference=f"PO-{supplier_id.upper()}-{quantity}",
                item_count=quantity,
            )
        )
    return tasks
