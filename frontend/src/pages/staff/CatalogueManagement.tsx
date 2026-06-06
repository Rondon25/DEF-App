import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../../api";
import { Pencil, DollarSign, X, Plus, Droplet, Power, PowerOff } from "lucide-react";

const ic = { display: "inline", verticalAlign: "-3px", marginRight: 5 } as const;

interface SKU {
  id: number;
  sku_code: string;
  name: string;
  description: string | null;
  volume_liters: number;
  unit: string;
  current_price: number;
  is_active: boolean;
}

const EMPTY_NEW = { code: "", name: "", description: "", volume_liters: "", unit: "unit", current_price: "" };

export default function CatalogueManagement() {
  const qc = useQueryClient();

  const [showAdd,     setShowAdd]     = useState(false);
  const [editSku,     setEditSku]     = useState<SKU | null>(null);
  const [priceSku,    setPriceSku]    = useState<SKU | null>(null);
  const [newForm,     setNewForm]     = useState(EMPTY_NEW);
  const [editForm,    setEditForm]    = useState({ name: "", description: "", volume_liters: "", unit: "" });
  const [newPrice,    setNewPrice]    = useState("");
  const [priceNotes,  setPriceNotes]  = useState("");
  const [error,       setError]       = useState("");

  const { data: skus = [], isLoading } = useQuery<SKU[]>({
    queryKey: ["admin-skus"],
    queryFn: () => staffApi.get("/admin/skus").then(r => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-skus"] });

  const createMutation = useMutation({
    mutationFn: (body: any) => staffApi.post("/admin/skus", body).then(r => r.data),
    onSuccess: () => { invalidate(); setShowAdd(false); setNewForm(EMPTY_NEW); setError(""); },
    onError: (e: any) => setError(e.response?.data?.detail || "Failed to create SKU"),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) =>
      staffApi.patch(`/admin/skus/${id}`, body).then(r => r.data),
    onSuccess: () => { invalidate(); setEditSku(null); setError(""); },
    onError: (e: any) => setError(e.response?.data?.detail || "Failed to update SKU"),
  });

  const priceMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) =>
      staffApi.patch(`/admin/skus/${id}/price`, body).then(r => r.data),
    onSuccess: () => { invalidate(); setPriceSku(null); setNewPrice(""); setPriceNotes(""); setError(""); },
    onError: (e: any) => setError(e.response?.data?.detail || "Failed to update price"),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => staffApi.patch(`/admin/skus/${id}/toggle`, {}).then(r => r.data),
    onSuccess: () => invalidate(),
  });

  const openEdit = (sku: SKU) => {
    setEditSku(sku);
    setEditForm({
      name: sku.name,
      description: sku.description || "",
      volume_liters: String(sku.volume_liters),
      unit: sku.unit,
    });
    setError("");
  };

  const openPrice = (sku: SKU) => {
    setPriceSku(sku);
    setNewPrice(String(sku.current_price));
    setPriceNotes("");
    setError("");
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-ink">Catalogue</h1>
          <p className="text-sm text-ink-3">{skus.length} products</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setError(""); }}
          className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-teal-700 transition-colors"
        >
          <Plus size={16} /> Add SKU
        </button>
      </div>

      {isLoading ? (
        <div className="loading-screen"><span className="spinner spinner-dark" /></div>
      ) : (
        <div className="flex flex-col gap-3">
          {skus.map((sku) => (
            <div
              key={sku.id}
              className={`bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${sku.is_active ? "" : "opacity-60"}`}
            >
              {/* Icon + info */}
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <div className="size-12 rounded-xl bg-teal-50 flex items-center justify-center text-primary shrink-0">
                  <Droplet size={22} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[15px]">{sku.name}</span>
                    <span className="text-[11px] font-mono text-ink-4">{sku.sku_code}</span>
                    {!sku.is_active && <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactive</span>}
                  </div>
                  {sku.description && <p className="text-[13px] text-ink-3 mt-0.5 line-clamp-1">{sku.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-[13px]">
                    <span className="font-bold text-primary">${sku.current_price.toFixed(2)}</span>
                    <span className="text-ink-3">/ {sku.unit}</span>
                    {sku.volume_liters > 0 && <span className="text-ink-4">· {sku.volume_liters}L</span>}
                  </div>
                </div>
              </div>

              {/* Actions on the right */}
              <div className="flex items-center gap-2 shrink-0 sm:pl-2 sm:border-l sm:border-border">
                <button
                  onClick={() => openEdit(sku)}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-border text-[13px] font-medium text-ink-2 hover:border-primary hover:text-primary transition-colors"
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  onClick={() => openPrice(sku)}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-border text-[13px] font-medium text-ink-2 hover:border-primary hover:text-primary transition-colors"
                >
                  <DollarSign size={14} /> Price
                </button>
                <button
                  onClick={() => toggleMutation.mutate(sku.id)}
                  disabled={toggleMutation.isPending}
                  className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[13px] font-medium transition-colors ${
                    sku.is_active
                      ? "border-red-200 text-red-600 hover:bg-red-50"
                      : "border-green-200 text-green-600 hover:bg-green-50"
                  }`}
                >
                  {sku.is_active ? <Power size={14} /> : <PowerOff size={14} />}
                  {sku.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add SKU sheet ── */}
      {showAdd && (
        <Sheet title="Add New SKU" onClose={() => setShowAdd(false)}>
          <div className="form-group">
            <label>SKU Code *</label>
            <input className="input" placeholder="DEF-25L" value={newForm.code}
              onChange={e => setNewForm(p => ({ ...p, code: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Name *</label>
            <input className="input" placeholder="DEF 25L" value={newForm.name}
              onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="input" rows={2} style={{ resize: "none" }} value={newForm.description}
              onChange={e => setNewForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="form-group">
              <label>Volume (litres)</label>
              <input className="input" type="number" min="0" value={newForm.volume_liters}
                onChange={e => setNewForm(p => ({ ...p, volume_liters: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Unit</label>
              <select className="input" value={newForm.unit}
                onChange={e => setNewForm(p => ({ ...p, unit: e.target.value }))}>
                <option value="unit">unit</option>
                <option value="drum">drum</option>
                <option value="ibc">ibc</option>
                <option value="litre">litre</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Price (USD) *</label>
            <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={newForm.current_price}
              onChange={e => setNewForm(p => ({ ...p, current_price: e.target.value }))} />
          </div>
          {error && <div className="alert alert-error" style={{ marginBottom: 10 }}>{error}</div>}
          <button
            className="btn btn-primary btn-full"
            disabled={createMutation.isPending || !newForm.code || !newForm.name || !newForm.current_price}
            onClick={() => createMutation.mutate({
              code: newForm.code,
              name: newForm.name,
              description: newForm.description || null,
              volume_liters: parseFloat(newForm.volume_liters) || 0,
              unit: newForm.unit,
              current_price: parseFloat(newForm.current_price),
            })}
          >
            {createMutation.isPending ? <span className="spinner" /> : "Create SKU"}
          </button>
        </Sheet>
      )}

      {/* ── Edit SKU sheet ── */}
      {editSku && (
        <Sheet title={`Edit — ${editSku.name}`} onClose={() => setEditSku(null)}>
          <div className="form-group">
            <label>Name</label>
            <input className="input" value={editForm.name}
              onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="input" rows={2} style={{ resize: "none" }} value={editForm.description}
              onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="form-group">
              <label>Volume (litres)</label>
              <input className="input" type="number" min="0" value={editForm.volume_liters}
                onChange={e => setEditForm(p => ({ ...p, volume_liters: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Unit</label>
              <select className="input" value={editForm.unit}
                onChange={e => setEditForm(p => ({ ...p, unit: e.target.value }))}>
                <option value="unit">unit</option>
                <option value="drum">drum</option>
                <option value="ibc">ibc</option>
                <option value="litre">litre</option>
              </select>
            </div>
          </div>
          {error && <div className="alert alert-error" style={{ marginBottom: 10 }}>{error}</div>}
          <button
            className="btn btn-primary btn-full"
            disabled={editMutation.isPending}
            onClick={() => editMutation.mutate({
              id: editSku.id,
              body: {
                name: editForm.name || undefined,
                description: editForm.description || null,
                volume_liters: parseFloat(editForm.volume_liters) || undefined,
                unit: editForm.unit || undefined,
              },
            })}
          >
            {editMutation.isPending ? <span className="spinner" /> : "Save changes"}
          </button>
        </Sheet>
      )}

      {/* ── Update price sheet ── */}
      {priceSku && (
        <Sheet title={`Update Price — ${priceSku.name}`} onClose={() => setPriceSku(null)}>
          <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: 12, marginBottom: 14, fontSize: 13 }}>
            Current price: <strong style={{ color: "var(--blue)" }}>${priceSku.current_price.toFixed(2)}</strong> / {priceSku.unit}
          </div>
          <div className="form-group">
            <label>New price (USD) *</label>
            <input className="input" type="number" min="0" step="0.01"
              value={newPrice} onChange={e => setNewPrice(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Effective from *</label>
            <input className="input" type="date" defaultValue={today}
              onChange={e => setPriceNotes(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Notes (optional)</label>
            <input className="input" placeholder="e.g. Q3 price adjustment"
              value={priceNotes} onChange={e => setPriceNotes(e.target.value)} />
          </div>
          {error && <div className="alert alert-error" style={{ marginBottom: 10 }}>{error}</div>}
          <button
            className="btn btn-primary btn-full"
            disabled={priceMutation.isPending || !newPrice}
            onClick={() => priceMutation.mutate({
              id: priceSku.id,
              body: {
                new_price: parseFloat(newPrice),
                effective_from: today,
                notes: priceNotes || null,
              },
            })}
          >
            {priceMutation.isPending ? <span className="spinner" /> : "Update Price"}
          </button>
        </Sheet>
      )}
    </>
  );
}

// ── Reusable bottom sheet ─────────────────────────────────────────────────────
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
      display: "flex", alignItems: "flex-end", zIndex: 200,
    }}>
      <div style={{
        background: "var(--bg)", borderRadius: "20px 20px 0 0",
        width: "100%", maxHeight: "90dvh", overflow: "auto",
        padding: "20px 16px calc(env(safe-area-inset-bottom) + 20px)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--ink-3)", display: "flex" }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
