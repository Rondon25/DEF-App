import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { staffApi } from "../api";
import { X, Plus, Minus, Trash2, Loader2, Check } from "lucide-react";

interface SKU { id: number; sku_code: string; name: string; unit: string; current_price: number; }
interface Line { sku: SKU; qty: number; }

const selectCls = "w-full h-11 rounded-xl border border-input bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function StaffCreateOrder({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState<number | "">("");
  const [lines, setLines] = useState<Line[]>([]);
  const [pickSku, setPickSku] = useState<number | "">("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["all-customers"],
    queryFn: () => staffApi.get("/customers?status=active").then((r) => r.data),
  });
  const { data: skus = [] } = useQuery<SKU[]>({
    queryKey: ["catalog-skus-staff"],
    queryFn: () => staffApi.get("/catalog/skus").then((r) => r.data),
  });

  const addLine = () => {
    if (!pickSku) return;
    const sku = skus.find((s) => s.id === Number(pickSku));
    if (!sku) return;
    if (lines.find((l) => l.sku.id === sku.id)) { setPickSku(""); return; }
    setLines((p) => [...p, { sku, qty: 1 }]);
    setPickSku("");
  };
  const setQty = (id: number, qty: number) => {
    if (qty <= 0) setLines((p) => p.filter((l) => l.sku.id !== id));
    else setLines((p) => p.map((l) => (l.sku.id === id ? { ...l, qty } : l)));
  };

  const total = lines.reduce((s, l) => s + l.sku.current_price * l.qty, 0);

  const createMutation = useMutation({
    mutationFn: () => staffApi.post("/staff/orders", {
      customer_id: Number(customerId),
      items: lines.map((l) => ({ sku_id: l.sku.id, quantity: l.qty })),
      delivery_address: address || undefined,
      notes: notes || undefined,
    }).then((r) => r.data),
    onSuccess: (order) => { onClose(); navigate(`/staff/orders/${order.id}`); },
    onError: (e: any) => setError(e.response?.data?.detail || "Failed to create order"),
  });

  const submit = () => {
    if (!customerId) { setError("Select a customer."); return; }
    if (!lines.length) { setError("Add at least one product."); return; }
    setError("");
    createMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-[480px] rounded-t-2xl sm:rounded-2xl p-6 max-h-[92dvh] overflow-auto" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">New Order</h3>
          <button onClick={onClose} className="text-ink-3"><X size={20} /></button>
        </div>

        {/* Customer */}
        <div className="mb-3">
          <label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">Customer</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")} className={selectCls}>
            <option value="">Select customer…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company_name ? ` · ${c.company_name}` : ""}</option>)}
          </select>
        </div>

        {/* Product picker */}
        <div className="mb-3">
          <label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">Add product</label>
          <div className="flex gap-2">
            <select value={pickSku} onChange={(e) => setPickSku(e.target.value ? Number(e.target.value) : "")} className={selectCls}>
              <option value="">Select product…</option>
              {skus.map((s) => <option key={s.id} value={s.id}>{s.name} — ₹{s.current_price.toFixed(2)}/{s.unit}</option>)}
            </select>
            <button onClick={addLine} disabled={!pickSku} className="shrink-0 h-11 px-4 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1"><Plus size={16} /></button>
          </div>
        </div>

        {/* Lines */}
        {lines.length > 0 && (
          <div className="rounded-xl border border-border divide-y divide-border mb-3">
            {lines.map((l) => (
              <div key={l.sku.id} className="flex items-center gap-2 p-2.5">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13px] truncate">{l.sku.name}</div>
                  <div className="text-[11px] text-ink-4">₹{l.sku.current_price.toFixed(2)} / {l.sku.unit}</div>
                </div>
                <button onClick={() => setQty(l.sku.id, l.qty - 1)} className="size-7 rounded-full border border-border flex items-center justify-center text-ink-2"><Minus size={13} /></button>
                <span className="w-6 text-center font-bold text-sm">{l.qty}</span>
                <button onClick={() => setQty(l.sku.id, l.qty + 1)} className="size-7 rounded-full bg-primary text-white flex items-center justify-center"><Plus size={13} /></button>
                <span className="w-16 text-right font-bold text-[13px]">₹{(l.sku.current_price * l.qty).toFixed(2)}</span>
                <button onClick={() => setQty(l.sku.id, 0)} className="text-ink-4 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            ))}
            <div className="flex justify-between p-2.5 font-bold text-sm">
              <span>Total</span><span className="text-primary">₹{total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Address + notes */}
        <div className="mb-3">
          <label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">Delivery address (optional)</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Defaults to customer's main address" className={selectCls} />
        </div>
        <div className="mb-4">
          <label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any instructions…"
            className="w-full rounded-xl border border-input bg-surface px-3.5 py-2.5 text-sm resize-none outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>

        {error && <div className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 mb-3 text-[13px] text-red-700">{error}</div>}

        <button onClick={submit} disabled={createMutation.isPending}
          className="w-full h-12 rounded-full bg-primary text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-teal-700 transition-colors disabled:opacity-60">
          {createMutation.isPending ? <Loader2 className="size-5 animate-spin" /> : <><Check size={16} /> Create Order</>}
        </button>
      </div>
    </div>
  );
}
