import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { getCustomerUser } from "../../hooks/useAuth";

interface SKU {
  id: number;
  sku_code: string;
  name: string;
  description: string | null;
  unit: string;
  current_price: number;
  min_order_qty: number;
  stock_qty: number | null;
}

interface CartItem {
  sku: SKU;
  qty: number;
}

export default function Catalogue() {
  const navigate  = useNavigate();
  const customer  = getCustomerUser();
  const [cart, setCart]           = useState<CartItem[]>([]);
  const [showCart, setShowCart]   = useState(false);
  const [address, setAddress]     = useState(customer?.address || "");
  const [notes, setNotes]         = useState("");
  const [error, setError]         = useState("");

  const { data: skus = [], isLoading } = useQuery<SKU[]>({
    queryKey: ["skus"],
    queryFn: () => api.get("/catalog/skus").then(r => r.data),
  });

  const placeMutation = useMutation({
    mutationFn: (body: any) => api.post("/orders", body).then(r => r.data),
    onSuccess: (order) => navigate(`/orders/${order.id}`),
    onError: (err: any) => setError(err.response?.data?.detail || "Failed to place order"),
  });

  const getQty = (skuId: number) => cart.find(c => c.sku.id === skuId)?.qty ?? 0;

  const setQty = (sku: SKU, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(c => c.sku.id !== sku.id));
    } else {
      setCart(prev => {
        const existing = prev.find(c => c.sku.id === sku.id);
        if (existing) return prev.map(c => c.sku.id === sku.id ? { ...c, qty } : c);
        return [...prev, { sku, qty }];
      });
    }
  };

  const cartTotal = cart.reduce((s, c) => s + c.sku.current_price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const handlePlaceOrder = () => {
    if (!cart.length) return;
    setError("");
    placeMutation.mutate({
      items: cart.map(c => ({ sku_id: c.sku.id, quantity: c.qty })),
      delivery_address: address || undefined,
      notes: notes || undefined,
    });
  };

  if (isLoading) return <div className="loading-screen"><span className="spinner spinner-dark" /></div>;

  return (
    <>
      <div className="page-header">
        <h1>Place Order</h1>
        <p>Select products and quantities</p>
      </div>

      {/* SKU list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 100 }}>
        {skus.map(sku => {
          const qty = getQty(sku.id);
          return (
            <div key={sku.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{sku.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{sku.sku_code}</div>
                  {sku.description && (
                    <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>{sku.description}</div>
                  )}
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    <span style={{ fontWeight: 700, color: "var(--blue)" }}>${sku.current_price.toFixed(2)}</span>
                    <span style={{ color: "var(--ink-3)" }}> / {sku.unit}</span>
                    {sku.min_order_qty > 1 && (
                      <span style={{ color: "var(--ink-4)", fontSize: 11, marginLeft: 6 }}>Min {sku.min_order_qty} {sku.unit}</span>
                    )}
                  {sku.stock_qty !== null && sku.stock_qty <= 0 && (
                    <span style={{ color: "var(--red,#ef4444)", fontSize: 11, marginLeft: 6, fontWeight: 600 }}>Out of stock</span>
                  )}
                  {sku.stock_qty !== null && sku.stock_qty > 0 && sku.stock_qty < 10 && (
                    <span style={{ color: "var(--amber,#d97706)", fontSize: 11, marginLeft: 6, fontWeight: 600 }}>Low stock ({sku.stock_qty} left)</span>
                  )}
                  </div>
                </div>

                {/* Qty control */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 12 }}>
                  {qty > 0 ? (
                    <>
                      <button
                        onClick={() => setQty(sku, qty - 1)}
                        style={{
                          width: 36, height: 36, borderRadius: 99,
                          border: "2px solid var(--border)",
                          background: "var(--surface)", fontSize: 18,
                          fontWeight: 700, cursor: "pointer", display: "flex",
                          alignItems: "center", justifyContent: "center",
                        }}
                      >−</button>
                      <span style={{ fontWeight: 700, fontSize: 16, minWidth: 28, textAlign: "center" }}>{qty}</span>
                      <button
                        onClick={() => setQty(sku, qty + 1)}
                        style={{
                          width: 36, height: 36, borderRadius: 99,
                          border: "none", background: "var(--blue)",
                          color: "#fff", fontSize: 18, fontWeight: 700,
                          cursor: "pointer", display: "flex",
                          alignItems: "center", justifyContent: "center",
                        }}
                      >+</button>
                    </>
                  ) : (
                    <button
                      onClick={() => setQty(sku, sku.min_order_qty || 1)}
                      style={{
                        padding: "8px 16px", borderRadius: 99,
                        border: "none", background: "var(--blue)",
                        color: "#fff", fontWeight: 600, fontSize: 13,
                        cursor: "pointer",
                      }}
                    >Add</button>
                  )}
                </div>
              </div>

              {qty > 0 && (
                <div style={{
                  background: "var(--blue-light, #eff6ff)",
                  borderRadius: "var(--radius)", padding: "6px 10px",
                  fontSize: 13, fontWeight: 600, color: "var(--blue)",
                }}>
                  Subtotal: ${(sku.current_price * qty).toFixed(2)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky cart bar */}
      {cart.length > 0 && !showCart && (
        <div style={{
          position: "fixed", bottom: "calc(60px + env(safe-area-inset-bottom))",
          left: 0, right: 0, padding: "0 16px", zIndex: 100,
        }}>
          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={() => setShowCart(true)}
            style={{ boxShadow: "0 4px 20px rgba(37,99,235,.4)" }}
          >
            🛒 Review Order · {cartCount} item{cartCount !== 1 ? "s" : ""} · ${cartTotal.toFixed(2)}
          </button>
        </div>
      )}

      {/* Order review sheet */}
      {showCart && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
          display: "flex", alignItems: "flex-end",
          zIndex: 200,
        }}>
          <div style={{
            background: "var(--bg)", borderRadius: "20px 20px 0 0",
            width: "100%", maxHeight: "90dvh", overflow: "auto",
            padding: "20px 16px calc(env(safe-area-inset-bottom) + 20px)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: 17 }}>Review Order</h3>
              <button onClick={() => setShowCart(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--ink-3)" }}>✕</button>
            </div>

            {/* Items */}
            {cart.map(c => (
              <div key={c.sku.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.sku.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{c.qty} × ${c.sku.current_price.toFixed(2)} / {c.sku.unit}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>${(c.sku.current_price * c.qty).toFixed(2)}</div>
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontWeight: 700, fontSize: 16 }}>
              <span>Total</span>
              <span style={{ color: "var(--blue)" }}>${cartTotal.toFixed(2)}</span>
            </div>

            {/* Delivery address */}
            <div className="form-group" style={{ marginTop: 8 }}>
              <label>Delivery address</label>
              <input
                className="input"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Street, City, Country"
              />
            </div>

            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea
                className="input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any special instructions..."
                rows={2}
                style={{ resize: "none" }}
              />
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={handlePlaceOrder}
              disabled={placeMutation.isPending}
              style={{ marginTop: 4 }}
            >
              {placeMutation.isPending ? <span className="spinner" /> : "✅ Place Order"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
