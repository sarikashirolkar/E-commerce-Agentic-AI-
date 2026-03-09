from __future__ import annotations

import hashlib
import hmac
import os
from dataclasses import dataclass

import httpx


@dataclass
class RazorpayConfig:
    key_id: str
    key_secret: str


def get_razorpay_config() -> RazorpayConfig:
    key_id = os.getenv("RAZORPAY_KEY_ID", "").strip()
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "").strip()
    if not key_id or not key_secret:
        raise ValueError("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured")
    return RazorpayConfig(key_id=key_id, key_secret=key_secret)


def create_razorpay_order(*, amount_paise: int, receipt: str) -> tuple[str, str]:
    if amount_paise <= 0:
        raise ValueError("Amount must be positive")

    config = get_razorpay_config()
    payload = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt,
        "notes": {"order_ref": receipt},
    }

    try:
        response = httpx.post(
            "https://api.razorpay.com/v1/orders",
            auth=(config.key_id, config.key_secret),
            json=payload,
            timeout=20.0,
        )
    except httpx.HTTPError as exc:
        raise RuntimeError(f"Razorpay request failed: {exc}") from exc

    if response.status_code >= 400:
        raise RuntimeError(f"Razorpay order creation failed: {response.text}")

    body = response.json()
    razorpay_order_id = body.get("id")
    if not razorpay_order_id:
        raise RuntimeError("Razorpay order creation response missing order id")

    return config.key_id, razorpay_order_id


def verify_razorpay_signature(*, razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
    config = get_razorpay_config()
    signature_payload = f"{razorpay_order_id}|{razorpay_payment_id}".encode("utf-8")
    generated_signature = hmac.new(
        key=config.key_secret.encode("utf-8"),
        msg=signature_payload,
        digestmod=hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(generated_signature, razorpay_signature)
