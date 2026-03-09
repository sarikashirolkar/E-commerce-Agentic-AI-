"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ProcurementTask = {
  supplier_id: string;
  supplier_order_reference: string;
  item_count: number;
  status: "queued" | "placed" | "failed";
};

type Order = {
  id: string;
  created_at: string;
  customer_email: string;
  destination_country: string;
  status: "payment_pending" | "paid" | "purchasing" | "consolidating" | "shipped";
  payment_amount_inr: number;
  procurement_tasks: ProcurementTask[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/orders`, { cache: "no-store" });
      const data = (await response.json()) as Order[] | { detail: string };
      if (!response.ok) {
        throw new Error("detail" in data ? data.detail : "Failed to load orders");
      }
      setOrders(data as Order[]);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unknown error";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  async function updateOrderStatus(orderId: string, status: Order["status"]) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as Order | { detail: string };
      if (!response.ok) {
        throw new Error("detail" in data ? data.detail : "Failed to update status");
      }
      setOrders((prev) => prev.map((order) => (order.id === orderId ? (data as Order) : order)));
      setMessage(`Updated ${orderId} to ${status}`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unknown error";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  async function updateProcurement(orderId: string, supplierId: string, status: ProcurementTask["status"]) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/orders/${orderId}/procurement/${supplierId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as Order | { detail: string };
      if (!response.ok) {
        throw new Error("detail" in data ? data.detail : "Failed to update procurement task");
      }
      setOrders((prev) => prev.map((order) => (order.id === orderId ? (data as Order) : order)));
      setMessage(`Updated procurement task ${supplierId} in ${orderId}`);
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
        <p className="eyebrow">Operations</p>
        <h1>Warehouse & Procurement Dashboard</h1>
        <p>Track payment-verified orders, update fulfillment stages, and mark supplier procurement progress.</p>
        <Link className="admin-link" href="/">
          Back to Storefront
        </Link>
      </section>

      <section className="panel admin-toolbar">
        <button onClick={() => void loadOrders()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Orders"}
        </button>
      </section>

      <section className="admin-list">
        {orders.map((order) => (
          <article key={order.id} className="panel admin-order">
            <div className="admin-order-header">
              <div>
                <h2>{order.id}</h2>
                <p>
                  {order.customer_email} · {order.destination_country} · ₹{order.payment_amount_inr}
                </p>
              </div>
              <label>
                Order status
                <select
                  value={order.status}
                  onChange={(e) => void updateOrderStatus(order.id, e.target.value as Order["status"])}
                >
                  <option value="payment_pending">payment_pending</option>
                  <option value="paid">paid</option>
                  <option value="purchasing">purchasing</option>
                  <option value="consolidating">consolidating</option>
                  <option value="shipped">shipped</option>
                </select>
              </label>
            </div>

            <div className="admin-procurement">
              <h3>Procurement Tasks</h3>
              {order.procurement_tasks.length === 0 ? <p>No procurement tasks yet.</p> : null}
              {order.procurement_tasks.map((task) => (
                <div key={`${order.id}-${task.supplier_id}`} className="admin-task">
                  <p>
                    <strong>{task.supplier_id}</strong> · {task.supplier_order_reference} · qty {task.item_count}
                  </p>
                  <div className="admin-task-actions">
                    <button onClick={() => void updateProcurement(order.id, task.supplier_id, "queued")}>queued</button>
                    <button onClick={() => void updateProcurement(order.id, task.supplier_id, "placed")}>placed</button>
                    <button onClick={() => void updateProcurement(order.id, task.supplier_id, "failed")}>failed</button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      {message ? <p className="status">{message}</p> : null}
    </main>
  );
}
