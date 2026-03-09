from app.models import CartItem, CartQuoteResponse, Order, OrderStatus, ProcurementTask, ShippingQuote
from app.services.operations import update_order_status, update_procurement_task_status


def sample_order() -> Order:
    return Order(
        customer_email="ops@example.com",
        destination_country="US",
        items=[CartItem(product_id="prd_amul_ghee_1l", quantity=1)],
        quote=CartQuoteResponse(
            items_subtotal_inr=720,
            product_margin_inr=108,
            service_fee_inr=300,
            shipping=ShippingQuote(
                billable_weight_kg=1.1,
                courier_base_charge_inr=1600,
                platform_shipping_margin_inr=192,
                total_shipping_charge_inr=1792,
            ),
            grand_total_inr=2920,
        ),
        payment_amount_inr=2920,
        status=OrderStatus.purchasing,
        procurement_tasks=[
            ProcurementTask(supplier_id="amazon_in", supplier_order_reference="PO-A-1", item_count=1, status="queued"),
            ProcurementTask(supplier_id="flipkart", supplier_order_reference="PO-F-1", item_count=1, status="queued"),
        ],
    )


def test_valid_order_status_transition() -> None:
    order = sample_order()
    updated = update_order_status(order, OrderStatus.consolidating)
    assert updated.status == OrderStatus.consolidating


def test_invalid_order_status_transition_raises() -> None:
    order = sample_order()
    try:
        update_order_status(order, OrderStatus.payment_pending)
    except ValueError as exc:
        assert "Invalid status transition" in str(exc)
        return
    raise AssertionError("Expected ValueError for invalid transition")


def test_procurement_auto_advances_to_consolidating() -> None:
    order = sample_order()
    update_procurement_task_status(order, "amazon_in", "placed")
    assert order.status == OrderStatus.purchasing
    update_procurement_task_status(order, "flipkart", "placed")
    assert order.status == OrderStatus.consolidating
