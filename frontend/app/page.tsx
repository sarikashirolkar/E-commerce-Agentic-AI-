"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: (response: { error: { description: string } }) => void) => void;
    };
  }
}

type Product = {
  id: string;
  supplier_id: string;
  supplier_sku: string;
  title: string;
  brand: string;
  category: string;
  inr_price: number;
  mrp_inr: number | null;
  discount_percent: number;
  rating: number;
  rating_count: number;
  delivery_text: string;
  stock_status: string;
  image_url: string;
  gallery_urls: string[];
  is_prime: boolean;
  bullet_points: string[];
  about_item: string[];
  size_options: string[];
  color_options: string[];
  weight_kg: number;
  in_stock: boolean;
};

type CartLine = {
  product: Product;
  quantity: number;
};

type Quote = {
  items_subtotal_inr: number;
  product_margin_inr: number;
  service_fee_inr: number;
  shipping: {
    billable_weight_kg: number;
    courier_base_charge_inr: number;
    platform_shipping_margin_inr: number;
    total_shipping_charge_inr: number;
  };
  grand_total_inr: number;
};

type Order = {
  id: string;
  status: string;
  quote: Quote;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
const CATEGORY_CHIPS = ["all", "grocery", "snacks", "festival", "regional", "clothing", "ayurvedic"];

function formatINR(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function countdownLabel(target: number, now: number): string {
  const delta = Math.max(0, target - now);
  const hours = Math.floor(delta / 3600000);
  const minutes = Math.floor((delta % 3600000) / 60000);
  const seconds = Math.floor((delta % 60000) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("US");
  const [email, setEmail] = useState("buyer@example.com");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(3000);
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [clock, setClock] = useState(Date.now());

  const dealTargets = useMemo(
    () => [Date.now() + 6 * 3600000, Date.now() + 3 * 3600000, Date.now() + 9 * 3600000],
    [],
  );

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchProducts = useCallback(async (searchTerm: string) => {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) {
        params.set("query", searchTerm.trim());
      }
      const response = await fetch(`${API_BASE}/products?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load products");
      }
      const data = (await response.json()) as Product[];
      setProducts(data);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unknown error";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts("");
  }, [fetchProducts]);

  const brands = useMemo(() => ["all", ...Array.from(new Set(products.map((p) => p.brand))).sort()], [products]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    list = list.filter((product) => product.inr_price >= minPrice && product.inr_price <= maxPrice);
    list = list.filter((product) => product.rating >= minRating);
    if (inStockOnly) {
      list = list.filter((product) => product.in_stock);
    }
    if (selectedBrand !== "all") {
      list = list.filter((product) => product.brand === selectedBrand);
    }
    if (activeCategory !== "all") {
      list = list.filter((product) => product.category === activeCategory);
    }

    if (sortBy === "price_asc") {
      list.sort((a, b) => a.inr_price - b.inr_price);
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => b.inr_price - a.inr_price);
    } else if (sortBy === "rating") {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "discount") {
      list.sort((a, b) => b.discount_percent - a.discount_percent);
    }

    return list;
  }, [products, minPrice, maxPrice, minRating, inStockOnly, selectedBrand, activeCategory, sortBy]);

  const cartItems = useMemo(
    () => Object.values(cart).map((line) => ({ product_id: line.product.id, quantity: line.quantity })),
    [cart],
  );

  const cartLineItems = useMemo(() => Object.values(cart), [cart]);
  const cartCount = useMemo(() => cartLineItems.reduce((acc, line) => acc + line.quantity, 0), [cartLineItems]);

  const wishlistProducts = useMemo(
    () => products.filter((product) => wishlist.has(product.id)),
    [products, wishlist],
  );

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev[product.id];
      return {
        ...prev,
        [product.id]: { product, quantity: existing ? existing.quantity + 1 : 1 },
      };
    });
  }

  function updateQty(productId: string, quantity: number) {
    setCart((prev) => {
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return {
        ...prev,
        [productId]: { ...prev[productId], quantity },
      };
    });
  }

  function toggleWishlist(productId: string) {
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }

  function saveForLater(productId: string) {
    setWishlist((prev) => new Set(prev).add(productId));
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }

  async function quoteCart() {
    if (cartItems.length === 0) {
      setMessage("Add at least one item before requesting a quote.");
      return;
    }

    setLoading(true);
    setMessage("");
    setOrder(null);

    try {
      const response = await fetch(`${API_BASE}/cart/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination_country: country, items: cartItems }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to quote cart");
      }
      setQuote(data as Quote);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unknown error";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  async function payWithRazorpay() {
    if (cartItems.length === 0) {
      setMessage("Cart is empty.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const checkoutResponse = await fetch(`${API_BASE}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_email: email, destination_country: country, items: cartItems }),
      });
      const checkoutData = (await checkoutResponse.json()) as Order | { detail: string };
      if (!checkoutResponse.ok) {
        throw new Error("detail" in checkoutData ? checkoutData.detail : "Checkout failed");
      }

      const pendingOrder = checkoutData as Order;
      setQuote(pendingOrder.quote);

      const rpOrderResponse = await fetch(`${API_BASE}/payments/razorpay/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: pendingOrder.id }),
      });
      const rpOrderData =
        (await rpOrderResponse.json()) as
          | { key_id: string; razorpay_order_id: string; amount_paise: number; currency: string }
          | { detail: string };

      if (!rpOrderResponse.ok || "detail" in rpOrderData) {
        throw new Error("detail" in rpOrderData ? rpOrderData.detail : "Unable to initialize Razorpay");
      }

      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay checkout script");
      }

      const options = {
        key: rpOrderData.key_id,
        amount: rpOrderData.amount_paise,
        currency: rpOrderData.currency,
        name: "Desi Deli",
        description: `Order ${pendingOrder.id}`,
        order_id: rpOrderData.razorpay_order_id,
        prefill: { email },
        handler: async (paymentResponse: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyResponse = await fetch(`${API_BASE}/payments/razorpay/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_id: pendingOrder.id, ...paymentResponse }),
          });

          const verifyData = (await verifyResponse.json()) as Order | { detail: string };
          if (!verifyResponse.ok) {
            setMessage("detail" in verifyData ? verifyData.detail : "Payment verification failed");
            return;
          }

          setOrder(verifyData as Order);
          setQuote((verifyData as Order).quote);
          setMessage("Payment verified. Procurement initiated.");
        },
        modal: { ondismiss: () => setMessage("Payment window closed before completion.") },
        theme: { color: "#26d1b7" },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", (response: { error: { description: string } }) => {
        setMessage(`Payment failed: ${response.error.description}`);
      });
      razorpay.open();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unknown error";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="aurora-page">
      <header className="top-nav glass-card">
        <div className="brand-zone">
          <p className="brand-mark">Desi Deli</p>
          <p className="delivery-loc">Deliver to {country}</p>
        </div>
        <div className="search-zone">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Indian groceries, fashion, wellness..."
          />
          <button onClick={() => void fetchProducts(query)} disabled={loading}>
            Search
          </button>
        </div>
        <div className="account-zone">
          <div className="account-menu">
            <span>Account</span>
            <div className="menu-popover">
              <p>Hi, Shopper</p>
              <Link href="/admin">Operations Dashboard</Link>
            </div>
          </div>
          <p className="cart-pill">Cart {cartCount}</p>
        </div>
      </header>

      <nav className="mega-nav glass-card">
        <div className="mega-item">
          <span>Shop by Category</span>
          <div className="mega-dropdown">
            <div>
              <h4>Groceries</h4>
              <p>Staples, snacks, spice mixes</p>
            </div>
            <div>
              <h4>Festive</h4>
              <p>Diya sets, gift boxes, puja essentials</p>
            </div>
            <div>
              <h4>Lifestyle</h4>
              <p>Kurta sets, ayurvedic care, wellness</p>
            </div>
          </div>
        </div>
        <p>Fast UK Delivery</p>
        <p>Today&apos;s Offers</p>
        <p>Customer Care</p>
      </nav>

      <section className="hero-aurora glass-card">
        <div>
          <p className="eyebrow">Made In India, Loved Worldwide</p>
          <h1>Traditional Indian Treats In A Modern Marketplace</h1>
          <p>Shop authentic snacks, festive boxes, and regional favorites with one cart and international checkout.</p>
        </div>
        <div className="hero-cta-row">
          <button onClick={quoteCart} disabled={loading}>
            Get Shipping Quote
          </button>
          <button onClick={payWithRazorpay} disabled={loading}>
            Checkout with Razorpay
          </button>
        </div>
      </section>

      <section className="promo-parallax glass-card">
        <h3>Weekend Desi Fest Promo</h3>
        <p>Extra discounts on bestsellers, festive packs, and export bundles</p>
      </section>

      <section className="deals-grid">
        {filteredProducts.slice(0, 3).map((deal, idx) => (
          <article key={deal.id} className="glass-card deal-card">
            <p className="deal-tag">Today&apos;s Offer</p>
            <h4>{deal.title}</h4>
            <p>
              {formatINR(deal.inr_price)} <span className="discount">-{deal.discount_percent}%</span>
            </p>
            <p className="countdown">Ends in {countdownLabel(dealTargets[idx], clock)}</p>
          </article>
        ))}
      </section>

      <section className="category-chip-row">
        {CATEGORY_CHIPS.map((chip) => (
          <button
            key={chip}
            className={chip === activeCategory ? "chip active" : "chip"}
            onClick={() => setActiveCategory(chip)}
          >
            {chip}
          </button>
        ))}
      </section>

      <section className="market-layout">
        <aside className="glass-card filters-side">
          <h3>Filters</h3>
          <label>
            Min Price
            <input type="number" value={minPrice} onChange={(event) => setMinPrice(Number(event.target.value) || 0)} />
          </label>
          <label>
            Max Price
            <input type="number" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value) || 3000)} />
          </label>
          <label>
            Min Rating
            <select value={minRating} onChange={(event) => setMinRating(Number(event.target.value))}>
              <option value={0}>All</option>
              <option value={3}>3+</option>
              <option value={4}>4+</option>
              <option value={4.5}>4.5+</option>
            </select>
          </label>
          <label>
            Brand
            <select value={selectedBrand} onChange={(event) => setSelectedBrand(event.target.value)}>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-check">
            <input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} />
            In stock only
          </label>
          <label>
            Sort By
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="featured">Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Rating</option>
              <option value="discount">Discount</option>
            </select>
          </label>
        </aside>

        <div className="catalog-main">
          <section className="glass-card product-grid-wrap">
            <h2>Marketplace Products</h2>
            <ul className="product-grid">
              {filteredProducts.map((product) => (
                <li key={product.id} className="product-card glass-card">
                  <button className="wish-btn" onClick={() => toggleWishlist(product.id)}>
                    {wishlist.has(product.id) ? "♥" : "♡"}
                  </button>
                  <Link href={`/product/${product.id}`} className="preview-wrap">
                    <Image src={product.image_url} alt={product.title} width={180} height={180} className="product-image" />
                  </Link>
                  <Link href={`/product/${product.id}`} className="prod-title-link">
                    <h3>{product.title}</h3>
                  </Link>
                  <p className="rating">
                    {product.rating.toFixed(1)} ★ ({product.rating_count.toLocaleString("en-IN")})
                  </p>
                  <p className="price-row">
                    <strong>{formatINR(product.inr_price)}</strong>
                    {product.mrp_inr ? <span className="mrp">{formatINR(product.mrp_inr)}</span> : null}
                    <span className="discount">-{product.discount_percent}%</span>
                  </p>
                  <p className="delivery">{product.delivery_text}</p>
                  <button className="add-cart" onClick={() => addToCart(product)} disabled={!product.in_stock}>
                    Add to Cart
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass-card wishlist-box">
            <h2>Wishlist / Save for Later</h2>
            {wishlistProducts.length === 0 ? <p>No saved items yet.</p> : null}
            <ul>
              {wishlistProducts.map((item) => (
                <li key={item.id}>
                  <Link href={`/product/${item.id}`}>{item.title}</Link>
                  <button onClick={() => addToCart(item)}>Move to Cart</button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="glass-card cart-side">
          <h3>Cart ({cartCount})</h3>
          <label>
            Destination
            <select value={country} onChange={(event) => setCountry(event.target.value)}>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="CA">Canada</option>
              <option value="AE">UAE</option>
            </select>
          </label>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>

          <ul className="cart-list">
            {cartLineItems.map((line) => (
              <li key={line.product.id}>
                <div>
                  <strong>{line.product.title}</strong>
                  <p>{formatINR(line.product.inr_price)} each</p>
                </div>
                <input
                  type="number"
                  min={0}
                  value={line.quantity}
                  onChange={(event) => updateQty(line.product.id, Number(event.target.value))}
                />
                <button onClick={() => saveForLater(line.product.id)}>Save for Later</button>
              </li>
            ))}
          </ul>

          <div className="actions">
            <button onClick={quoteCart} disabled={loading}>
              Quote Cart
            </button>
            <button onClick={payWithRazorpay} disabled={loading}>
              Pay
            </button>
          </div>

          {quote ? (
            <div className="quote-box">
              <h4>Quote Summary</h4>
              <p>Subtotal: {formatINR(quote.items_subtotal_inr)}</p>
              <p>Shipping: {formatINR(quote.shipping.total_shipping_charge_inr)}</p>
              <p className="grand">Total: {formatINR(quote.grand_total_inr)}</p>
            </div>
          ) : null}

          {order ? (
            <div className="order-box">
              <h4>Order Confirmed</h4>
              <p>{order.id}</p>
              <p>{order.status}</p>
            </div>
          ) : null}
        </aside>
      </section>

      {message ? <p className="status">{message}</p> : null}
    </main>
  );
}
