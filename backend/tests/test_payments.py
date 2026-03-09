import hashlib
import hmac

from app.services.payments import verify_razorpay_signature


def test_verify_razorpay_signature_valid(monkeypatch) -> None:
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_abc")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "secret123")

    razorpay_order_id = "order_123"
    razorpay_payment_id = "pay_123"
    payload = f"{razorpay_order_id}|{razorpay_payment_id}".encode("utf-8")
    signature = hmac.new(b"secret123", payload, hashlib.sha256).hexdigest()

    assert verify_razorpay_signature(
        razorpay_order_id=razorpay_order_id,
        razorpay_payment_id=razorpay_payment_id,
        razorpay_signature=signature,
    )


def test_verify_razorpay_signature_invalid(monkeypatch) -> None:
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_abc")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "secret123")

    assert not verify_razorpay_signature(
        razorpay_order_id="order_123",
        razorpay_payment_id="pay_123",
        razorpay_signature="invalid_signature",
    )
