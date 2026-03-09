from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class OrderRecord(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    customer_email: Mapped[str] = mapped_column(String(255), nullable=False)
    destination_country: Mapped[str] = mapped_column(String(8), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    quote_json: Mapped[str] = mapped_column(Text, nullable=False)
    items_json: Mapped[str] = mapped_column(Text, nullable=False)
    procurement_tasks_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    payment_currency: Mapped[str] = mapped_column(String(8), nullable=False)
    payment_amount_inr: Mapped[float] = mapped_column(Float, nullable=False)
    payment_provider: Mapped[str | None] = mapped_column(String(32), nullable=True)
    razorpay_order_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
