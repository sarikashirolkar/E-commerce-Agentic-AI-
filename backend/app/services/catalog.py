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
        title="Amul Pure Ghee 1L Tetra Pack",
        brand="Amul",
        category="grocery",
        inr_price=720,
        mrp_inr=845,
        discount_percent=15,
        rating=4.4,
        rating_count=18211,
        delivery_text="FREE delivery by Friday",
        image_url="/products/ghee.svg",
        is_prime=True,
        weight_kg=1.1,
        dimensions_cm=DimensionsCm(length=10, width=10, height=24),
    ),
    Product(
        id="prd_haldiram_bhujia",
        supplier_id="flipkart",
        supplier_sku="FLP-BHUJIA-400G",
        title="Haldiram Bhujia Sev, 400g Pack",
        brand="Haldiram",
        category="snacks",
        inr_price=180,
        mrp_inr=235,
        discount_percent=23,
        rating=4.2,
        rating_count=9412,
        delivery_text="Delivery by Thursday",
        image_url="/products/bhujia.svg",
        is_prime=False,
        weight_kg=0.45,
        dimensions_cm=DimensionsCm(length=8, width=20, height=26),
    ),
    Product(
        id="prd_ayurvedic_oil",
        supplier_id="regional_vendor",
        supplier_sku="REG-OIL-200ML",
        title="Bhringraj Ayurvedic Hair Oil, 200ml",
        brand="KeshAyur",
        category="ayurvedic",
        inr_price=340,
        mrp_inr=499,
        discount_percent=32,
        rating=4.1,
        rating_count=2711,
        delivery_text="Delivery in 5-7 days",
        image_url="/products/oil.svg",
        is_prime=False,
        weight_kg=0.3,
        dimensions_cm=DimensionsCm(length=5, width=5, height=18),
    ),
    Product(
        id="prd_dryfruit_box",
        supplier_id="amazon_in",
        supplier_sku="AMZ-DRY-750G",
        title="Premium Dry Fruit Gift Box, 750g",
        brand="NutriHarvest",
        category="festival",
        inr_price=1299,
        mrp_inr=1699,
        discount_percent=24,
        rating=4.5,
        rating_count=6044,
        delivery_text="FREE One-Day Delivery",
        image_url="/products/dryfruit.svg",
        is_prime=True,
        weight_kg=0.95,
        dimensions_cm=DimensionsCm(length=27, width=19, height=9),
    ),
    Product(
        id="prd_masala_combo",
        supplier_id="flipkart",
        supplier_sku="FLP-MASALA-CMB",
        title="Kitchen King Masala Combo (6 Pack)",
        brand="EverSpice",
        category="grocery",
        inr_price=499,
        mrp_inr=799,
        discount_percent=38,
        rating=4.3,
        rating_count=3330,
        delivery_text="Delivery by Saturday",
        image_url="/products/masala.svg",
        is_prime=False,
        weight_kg=0.9,
        dimensions_cm=DimensionsCm(length=22, width=14, height=12),
    ),
    Product(
        id="prd_festival_diya",
        supplier_id="regional_vendor",
        supplier_sku="REG-DIYA-24",
        title="Handcrafted Diya Set (Pack of 24)",
        brand="Utsav Crafts",
        category="festival",
        inr_price=599,
        mrp_inr=999,
        discount_percent=40,
        rating=4.0,
        rating_count=1820,
        delivery_text="Delivery in 6-8 days",
        image_url="/products/diya.svg",
        is_prime=False,
        weight_kg=1.2,
        dimensions_cm=DimensionsCm(length=30, width=20, height=11),
    ),
    Product(
        id="prd_pickles_combo",
        supplier_id="amazon_in",
        supplier_sku="AMZ-PKL-3X",
        title="Andhra Pickles Combo, 3 x 300g",
        brand="Grandma's Kitchen",
        category="regional",
        inr_price=749,
        mrp_inr=1049,
        discount_percent=29,
        rating=4.6,
        rating_count=1288,
        delivery_text="FREE delivery by Monday",
        image_url="/products/pickles.svg",
        is_prime=True,
        weight_kg=1.25,
        dimensions_cm=DimensionsCm(length=25, width=12, height=12),
    ),
    Product(
        id="prd_kurta_set",
        supplier_id="flipkart",
        supplier_sku="FLP-KURTA-M",
        title="Men's Cotton Kurta Pajama Set",
        brand="Vastra Home",
        category="clothing",
        inr_price=1399,
        mrp_inr=2499,
        discount_percent=44,
        rating=3.9,
        rating_count=4450,
        delivery_text="Delivery by Sunday",
        image_url="/products/kurta.svg",
        is_prime=False,
        weight_kg=0.7,
        dimensions_cm=DimensionsCm(length=30, width=24, height=4),
    ),
]


def list_suppliers() -> list[Supplier]:
    return SUPPLIERS


def search_products(query: str | None = None, category: str | None = None) -> list[Product]:
    normalized_query = (query or "").strip().lower()
    normalized_category = (category or "").strip().lower()

    def matches(product: Product) -> bool:
        title_ok = not normalized_query or normalized_query in product.title.lower() or normalized_query in product.brand.lower()
        category_ok = not normalized_category or product.category.lower() == normalized_category
        return title_ok and category_ok

    return [product for product in PRODUCTS if matches(product)]


def get_product_or_error(product_id: str) -> Product:
    for product in PRODUCTS:
        if product.id == product_id:
            return product
    raise KeyError(f"Unknown product_id: {product_id}")
