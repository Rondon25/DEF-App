import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { getCustomerUser } from "../../hooks/useAuth";
import type { DeliveryLocation } from "../../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonList } from "@/components/Skeleton";
import { Minus, Plus, ShoppingCart, X, Loader2, MapPin, Check } from "lucide-react";

interface SKU {
  id: number; sku_code: string; name: string; description: string | null;
  unit: string; current_price: number; min_order_qty: number; stock_qty: number | null;
}
interface CartItem { sku: SKU; qty: number; }

const CUSTOM = "__custom__";

export default function Catalogue() {
  const navigate = useNavigate();
  const customer = getCustomerUser();
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [showCart, setShowCart]       = useState(false);
  const [locChoice, setLocChoice]     = useState<string>("");
  const [customAddr, setCustomAddr]   = useState("");
  const [notes, setNotes]             = useState("");
  const [error, setError]             = useState("");

  const { data: skus = [], isLoading } = useQuery<SKU[]>({
    queryKey: ["skus"],
    queryFn: () => api.get("/catalog/skus").then((r) => r.data),
  });

  const { data: locations = [] } = useQuery<DeliveryLocation[]>({
    queryKey: ["my-locations"],
    queryFn: () => api.get("/auth/me/locations").then((r) => r.data),
  });

  // Build the location options: main address (from profile) + saved locations
  const locationOptions = useMemo(() => {
    const opts: { id: string; label: string; address: string }[] = [];
    const mainAddr = [customer?.address, customer?.city, customer?.state].filter(Boolean).join(", ");
    if (mainAddr) opts.push({ id: "main", label: "Main address", address: mainAddr });
    locations.forEach((l) => {
      const addr = [l.address, l.city, l.state].filter(Boolean).join(", ");
      opts.push({ id: String(l.id), label: l.label, address: addr });
    });
    return opts;
  }, [customer, locations]);

  // Default selection
  const effectiveChoice = locChoice || (locationOptions[0]?.id ?? CUSTOM);

  const resolvedAddress = useMemo(() => {
    if (effectiveChoice === CUSTOM) return customAddr.trim();
    return locationOptions.find((o) => o.id === effectiveChoice)?.address || "";
  }, [effectiveChoice, customAddr, locationOptions]);

  const getQty = (skuId: number) => cart.find((c) => c.sku.id === skuId)?.qty ?? 0;
  const setQty = (sku: SKU, qty: number) => {
    if (qty <= 0) setCart((prev) => prev.filter((c) => c.sku.id !== sku.id));
    else setCart((prev) => {
      const ex = prev.find((c) => c.sku.id === sku.id);
      if (ex) return prev.map((c) => (c.sku.id === sku.id ? { ...c, qty } : c));
      return [...prev, { sku, qty }];
    });
  };

  const cartTotal = cart.reduce((s, c) => s + c.sku.current_price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const placeMutation = useMutation({
    mutationFn: (body: any) => api.post("/orders", body).then((r) => r.data),
    onSuccess: (order) => navigate(`/orders/${order.id}`),
    onError: (err: any) => setError(err.response?.data?.detail || "Failed to place order"),
  });

  const handlePlaceOrder = () => {
    if (!cart.length) return;
    setError("");
    placeMutation.mutate({
      items: cart.map((c) => ({ sku_id: c.sku.id, quantity: c.qty })),
      delivery_address: resolvedAddress || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-ink">Place Order</h1>
        <p className="text-sm text-ink-3">Select products and quantities</p>
      </div>

      {isLoading ? (
        <SkeletonList rows={5} />
      ) : (
        <div className="flex flex-col gap-3 pb-36">
          {skus.map((sku) => {
            const qty = getQty(sku.id);
            const out = sku.stock_qty !== null && sku.stock_qty <= 0;
            return (
              <div key={sku.id} className="bg-surface rounded-2xl p-4 shadow-[var(--shadow-sm)]">
                <div className="flex justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[15px]">{sku.name}</div>
                    <div className="text-[11px] text-ink-4 font-mono mt-0.5">{sku.sku_code}</div>
                    {sku.description && <p className="text-[13px] text-ink-3 mt-1.5 leading-snug">{sku.description}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="font-bold text-primary">₹{sku.current_price.toFixed(2)}</span>
                      <span className="text-ink-3 text-sm">/ {sku.unit}</span>
                      {sku.min_order_qty > 1 && <span className="text-[11px] text-ink-4">Min {sku.min_order_qty}</span>}
                      {out && <Badge tone="red">Out of stock</Badge>}
                      {!out && sku.stock_qty !== null && sku.stock_qty < 10 && (
                        <Badge tone="amber">Low · {sku.stock_qty} left</Badge>
                      )}
                    </div>
                  </div>

                  {/* Qty control */}
                  <div className="flex items-center shrink-0">
                    {qty > 0 ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setQty(sku, qty - 1)}
                          className="size-9 rounded-full border-2 border-border flex items-center justify-center text-ink-2 active:scale-90 transition-transform">
                          <Minus className="size-4" />
                        </button>
                        <span className="w-6 text-center font-bold">{qty}</span>
                        <button onClick={() => setQty(sku, qty + 1)} disabled={out}
                          className="size-9 rounded-full bg-primary text-white flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40">
                          <Plus className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setQty(sku, sku.min_order_qty || 1)} disabled={out}
                        className="h-9 px-5 rounded-full bg-primary text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-40">
                        Add
                      </button>
                    )}
                  </div>
                </div>

                {qty > 0 && (
                  <div className="mt-3 rounded-xl bg-teal-50 px-3 py-1.5 text-[13px] font-semibold text-primary">
                    Subtotal: ₹{(sku.current_price * qty).toFixed(2)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky review bar */}
      {cart.length > 0 && !showCart && (
        <div className="fixed inset-x-0 z-30 px-4" style={{ bottom: "calc(84px + env(safe-area-inset-bottom))" }}>
          <div className="max-w-2xl mx-auto">
            <Button size="full" className="h-12 shadow-[0_6px_24px_rgba(13,148,136,.35)]" onClick={() => setShowCart(true)}>
              <ShoppingCart className="size-4" />
              Review · {cartCount} item{cartCount !== 1 ? "s" : ""} · ₹{cartTotal.toFixed(2)}
            </Button>
          </div>
        </div>
      )}

      {/* Review sheet */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setShowCart(false)}>
          <div
            className="bg-canvas rounded-t-2xl w-full max-h-[90dvh] overflow-auto"
            style={{ padding: "20px 16px calc(env(safe-area-inset-bottom) + 20px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Review Order</h3>
              <button onClick={() => setShowCart(false)} className="text-ink-3 hover:text-ink"><X className="size-5" /></button>
            </div>

            {/* Items */}
            <div className="bg-surface rounded-2xl p-4 mb-3">
              {cart.map((c) => (
                <div key={c.sku.id} className="flex justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <div className="font-semibold text-sm">{c.sku.name}</div>
                    <div className="text-xs text-ink-3">{c.qty} × ₹{c.sku.current_price.toFixed(2)} / {c.sku.unit}</div>
                  </div>
                  <div className="font-bold text-sm">₹{(c.sku.current_price * c.qty).toFixed(2)}</div>
                </div>
              ))}
              <div className="flex justify-between pt-3 mt-1 font-bold">
                <span>Total</span>
                <span className="text-primary text-lg">₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Delivery location */}
            <div className="mb-3">
              <label className="text-[13px] font-semibold text-ink-2 mb-1.5 flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary" /> Delivery location
              </label>
              <select
                value={effectiveChoice}
                onChange={(e) => setLocChoice(e.target.value)}
                className="w-full h-11 rounded-xl border border-input bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236c757d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 36 }}
              >
                {locationOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}{o.address ? ` — ${o.address}` : ""}</option>
                ))}
                <option value={CUSTOM}>+ Enter a custom address</option>
              </select>

              {effectiveChoice === CUSTOM && (
                <input
                  className="w-full h-11 rounded-xl border border-input bg-surface px-3.5 text-sm mt-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-ink-4"
                  value={customAddr}
                  onChange={(e) => setCustomAddr(e.target.value)}
                  placeholder="Street, area, city, state"
                  autoFocus
                />
              )}
            </div>

            {/* Notes */}
            <div className="mb-3">
              <label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">Notes (optional)</label>
              <textarea
                className="w-full rounded-xl border border-input bg-surface px-3.5 py-2.5 text-sm resize-none outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-ink-4"
                rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special instructions..."
              />
            </div>

            {error && <div className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-3 mb-3 text-[13px] text-red-700">{error}</div>}

            <Button size="full" className="h-12" onClick={handlePlaceOrder} disabled={placeMutation.isPending}>
              {placeMutation.isPending ? <Loader2 className="size-5 animate-spin" /> : <><Check className="size-4" /> Place Order</>}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
