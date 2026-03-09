from app.models import CartItem
from app.services.pricing import quote_cart


def test_quote_cart_returns_expected_shape_and_values() -> None:
    quote = quote_cart(
        destination_country="US",
        items=[
            CartItem(product_id="prd_amul_ghee_1l", quantity=2),
            CartItem(product_id="prd_haldiram_bhujia", quantity=1),
        ],
    )

    assert quote.items_subtotal_inr > 0
    assert quote.product_margin_inr > 0
    assert quote.shipping.total_shipping_charge_inr >= quote.shipping.courier_base_charge_inr
    assert quote.grand_total_inr > quote.items_subtotal_inr


def test_quote_cart_rejects_unsupported_country() -> None:
    try:
        quote_cart(destination_country="FR", items=[CartItem(product_id="prd_amul_ghee_1l", quantity=1)])
    except ValueError as exc:
        assert "Unsupported destination country" in str(exc)
        return

    raise AssertionError("Expected ValueError for unsupported country")
