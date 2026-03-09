from __future__ import annotations

from app.models import DimensionsCm, Product, Supplier, SupplierType

SUPPLIERS: list[Supplier] = [
    Supplier(
        id="amazon_in",
        name="Amazon India",
        type=SupplierType.api,
        source_url="https://www.amazon.in",
    ),
    Supplier(
        id="flipkart",
        name="Flipkart",
        type=SupplierType.api,
        source_url="https://www.flipkart.com",
    ),
    Supplier(
        id="regional_vendor",
        name="Regional Specialty Vendor",
        type=SupplierType.website_automation,
        source_url="https://example-regional-vendor.in",
    ),
]

PRODUCTS: list[Product] = [
    Product(
        id="prd_amul_ghee_1l",
        supplier_id="amazon_in",
        supplier_sku="AMZ-GHEE-1L",
        title="Amul Pure Ghee 1L",
        category="grocery",
        inr_price=720,
        weight_kg=1.1,
        dimensions_cm=DimensionsCm(length=10, width=10, height=24),
    ),
    Product(
        id="prd_haldiram_bhujia",
        supplier_id="flipkart",
        supplier_sku="FLP-BHUJIA-400G",
        title="Haldiram Bhujia 400g",
        category="snacks",
        inr_price=180,
        weight_kg=0.45,
        dimensions_cm=DimensionsCm(length=8, width=20, height=26),
    ),
    Product(
        id="prd_ayurvedic_oil",
        supplier_id="regional_vendor",
        supplier_sku="REG-OIL-200ML",
        title="Ayurvedic Hair Oil 200ml",
        category="ayurvedic",
        inr_price=340,
        weight_kg=0.3,
        dimensions_cm=DimensionsCm(length=5, width=5, height=18),
    ),
]


def list_suppliers() -> list[Supplier]:
    return SUPPLIERS


def search_products(query: str | None = None, category: str | None = None) -> list[Product]:
    normalized_query = (query or "").strip().lower()
    normalized_category = (category or "").strip().lower()

    def matches(product: Product) -> bool:
        title_ok = not normalized_query or normalized_query in product.title.lower()
        category_ok = not normalized_category or product.category.lower() == normalized_category
        return title_ok and category_ok

    return [product for product in PRODUCTS if matches(product)]


def get_product_or_error(product_id: str) -> Product:
    for product in PRODUCTS:
        if product.id == product_id:
            return product
    raise KeyError(f"Unknown product_id: {product_id}")
