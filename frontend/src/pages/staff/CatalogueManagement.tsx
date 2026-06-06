import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../../api";
import { Pencil, DollarSign, X, Plus, Droplet, Power, PowerOff, Upload, FileDown, FileSpreadsheet, FileText, Trash2, Search } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import BulkSkuUpload, { type SkuRow } from "@/components/BulkSkuUpload";
import ConfirmDialog from "@/components/ConfirmDialog";

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
  const [showBulk,    setShowBulk]    = useState(false);
  const [showExport,  setShowExport]  = useState(false);
  const [importing,   setImporting]   = useState(false);
  const [search,      setSearch]      = useState("");
  const [editSku,     setEditSku]     = useState<SKU | null>(null);
  const [priceSku,    setPriceSku]    = useState<SKU | null>(null);
  const [delSku,      setDelSku]      = useState<SKU | null>(null);
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

  const archiveMutation = useMutation({
    mutationFn: (id: number) => staffApi.post(`/admin/skus/${id}/archive`, {}).then(r => r.data),
    onSuccess: () => { invalidate(); setDelSku(null); },
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

  // Bulk import — create each SKU sequentially
  const importSkus = async (rows: SkuRow[]) => {
    setImporting(true);
    for (const r of rows) {
      await staffApi.post("/admin/skus", {
        code: r.code, name: r.name, description: r.description || null,
        volume_liters: r.volume_liters, unit: r.unit, current_price: r.current_price,
      }).catch(() => {}); // skip dupes/errors silently
    }
    invalidate();
    setImporting(false);
    setShowBulk(false);
  };

  // Export — Excel
  const exportExcel = () => {
    const data = skus.map((s) => ({
      Code: s.sku_code, Name: s.name, Description: s.description || "",
      Volume_L: s.volume_liters, Unit: s.unit, Price_USD: s.current_price.toFixed(2),
      Status: s.is_active ? "Active" : "Inactive",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 42 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Catalogue");
    XLSX.writeFile(wb, `catalogue_${today}.xlsx`);
    setShowExport(false);
  };

  // Export — PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(13, 148, 136);
    doc.text("Rohan Energy Solutions — Catalogue", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Generated ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })} · ${skus.length} products`, 14, 25);
    autoTable(doc, {
      startY: 31,
      head: [["Code", "Name", "Unit", "Volume (L)", "Price (USD)", "Status"]],
      body: skus.map((s) => [
        s.sku_code, s.name, s.unit, s.volume_liters || "—",
        `$${s.current_price.toFixed(2)}`, s.is_active ? "Active" : "Inactive",
      ]),
      headStyles: { fillColor: [30, 30, 45], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 4: { halign: "right" } },
    });
    doc.save(`catalogue_${today}.pdf`);
    setShowExport(false);
  };

  const filtered = search.trim()
    ? skus.filter((s) => {
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.sku_code.toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q);
      })
    : skus;

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-ink">Catalogue</h1>
        <p className="text-sm text-ink-3">{filtered.length} of {skus.length} products</p>
      </div>

      {/* Search + actions */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink-4" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, code, description..."
            className="w-full h-11 rounded-full border border-input bg-surface pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-ink-4" />
        </div>
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExport((v) => !v)}
              className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full border border-border bg-surface text-sm font-medium text-ink-2 hover:border-primary hover:text-primary transition-colors"
            >
              <FileDown size={16} /> Export
            </button>
            {showExport && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExport(false)} />
                <div className="absolute right-0 top-12 z-20 w-48 bg-surface rounded-xl shadow-[var(--shadow-lg)] border border-border overflow-hidden">
                  <button onClick={exportExcel} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-canvas text-left">
                    <FileSpreadsheet size={16} className="text-green-600" /> Export as Excel
                  </button>
                  <button onClick={exportPDF} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-canvas text-left border-t border-border">
                    <FileText size={16} className="text-red-600" /> Export as PDF
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setShowBulk(true)}
            className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full border border-border bg-surface text-sm font-medium text-ink-2 hover:border-primary hover:text-primary transition-colors"
          >
            <Upload size={16} /> Bulk Add
          </button>
          <button
            onClick={() => { setShowAdd(true); setError(""); }}
            className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-teal-700 transition-colors"
          >
            <Plus size={16} /> Add SKU
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-screen"><span className="spinner spinner-dark" /></div>
      ) : (
        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-ink-4 border-b border-border">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3 text-right">Price</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sku) => (
                  <tr key={sku.id} className={`border-b border-border last:border-0 hover:bg-canvas ${sku.is_active ? "" : "opacity-60"}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-teal-50 flex items-center justify-center text-primary shrink-0"><Droplet size={17} /></div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm">{sku.name}</div>
                          {sku.description && <div className="text-[12px] text-ink-4 line-clamp-1 max-w-[320px]">{sku.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[13px] text-ink-3">{sku.sku_code}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-bold text-primary text-sm">${sku.current_price.toFixed(2)}</span>
                      <span className="text-ink-4 text-xs"> /{sku.unit}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {sku.is_active
                        ? <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                        : <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactive</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(sku)} title="Edit"
                          className="inline-flex items-center justify-center size-8 rounded-full border border-border text-ink-4 hover:border-primary hover:text-primary transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => openPrice(sku)} title="Update price"
                          className="inline-flex items-center justify-center size-8 rounded-full border border-border text-ink-4 hover:border-primary hover:text-primary transition-colors"><DollarSign size={14} /></button>
                        <button onClick={() => toggleMutation.mutate(sku.id)} disabled={toggleMutation.isPending} title={sku.is_active ? "Deactivate" : "Activate"}
                          className={`inline-flex items-center justify-center size-8 rounded-full border transition-colors ${sku.is_active ? "border-border text-ink-4 hover:border-amber-300 hover:text-amber-600" : "border-green-200 text-green-600 hover:bg-green-50"}`}>
                          {sku.is_active ? <Power size={14} /> : <PowerOff size={14} />}
                        </button>
                        <button onClick={() => setDelSku(sku)} title="Archive"
                          className="inline-flex items-center justify-center size-8 rounded-full border border-border text-ink-4 hover:border-red-300 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-4">{search ? "No products match your search" : "No products yet"}</td></tr>}
              </tbody>
            </table>
          </div>
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

      {/* Bulk add */}
      {showBulk && (
        <BulkSkuUpload onClose={() => !importing && setShowBulk(false)} onSkus={importSkus} />
      )}

      {/* Archive confirm */}
      {delSku && (
        <ConfirmDialog
          title="Archive product?"
          message={<>This removes <strong>{delSku.name}</strong> from the catalogue and stock. It can be restored from the database if needed.</>}
          confirmLabel="Archive"
          loading={archiveMutation.isPending}
          onConfirm={() => archiveMutation.mutate(delSku.id)}
          onCancel={() => setDelSku(null)}
        />
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
