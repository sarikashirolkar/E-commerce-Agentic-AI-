from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field


class SupplierType(str, Enum):
    api = "api"
    website_automation = "website_automation"


class Supplier(BaseModel):
    id: str
    name: str
    type: SupplierType
    source_url: str


class DimensionsCm(BaseModel):
    length: float = Field(..., gt=0)
    width: float = Field(..., gt=0)
    height: float = Field(..., gt=0)


class Product(BaseModel):
    id: str
    supplier_id: str
    supplier_sku: str
    title: str
    category: str
    inr_price: float = Field(..., gt=0)
    weight_kg: float = Field(..., gt=0)
    dimensions_cm: DimensionsCm
    in_stock: bool = True


class CartItem(BaseModel):
    product_id: str
    quantity: int = Field(..., ge=1)


class ShippingQuoteRequest(BaseModel):
    destination_country: str = Field(..., min_length=2, max_length=2)
    items: list[CartItem]


class ShippingQuote(BaseModel):
    currency: Literal["INR"] = "INR"
    billable_weight_kg: float
    courier_base_charge_inr: float
    platform_shipping_margin_inr: float
    total_shipping_charge_inr: float


class CartQuoteResponse(BaseModel):
    items_subtotal_inr: float
    product_margin_inr: float
    service_fee_inr: float
    shipping: ShippingQuote
    grand_total_inr: float


class CheckoutRequest(BaseModel):
    customer_email: str
    destination_country: str = Field(..., min_length=2, max_length=2)
    items: list[CartItem]


class OrderStatus(str, Enum):
    payment_pending = "payment_pending"
    paid = "paid"
    purchasing = "purchasing"
    consolidating = "consolidating"
    shipped = "shipped"


class ProcurementTask(BaseModel):
    supplier_id: str
    supplier_order_reference: str
    item_count: int
    status: Literal["queued", "placed", "failed"] = "queued"


class Order(BaseModel):
    id: str = Field(default_factory=lambda: f"ord_{uuid4().hex[:12]}")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    customer_email: str
    destination_country: str
    items: list[CartItem]
    quote: CartQuoteResponse
    procurement_tasks: list[ProcurementTask] = Field(default_factory=list)
    status: OrderStatus = OrderStatus.payment_pending
    payment_currency: Literal["INR"] = "INR"
    payment_amount_inr: float = Field(..., gt=0)
    payment_provider: Literal["razorpay"] | None = None
    razorpay_order_id: str | None = None
    razorpay_payment_id: str | None = None
    paid_at: datetime | None = None


class RazorpayCreateOrderRequest(BaseModel):
    order_id: str


class RazorpayCreateOrderResponse(BaseModel):
    key_id: str
    razorpay_order_id: str
    amount_paise: int
    currency: Literal["INR"] = "INR"


class RazorpayVerifyRequest(BaseModel):
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
