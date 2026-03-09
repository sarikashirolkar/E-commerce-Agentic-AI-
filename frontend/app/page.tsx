"use client";

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
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

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
        body: JSON.stringify({
          customer_email: email,
          destination_country: country,
          items: cartItems,
        }),
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
          | {
              key_id: string;
              razorpay_order_id: string;
              amount_paise: number;
              currency: string;
            }
          | { detail: string };

      if (!rpOrderResponse.ok) {
        throw new Error("detail" in rpOrderData ? rpOrderData.detail : "Unable to initialize Razorpay");
      }
      if ("detail" in rpOrderData) {
        throw new Error(rpOrderData.detail);
      }

      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay checkout script");
      }

      const options = {
        key: rpOrderData.key_id,
        amount: rpOrderData.amount_paise,
        currency: rpOrderData.currency,
        name: "GharSe Global",
        description: `Order ${pendingOrder.id}`,
        order_id: rpOrderData.razorpay_order_id,
        prefill: {
          email,
        },
        handler: async (paymentResponse: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyResponse = await fetch(`${API_BASE}/payments/razorpay/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: pendingOrder.id,
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            }),
          });

          const verifyData = (await verifyResponse.json()) as Order | { detail: string };
          if (!verifyResponse.ok) {
            setMessage("detail" in verifyData ? verifyData.detail : "Payment verification failed");
            return;
          }

          const verifiedOrder = verifyData as Order;
          setOrder(verifiedOrder);
          setQuote(verifiedOrder.quote);
          setMessage("Payment verified. Procurement initiated.");
        },
        modal: {
          ondismiss: () => {
            setMessage("Payment window closed before completion.");
          },
        },
        theme: {
          color: "#ad3f2f",
        },
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
        <button onClick={() => void fetchProducts(query)} disabled={loading}>
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
            <button onClick={payWithRazorpay} disabled={loading}>
              Pay with Razorpay
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
              {order.razorpay_payment_id ? <p>Payment ID: {order.razorpay_payment_id}</p> : null}
            </div>
          ) : null}
        </div>
      </section>

      {message ? <p className="status">{message}</p> : null}
    </main>
  );
}
