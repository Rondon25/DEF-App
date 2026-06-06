import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../../api";
import ConfirmDialog from "@/components/ConfirmDialog";
import { SkeletonList } from "@/components/Skeleton";
import StatCard from "@/components/ui/StatCard";
import LabCard from "@/components/ui/LabCard";
import BarChart from "@/components/charts/BarChart";
import {
  Boxes, Package, AlertTriangle, Factory, Plus, Pencil, Trash2, X, Loader2,
  FileDown, FileSpreadsheet, FileText, ChevronDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Plant { id: number; name: string; location: string | null; }
interface StockRow {
  id: number; sku_code: string; name: string; unit: string;
  total_qty: number; status: string;
  by_plant: { plant_id: number; plant_name: string; quantity: number }[];
}

export default function Stock() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const [plantFilter, setPlantFilter] = useState<number | "">("");
  const [showAdd, setShowAdd]   = useState(false);
  const [editRow, setEditRow]   = useState<StockRow | null>(null);
  const [delRow, setDelRow]     = useState<StockRow | null>(null);
  const [showExport, setShowExport] = useState(false);

  // Add/edit form state
  const [formSku, setFormSku]     = useState<number | "">("");
  const [formPlant, setFormPlant] = useState<number | "">("");
  const [formQty, setFormQty]     = useState("");
  const [formErr, setFormErr]     = useState("");

  const { data: plants = [] } = useQuery<Plant[]>({
    queryKey: ["plants"],
    queryFn: () => staffApi.get("/admin/plants").then((r) => r.data),
  });
  const { data: summary } = useQuery({
    queryKey: ["stock-summary"],
    queryFn: () => staffApi.get("/admin/stock/summary").then((r) => r.data),
    refetchInterval: 30_000,
  });
  const { data: stock = [], isLoading } = useQuery<StockRow[]>({
    queryKey: ["stock", plantFilter],
    queryFn: () => staffApi.get("/admin/stock" + (plantFilter ? `?plant_id=${plantFilter}` : "")).then((r) => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["stock"] });
    qc.invalidateQueries({ queryKey: ["stock-summary"] });
  };

  const setStockMutation = useMutation({
    mutationFn: (body: { sku_id: number; plant_id: number; quantity: number }) =>
      staffApi.post("/admin/stock", body).then((r) => r.data),
    onSuccess: () => { invalidate(); closeForm(); },
    onError: (e: any) => setFormErr(e.response?.data?.detail || "Failed to update stock"),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => staffApi.post(`/admin/skus/${id}/archive`, {}).then((r) => r.data),
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ["admin-skus"] }); setDelRow(null); },
  });

  const closeForm = () => {
    setShowAdd(false); setEditRow(null);
    setFormSku(""); setFormPlant(""); setFormQty(""); setFormErr("");
  };

  const openEdit = (row: StockRow) => {
    setEditRow(row);
    setFormSku(row.id);
    setFormPlant(plantFilter || (plants[0]?.id ?? ""));
    setFormQty("");
    setFormErr("");
  };

  const submitForm = () => {
    if (!formSku || !formPlant || formQty === "") { setFormErr("Select a product, plant, and quantity."); return; }
    setStockMutation.mutate({ sku_id: Number(formSku), plant_id: Number(formPlant), quantity: parseFloat(formQty) });
  };

  // Charts
  const topProducts = summary?.top_products || [];
  const byPlant = summary?.by_plant || [];

  // Export
  const exportExcel = () => {
    const data = stock.map((s) => ({ Code: s.sku_code, Product: s.name, Unit: s.unit, Quantity: s.total_qty, Status: s.status === "low" ? "Low" : "OK" }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock");
    XLSX.writeFile(wb, `stock_${today}.xlsx`);
    setShowExport(false);
  };
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.setTextColor(13, 148, 136);
    doc.text("Rohan Energy Solutions — Stock", 14, 18);
    doc.setFontSize(10); doc.setTextColor(120);
    const scope = plantFilter ? plants.find((p) => p.id === plantFilter)?.name : "All plants";
    doc.text(`Generated ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })} · ${scope}`, 14, 25);
    autoTable(doc, {
      startY: 31,
      head: [["Code", "Product", "Unit", "Quantity", "Status"]],
      body: stock.map((s) => [s.sku_code, s.name, s.unit, s.total_qty, s.status === "low" ? "Low" : "OK"]),
      headStyles: { fillColor: [30, 30, 45], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 3: { halign: "right" } },
    });
    doc.save(`stock_${today}.pdf`);
    setShowExport(false);
  };

  const selectCls = "h-11 rounded-xl border border-input bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 w-full";

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Stock</h1>
          <p className="text-sm text-ink-3">Inventory across plants</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowExport((v) => !v)} disabled={stock.length === 0}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border bg-surface text-sm font-medium text-ink-2 hover:border-primary hover:text-primary transition-colors disabled:opacity-50">
              <FileDown size={16} /> Export
            </button>
            {showExport && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExport(false)} />
                <div className="absolute right-0 top-12 z-20 w-44 bg-surface rounded-xl shadow-[var(--shadow-lg)] border border-border overflow-hidden">
                  <button onClick={exportExcel} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-canvas text-left"><FileSpreadsheet size={16} className="text-green-600" /> Excel</button>
                  <button onClick={exportPDF} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-canvas text-left border-t border-border"><FileText size={16} className="text-red-600" /> PDF</button>
                </div>
              </>
            )}
          </div>
          <button onClick={() => { setShowAdd(true); setFormSku(""); setFormPlant(plants[0]?.id ?? ""); setFormQty(""); setFormErr(""); }}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-teal-700 transition-colors">
            <Plus size={16} /> Add Stock
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Total Units" value={summary?.total_units ?? "—"} icon={<Boxes className="size-4" />} />
        <StatCard label="Products Tracked" value={summary?.total_products ?? "—"} icon={<Package className="size-4" />} />
        <StatCard label="Low Stock" value={summary?.low_stock ?? "—"} warn={(summary?.low_stock ?? 0) > 0} icon={<AlertTriangle className="size-4" />} />
        <StatCard label="Plants" value={summary?.plant_count ?? "—"} icon={<Factory className="size-4" />} />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <LabCard title="Top Products by Stock">
          <BarChart data={topProducts.map((p: any) => ({ label: p.name, value: p.qty }))} />
        </LabCard>
        <LabCard title="Stock by Plant">
          <BarChart data={byPlant.map((p: any) => ({ label: p.name, value: p.qty }))} />
        </LabCard>
      </div>

      {/* Plant filter */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-ink-3">Plant:</span>
        <div className="relative">
          <select value={plantFilter} onChange={(e) => setPlantFilter(e.target.value ? Number(e.target.value) : "")}
            className="h-9 rounded-full border border-border bg-surface pl-3.5 pr-9 text-sm font-medium outline-none focus:border-primary appearance-none cursor-pointer">
            <option value="">All plants</option>
            {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <SkeletonList rows={6} />
      ) : (
        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-ink-4 border-b border-border">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3 text-right">{plantFilter ? "Qty at plant" : "Total Qty"}</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-canvas">
                    <td className="px-5 py-3.5 font-semibold text-sm">{s.name}</td>
                    <td className="px-5 py-3.5 font-mono text-[13px] text-ink-3">{s.sku_code}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-sm">{s.total_qty} <span className="text-ink-4 font-normal text-xs">{s.unit}</span></td>
                    <td className="px-5 py-3.5">
                      {s.total_qty <= 0
                        ? <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">Out</span>
                        : s.status === "low"
                        ? <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Low</span>
                        : <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">In stock</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(s)} title="Adjust stock"
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-full border border-border text-[12px] font-medium text-ink-2 hover:border-primary hover:text-primary transition-colors">
                          <Pencil size={13} /> Edit
                        </button>
                        <button onClick={() => setDelRow(s)} title="Archive product"
                          className="inline-flex items-center justify-center size-8 rounded-full border border-border text-ink-4 hover:border-red-300 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {stock.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-4">No products tracked yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit stock sheet */}
      {(showAdd || editRow) && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center sm:justify-center" onClick={closeForm}>
          <div className="bg-surface w-full sm:max-w-[440px] rounded-t-2xl sm:rounded-2xl p-6" onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editRow ? `Adjust — ${editRow.name}` : "Add Stock"}</h3>
              <button onClick={closeForm} className="text-ink-3"><X size={20} /></button>
            </div>

            {!editRow && (
              <div className="mb-3">
                <label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">Product</label>
                <select value={formSku} onChange={(e) => setFormSku(e.target.value ? Number(e.target.value) : "")} className={selectCls}>
                  <option value="">Select product…</option>
                  {stock.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.sku_code})</option>)}
                </select>
              </div>
            )}

            <div className="mb-3">
              <label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">Plant</label>
              <select value={formPlant} onChange={(e) => setFormPlant(e.target.value ? Number(e.target.value) : "")} className={selectCls}>
                <option value="">Select plant…</option>
                {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">Quantity at this plant</label>
              <input type="number" min="0" step="any" value={formQty} onChange={(e) => setFormQty(e.target.value)} placeholder="0"
                className={selectCls} />
              <p className="text-xs text-ink-4 mt-1.5">Sets the absolute stock level for this product at the selected plant.</p>
            </div>

            {formErr && <div className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 mb-3 text-[13px] text-red-700">{formErr}</div>}

            <button onClick={submitForm} disabled={setStockMutation.isPending}
              className="w-full h-12 rounded-full bg-primary text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-teal-700 transition-colors disabled:opacity-60">
              {setStockMutation.isPending ? <Loader2 className="size-5 animate-spin" /> : <><Plus size={16} /> Save Stock</>}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delRow && (
        <ConfirmDialog
          title="Archive product?"
          message={<>This removes <strong>{delRow.name}</strong> from stock and the catalogue. It can be restored from the database if needed.</>}
          confirmLabel="Archive"
          loading={archiveMutation.isPending}
          onConfirm={() => archiveMutation.mutate(delRow.id)}
          onCancel={() => setDelRow(null)}
        />
      )}
    </>
  );
}

