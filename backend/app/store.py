from __future__ import annotations

import json

from app.db import get_session
from app.db_models import OrderRecord
from app.models import Order


def _record_to_order(record: OrderRecord) -> Order:
    return Order(
        id=record.id,
        created_at=record.created_at,
        customer_email=record.customer_email,
        destination_country=record.destination_country,
        items=json.loads(record.items_json),
        quote=json.loads(record.quote_json),
        procurement_tasks=json.loads(record.procurement_tasks_json),
        status=record.status,
        payment_currency=record.payment_currency,
        payment_amount_inr=float(record.payment_amount_inr),
        payment_provider=record.payment_provider,
        razorpay_order_id=record.razorpay_order_id,
        razorpay_payment_id=record.razorpay_payment_id,
        paid_at=record.paid_at,
    )


def save_order(order: Order) -> Order:
    with get_session() as session:
        existing = session.get(OrderRecord, order.id)
        if existing is None:
            existing = OrderRecord(id=order.id, created_at=order.created_at)

        existing.customer_email = order.customer_email
        existing.destination_country = order.destination_country
        existing.status = order.status.value
        existing.quote_json = json.dumps(order.quote.model_dump())
        existing.items_json = json.dumps([item.model_dump() for item in order.items])
        existing.procurement_tasks_json = json.dumps([task.model_dump() for task in order.procurement_tasks])
        existing.payment_currency = order.payment_currency
        existing.payment_amount_inr = order.payment_amount_inr
        existing.payment_provider = order.payment_provider
        existing.razorpay_order_id = order.razorpay_order_id
        existing.razorpay_payment_id = order.razorpay_payment_id
        existing.paid_at = order.paid_at

        session.add(existing)
        session.flush()
        session.refresh(existing)
        return _record_to_order(existing)


def get_order(order_id: str) -> Order:
    with get_session() as session:
        record = session.get(OrderRecord, order_id)
        if record is None:
            raise KeyError(f"Unknown order_id: {order_id}")
        return _record_to_order(record)


def list_orders() -> list[Order]:
    with get_session() as session:
        records = session.query(OrderRecord).order_by(OrderRecord.created_at.desc()).all()
        return [_record_to_order(record) for record in records]
