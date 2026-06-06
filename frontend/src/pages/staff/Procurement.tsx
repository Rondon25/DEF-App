import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../../api";
import { SkeletonList } from "@/components/Skeleton";
import ConfirmDialog from "@/components/ConfirmDialog";
import StatCard from "@/components/ui/StatCard";
import {
  ShoppingCart, Zap, Clock, Truck, CheckCircle2, Search, X, Loader2,
  FileDown, FileSpreadsheet, FileText, Plus, Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PO {
  id: number; po_number: string; plant_id: number; plant_name: string; material_id: number; material_name: string; unit: string;
  vendor_id: number | null; vendor_name: string | null; trigger_date: string | null; stock_at_trigger: number;
  reorder_point: number; order_qty: number; lead_time_days: number; expected_arrival: string | null;
  unit_cost: number; total_cost: number; status: string; auto_generated: boolean; notes: string | null;
}

const STATUSES = ["draft", "pending", "ordered", "arrived", "cancelled"];
const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700", pending: "bg-amber-100 text-amber-700",
  ordered: "bg-blue-100 text-blue-700", arrived: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
};

export default function Procurement() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showExport, setShowExport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [delPo, setDelPo] = useState<PO | null>(null);

  const { data: pos = [], isLoading } = useQuery<PO[]>({ queryKey: ["pos"], queryFn: () => staffApi.get("/admin/purchase-orders").then((r) => r.data), refetchInterval: 30_000 });
  const inv = () => { qc.invalidateQueries({ queryKey: ["pos"] }); qc.invalidateQueries({ queryKey: ["rm-stock"] }); qc.invalidateQueries({ queryKey: ["rm-summary"] }); };

  const generate = useMutation({ mutationFn: () => staffApi.post("/admin/purchase-orders/generate", {}).then((r) => r.data), onSuccess: inv });
  const setStatus = useMutation({ mutationFn: ({ id, status }: any) => staffApi.patch(`/admin/purchase-orders/${id}`, { status }), onSuccess: inv });
  const archive = useMutation({ mutationFn: (id: number) => staffApi.post(`/admin/purchase-orders/${id}/archive`, {}), onSuccess: () => { inv(); setDelPo(null); } });

  const kpi = useMemo(() => ({
    active: pos.filter((p) => ["draft", "pending", "ordered"].includes(p.status)).length,
    draft: pos.filter((p) => p.status === "draft").length,
    ordered: pos.filter((p) => p.status === "ordered").length,
    value: pos.filter((p) => p.status !== "cancelled").reduce((s, p) => s + p.total_cost, 0),
  }), [pos]);

  const filtered = useMemo(() => pos.filter((p) =>
    (statusFilter === "all" || p.status === statusFilter) &&
    (!search.trim() || p.material_name.toLowerCase().includes(search.toLowerCase()) || p.plant_name.toLowerCase().includes(search.toLowerCase()) || (p.vendor_name || "").toLowerCase().includes(search.toLowerCase()) || (p.po_number || "").toLowerCase().includes(search.toLowerCase()))
  ), [pos, search, statusFilter]);

  const exportExcel = () => {
    const data = filtered.map((p) => ({ PO: p.po_number, Plant: p.plant_name, Material: p.material_name, Vendor: p.vendor_name || "", "Trigger Date": p.trigger_date || "", "Stock @ Trigger": p.stock_at_trigger, ROP: p.reorder_point, "Order Qty": p.order_qty, "Lead Time": p.lead_time_days, "Expected Arrival": p.expected_arrival || "", "Unit Cost": p.unit_cost, "Total Cost": p.total_cost, Status: p.status }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Purchase Orders");
    XLSX.writeFile(wb, `purchase_orders_${today}.xlsx`); setShowExport(false);
  };
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16); doc.setTextColor(13, 148, 136); doc.text("Procurement — Purchase Orders", 14, 16);
    doc.setFontSize(10); doc.setTextColor(120); doc.text(`Generated ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}`, 14, 22);
    autoTable(doc, { startY: 28,
      head: [["PO", "Plant", "Material", "Vendor", "Order Qty", "Lead", "Arrival", "Total", "Status"]],
      body: filtered.map((p) => [p.po_number, p.plant_name, p.material_name, p.vendor_name || "—", p.order_qty, `${p.lead_time_days}d`, p.expected_arrival || "—", `$${p.total_cost}`, p.status]),
      headStyles: { fillColor: [30, 30, 45], textColor: 255, fontStyle: "bold" }, alternateRowStyles: { fillColor: [248, 249, 250] }, styles: { fontSize: 8, cellPadding: 2 } });
    doc.save(`purchase_orders_${today}.pdf`); setShowExport(false);
  };

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink">Procurement</h1>
        <p className="text-sm text-ink-3">Reorder tracker &amp; active purchase orders</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Active POs" value={kpi.active} icon={<ShoppingCart className="size-4" />} />
        <StatCard label="Draft" value={kpi.draft} icon={<Clock className="size-4" />} />
        <StatCard label="Ordered" value={kpi.ordered} icon={<Truck className="size-4" />} />
        <StatCard label="Open Value" value={`$${kpi.value.toLocaleString()}`} icon={<CheckCircle2 className="size-4" />} />
      </div>

      {/* status pills + actions */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {["all", ...STATUSES].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`h-9 px-3.5 rounded-full text-[13px] font-medium capitalize transition-colors ${statusFilter === s ? "bg-primary text-white" : "bg-surface border border-border text-ink-2 hover:border-primary"}`}>{s}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => generate.mutate()} disabled={generate.isPending}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-60">
            {generate.isPending ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />} Generate Reorders
          </button>
          <div className="relative">
            <button onClick={() => setShowExport((v) => !v)} disabled={pos.length === 0}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border bg-surface text-sm font-medium text-ink-2 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"><FileDown size={16} /> Export</button>
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
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-primary text-white text-sm font-semibold hover:bg-teal-700 transition-colors"><Plus size={16} /> New PO</button>
        </div>
      </div>

      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink-4" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search PO, material, vendor, plant..."
          className="w-full h-11 rounded-full border border-input bg-surface pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-ink-4" />
      </div>

      {isLoading ? <SkeletonList rows={5} /> : (
        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px]">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-ink-4 border-b border-border">
                  <th className="px-4 py-3">PO / Material</th><th className="px-4 py-3">Plant</th><th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Order Qty</th><th className="px-4 py-3">Arrival</th><th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-canvas">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm flex items-center gap-1.5">{p.material_name}{p.auto_generated && <Zap size={12} className="text-amber-500" />}</div>
                      <div className="text-[12px] font-mono text-ink-4">{p.po_number}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-2">{p.plant_name}</td>
                    <td className="px-4 py-3 text-sm">{p.vendor_name || <span className="text-ink-4">—</span>}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{p.order_qty.toLocaleString()} <span className="text-ink-4 font-normal text-xs">{p.unit}</span></td>
                    <td className="px-4 py-3 text-sm text-ink-3">{p.expected_arrival || "—"}</td>
                    <td className="px-4 py-3 text-sm font-mono">${p.total_cost.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <select value={p.status} onChange={(e) => setStatus.mutate({ id: p.id, status: e.target.value })}
                        className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border-0 outline-none cursor-pointer capitalize ${STATUS_STYLE[p.status]}`}>
                        {STATUSES.map((s) => <option key={s} value={s} className="bg-surface text-ink capitalize">{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3"><div className="flex justify-end"><button onClick={() => setDelPo(p)} className="size-8 rounded-full border border-border flex items-center justify-center text-ink-4 hover:border-red-300 hover:text-red-600 transition-colors"><Trash2 size={14} /></button></div></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-ink-4">{pos.length === 0 ? "No purchase orders — click 'Generate Reorders' to create them from low-stock signals" : "No POs match your filter"}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && <NewPoModal onClose={() => setShowAdd(false)} onSaved={() => { inv(); setShowAdd(false); }} />}
      {delPo && <ConfirmDialog title="Archive purchase order?" message={<>Remove <strong>{delPo.po_number}</strong> ({delPo.material_name}).</>} confirmLabel="Archive" loading={archive.isPending} onConfirm={() => archive.mutate(delPo.id)} onCancel={() => setDelPo(null)} />}
    </>
  );
}

const inputCls = "w-full h-11 rounded-xl border border-input bg-surface px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function NewPoModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { data: rm = [] } = useQuery<any[]>({ queryKey: ["rm-stock"], queryFn: () => staffApi.get("/admin/rm-stock").then((r) => r.data) });
  const [stockId, setStockId] = useState("");
  const [qty, setQty] = useState("");
  const selected = rm.find((r) => String(r.id) === stockId);
  const save = useMutation({
    mutationFn: () => staffApi.post("/admin/purchase-orders", {
      plant_id: selected.plant_id, material_id: selected.material_id, vendor_id: selected.vendor_id,
      order_qty: parseFloat(qty) || 0, lead_time_days: selected.lead_time_days, unit_cost: selected.unit_cost,
    }),
    onSuccess: onSaved,
  });
  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-[460px] rounded-t-2xl sm:rounded-2xl p-6 max-h-[92dvh] overflow-auto" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold">New Purchase Order</h3><button onClick={onClose} className="text-ink-3"><X size={20} /></button></div>
        <div className="space-y-3">
          <div><label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">Material @ Plant</label>
            <select className={inputCls} value={stockId} onChange={(e) => { setStockId(e.target.value); const r = rm.find((x) => String(x.id) === e.target.value); if (r) setQty(String(r.suggested_qty || r.moq || "")); }}>
              <option value="">Select…</option>
              {rm.map((r) => <option key={r.id} value={r.id}>{r.material_name} — {r.plant_name} (stock {r.quantity})</option>)}
            </select>
          </div>
          {selected && (
            <div className="rounded-xl bg-canvas p-3 text-[13px] space-y-1">
              <div className="flex justify-between"><span className="text-ink-3">Vendor</span><span className="font-medium">{selected.vendor_name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-ink-3">Reorder point</span><span>{selected.reorder_point.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-ink-3">Lead time</span><span>{selected.lead_time_days} days</span></div>
              <div className="flex justify-between"><span className="text-ink-3">Suggested qty</span><span className="font-semibold text-primary">{selected.suggested_qty.toLocaleString()}</span></div>
            </div>
          )}
          <div><label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">Order quantity</label><input type="number" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} /></div>
        </div>
        <button onClick={() => save.mutate()} disabled={save.isPending || !selected || !qty} className="w-full h-12 rounded-full bg-primary text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-teal-700 transition-colors disabled:opacity-60 mt-5">
          {save.isPending ? <Loader2 className="size-5 animate-spin" /> : <><Plus size={16} /> Create PO</>}
        </button>
      </div>
    </div>
  );
}

