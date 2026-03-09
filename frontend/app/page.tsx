"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  supplier_id: string;
  supplier_sku: string;
  title: string;
  category: string;
  inr_price: number;
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
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("US");
  const [email, setEmail] = useState("buyer@example.com");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("query", query.trim());
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
  }, [query]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev[product.id];
      return {
        ...prev,
        [product.id]: {
          product,
          quantity: existing ? existing.quantity + 1 : 1,
        },
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
        [productId]: {
          ...prev[productId],
          quantity,
        },
      };
    });
  }

  const cartItems = useMemo(
    () => Object.values(cart).map((line) => ({ product_id: line.product.id, quantity: line.quantity })),
    [cart],
  );

  const cartLineItems = useMemo(() => Object.values(cart), [cart]);

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

  async function checkout() {
    if (cartItems.length === 0) {
      setMessage("Cart is empty.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_email: email,
          destination_country: country,
          items: cartItems,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Checkout failed");
      }
      setOrder(data as Order);
      setQuote((data as Order).quote);
      setMessage("Order placed successfully.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unknown error";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Phase-1 MVP</p>
        <h1>One checkout for Indian products worldwide</h1>
        <p>
          Aggregate products from Indian suppliers, quote international shipping by billable weight, and place a
          single consolidated order.
        </p>
      </section>

      <section className="panel controls">
        <label>
          Search products
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ghee, snacks, ayurvedic..." />
        </label>
        <button onClick={fetchProducts} disabled={loading}>
          {loading ? "Loading..." : "Search"}
        </button>

        <label>
          Destination country
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="AU">Australia</option>
            <option value="CA">Canada</option>
            <option value="AE">United Arab Emirates</option>
          </select>
        </label>

        <label>
          Customer email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </label>
      </section>

      <section className="grid-wrap">
        <div className="panel">
          <h2>Catalog</h2>
          <ul className="product-list">
            {products.map((product) => (
              <li key={product.id}>
                <div>
                  <h3>{product.title}</h3>
                  <p>
                    ₹{product.inr_price} · {product.category} · {product.supplier_id}
                  </p>
                </div>
                <button onClick={() => addToCart(product)} disabled={!product.in_stock}>
                  {product.in_stock ? "Add" : "Out"}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <h2>Cart</h2>
          <ul className="cart-list">
            {cartLineItems.map((line) => (
              <li key={line.product.id}>
                <div>
                  <strong>{line.product.title}</strong>
                  <p>₹{line.product.inr_price} each</p>
                </div>
                <input
                  type="number"
                  min={0}
                  value={line.quantity}
                  onChange={(e) => updateQty(line.product.id, Number(e.target.value))}
                />
              </li>
            ))}
          </ul>

          <div className="actions">
            <button onClick={quoteCart} disabled={loading}>
              Quote Cart
            </button>
            <button onClick={checkout} disabled={loading}>
              Checkout
            </button>
          </div>

          {quote ? (
            <div className="quote-box">
              <h3>Quote Summary</h3>
              <p>Items subtotal: ₹{quote.items_subtotal_inr}</p>
              <p>Product margin: ₹{quote.product_margin_inr}</p>
              <p>Service fee: ₹{quote.service_fee_inr}</p>
              <p>Billable weight: {quote.shipping.billable_weight_kg} kg</p>
              <p>Shipping total: ₹{quote.shipping.total_shipping_charge_inr}</p>
              <p className="grand">Grand total: ₹{quote.grand_total_inr}</p>
            </div>
          ) : null}

          {order ? (
            <div className="order-box">
              <h3>Order Confirmed</h3>
              <p>Order ID: {order.id}</p>
              <p>Status: {order.status}</p>
            </div>
          ) : null}
        </div>
      </section>

      {message ? <p className="status">{message}</p> : null}
    </main>
  );
}
